
ALTER TABLE public.whatsapp_instancias ADD COLUMN IF NOT EXISTS setor_entrada_id text REFERENCES public.company_sectors(id) ON DELETE SET NULL;
ALTER TABLE public.whatsapp_conversas ADD COLUMN IF NOT EXISTS setor_id text REFERENCES public.company_sectors(id) ON DELETE SET NULL;
ALTER TABLE public.whatsapp_mensagens ADD COLUMN IF NOT EXISTS evento_tipo text;
ALTER TABLE public.whatsapp_mensagens ADD COLUMN IF NOT EXISTS erro text;
ALTER TABLE public.whatsapp_mensagens DROP CONSTRAINT IF EXISTS whatsapp_mensagens_origem_check;
ALTER TABLE public.whatsapp_mensagens ADD CONSTRAINT whatsapp_mensagens_origem_check CHECK (origem IN ('paciente','usuario','sistema','evento'));
ALTER TABLE public.whatsapp_mensagens DROP CONSTRAINT IF EXISTS whatsapp_mensagens_direcao_check;
ALTER TABLE public.whatsapp_mensagens ADD CONSTRAINT whatsapp_mensagens_direcao_check CHECK (direcao IN ('entrada','saida','interna'));
CREATE INDEX IF NOT EXISTS whatsapp_mensagens_envio_usuario_idx ON public.whatsapp_mensagens(enviada_por_usuario_id, criado_em) WHERE origem = 'usuario';
CREATE INDEX IF NOT EXISTS whatsapp_conversas_setor_idx ON public.whatsapp_conversas(company_id, setor_id, status);

-- permissão para um usuário qualquer (usado em notificações e lista de atendentes)
CREATE OR REPLACE FUNCTION public.inovachat_usuario_tem(_user uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND (
    public.is_company_manager(_user) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = _user
        AND ap.company_id = public.get_user_company_id(_user)
        AND coalesce(ap.permissions->'inovachat','[]'::jsonb) ? _perm))
$$;

CREATE OR REPLACE FUNCTION public.inovachat_pode_ver_u(_user uuid, _company uuid, _status text, _resp uuid, _setor text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _company = public.get_user_company_id(_user)
    AND public.inovachat_ativo(_company)
    AND public.inovachat_usuario_tem(_user, 'inovachat.visualizar')
    AND (public.inovachat_usuario_tem(_user, 'inovachat.gerenciar')
         OR _resp = _user
         OR (_status = 'na_fila' AND (_setor IS NULL OR EXISTS (
              SELECT 1 FROM public.sector_users su WHERE su.user_id = _user AND su.sector_id = _setor))))
$$;

CREATE OR REPLACE FUNCTION public.inovachat_pode_ver(_company uuid, _status text, _resp uuid, _setor text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.inovachat_pode_ver_u(auth.uid(), _company, _status, _resp, _setor)
$$;

DROP POLICY IF EXISTS "inovachat conversas leitura" ON public.whatsapp_conversas;
CREATE POLICY "inovachat conversas leitura" ON public.whatsapp_conversas FOR SELECT TO authenticated
  USING (public.inovachat_pode_ver(company_id, status, responsavel_id, setor_id));
DROP POLICY IF EXISTS "inovachat mensagens leitura" ON public.whatsapp_mensagens;
CREATE POLICY "inovachat mensagens leitura" ON public.whatsapp_mensagens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.whatsapp_conversas c WHERE c.id = whatsapp_mensagens.conversa_id
    AND public.inovachat_pode_ver(c.company_id, c.status, c.responsavel_id, c.setor_id)));

CREATE OR REPLACE FUNCTION public.inovachat_meu_acesso()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'ver', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.visualizar'),
    'responder', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.visualizar') AND public.inovachat_tem_permissao('inovachat.responder'),
    'gerenciar', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.gerenciar'),
    'usuario_id', auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.inovachat_abrir(p_conversa uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa;
  IF c.id IS NULL OR NOT inovachat_pode_ver(c.company_id, c.status, c.responsavel_id, c.setor_id) THEN RAISE EXCEPTION 'Conversa não encontrada'; END IF;
  IF c.nao_lidas > 0 THEN UPDATE whatsapp_conversas SET nao_lidas = 0 WHERE id = c.id; END IF;
  IF NOT EXISTS (SELECT 1 FROM whatsapp_conversa_acessos WHERE conversa_id = c.id AND usuario_id = auth.uid() AND acessado_em > now() - interval '1 hour') THEN
    INSERT INTO whatsapp_conversa_acessos(company_id, conversa_id, usuario_id) VALUES (c.company_id, c.id, auth.uid());
  END IF;
END $$;

-- nome de exibição
CREATE OR REPLACE FUNCTION public.inovachat_nome_usuario(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(trim(full_name),''), 'Usuário') FROM public.profiles WHERE id = _user
$$;

-- evento interno (nunca vai ao WhatsApp, não conta como não lida nem resumo)
CREATE OR REPLACE FUNCTION public.inovachat_evento(_conv uuid, _texto text, _tipo text DEFAULT 'evento', _user uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid;
BEGIN
  SELECT company_id INTO v_comp FROM whatsapp_conversas WHERE id = _conv;
  INSERT INTO whatsapp_mensagens(company_id, conversa_id, direcao, origem, tipo, texto, message_id_uazapi, evento_tipo, enviada_por_usuario_id, enviada_por_nome)
  VALUES (v_comp, _conv, 'interna', 'evento', 'texto', left(_texto, 1000), 'evt-' || gen_random_uuid(), _tipo, _user,
          CASE WHEN _user IS NOT NULL THEN inovachat_nome_usuario(_user) END);
  INSERT INTO inovachat_sinais(conversa_id, company_id, em) VALUES (_conv, v_comp, now())
    ON CONFLICT (conversa_id) DO UPDATE SET em = now();
END $$;
REVOKE ALL ON FUNCTION public.inovachat_evento(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- aviso no sino para membros do setor quando conversa entra na fila
CREATE OR REPLACE FUNCTION public.inovachat_avisar_setor(_conv uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record; v_setor text;
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = _conv;
  IF c.setor_id IS NULL THEN RETURN; END IF;
  SELECT name INTO v_setor FROM company_sectors WHERE id = c.setor_id;
  INSERT INTO user_notifications(company_id, user_id, category, priority, title, message, action_route)
  SELECT c.company_id, su.user_id, 'reception', 'medium', 'Nova conversa na fila',
         'Chegou uma conversa na fila do setor ' || coalesce(v_setor, '') || '.', '/app/inovachat?c=' || c.id
  FROM sector_users su
  WHERE su.sector_id = c.setor_id AND su.company_id = c.company_id
    AND inovachat_usuario_tem(su.user_id, 'inovachat.visualizar')
  GROUP BY su.user_id;
END $$;
REVOKE ALL ON FUNCTION public.inovachat_avisar_setor(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.inovachat_registrar(p_instancia uuid, p_message_id text, p_telefone text, p_nome text, p_direcao text, p_origem text, p_tipo text, p_texto text, p_citada text, p_enviada_por_nome text, p_status text, p_criado_em timestamp with time zone)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_comp uuid; v_tel text; v_ct record; v_n int; v_pac uuid; v_conv record; v_mid uuid; v_setor text;
  v_quando timestamptz := coalesce(p_criado_em, now()); v_resumo text; v_avisar boolean := false; v_reaberta boolean := false;
BEGIN
  SELECT company_id, setor_entrada_id INTO v_comp, v_setor FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_comp IS NULL THEN RETURN 'sem_instancia'; END IF;
  IF NOT inovachat_ativo(v_comp) THEN RETURN 'desligado'; END IF;
  IF coalesce(p_message_id,'') = '' THEN RETURN 'sem_id'; END IF;
  IF EXISTS (SELECT 1 FROM whatsapp_mensagens WHERE company_id = v_comp AND message_id_uazapi = p_message_id) THEN RETURN 'duplicada'; END IF;
  v_tel := regexp_replace(coalesce(p_telefone,''), '\D', '', 'g');
  IF length(v_tel) IN (10, 11) THEN v_tel := '55' || v_tel; END IF;
  IF length(v_tel) < 12 OR length(v_tel) > 13 THEN RETURN 'telefone_invalido'; END IF;
  SELECT * INTO v_ct FROM whatsapp_contatos WHERE company_id = v_comp
    AND whatsapp_tel_canonico(telefone) = whatsapp_tel_canonico(v_tel) ORDER BY criado_em LIMIT 1;
  IF v_ct.id IS NULL THEN
    SELECT count(DISTINCT id), min(id::text)::uuid INTO v_n, v_pac FROM patients
     WHERE company_id = v_comp AND whatsapp_tel_canonico(v_tel) IN (
       whatsapp_tel_canonico(CASE WHEN length(regexp_replace(coalesce(phone,''),'\D','','g')) IN (10,11) THEN '55' ELSE '' END || phone),
       whatsapp_tel_canonico(CASE WHEN length(regexp_replace(coalesce(phone2,''),'\D','','g')) IN (10,11) THEN '55' ELSE '' END || phone2),
       whatsapp_tel_canonico(CASE WHEN length(regexp_replace(coalesce(phone3,''),'\D','','g')) IN (10,11) THEN '55' ELSE '' END || phone3));
    INSERT INTO whatsapp_contatos(company_id, telefone, nome_exibicao, paciente_id, vinculo_status)
    VALUES (v_comp, v_tel, nullif(left(p_nome,120),''), CASE WHEN v_n = 1 THEN v_pac END,
      CASE WHEN v_n = 1 THEN 'vinculado' WHEN v_n > 1 THEN 'varios' ELSE 'novo' END)
    ON CONFLICT (company_id, telefone) DO UPDATE SET atualizado_em = now()
    RETURNING * INTO v_ct;
  ELSIF p_direcao = 'entrada' AND coalesce(p_nome,'') <> '' AND p_nome IS DISTINCT FROM v_ct.nome_exibicao THEN
    UPDATE whatsapp_contatos SET nome_exibicao = left(p_nome,120), atualizado_em = now() WHERE id = v_ct.id;
  END IF;
  SELECT * INTO v_conv FROM whatsapp_conversas WHERE contato_id = v_ct.id AND instancia_id = p_instancia AND status <> 'finalizada' FOR UPDATE;
  IF v_conv.id IS NULL THEN
    SELECT * INTO v_conv FROM whatsapp_conversas WHERE contato_id = v_ct.id AND instancia_id = p_instancia
      ORDER BY criada_em DESC LIMIT 1 FOR UPDATE;
    IF v_conv.id IS NOT NULL AND p_origem <> 'sistema' THEN
      -- reabre a mesma conversa na fila, mantendo o último setor e sem responsável
      UPDATE whatsapp_conversas SET status = 'na_fila', finalizada_em = NULL, responsavel_id = NULL WHERE id = v_conv.id;
      v_reaberta := true; v_avisar := true;
    ELSIF v_conv.id IS NULL THEN
      INSERT INTO whatsapp_conversas(company_id, instancia_id, contato_id, status, finalizada_em, setor_id)
      VALUES (v_comp, p_instancia, v_ct.id, CASE WHEN p_origem = 'sistema' THEN 'finalizada' ELSE 'na_fila' END,
              CASE WHEN p_origem = 'sistema' THEN now() END, v_setor)
      RETURNING * INTO v_conv;
      v_avisar := p_origem <> 'sistema';
    END IF;
  END IF;
  IF v_reaberta THEN
    PERFORM inovachat_evento(v_conv.id, CASE WHEN p_origem = 'paciente' THEN 'Conversa reaberta pelo paciente' ELSE 'Conversa reaberta' END);
  END IF;
  INSERT INTO whatsapp_mensagens(company_id, conversa_id, direcao, origem, tipo, texto, message_id_uazapi, citada_message_id,
    enviada_por_nome, status, criado_em)
  VALUES (v_comp, v_conv.id, p_direcao, p_origem, coalesce(p_tipo,'texto'), p_texto, p_message_id, nullif(p_citada,''),
    CASE WHEN p_direcao = 'saida' THEN p_enviada_por_nome END, CASE WHEN p_direcao = 'saida' THEN coalesce(p_status,'enviada') END, v_quando)
  ON CONFLICT (company_id, message_id_uazapi) DO NOTHING RETURNING id INTO v_mid;
  IF v_mid IS NULL THEN RETURN 'duplicada'; END IF;
  v_resumo := left(coalesce(nullif(regexp_replace(p_texto, '\s+', ' ', 'g'),''), CASE p_tipo WHEN 'audio' THEN 'Áudio' WHEN 'imagem' THEN 'Imagem'
    WHEN 'documento' THEN 'Documento' WHEN 'video' THEN 'Vídeo' WHEN 'figurinha' THEN 'Figurinha' ELSE 'Mensagem' END), 60);
  UPDATE whatsapp_conversas SET
    nao_lidas = nao_lidas + CASE WHEN p_direcao = 'entrada' THEN 1 ELSE 0 END,
    ultima_mensagem_resumo = CASE WHEN ultima_mensagem_em IS NULL OR v_quando >= ultima_mensagem_em THEN v_resumo ELSE ultima_mensagem_resumo END,
    ultima_mensagem_em = greatest(coalesce(ultima_mensagem_em, v_quando), v_quando)
  WHERE id = v_conv.id;
  INSERT INTO inovachat_sinais(conversa_id, company_id, em) VALUES (v_conv.id, v_comp, now())
    ON CONFLICT (conversa_id) DO UPDATE SET em = now();
  IF v_avisar THEN PERFORM inovachat_avisar_setor(v_conv.id); END IF;
  RETURN 'gravada';
END $function$;

-- ===== ações do atendente (chamadas pelo navegador; validação no banco) =====
CREATE OR REPLACE FUNCTION public.inovachat__conv(p_conversa uuid)
RETURNS whatsapp_conversas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c whatsapp_conversas;
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa FOR UPDATE;
  IF c.id IS NULL OR NOT inovachat_pode_ver(c.company_id, c.status, c.responsavel_id, c.setor_id) THEN
    RAISE EXCEPTION 'Conversa não encontrada.'; END IF;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.inovachat__conv(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.inovachat_assumir(p_conversa uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c whatsapp_conversas; v_ger boolean := inovachat_tem_permissao('inovachat.gerenciar');
BEGIN
  c := inovachat__conv(p_conversa);
  IF NOT inovachat_tem_permissao('inovachat.responder') AND NOT v_ger THEN RAISE EXCEPTION 'Seu perfil não pode atender conversas.'; END IF;
  IF c.responsavel_id = auth.uid() AND c.status = 'em_atendimento' THEN RETURN; END IF;
  IF c.responsavel_id IS NOT NULL AND c.status = 'em_atendimento' AND NOT v_ger THEN
    RAISE EXCEPTION 'Esta conversa já está em atendimento por %.', inovachat_nome_usuario(c.responsavel_id); END IF;
  IF c.status = 'finalizada' AND NOT v_ger THEN RAISE EXCEPTION 'Conversa finalizada.'; END IF;
  UPDATE whatsapp_conversas SET status = 'em_atendimento', responsavel_id = auth.uid(), finalizada_em = NULL WHERE id = c.id;
  PERFORM inovachat_evento(c.id, inovachat_nome_usuario(auth.uid()) || ' assumiu a conversa', 'evento', auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_transferir(p_conversa uuid, p_usuario uuid, p_setor text, p_nota text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c whatsapp_conversas; v_ger boolean := inovachat_tem_permissao('inovachat.gerenciar');
  v_eu text := inovachat_nome_usuario(auth.uid()); v_nome text; v_nota text := nullif(trim(coalesce(p_nota,'')),'');
BEGIN
  c := inovachat__conv(p_conversa);
  IF NOT (v_ger OR (c.responsavel_id = auth.uid() AND inovachat_tem_permissao('inovachat.responder'))) THEN
    RAISE EXCEPTION 'Só o responsável ou a supervisão pode transferir esta conversa.'; END IF;
  IF (p_usuario IS NULL) = (p_setor IS NULL) THEN RAISE EXCEPTION 'Escolha um atendente ou um setor.'; END IF;
  IF length(coalesce(v_nota,'')) > 1000 THEN RAISE EXCEPTION 'Nota interna de até 1000 caracteres.'; END IF;
  IF p_usuario IS NOT NULL THEN
    IF get_user_company_id(p_usuario) IS DISTINCT FROM c.company_id OR NOT inovachat_usuario_tem(p_usuario, 'inovachat.responder')
       OR NOT inovachat_usuario_tem(p_usuario, 'inovachat.visualizar') THEN
      RAISE EXCEPTION 'Este usuário não pode atender conversas.'; END IF;
    v_nome := inovachat_nome_usuario(p_usuario);
    UPDATE whatsapp_conversas SET status = 'em_atendimento', responsavel_id = p_usuario, finalizada_em = NULL WHERE id = c.id;
    PERFORM inovachat_evento(c.id, v_eu || ' transferiu para ' || v_nome, 'evento', auth.uid());
    IF p_usuario <> auth.uid() THEN
      INSERT INTO user_notifications(company_id, user_id, category, priority, title, message, action_route)
      VALUES (c.company_id, p_usuario, 'reception', 'high', 'Conversa transferida', v_eu || ' transferiu uma conversa para você', '/app/inovachat?c=' || c.id);
    END IF;
  ELSE
    SELECT name INTO v_nome FROM company_sectors WHERE id = p_setor AND company_id = c.company_id;
    IF v_nome IS NULL THEN RAISE EXCEPTION 'Setor não encontrado.'; END IF;
    UPDATE whatsapp_conversas SET status = 'na_fila', responsavel_id = NULL, setor_id = p_setor, finalizada_em = NULL WHERE id = c.id;
    PERFORM inovachat_evento(c.id, v_eu || ' transferiu para o setor ' || v_nome, 'evento', auth.uid());
    PERFORM inovachat_avisar_setor(c.id);
  END IF;
  IF v_nota IS NOT NULL THEN PERFORM inovachat_evento(c.id, v_nota, 'nota', auth.uid()); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_finalizar(p_conversa uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c whatsapp_conversas;
BEGIN
  c := inovachat__conv(p_conversa);
  IF NOT (inovachat_tem_permissao('inovachat.gerenciar') OR (c.responsavel_id = auth.uid() AND inovachat_tem_permissao('inovachat.responder'))) THEN
    RAISE EXCEPTION 'Só o responsável ou a supervisão pode finalizar esta conversa.'; END IF;
  IF c.status = 'finalizada' THEN RETURN; END IF;
  UPDATE whatsapp_conversas SET status = 'finalizada', finalizada_em = now() WHERE id = c.id;
  PERFORM inovachat_evento(c.id, 'Conversa finalizada por ' || inovachat_nome_usuario(auth.uid()), 'evento', auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_reabrir(p_conversa uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c whatsapp_conversas;
BEGIN
  c := inovachat__conv(p_conversa);
  IF NOT inovachat_tem_permissao('inovachat.gerenciar') THEN RAISE EXCEPTION 'Só a supervisão pode reabrir conversas.'; END IF;
  IF c.status <> 'finalizada' THEN RETURN; END IF;
  UPDATE whatsapp_conversas SET status = 'na_fila', responsavel_id = NULL, finalizada_em = NULL WHERE id = c.id;
  PERFORM inovachat_evento(c.id, 'Conversa reaberta por ' || inovachat_nome_usuario(auth.uid()), 'evento', auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_atendentes()
RETURNS TABLE(id uuid, nome text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, coalesce(nullif(trim(p.full_name),''),'Usuário')
  FROM profiles p
  WHERE inovachat_tem_permissao('inovachat.visualizar')
    AND p.company_id = get_user_company_id(auth.uid()) AND coalesce(p.is_active, true)
    AND inovachat_usuario_tem(p.id, 'inovachat.responder') AND inovachat_usuario_tem(p.id, 'inovachat.visualizar')
  ORDER BY 2
$$;

CREATE OR REPLACE FUNCTION public.inovachat_nomes(p_ids uuid[])
RETURNS TABLE(id uuid, nome text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, coalesce(nullif(trim(p.full_name),''),'Usuário') FROM profiles p
  WHERE inovachat_tem_permissao('inovachat.visualizar') AND p.id = ANY(p_ids) AND p.company_id = get_user_company_id(auth.uid())
$$;

-- ===== envio (preparar: pelo usuário; gravar: só service role) =====
CREATE OR REPLACE FUNCTION public.inovachat_preparar_envio(p_conversa uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c whatsapp_conversas; v_ger boolean; v_n int; v_inst record; v_tel text; v_upd uuid;
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa;
  IF c.id IS NULL OR NOT inovachat_pode_ver(c.company_id, c.status, c.responsavel_id, c.setor_id) THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADA', 'mensagem', 'Conversa não encontrada.'); END IF;
  IF NOT inovachat_tem_permissao('inovachat.responder') THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'SEM_PERMISSAO', 'mensagem', 'Seu perfil não pode responder conversas.'); END IF;
  v_ger := inovachat_tem_permissao('inovachat.gerenciar');
  IF c.status = 'finalizada' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'FINALIZADA', 'mensagem', 'Conversa finalizada. Reabra para responder.'); END IF;
  SELECT * INTO v_inst FROM whatsapp_instancias WHERE id = c.instancia_id;
  IF v_inst.status IS DISTINCT FROM 'connected' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'DESCONECTADO', 'mensagem', 'Número desconectado: reconecte em Configurações > WhatsApp.'); END IF;
  SELECT count(*) INTO v_n FROM whatsapp_mensagens WHERE enviada_por_usuario_id = auth.uid() AND origem = 'usuario' AND criado_em > now() - interval '1 minute';
  IF v_n >= 15 THEN RETURN jsonb_build_object('ok', false, 'codigo', 'LIMITE', 'mensagem', 'Você enviou muitas mensagens em pouco tempo. Aguarde um minuto.'); END IF;
  SELECT count(*) INTO v_n FROM whatsapp_mensagens m JOIN whatsapp_conversas cc ON cc.id = m.conversa_id
   WHERE cc.instancia_id = c.instancia_id AND m.origem = 'usuario' AND m.enviada_por_usuario_id IS NOT NULL AND m.criado_em > now() - interval '1 minute';
  IF v_n >= 30 THEN RETURN jsonb_build_object('ok', false, 'codigo', 'LIMITE', 'mensagem', 'Este número atingiu o limite de mensagens por minuto. Aguarde um pouco.'); END IF;
  IF c.status = 'na_fila' AND c.responsavel_id IS NULL THEN
    UPDATE whatsapp_conversas SET status = 'em_atendimento', responsavel_id = auth.uid()
     WHERE id = c.id AND responsavel_id IS NULL AND status = 'na_fila' RETURNING id INTO v_upd;
    IF v_upd IS NULL THEN
      SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa;
      RETURN jsonb_build_object('ok', false, 'codigo', 'ASSUMIDA', 'mensagem', 'Esta conversa acabou de ser assumida por ' || coalesce(inovachat_nome_usuario(c.responsavel_id),'outro atendente') || '.');
    END IF;
    PERFORM inovachat_evento(c.id, inovachat_nome_usuario(auth.uid()) || ' assumiu a conversa', 'evento', auth.uid());
  ELSIF c.responsavel_id IS DISTINCT FROM auth.uid() AND NOT v_ger THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'OUTRO_RESPONSAVEL', 'mensagem', 'Conversa em atendimento por ' || inovachat_nome_usuario(c.responsavel_id) || '. Peça a transferência.');
  END IF;
  SELECT telefone INTO v_tel FROM whatsapp_contatos WHERE id = c.contato_id;
  RETURN jsonb_build_object('ok', true, 'conversa_id', c.id, 'company_id', c.company_id, 'instancia_id', c.instancia_id,
    'telefone', v_tel, 'nome', inovachat_nome_usuario(auth.uid()), 'usuario_id', auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.inovachat_preparar_envio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inovachat_preparar_envio(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.inovachat_gravar_envio(p_conversa uuid, p_usuario uuid, p_nome text, p_texto text, p_status text, p_message_id text, p_erro text, p_substituir uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record; v_id uuid; v_mid text := coalesce(nullif(p_message_id,''), 'local-' || gen_random_uuid());
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa;
  IF c.id IS NULL THEN RAISE EXCEPTION 'conversa'; END IF;
  IF p_substituir IS NOT NULL THEN
    UPDATE whatsapp_mensagens SET status = p_status, message_id_uazapi = v_mid, erro = p_erro, criado_em = now(), texto = p_texto
     WHERE id = p_substituir AND conversa_id = c.id AND enviada_por_usuario_id = p_usuario AND status = 'falha' RETURNING id INTO v_id;
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO whatsapp_mensagens(company_id, conversa_id, direcao, origem, tipo, texto, message_id_uazapi, enviada_por_usuario_id, enviada_por_nome, status, erro)
    VALUES (c.company_id, c.id, 'saida', 'usuario', 'texto', p_texto, v_mid, p_usuario, p_nome, p_status, p_erro)
    ON CONFLICT (company_id, message_id_uazapi) DO UPDATE SET origem = 'usuario', texto = EXCLUDED.texto,
      enviada_por_usuario_id = EXCLUDED.enviada_por_usuario_id, enviada_por_nome = EXCLUDED.enviada_por_nome
    RETURNING id INTO v_id;
  END IF;
  IF p_status <> 'falha' THEN
    UPDATE whatsapp_conversas SET ultima_mensagem_em = now(), ultima_mensagem_resumo = left(regexp_replace(p_texto, '\s+', ' ', 'g'), 60) WHERE id = c.id;
  END IF;
  INSERT INTO inovachat_sinais(conversa_id, company_id, em) VALUES (c.id, c.company_id, now())
    ON CONFLICT (conversa_id) DO UPDATE SET em = now();
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.inovachat_gravar_envio(uuid, uuid, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inovachat_gravar_envio(uuid, uuid, text, text, text, text, text, uuid) TO service_role;

-- ===== respostas rápidas =====
CREATE TABLE public.whatsapp_respostas_rapidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (length(trim(titulo)) BETWEEN 1 AND 80),
  atalho text NOT NULL CHECK (atalho ~ '^/[^\s/]{1,30}$'),
  texto text NOT NULL CHECK (length(trim(texto)) BETWEEN 1 AND 1000),
  setor_id text REFERENCES public.company_sectors(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, atalho)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_respostas_rapidas TO authenticated;
GRANT ALL ON public.whatsapp_respostas_rapidas TO service_role;
ALTER TABLE public.whatsapp_respostas_rapidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "respostas rapidas leitura" ON public.whatsapp_respostas_rapidas FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND inovachat_tem_permissao('inovachat.visualizar'));
CREATE POLICY "respostas rapidas criar" ON public.whatsapp_respostas_rapidas FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND inovachat_tem_permissao('inovachat.gerenciar'));
CREATE POLICY "respostas rapidas editar" ON public.whatsapp_respostas_rapidas FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND inovachat_tem_permissao('inovachat.gerenciar'))
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND inovachat_tem_permissao('inovachat.gerenciar'));
CREATE POLICY "respostas rapidas excluir" ON public.whatsapp_respostas_rapidas FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND inovachat_tem_permissao('inovachat.gerenciar'));

CREATE OR REPLACE FUNCTION public.inovachat_respostas_padrao(_company uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO whatsapp_respostas_rapidas(company_id, titulo, atalho, texto) VALUES
    (_company, 'Saudação', '/ola', 'Olá, {nome_contato}! Em que posso ajudar?'),
    (_company, 'Aguarde', '/aguarde', 'Só um momento, por favor, estou verificando para você.'),
    (_company, 'Mais alguma coisa', '/mais', 'Posso ajudar em mais alguma coisa? Estamos à disposição. 💚'),
    (_company, 'Agradecimento', '/obrigado', 'Nós que agradecemos, {nome_contato}! Até breve. 🙏')
  ON CONFLICT (company_id, atalho) DO NOTHING
$$;
REVOKE ALL ON FUNCTION public.inovachat_respostas_padrao(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.inovachat_ligado_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.inovachat_habilitado AND NOT coalesce(OLD.inovachat_habilitado, false) THEN
    PERFORM inovachat_respostas_padrao(NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER inovachat_ligado AFTER UPDATE OF inovachat_habilitado ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.inovachat_ligado_trg();

SELECT public.inovachat_respostas_padrao(id) FROM public.companies WHERE inovachat_habilitado;
