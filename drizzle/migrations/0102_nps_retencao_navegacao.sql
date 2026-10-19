ALTER TABLE public.whatsapp_retencao_execucoes ADD COLUMN IF NOT EXISTS nps_anonimizadas integer NOT NULL DEFAULT 0;
-- NPS statistics outlive queue retention; retain the original UUID for scoped erasure while the queue exists.
ALTER TABLE public.whatsapp_nps_respostas DROP CONSTRAINT IF EXISTS whatsapp_nps_respostas_fila_id_fkey;
COMMENT ON COLUMN public.whatsapp_nps_respostas.fila_id IS 'Original queue UUID without cascading FK: statistics survive queue retention; used for scoped contact erasure while origin exists.';

CREATE OR REPLACE FUNCTION public.inovachat_retencao_contar(p_company uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE corte timestamptz := inovachat_retencao_corte(p_company);
  corte_ac timestamptz := least(corte, now() - interval '12 months'); r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'mensagens', (SELECT count(*) FROM whatsapp_mensagens WHERE company_id = p_company AND criado_em < corte),
    'midias', (SELECT count(*) FROM whatsapp_mensagens WHERE company_id = p_company AND criado_em < corte AND midia_path IS NOT NULL),
    'conversas', (SELECT count(*) FROM whatsapp_conversas c WHERE c.company_id = p_company AND c.status = 'finalizada'
        AND NOT EXISTS (SELECT 1 FROM whatsapp_mensagens m WHERE m.conversa_id = c.id AND m.criado_em >= corte)),
    'contatos', (SELECT count(*) FROM whatsapp_contatos ct WHERE ct.company_id = p_company AND ct.paciente_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM whatsapp_conversas c WHERE c.contato_id = ct.id AND (c.status <> 'finalizada'
          OR EXISTS (SELECT 1 FROM whatsapp_mensagens m WHERE m.conversa_id = c.id AND m.criado_em >= corte)))),
    'fila', (SELECT count(*) FROM whatsapp_fila_envios WHERE company_id = p_company AND criado_em < corte),
    'acessos', (SELECT count(*) FROM whatsapp_conversa_acessos WHERE company_id = p_company AND acessado_em < corte_ac),
    'nps_anonimizadas', (SELECT count(*) FROM whatsapp_nps_respostas WHERE company_id = p_company AND respondida_em < corte
      AND (comentario IS NOT NULL OR paciente_id IS NOT NULL OR paciente_nome IS NOT NULL OR agendamento_id IS NOT NULL))) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_limpar(p_company uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE corte timestamptz := inovachat_retencao_corte(p_company);
  corte_ac timestamptz := least(corte, now() - interval '12 months');
  n_msg int; n_conv int; n_ct int; n_fila int; n_ac int; n_nps int;
BEGIN
  UPDATE whatsapp_nps_respostas SET comentario = NULL, paciente_id = NULL, paciente_nome = NULL, agendamento_id = NULL
  WHERE id IN (SELECT id FROM whatsapp_nps_respostas WHERE company_id = p_company AND respondida_em < corte
    AND (comentario IS NOT NULL OR paciente_id IS NOT NULL OR paciente_nome IS NOT NULL OR agendamento_id IS NOT NULL)
    ORDER BY respondida_em, id LIMIT 500 FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS n_nps = ROW_COUNT;
  DELETE FROM whatsapp_mensagens WHERE id IN (SELECT id FROM whatsapp_mensagens WHERE company_id = p_company AND criado_em < corte AND midia_path IS NULL LIMIT 500);
  GET DIAGNOSTICS n_msg = ROW_COUNT;
  DELETE FROM whatsapp_conversas WHERE id IN (SELECT c.id FROM whatsapp_conversas c WHERE c.company_id = p_company AND c.status = 'finalizada'
    AND NOT EXISTS (SELECT 1 FROM whatsapp_mensagens m WHERE m.conversa_id = c.id) LIMIT 500);
  GET DIAGNOSTICS n_conv = ROW_COUNT;
  DELETE FROM whatsapp_contatos WHERE id IN (SELECT ct.id FROM whatsapp_contatos ct WHERE ct.company_id = p_company AND ct.paciente_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM whatsapp_conversas c WHERE c.contato_id = ct.id) LIMIT 500);
  GET DIAGNOSTICS n_ct = ROW_COUNT;
  DELETE FROM whatsapp_fila_envios WHERE id IN (SELECT id FROM whatsapp_fila_envios WHERE company_id = p_company AND criado_em < corte
    AND status NOT IN ('enviando') AND NOT EXISTS (SELECT 1 FROM whatsapp_nps_respostas n WHERE n.company_id=p_company AND n.fila_id=whatsapp_fila_envios.id
      AND n.respondida_em < corte AND (n.comentario IS NOT NULL OR n.paciente_id IS NOT NULL OR n.paciente_nome IS NOT NULL OR n.agendamento_id IS NOT NULL)) LIMIT 500);
  GET DIAGNOSTICS n_fila = ROW_COUNT;
  DELETE FROM whatsapp_conversa_acessos WHERE id IN (SELECT id FROM whatsapp_conversa_acessos WHERE company_id = p_company AND acessado_em < corte_ac LIMIT 500);
  GET DIAGNOSTICS n_ac = ROW_COUNT;
  RETURN jsonb_build_object('mensagens', n_msg, 'conversas', n_conv, 'contatos', n_ct, 'fila', n_fila, 'acessos', n_ac, 'nps_anonimizadas', n_nps);
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_excluir_contato_executar(p_contato uuid, p_usuario uuid, p_midias int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ct record; n_msg int; n_conv int; n_fila int; n_nps int;
BEGIN
  SELECT * INTO ct FROM whatsapp_contatos WHERE id = p_contato FOR UPDATE;
  IF ct.id IS NULL THEN RAISE EXCEPTION 'contato'; END IF;
  DELETE FROM whatsapp_nps_respostas n USING whatsapp_fila_envios f
    WHERE n.fila_id=f.id AND n.company_id=ct.company_id AND f.company_id=ct.company_id
      AND whatsapp_tel_canonico(f.telefone_destino)=whatsapp_tel_canonico(ct.telefone);
  GET DIAGNOSTICS n_nps = ROW_COUNT;
  SELECT count(*) INTO n_msg FROM whatsapp_mensagens m JOIN whatsapp_conversas c ON c.id = m.conversa_id WHERE c.contato_id = ct.id;
  DELETE FROM whatsapp_conversas WHERE contato_id = ct.id; GET DIAGNOSTICS n_conv = ROW_COUNT;
  DELETE FROM whatsapp_fila_envios WHERE company_id = ct.company_id AND whatsapp_tel_canonico(telefone_destino) = whatsapp_tel_canonico(ct.telefone);
  GET DIAGNOSTICS n_fila = ROW_COUNT;
  DELETE FROM whatsapp_contatos WHERE id = ct.id;
  INSERT INTO whatsapp_auditoria(company_id, acao, depois, usuario_id) VALUES (ct.company_id, 'inovachat_exclusao_titular',
    jsonb_build_object('telefone_final', right(ct.telefone, 4), 'mensagens', n_msg, 'midias', p_midias, 'conversas', n_conv, 'fila', n_fila, 'nps_apagadas', n_nps), p_usuario);
  RETURN jsonb_build_object('mensagens', n_msg, 'midias', p_midias, 'conversas', n_conv, 'fila', n_fila, 'nps_apagadas', n_nps);
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_nps_conversa(p_nps uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n record; c record;
BEGIN
  SELECT company_id, fila_id INTO n FROM whatsapp_nps_respostas WHERE id=p_nps;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resposta indisponível'; END IF;
  IF n.company_id IS DISTINCT FROM get_user_company_id(auth.uid()) OR NOT (
    whatsapp_tem_permissao('configuracoes.whatsapp') OR inovachat_tem_permissao('inovachat.gerenciar')) THEN
    RAISE EXCEPTION 'Sem permissão para esta resposta'; END IF;
  IF NOT (inovachat_ativo(n.company_id) AND inovachat_tem_permissao('inovachat.visualizar')) THEN
    RAISE EXCEPTION 'Sem permissão para abrir a conversa'; END IF;
  SELECT cv.* INTO c FROM whatsapp_fila_envios f
    JOIN whatsapp_contatos ct ON ct.company_id=f.company_id AND whatsapp_tel_canonico(ct.telefone)=whatsapp_tel_canonico(f.telefone_destino)
    JOIN whatsapp_conversas cv ON cv.contato_id=ct.id AND cv.company_id=f.company_id
    WHERE f.id=n.fila_id AND f.company_id=n.company_id ORDER BY cv.ultima_mensagem_em DESC NULLS LAST, cv.id LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','sem_conversa'); END IF;
  IF NOT coalesce(inovachat_pode_ver(c.company_id,c.status,c.responsavel_id,c.setor_id::text),false) THEN
    RAISE EXCEPTION 'Sem permissão para abrir a conversa'; END IF;
  RETURN jsonb_build_object('status','ok','conversa_id',c.id);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_nps_conversa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_nps_conversa(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.whatsapp__nps_avisar(p_company uuid, p_tel text, p_titulo text, p_msg text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_nps uuid; v_rota text := '/app/inovachat?sem_conversa=1';
BEGIN
  SELECT n.id INTO v_nps FROM whatsapp_nps_respostas n JOIN whatsapp_fila_envios f ON f.id=n.fila_id AND f.company_id=n.company_id
    WHERE n.company_id=p_company AND whatsapp_tel_canonico(f.telefone_destino)=whatsapp_tel_canonico(p_tel)
    ORDER BY n.respondida_em DESC, n.id LIMIT 1;
  IF v_nps IS NOT NULL THEN v_rota := '/app/inovachat?nps=' || v_nps; END IF;
  INSERT INTO user_notifications(company_id, user_id, category, priority, title, message, action_route)
  SELECT p_company, p.id, 'system', 'high', p_titulo, p_msg, v_rota FROM profiles p
    WHERE p.company_id=p_company AND coalesce(p.is_active,true)
      AND (p.is_admin=true OR p.role='company_admin' OR inovachat_usuario_tem(p.id,'inovachat.gerenciar'));
END $$;
REVOKE ALL ON FUNCTION public.whatsapp__nps_avisar(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp__nps_avisar(uuid,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.inovachat_retencao_contar(uuid), public.inovachat_retencao_limpar(uuid), public.inovachat_excluir_contato_executar(uuid,uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inovachat_retencao_contar(uuid), public.inovachat_retencao_limpar(uuid), public.inovachat_excluir_contato_executar(uuid,uuid,int) TO service_role;