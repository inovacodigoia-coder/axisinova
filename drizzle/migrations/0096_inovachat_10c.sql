
-- ===== 1) Mídia =====
ALTER TABLE public.whatsapp_mensagens
  ADD COLUMN IF NOT EXISTS midia_path text, ADD COLUMN IF NOT EXISTS midia_mime text,
  ADD COLUMN IF NOT EXISTS midia_tamanho bigint, ADD COLUMN IF NOT EXISTS midia_nome text,
  ADD COLUMN IF NOT EXISTS duracao_seg int, ADD COLUMN IF NOT EXISTS midia_status text,
  ADD COLUMN IF NOT EXISTS midia_tentativas smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS midia_erro text, ADD COLUMN IF NOT EXISTS midia_reservada_em timestamptz;
ALTER TABLE public.whatsapp_mensagens DROP CONSTRAINT IF EXISTS whatsapp_mensagens_midia_status_chk;
ALTER TABLE public.whatsapp_mensagens ADD CONSTRAINT whatsapp_mensagens_midia_status_chk
  CHECK (midia_status IS NULL OR midia_status IN ('pendente','baixada','falha','grande_demais','nao_suportado'));
CREATE INDEX IF NOT EXISTS whatsapp_mensagens_midia_pend_idx ON public.whatsapp_mensagens (criado_em) WHERE midia_status = 'pendente';
CREATE INDEX IF NOT EXISTS whatsapp_mensagens_company_criado_idx ON public.whatsapp_mensagens (company_id, criado_em);

ALTER TABLE public.whatsapp_conversas ADD COLUMN IF NOT EXISTS fora_horario boolean NOT NULL DEFAULT false;
ALTER TABLE public.whatsapp_contatos ADD COLUMN IF NOT EXISTS ultima_fora_horario_em timestamptz;

CREATE OR REPLACE FUNCTION public.inovachat_sinal(_conv uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO inovachat_sinais(conversa_id, company_id, em) SELECT id, company_id, now() FROM whatsapp_conversas WHERE id = _conv
  ON CONFLICT (conversa_id) DO UPDATE SET em = now();
$$;
REVOKE ALL ON FUNCTION public.inovachat_sinal(uuid) FROM PUBLIC, anon, authenticated;

-- webhook marca a mídia da mensagem recém-gravada
CREATE OR REPLACE FUNCTION public.inovachat_midia_marcar(p_instancia uuid, p_message_id text, p_mime text, p_tamanho bigint,
  p_nome text, p_duracao int, p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid; v_conv uuid;
BEGIN
  SELECT company_id INTO v_comp FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_comp IS NULL OR p_status NOT IN ('pendente','grande_demais','nao_suportado') THEN RETURN; END IF;
  UPDATE whatsapp_mensagens SET midia_mime = left(p_mime, 120), midia_tamanho = p_tamanho, midia_nome = left(p_nome, 200),
    duracao_seg = p_duracao, midia_status = p_status
  WHERE company_id = v_comp AND message_id_uazapi = p_message_id AND midia_status IS NULL RETURNING conversa_id INTO v_conv;
  IF v_conv IS NOT NULL THEN PERFORM inovachat_sinal(v_conv); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_midia_reservar(p_limite int DEFAULT 5)
RETURNS TABLE(id uuid, company_id uuid, conversa_id uuid, instancia_id uuid, message_id_uazapi text, tipo text, midia_mime text, midia_nome text, tentativas smallint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  RETURN QUERY
  WITH alvo AS (
    SELECT m.id FROM whatsapp_mensagens m
     WHERE m.midia_status = 'pendente' AND m.midia_tentativas < 3
       AND (m.midia_reservada_em IS NULL OR m.midia_reservada_em < now() - interval '5 minutes')
     ORDER BY m.criado_em LIMIT least(greatest(p_limite,1), 20) FOR UPDATE SKIP LOCKED)
  UPDATE whatsapp_mensagens m SET midia_tentativas = m.midia_tentativas + 1, midia_reservada_em = now()
    FROM alvo, whatsapp_conversas c WHERE m.id = alvo.id AND c.id = m.conversa_id
  RETURNING m.id, m.company_id, m.conversa_id, c.instancia_id, m.message_id_uazapi, m.tipo, m.midia_mime, m.midia_nome, m.midia_tentativas;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_midia_tick(p_url text, p_apikey text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_cod text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM whatsapp_mensagens WHERE midia_status = 'pendente' AND midia_tentativas < 3
     AND (midia_reservada_em IS NULL OR midia_reservada_em < now() - interval '5 minutes')) THEN RETURN 'sem_trabalho'; END IF;
  v_cod := encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO whatsapp_worker_codigos(hash, expira_em) VALUES (encode(extensions.digest(v_cod,'sha256'),'hex'), now() + interval '2 minutes');
  PERFORM net.http_post(url := p_url, headers := jsonb_build_object('Content-Type','application/json','apikey',p_apikey,'x-worker-secret',v_cod),
    body := '{}'::jsonb, timeout_milliseconds := 10000);
  RETURN 'disparado';
END $$;

-- navegador: caminho da mídia só se a conversa estiver no escopo do usuário
CREATE OR REPLACE FUNCTION public.inovachat_midia_acesso(p_mensagem uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r record;
BEGIN
  SELECT m.midia_path, m.midia_status, m.midia_mime, m.midia_nome, c.company_id, c.status, c.responsavel_id, c.setor_id INTO r
    FROM whatsapp_mensagens m JOIN whatsapp_conversas c ON c.id = m.conversa_id WHERE m.id = p_mensagem;
  IF r.company_id IS NULL OR NOT inovachat_pode_ver(r.company_id, r.status, r.responsavel_id, r.setor_id) THEN RETURN NULL; END IF;
  IF r.midia_status IS DISTINCT FROM 'baixada' OR r.midia_path IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('path', r.midia_path, 'mime', r.midia_mime, 'nome', r.midia_nome);
END $$;

-- navegador: pode subir arquivo para esta conversa?
CREATE OR REPLACE FUNCTION public.inovachat_pode_enviar(p_conversa uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c whatsapp_conversas;
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa;
  IF c.id IS NULL OR c.status = 'finalizada' OR NOT inovachat_pode_ver(c.company_id, c.status, c.responsavel_id, c.setor_id)
     OR NOT inovachat_tem_permissao('inovachat.responder') THEN RETURN NULL; END IF;
  RETURN c.company_id;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_gravar_envio_midia(p_conversa uuid, p_usuario uuid, p_nome text, p_tipo text, p_texto text,
  p_status text, p_message_id text, p_erro text, p_substituir uuid, p_path text, p_mime text, p_tamanho bigint, p_arquivo text, p_duracao int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record; v_id uuid; v_mid text := coalesce(nullif(p_message_id,''), 'local-' || gen_random_uuid());
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa;
  IF c.id IS NULL THEN RAISE EXCEPTION 'conversa'; END IF;
  IF p_substituir IS NOT NULL THEN
    UPDATE whatsapp_mensagens SET status = p_status, message_id_uazapi = v_mid, erro = p_erro, criado_em = now()
     WHERE id = p_substituir AND conversa_id = c.id AND enviada_por_usuario_id = p_usuario AND status = 'falha' RETURNING id INTO v_id;
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO whatsapp_mensagens(company_id, conversa_id, direcao, origem, tipo, texto, message_id_uazapi, enviada_por_usuario_id, enviada_por_nome,
      status, erro, midia_path, midia_mime, midia_tamanho, midia_nome, duracao_seg, midia_status)
    VALUES (c.company_id, c.id, 'saida', 'usuario', p_tipo, nullif(p_texto,''), v_mid, p_usuario, p_nome, p_status, p_erro,
      p_path, p_mime, p_tamanho, left(p_arquivo,200), p_duracao, 'baixada')
    ON CONFLICT (company_id, message_id_uazapi) DO UPDATE SET origem = 'usuario', enviada_por_usuario_id = EXCLUDED.enviada_por_usuario_id,
      enviada_por_nome = EXCLUDED.enviada_por_nome, midia_path = EXCLUDED.midia_path, midia_mime = EXCLUDED.midia_mime,
      midia_tamanho = EXCLUDED.midia_tamanho, midia_nome = EXCLUDED.midia_nome, duracao_seg = EXCLUDED.duracao_seg, midia_status = 'baixada'
    RETURNING id INTO v_id;
  END IF;
  IF p_status <> 'falha' THEN
    UPDATE whatsapp_conversas SET ultima_mensagem_em = now(), ultima_mensagem_resumo = left(coalesce(nullif(p_texto,''),
      CASE p_tipo WHEN 'audio' THEN 'Áudio' WHEN 'imagem' THEN 'Imagem' WHEN 'video' THEN 'Vídeo' ELSE 'Documento' END), 60) WHERE id = c.id;
  END IF;
  PERFORM inovachat_sinal(c.id);
  RETURN v_id;
END $$;

-- ===== 3) Horário de atendimento =====
CREATE TABLE IF NOT EXISTS public.inovachat_horario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  setor_id text,
  ativo boolean NOT NULL DEFAULT true,
  dias jsonb NOT NULL DEFAULT '[{"d":1,"a":true,"i":"08:00","f":"18:00"},{"d":2,"a":true,"i":"08:00","f":"18:00"},{"d":3,"a":true,"i":"08:00","f":"18:00"},{"d":4,"a":true,"i":"08:00","f":"18:00"},{"d":5,"a":true,"i":"08:00","f":"18:00"},{"d":6,"a":false,"i":"08:00","f":"12:00"},{"d":0,"a":false,"i":"08:00","f":"12:00"}]'::jsonb,
  feriados jsonb NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS inovachat_horario_uk ON public.inovachat_horario (company_id, coalesce(setor_id, ''));
GRANT SELECT ON public.inovachat_horario TO authenticated;
GRANT ALL ON public.inovachat_horario TO service_role;
ALTER TABLE public.inovachat_horario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inovachat_horario_ler" ON public.inovachat_horario FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.inovachat_tem_permissao('inovachat.visualizar'));

CREATE TABLE IF NOT EXISTS public.inovachat_fora_horario_cfg (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  texto text NOT NULL DEFAULT 'Olá, {nome_contato}! Recebemos sua mensagem fora do nosso horário de atendimento. Retornaremos assim que possível. Nosso horário: {horario_atendimento}.',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);
GRANT SELECT ON public.inovachat_fora_horario_cfg TO authenticated;
GRANT ALL ON public.inovachat_fora_horario_cfg TO service_role;
ALTER TABLE public.inovachat_fora_horario_cfg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inovachat_fora_cfg_ler" ON public.inovachat_fora_horario_cfg FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.inovachat_tem_permissao('inovachat.visualizar'));

CREATE OR REPLACE FUNCTION public.inovachat_fora_horario_padrao() RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'Olá, {nome_contato}! Recebemos sua mensagem fora do nosso horário de atendimento. Retornaremos assim que possível. Nosso horário: {horario_atendimento}.'::text
$$;

CREATE OR REPLACE FUNCTION public.inovachat_horario_texto(_dias jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE ordem int[] := ARRAY[1,2,3,4,5,6,0]; nomes text[] := ARRAY['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  partes text[] := '{}'; d int; e jsonb; ini int := NULL; fim int; chave text; atual text := NULL; k int;
BEGIN
  FOR k IN 1..8 LOOP
    IF k <= 7 THEN
      d := ordem[k];
      SELECT x INTO e FROM jsonb_array_elements(coalesce(_dias,'[]')) x WHERE (x->>'d')::int = d LIMIT 1;
      chave := CASE WHEN coalesce((e->>'a')::boolean, false) THEN (e->>'i') || '|' || (e->>'f') END;
    ELSE chave := NULL; END IF;
    IF atual IS NOT NULL AND (chave IS DISTINCT FROM atual) THEN
      partes := partes || (CASE WHEN ini = fim THEN nomes[ordem[ini]+1] ELSE nomes[ordem[ini]+1] || ' a ' || nomes[ordem[fim]+1] END
        || ', das ' || split_part(atual,'|',1) || ' às ' || split_part(atual,'|',2));
      atual := NULL;
    END IF;
    IF chave IS NOT NULL AND atual IS NULL THEN atual := chave; ini := k; END IF;
    IF chave IS NOT NULL THEN fim := k; END IF;
  END LOOP;
  IF array_length(partes,1) IS NULL THEN RETURN 'sem horário de atendimento definido'; END IF;
  RETURN upper(left(array_to_string(partes, '; '),1)) || substr(array_to_string(partes, '; '),2);
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_horario_vigente(_company uuid, _setor text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT jsonb_build_object('dias', dias, 'feriados', feriados) FROM inovachat_horario WHERE company_id = _company AND _setor IS NOT NULL AND setor_id = _setor AND ativo),
    (SELECT jsonb_build_object('dias', dias, 'feriados', feriados) FROM inovachat_horario WHERE company_id = _company AND setor_id IS NULL),
    jsonb_build_object('dias', '[{"d":1,"a":true,"i":"08:00","f":"18:00"},{"d":2,"a":true,"i":"08:00","f":"18:00"},{"d":3,"a":true,"i":"08:00","f":"18:00"},{"d":4,"a":true,"i":"08:00","f":"18:00"},{"d":5,"a":true,"i":"08:00","f":"18:00"},{"d":6,"a":false,"i":"08:00","f":"12:00"},{"d":0,"a":false,"i":"08:00","f":"12:00"}]'::jsonb, 'feriados', '[]'::jsonb))
$$;

CREATE OR REPLACE FUNCTION public.inovachat_horario_aberto(_company uuid, _setor text, _ts timestamptz) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h jsonb := inovachat_horario_vigente(_company, _setor); v_local timestamp := _ts AT TIME ZONE 'America/Fortaleza'; e jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(h->'feriados') f WHERE f->>'data' = to_char(v_local::date, 'YYYY-MM-DD')) THEN RETURN false; END IF;
  SELECT x INTO e FROM jsonb_array_elements(h->'dias') x WHERE (x->>'d')::int = extract(dow FROM v_local)::int LIMIT 1;
  IF e IS NULL OR NOT coalesce((e->>'a')::boolean, false) THEN RETURN false; END IF;
  RETURN v_local::time >= (e->>'i')::time AND v_local::time < (e->>'f')::time;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_horario_salvar(p_setor text, p_ativo boolean, p_dias jsonb, p_feriados jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := get_user_company_id(auth.uid()); e jsonb; antes jsonb;
BEGIN
  IF v_comp IS NULL OR NOT inovachat_ativo(v_comp) OR NOT inovachat_tem_permissao('inovachat.gerenciar') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_setor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM company_sectors WHERE id::text = p_setor AND company_id = v_comp) THEN RAISE EXCEPTION 'Setor inválido'; END IF;
  IF jsonb_typeof(p_dias) <> 'array' OR jsonb_array_length(p_dias) <> 7 THEN RAISE EXCEPTION 'Informe os 7 dias'; END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(p_dias) LOOP
    IF (e->>'d')::int NOT BETWEEN 0 AND 6 OR (e->>'i') !~ '^\d{2}:\d{2}$' OR (e->>'f') !~ '^\d{2}:\d{2}$' THEN RAISE EXCEPTION 'Horário inválido'; END IF;
    IF coalesce((e->>'a')::boolean,false) AND (e->>'i')::time >= (e->>'f')::time THEN RAISE EXCEPTION 'O fechamento deve ser depois da abertura'; END IF;
  END LOOP;
  IF jsonb_typeof(coalesce(p_feriados,'[]')) <> 'array' OR jsonb_array_length(coalesce(p_feriados,'[]')) > 100 THEN RAISE EXCEPTION 'Feriados inválidos'; END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(coalesce(p_feriados,'[]')) LOOP
    IF (e->>'data') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Data de feriado inválida'; END IF;
  END LOOP;
  SELECT to_jsonb(h) INTO antes FROM inovachat_horario h WHERE company_id = v_comp AND coalesce(setor_id,'') = coalesce(p_setor,'');
  INSERT INTO inovachat_horario(company_id, setor_id, ativo, dias, feriados, atualizado_em, atualizado_por)
  VALUES (v_comp, p_setor, coalesce(p_ativo, true), p_dias, coalesce(p_feriados,'[]'), now(), auth.uid())
  ON CONFLICT (company_id, coalesce(setor_id, '')) DO UPDATE SET ativo = EXCLUDED.ativo, dias = EXCLUDED.dias, feriados = EXCLUDED.feriados,
    atualizado_em = now(), atualizado_por = auth.uid();
  INSERT INTO whatsapp_auditoria(company_id, acao, antes, depois, usuario_id)
  VALUES (v_comp, 'inovachat_horario', antes, jsonb_build_object('setor_id', p_setor, 'ativo', p_ativo, 'dias', p_dias, 'feriados', p_feriados), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_fora_horario_salvar(p_ativo boolean, p_texto text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := get_user_company_id(auth.uid());
BEGIN
  IF v_comp IS NULL OR NOT inovachat_ativo(v_comp) OR NOT inovachat_tem_permissao('inovachat.gerenciar') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF length(trim(coalesce(p_texto,''))) < 1 OR length(p_texto) > 1000 THEN RAISE EXCEPTION 'A mensagem deve ter de 1 a 1000 caracteres'; END IF;
  INSERT INTO inovachat_fora_horario_cfg(company_id, ativo, texto, atualizado_em, atualizado_por) VALUES (v_comp, p_ativo, trim(p_texto), now(), auth.uid())
  ON CONFLICT (company_id) DO UPDATE SET ativo = EXCLUDED.ativo, texto = EXCLUDED.texto, atualizado_em = now(), atualizado_por = auth.uid();
  INSERT INTO whatsapp_auditoria(company_id, acao, depois, usuario_id) VALUES (v_comp, 'inovachat_fora_horario', jsonb_build_object('ativo', p_ativo), auth.uid());
END $$;

-- webhook (service role): decide se envia a automática; reserva o envio (1 a cada 12h por contato)
CREATE OR REPLACE FUNCTION public.inovachat_fora_horario_avaliar(p_instancia uuid, p_telefone text, p_eh_confirmacao boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid; v_tel text; ct record; cv record; cfg record; emp text; nome text; corpo text; v_ok uuid;
BEGIN
  SELECT company_id INTO v_comp FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_comp IS NULL OR NOT inovachat_ativo(v_comp) THEN RETURN jsonb_build_object('enviar', false); END IF;
  v_tel := regexp_replace(coalesce(p_telefone,''), '\D', '', 'g');
  IF length(v_tel) IN (10, 11) THEN v_tel := '55' || v_tel; END IF;
  SELECT * INTO ct FROM whatsapp_contatos WHERE company_id = v_comp AND whatsapp_tel_canonico(telefone) = whatsapp_tel_canonico(v_tel) ORDER BY criado_em LIMIT 1;
  IF ct.id IS NULL THEN RETURN jsonb_build_object('enviar', false); END IF;
  SELECT * INTO cv FROM whatsapp_conversas WHERE contato_id = ct.id AND instancia_id = p_instancia AND status <> 'finalizada' ORDER BY criada_em DESC LIMIT 1;
  IF cv.id IS NULL THEN RETURN jsonb_build_object('enviar', false); END IF;
  IF inovachat_horario_aberto(v_comp, cv.setor_id, now()) THEN RETURN jsonb_build_object('enviar', false, 'motivo', 'no_horario'); END IF;
  IF cv.responsavel_id IS NULL AND NOT cv.fora_horario THEN
    UPDATE whatsapp_conversas SET fora_horario = true WHERE id = cv.id; PERFORM inovachat_sinal(cv.id);
  END IF;
  IF p_eh_confirmacao THEN RETURN jsonb_build_object('enviar', false, 'motivo', 'confirmacao'); END IF;
  SELECT * INTO cfg FROM inovachat_fora_horario_cfg WHERE company_id = v_comp;
  IF cfg.company_id IS NOT NULL AND NOT cfg.ativo THEN RETURN jsonb_build_object('enviar', false, 'motivo', 'desligada'); END IF;
  IF EXISTS (SELECT 1 FROM whatsapp_mensagens WHERE conversa_id = cv.id AND origem = 'usuario' AND direcao = 'saida' AND criado_em > now() - interval '30 minutes') THEN
    RETURN jsonb_build_object('enviar', false, 'motivo', 'atendente_recente'); END IF;
  UPDATE whatsapp_contatos SET ultima_fora_horario_em = now()
   WHERE id = ct.id AND (ultima_fora_horario_em IS NULL OR ultima_fora_horario_em < now() - interval '12 hours') RETURNING id INTO v_ok;
  IF v_ok IS NULL THEN RETURN jsonb_build_object('enviar', false, 'motivo', 'ja_enviada_12h'); END IF;
  SELECT coalesce(nullif(trim(nome_fantasia),''), name) INTO emp FROM companies WHERE id = v_comp;
  nome := nullif(split_part(trim(coalesce(ct.nome_exibicao, (SELECT name FROM patients WHERE id = ct.paciente_id), '')), ' ', 1), '');
  corpo := replace(replace(replace(coalesce(cfg.texto, inovachat_fora_horario_padrao()),
     '{nome_contato}', coalesce(nome, '')), '{empresa}', coalesce(emp, '')),
     '{horario_atendimento}', inovachat_horario_texto(inovachat_horario_vigente(v_comp, cv.setor_id)->'dias'));
  corpo := regexp_replace(corpo, ',\s*([!.?])', '\1', 'g');
  RETURN jsonb_build_object('enviar', true, 'telefone', ct.telefone, 'conversa_id', cv.id, 'texto', whatsapp_cabecalho(emp, corpo));
END $$;

-- ===== 4) Retenção =====
ALTER TABLE public.whatsapp_config_global ADD COLUMN IF NOT EXISTS retencao_modo text NOT NULL DEFAULT 'simulacao';
ALTER TABLE public.whatsapp_config_global DROP CONSTRAINT IF EXISTS whatsapp_config_global_retencao_chk;
ALTER TABLE public.whatsapp_config_global ADD CONSTRAINT whatsapp_config_global_retencao_chk CHECK (retencao_modo IN ('desligada','simulacao','real'));

CREATE TABLE IF NOT EXISTS public.whatsapp_retencao_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executada_em timestamptz NOT NULL DEFAULT now(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  modo text NOT NULL CHECK (modo IN ('simulacao','real')),
  mensagens int NOT NULL DEFAULT 0, midias int NOT NULL DEFAULT 0, conversas int NOT NULL DEFAULT 0,
  contatos int NOT NULL DEFAULT 0, fila int NOT NULL DEFAULT 0, acessos int NOT NULL DEFAULT 0,
  erro text, manual boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.whatsapp_retencao_execucoes TO authenticated;
GRANT ALL ON public.whatsapp_retencao_execucoes TO service_role;
ALTER TABLE public.whatsapp_retencao_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retencao_exec_superadmin" ON public.whatsapp_retencao_execucoes FOR SELECT TO authenticated USING (private.is_super_admin());

CREATE OR REPLACE FUNCTION public.whatsapp_retencao_modo() RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  RETURN coalesce((SELECT retencao_modo FROM whatsapp_config_global LIMIT 1), 'simulacao');
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_retencao_definir_modo(p_modo text, p_confirmacao text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE antes text;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  IF p_modo NOT IN ('desligada','simulacao','real') THEN RAISE EXCEPTION 'Modo inválido'; END IF;
  IF p_modo = 'real' AND coalesce(p_confirmacao,'') <> 'APAGAR' THEN RAISE EXCEPTION 'Digite APAGAR para confirmar'; END IF;
  SELECT retencao_modo INTO antes FROM whatsapp_config_global LIMIT 1;
  UPDATE whatsapp_config_global SET retencao_modo = p_modo, alterado_por = auth.uid(), alterado_em = now();
  INSERT INTO whatsapp_auditoria(company_id, acao, antes, depois, usuario_id)
  VALUES (NULL, 'retencao_modo', jsonb_build_object('modo', antes), jsonb_build_object('modo', p_modo), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_corte(_company uuid) RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT now() - make_interval(months => coalesce((SELECT inovachat_retencao_meses FROM companies WHERE id = _company), 6)::int)
$$;

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
    'acessos', (SELECT count(*) FROM whatsapp_conversa_acessos WHERE company_id = p_company AND acessado_em < corte_ac)) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_midias(p_company uuid, p_limite int DEFAULT 500)
RETURNS TABLE(id uuid, path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, midia_path FROM whatsapp_mensagens WHERE company_id = p_company AND midia_path IS NOT NULL
    AND criado_em < inovachat_retencao_corte(p_company) ORDER BY criado_em LIMIT least(greatest(p_limite,1),500)
$$;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_apagar_msgs(p_company uuid, p_ids uuid[]) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
  DELETE FROM whatsapp_mensagens WHERE company_id = p_company AND id = ANY(p_ids) AND criado_em < inovachat_retencao_corte(p_company);
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_limpar(p_company uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE corte timestamptz := inovachat_retencao_corte(p_company);
  corte_ac timestamptz := least(corte, now() - interval '12 months');
  n_msg int; n_conv int; n_ct int; n_fila int; n_ac int;
BEGIN
  DELETE FROM whatsapp_mensagens WHERE id IN (SELECT id FROM whatsapp_mensagens WHERE company_id = p_company AND criado_em < corte AND midia_path IS NULL LIMIT 500);
  GET DIAGNOSTICS n_msg = ROW_COUNT;
  DELETE FROM whatsapp_conversas WHERE id IN (SELECT c.id FROM whatsapp_conversas c WHERE c.company_id = p_company AND c.status = 'finalizada'
    AND NOT EXISTS (SELECT 1 FROM whatsapp_mensagens m WHERE m.conversa_id = c.id) LIMIT 500);
  GET DIAGNOSTICS n_conv = ROW_COUNT;
  DELETE FROM whatsapp_contatos WHERE id IN (SELECT ct.id FROM whatsapp_contatos ct WHERE ct.company_id = p_company AND ct.paciente_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM whatsapp_conversas c WHERE c.contato_id = ct.id) LIMIT 500);
  GET DIAGNOSTICS n_ct = ROW_COUNT;
  DELETE FROM whatsapp_fila_envios WHERE id IN (SELECT id FROM whatsapp_fila_envios WHERE company_id = p_company AND criado_em < corte
    AND status NOT IN ('enviando') LIMIT 500);
  GET DIAGNOSTICS n_fila = ROW_COUNT;
  DELETE FROM whatsapp_conversa_acessos WHERE id IN (SELECT id FROM whatsapp_conversa_acessos WHERE company_id = p_company AND acessado_em < corte_ac LIMIT 500);
  GET DIAGNOSTICS n_ac = ROW_COUNT;
  RETURN jsonb_build_object('mensagens', n_msg, 'conversas', n_conv, 'contatos', n_ct, 'fila', n_fila, 'acessos', n_ac);
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_tick(p_url text, p_apikey text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_cod text;
BEGIN
  IF coalesce((SELECT retencao_modo FROM whatsapp_config_global LIMIT 1), 'simulacao') = 'desligada' THEN RETURN 'desligada'; END IF;
  v_cod := encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO whatsapp_worker_codigos(hash, expira_em) VALUES (encode(extensions.digest(v_cod,'sha256'),'hex'), now() + interval '2 minutes');
  PERFORM net.http_post(url := p_url, headers := jsonb_build_object('Content-Type','application/json','apikey',p_apikey,'x-worker-secret',v_cod),
    body := '{}'::jsonb, timeout_milliseconds := 10000);
  RETURN 'disparado';
END $$;

-- ===== 5) Exclusão a pedido do titular =====
CREATE OR REPLACE FUNCTION public.inovachat_excluir_contato_preparar(p_contato uuid, p_telefone text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ct record; v_tel text := regexp_replace(coalesce(p_telefone,''), '\D', '', 'g');
BEGIN
  SELECT * INTO ct FROM whatsapp_contatos WHERE id = p_contato;
  IF ct.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'mensagem', 'Contato não encontrado.'); END IF;
  IF NOT (private.is_super_admin() OR (ct.company_id = get_user_company_id(auth.uid()) AND is_company_manager(auth.uid()))) THEN
    RETURN jsonb_build_object('ok', false, 'mensagem', 'Apenas o administrador da empresa pode excluir dados do contato.'); END IF;
  IF length(v_tel) IN (10, 11) THEN v_tel := '55' || v_tel; END IF;
  IF whatsapp_tel_canonico(v_tel) IS DISTINCT FROM whatsapp_tel_canonico(ct.telefone) THEN
    RETURN jsonb_build_object('ok', false, 'mensagem', 'O telefone digitado não confere.'); END IF;
  RETURN jsonb_build_object('ok', true, 'company_id', ct.company_id, 'paths',
    coalesce((SELECT jsonb_agg(m.midia_path) FROM whatsapp_mensagens m JOIN whatsapp_conversas c ON c.id = m.conversa_id
              WHERE c.contato_id = ct.id AND m.midia_path IS NOT NULL), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_excluir_contato_executar(p_contato uuid, p_usuario uuid, p_midias int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ct record; n_msg int; n_conv int; n_fila int;
BEGIN
  SELECT * INTO ct FROM whatsapp_contatos WHERE id = p_contato FOR UPDATE;
  IF ct.id IS NULL THEN RAISE EXCEPTION 'contato'; END IF;
  SELECT count(*) INTO n_msg FROM whatsapp_mensagens m JOIN whatsapp_conversas c ON c.id = m.conversa_id WHERE c.contato_id = ct.id;
  DELETE FROM whatsapp_conversas WHERE contato_id = ct.id; GET DIAGNOSTICS n_conv = ROW_COUNT;
  DELETE FROM whatsapp_fila_envios WHERE company_id = ct.company_id AND whatsapp_tel_canonico(telefone_destino) = whatsapp_tel_canonico(ct.telefone);
  GET DIAGNOSTICS n_fila = ROW_COUNT;
  DELETE FROM whatsapp_contatos WHERE id = ct.id;
  INSERT INTO whatsapp_auditoria(company_id, acao, depois, usuario_id) VALUES (ct.company_id, 'inovachat_exclusao_titular',
    jsonb_build_object('telefone_final', right(ct.telefone, 4), 'mensagens', n_msg, 'midias', p_midias, 'conversas', n_conv, 'fila', n_fila), p_usuario);
  RETURN jsonb_build_object('mensagens', n_msg, 'midias', p_midias, 'conversas', n_conv, 'fila', n_fila);
END $$;

-- acesso: incluir "admin" (exclusão de dados)
CREATE OR REPLACE FUNCTION public.inovachat_meu_acesso() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'ver', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.visualizar'),
    'responder', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.visualizar') AND public.inovachat_tem_permissao('inovachat.responder'),
    'gerenciar', public.inovachat_ativo(public.get_user_company_id(auth.uid())) AND public.inovachat_tem_permissao('inovachat.gerenciar'),
    'admin', private.is_super_admin() OR public.is_company_manager(auth.uid()),
    'usuario_id', auth.uid())
$$;

-- service-role only
REVOKE ALL ON FUNCTION public.inovachat_midia_marcar(uuid,text,text,bigint,text,int,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_midia_reservar(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_midia_tick(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_gravar_envio_midia(uuid,uuid,text,text,text,text,text,text,uuid,text,text,bigint,text,int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_fora_horario_avaliar(uuid,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_retencao_contar(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_retencao_midias(uuid,int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_retencao_apagar_msgs(uuid,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_retencao_limpar(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_retencao_tick(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_retencao_corte(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_excluir_contato_executar(uuid,uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inovachat_midia_marcar(uuid,text,text,bigint,text,int,text), public.inovachat_midia_reservar(int),
  public.inovachat_gravar_envio_midia(uuid,uuid,text,text,text,text,text,text,uuid,text,text,bigint,text,int),
  public.inovachat_fora_horario_avaliar(uuid,text,boolean), public.inovachat_retencao_contar(uuid), public.inovachat_retencao_midias(uuid,int),
  public.inovachat_retencao_apagar_msgs(uuid,uuid[]), public.inovachat_retencao_limpar(uuid), public.inovachat_excluir_contato_executar(uuid,uuid,int),
  public.inovachat_sinal(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.inovachat_midia_acesso(uuid), public.inovachat_pode_enviar(uuid), public.inovachat_horario_salvar(text,boolean,jsonb,jsonb),
  public.inovachat_fora_horario_salvar(boolean,text), public.inovachat_excluir_contato_preparar(uuid,text),
  public.whatsapp_retencao_modo(), public.whatsapp_retencao_definir_modo(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inovachat_midia_acesso(uuid), public.inovachat_pode_enviar(uuid), public.inovachat_horario_salvar(text,boolean,jsonb,jsonb),
  public.inovachat_fora_horario_salvar(boolean,text), public.inovachat_excluir_contato_preparar(uuid,text),
  public.whatsapp_retencao_modo(), public.whatsapp_retencao_definir_modo(text,text), public.inovachat_horario_texto(jsonb) TO authenticated, service_role;
