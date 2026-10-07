-- Agendamento: confirmação pelo paciente e pedido de remarcar/cancelar
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS paciente_confirmou_em timestamptz,
  ADD COLUMN IF NOT EXISTS pedido_paciente text CHECK (pedido_paciente IN ('remarcar','cancelar')),
  ADD COLUMN IF NOT EXISTS pedido_paciente_em timestamptz;

CREATE OR REPLACE FUNCTION public.appointments_limpar_pedido_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pedido_paciente IS NOT NULL AND (
       (coalesce(NEW.sched_status,'') IS DISTINCT FROM coalesce(OLD.sched_status,'')
         AND coalesce(NEW.sched_status,'') IN ('cancelled','absent','completed','rescheduled','in_progress'))
    OR NEW.date IS DISTINCT FROM OLD.date OR NEW.time IS DISTINCT FROM OLD.time
    OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id) THEN
    NEW.pedido_paciente := NULL; NEW.pedido_paciente_em := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS appointments_limpar_pedido ON public.appointments;
CREATE TRIGGER appointments_limpar_pedido BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_limpar_pedido_trg();

-- Fila: respostas automáticas e resposta do paciente
ALTER TABLE public.whatsapp_fila_envios DROP CONSTRAINT IF EXISTS whatsapp_fila_envios_tipo_check;
ALTER TABLE public.whatsapp_fila_envios ADD CONSTRAINT whatsapp_fila_envios_tipo_check
  CHECK (tipo IN ('teste','confirmacao_agendamento','resposta_automatica'));
ALTER TABLE public.whatsapp_fila_envios
  ADD COLUMN IF NOT EXISTS resposta_acao text CHECK (resposta_acao IN ('confirmar','remarcar','cancelar')),
  ADD COLUMN IF NOT EXISTS respondida_em timestamptz,
  ADD COLUMN IF NOT EXISTS respostas_automaticas smallint NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_fila_sem_duplicar_v2 ON public.whatsapp_fila_envios (agendamento_id, tipo)
  WHERE status <> 'cancelada' AND status <> 'falha' AND tipo <> 'resposta_automatica';
DROP INDEX IF EXISTS public.whatsapp_fila_sem_duplicar;
CREATE INDEX IF NOT EXISTS whatsapp_fila_tel_idx ON public.whatsapp_fila_envios (instancia_id, telefone_destino, enviada_em);
CREATE INDEX IF NOT EXISTS whatsapp_fila_msgid_idx ON public.whatsapp_fila_envios (message_id_uazapi);

-- Respostas recebidas (sem texto livre)
CREATE TABLE IF NOT EXISTS public.whatsapp_respostas_recebidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instancia_id uuid REFERENCES public.whatsapp_instancias(id) ON DELETE SET NULL,
  fila_id uuid REFERENCES public.whatsapp_fila_envios(id) ON DELETE SET NULL,
  agendamento_id uuid,
  message_id_uazapi text NOT NULL UNIQUE,
  tipo_resposta text NOT NULL CHECK (tipo_resposta IN ('botao','numero','palavra')),
  acao text NOT NULL CHECK (acao IN ('confirmar','remarcar','cancelar')),
  resultado text NOT NULL DEFAULT 'processando',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_respostas_recebidas TO authenticated;
GRANT ALL ON public.whatsapp_respostas_recebidas TO service_role;
ALTER TABLE public.whatsapp_respostas_recebidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admin lê respostas" ON public.whatsapp_respostas_recebidas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- Diagnóstico do formato dos eventos de resposta (7 dias, primeira ocorrência de cada formato)
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_diagnostico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id uuid REFERENCES public.whatsapp_instancias(id) ON DELETE CASCADE,
  formato text NOT NULL UNIQUE,
  chaves text[] NOT NULL DEFAULT '{}',
  message_type text,
  button_or_listid text,
  tamanho_texto int,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_webhook_diagnostico TO authenticated;
GRANT ALL ON public.whatsapp_webhook_diagnostico TO service_role;
ALTER TABLE public.whatsapp_webhook_diagnostico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admin lê diagnóstico" ON public.whatsapp_webhook_diagnostico FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- Render com {dia_semana}
CREATE OR REPLACE FUNCTION public.whatsapp_render_modelo(p_texto text, p_paciente text, p_tipo text, p_primeira_vez boolean, p_medico text, p_data_hora timestamptz, p_responsavel text)
RETURNS text LANGUAGE plpgsql STABLE SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  v_pac text := btrim(coalesce(p_paciente,''));
  v_tipo text := lower(btrim(coalesce(p_tipo,'')));
  v_dh text := ''; v_ds text := '';
  v_local timestamp;
  v_dias text[] := ARRAY['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  v_dias_m text[] := ARRAY['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO'];
  r text := coalesce(p_texto,'');
BEGIN
  IF v_tipo <> '' AND coalesce(p_primeira_vez,false) THEN v_tipo := v_tipo || ' (1ª vez)'; END IF;
  IF p_data_hora IS NOT NULL THEN
    v_local := p_data_hora AT TIME ZONE 'America/Fortaleza';
    v_dh := v_dias[extract(dow from v_local)::int + 1] || ', ' || to_char(v_local,'DD/MM/YYYY') || ' às ' || to_char(v_local,'HH24:MI');
    v_ds := v_dias_m[extract(dow from v_local)::int + 1];
  END IF;
  r := replace(r,'{paciente}',v_pac);
  r := replace(r,'{primeiro_nome}',split_part(v_pac,' ',1));
  r := replace(r,'{tipo}',v_tipo);
  r := replace(r,'{medico}',btrim(coalesce(p_medico,'')));
  r := replace(r,'{data_hora}',v_dh);
  r := replace(r,'{dia_semana}',v_ds);
  r := replace(r,'{responsavel}',coalesce(whatsapp_limpar_nome(p_responsavel),''));
  r := regexp_replace(r,'[ \t]{2,}',' ','g');
  r := regexp_replace(r,' +([,.!?;:])','\1','g');
  RETURN btrim(r);
END $function$;

-- Modelos de resposta
CREATE OR REPLACE FUNCTION public.whatsapp_resposta_padrao(p_tipo text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE p_tipo
    WHEN 'resposta_confirmar' THEN E'Seu agendamento foi confirmado com sucesso.\nAgradecemos a sua confiança e ficamos à disposição caso precise alterar o horário ou obter mais informações.\n\nTenha um excelente dia! Até {dia_semana}! 💚🙏'
    WHEN 'resposta_remarcar' THEN 'Recebemos seu pedido de remarcação. Nossa equipe entrará em contato em breve para combinar um novo horário. 💚'
    WHEN 'resposta_cancelar' THEN 'Recebemos seu pedido de cancelamento. Nossa equipe vai confirmar com você em breve. 🙏'
  END
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_criar_modelos_padrao(_company uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.whatsapp_modelos_mensagem (company_id, posicao, texto)
  SELECT _company, p, public.whatsapp_modelo_padrao(p) FROM generate_series(1,3) p
  ON CONFLICT (company_id, tipo, posicao) DO NOTHING;
  INSERT INTO public.whatsapp_modelos_mensagem (company_id, tipo, posicao, texto, ativo)
  SELECT _company, t, 1, public.whatsapp_resposta_padrao(t), true
    FROM unnest(ARRAY['resposta_confirmar','resposta_remarcar','resposta_cancelar']) t
  ON CONFLICT (company_id, tipo, posicao) DO NOTHING;
  INSERT INTO public.whatsapp_config_empresa (company_id) VALUES (_company) ON CONFLICT DO NOTHING;
END $function$;

INSERT INTO public.whatsapp_modelos_mensagem (company_id, tipo, posicao, texto, ativo)
SELECT c.id, t, 1, public.whatsapp_resposta_padrao(t), true
  FROM public.companies c CROSS JOIN unnest(ARRAY['resposta_confirmar','resposta_remarcar','resposta_cancelar']) t
 WHERE c.whatsapp_habilitado OR EXISTS (SELECT 1 FROM public.whatsapp_modelos_mensagem m WHERE m.company_id = c.id)
ON CONFLICT (company_id, tipo, posicao) DO NOTHING;

-- Salvar modelo: respostas podem ficar todas desligadas
CREATE OR REPLACE FUNCTION public.whatsapp_modelo_salvar(p_id uuid, p_texto text, p_ativo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE m public.whatsapp_modelos_mensagem; v_txt text; v_outros int;
BEGIN
  SELECT * INTO m FROM public.whatsapp_modelos_mensagem WHERE id = p_id;
  IF m.id IS NULL OR m.company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) OR NOT public.whatsapp_tem_permissao('configuracoes.whatsapp') THEN
    RAISE EXCEPTION 'Sem permissão para alterar este modelo';
  END IF;
  v_txt := btrim(regexp_replace(coalesce(p_texto,''), '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'));
  IF length(v_txt) < 1 THEN RAISE EXCEPTION 'O texto não pode ficar vazio'; END IF;
  IF length(v_txt) > 600 THEN RAISE EXCEPTION 'O texto passa de 600 caracteres'; END IF;
  IF NOT p_ativo AND m.tipo NOT LIKE 'resposta\_%' THEN
    SELECT count(*) INTO v_outros FROM public.whatsapp_modelos_mensagem
     WHERE company_id = m.company_id AND tipo = m.tipo AND ativo AND id <> m.id;
    IF v_outros = 0 THEN RAISE EXCEPTION 'Mantenha ao menos uma mensagem ativa.'; END IF;
  END IF;
  UPDATE public.whatsapp_modelos_mensagem SET texto = v_txt, ativo = p_ativo WHERE id = p_id;
  INSERT INTO public.whatsapp_auditoria(company_id, acao, antes, depois, usuario_id)
  VALUES (m.company_id, 'modelo_alterado',
    jsonb_build_object('modelo_id', m.id, 'tipo', m.tipo, 'posicao', m.posicao, 'texto', m.texto, 'ativo', m.ativo),
    jsonb_build_object('modelo_id', m.id, 'tipo', m.tipo, 'posicao', m.posicao, 'texto', v_txt, 'ativo', p_ativo),
    auth.uid());
END $function$;

-- Telefone igual (tolera o 9º dígito ausente no WhatsApp)
CREATE OR REPLACE FUNCTION public.whatsapp_tel_canonico(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN length(d) = 13 AND d LIKE '55%' AND substr(d,5,1) = '9' THEN substr(d,1,4) || substr(d,6) ELSE d END
    FROM (SELECT regexp_replace(coalesce(p,''), '\D', '', 'g') d) s
$$;

-- Quem cuida da Agenda na empresa
CREATE OR REPLACE FUNCTION public.whatsapp_destinatarios_agenda(p_company uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id FROM profiles p
   WHERE p.company_id = p_company AND coalesce(p.is_active, true)
     AND (p.is_admin = true OR p.role IN ('company_admin') OR EXISTS (
       SELECT 1 FROM sector_users su
       JOIN company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
       JOIN access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
       WHERE su.user_id = p.id AND ap.company_id = p_company
         AND coalesce(ap.permissions->'scheduling','[]'::jsonb) ?| ARRAY['edit','approve']))
$$;
REVOKE ALL ON FUNCTION public.whatsapp_destinatarios_agenda(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_destinatarios_agenda(uuid) TO service_role;

-- Processa a resposta do paciente (chamado só pelo webhook, service role)
CREATE OR REPLACE FUNCTION public.whatsapp_resposta_processar(
  p_instancia uuid, p_message_id text, p_telefone text, p_tipo_resposta text, p_acao text, p_codigo text, p_quoted text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  v_inst record; v_rid uuid; f record; a record; v_res text; v_n int;
  v_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
  v_txt text; v_ativo boolean; v_tipo text; v_pv boolean; v_dh timestamptz; v_final text; v_rf uuid; v_data text;
  v_quoted text[];
BEGIN
  SELECT id, company_id, status INTO v_inst FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_inst.id IS NULL OR p_acao NOT IN ('confirmar','remarcar','cancelar') THEN RETURN jsonb_build_object('enviar',false,'resultado','ignorada_dados'); END IF;

  INSERT INTO whatsapp_respostas_recebidas(company_id, instancia_id, message_id_uazapi, tipo_resposta, acao)
  VALUES (v_inst.company_id, p_instancia, left(p_message_id,200), p_tipo_resposta, p_acao)
  ON CONFLICT (message_id_uazapi) DO NOTHING RETURNING id INTO v_rid;
  IF v_rid IS NULL THEN RETURN jsonb_build_object('enviar',false,'resultado','duplicada'); END IF;

  -- localizar a confirmação
  IF p_codigo IS NOT NULL THEN
    SELECT * INTO f FROM whatsapp_fila_envios WHERE codigo_resposta = upper(p_codigo) FOR UPDATE;
  ELSIF coalesce(p_quoted,'') <> '' THEN
    v_quoted := ARRAY[p_quoted, split_part(p_quoted, ':', 2)];
    SELECT * INTO f FROM whatsapp_fila_envios WHERE message_id_uazapi = ANY(v_quoted) AND instancia_id = p_instancia
      AND tipo = 'confirmacao_agendamento' LIMIT 1 FOR UPDATE;
  END IF;
  IF f.id IS NULL AND p_codigo IS NULL THEN
    SELECT count(*) INTO v_n FROM whatsapp_fila_envios x JOIN appointments ap ON ap.id = x.agendamento_id
     WHERE x.instancia_id = p_instancia AND x.tipo = 'confirmacao_agendamento'
       AND x.status IN ('enviada','entregue','lida') AND x.enviada_em > now() - interval '7 days'
       AND whatsapp_tel_canonico(x.telefone_destino) = whatsapp_tel_canonico(p_telefone)
       AND ap.status::text <> 'cancelled' AND coalesce(ap.sched_status,'') NOT IN ('cancelled','absent','completed','in_progress','rescheduled')
       AND (ap.date + coalesce(ap.time,'00:00')) > v_local;
    IF v_n > 1 THEN
      SELECT x.paciente_nome INTO v_data FROM whatsapp_fila_envios x
       WHERE x.instancia_id = p_instancia AND x.tipo='confirmacao_agendamento'
         AND whatsapp_tel_canonico(x.telefone_destino) = whatsapp_tel_canonico(p_telefone)
       ORDER BY x.enviada_em DESC NULLS LAST LIMIT 1;
      INSERT INTO user_notifications(company_id, user_id, category, priority, title, message, action_route)
      SELECT v_inst.company_id, u, 'scheduling', 'high', 'Resposta de confirmação ambígua',
        coalesce(v_data,'Um paciente') || ' respondeu a uma confirmação, mas há mais de um agendamento pendente. Verifique.', '/app/agendamento'
        FROM whatsapp_destinatarios_agenda(v_inst.company_id) u;
      UPDATE whatsapp_respostas_recebidas SET resultado = 'ignorada_ambigua' WHERE id = v_rid;
      RETURN jsonb_build_object('enviar',false,'resultado','ignorada_ambigua');
    END IF;
    SELECT * INTO f FROM whatsapp_fila_envios x
     WHERE x.instancia_id = p_instancia AND x.tipo = 'confirmacao_agendamento'
       AND x.status IN ('enviada','entregue','lida') AND x.enviada_em > now() - interval '7 days'
       AND whatsapp_tel_canonico(x.telefone_destino) = whatsapp_tel_canonico(p_telefone)
     ORDER BY x.enviada_em DESC LIMIT 1 FOR UPDATE;
  END IF;

  v_res := CASE
    WHEN f.id IS NULL THEN 'ignorada_sem_confirmacao'
    WHEN f.company_id <> v_inst.company_id THEN 'ignorada_outra_empresa'
    WHEN whatsapp_tel_canonico(f.telefone_destino) <> whatsapp_tel_canonico(p_telefone) THEN 'ignorada_outro_telefone'
    WHEN f.tipo <> 'confirmacao_agendamento' THEN 'ignorada_teste'
    ELSE NULL END;
  IF v_res IS NULL THEN
    SELECT * INTO a FROM appointments WHERE id = f.agendamento_id FOR UPDATE;
    IF a.id IS NULL OR a.status::text = 'cancelled' OR coalesce(a.sched_status,'') IN ('cancelled','absent','completed','in_progress','rescheduled')
       OR (a.date + coalesce(a.time,'00:00')) <= v_local THEN v_res := 'ignorada_agendamento_inativo';
    ELSIF f.resposta_acao = p_acao THEN v_res := 'ignorada_repetida';
    END IF;
  END IF;
  IF v_res IS NOT NULL THEN
    UPDATE whatsapp_respostas_recebidas SET resultado = v_res, fila_id = CASE WHEN f.company_id = v_inst.company_id THEN f.id END,
      agendamento_id = CASE WHEN f.company_id = v_inst.company_id THEN f.agendamento_id END WHERE id = v_rid;
    RETURN jsonb_build_object('enviar',false,'resultado',v_res);
  END IF;

  -- aplicar
  IF p_acao = 'confirmar' THEN
    UPDATE appointments SET sched_status = 'confirmed', status = 'confirmed', paciente_confirmou_em = now(),
      pedido_paciente = NULL, pedido_paciente_em = NULL, updated_at = now() WHERE id = a.id;
    v_res := 'confirmado';
  ELSE
    UPDATE appointments SET pedido_paciente = p_acao, pedido_paciente_em = now(), updated_at = now() WHERE id = a.id;
    v_res := p_acao || '_solicitado';
    v_data := to_char(a.date,'DD/MM/YYYY') || ' às ' || to_char(a.time,'HH24:MI');
    INSERT INTO user_notifications(company_id, user_id, category, priority, title, message, action_route)
    SELECT a.company_id, u, 'scheduling', 'high',
      CASE p_acao WHEN 'remarcar' THEN 'Paciente pediu para remarcar' ELSE 'Paciente pediu para cancelar' END,
      coalesce(a.patient_name,'Paciente') || ' pediu para ' || upper(p_acao) || ' ' ||
        CASE WHEN a.appointment_type = 'exam' THEN 'o exame' WHEN a.appointment_type = 'procedure' THEN 'o procedimento'
             WHEN a.visit_type = 'return' THEN 'o retorno' ELSE 'a consulta' END || ' de ' || v_data,
      '/app/agendamento?agendamento=' || a.id
      FROM whatsapp_destinatarios_agenda(a.company_id) u;
  END IF;
  UPDATE whatsapp_fila_envios SET resposta_acao = p_acao, respondida_em = now(), atualizado_em = now() WHERE id = f.id;
  UPDATE whatsapp_respostas_recebidas SET resultado = v_res, fila_id = f.id, agendamento_id = a.id WHERE id = v_rid;

  -- resposta automática
  IF f.respostas_automaticas >= 3 THEN RETURN jsonb_build_object('enviar',false,'resultado',v_res,'motivo','limite'); END IF;
  SELECT texto, ativo INTO v_txt, v_ativo FROM whatsapp_modelos_mensagem
   WHERE company_id = a.company_id AND tipo = 'resposta_' || p_acao AND posicao = 1;
  IF v_txt IS NULL OR NOT v_ativo THEN RETURN jsonb_build_object('enviar',false,'resultado',v_res,'motivo','modelo_inativo'); END IF;
  v_tipo := CASE WHEN a.visit_type = 'return' THEN 'Retorno' WHEN a.appointment_type = 'exam' THEN 'Exame'
                 WHEN a.appointment_type = 'procedure' THEN 'Procedimento' ELSE 'Consulta' END;
  v_pv := a.visit_type = 'first_visit' AND coalesce(a.appointment_type,'consultation') = 'consultation';
  v_dh := (a.date + a.time) AT TIME ZONE 'America/Fortaleza';
  v_final := whatsapp_cabecalho(f.responsavel_nome, whatsapp_render_modelo(v_txt, a.patient_name, v_tipo, v_pv, a.doctor, v_dh, f.responsavel_nome));
  UPDATE whatsapp_fila_envios SET respostas_automaticas = respostas_automaticas + 1 WHERE id = f.id;
  INSERT INTO whatsapp_fila_envios(company_id, tipo, agendamento_id, paciente_nome, telefone_destino, texto_final, instancia_id,
    status, agendada_para, responsavel_nome, formato_envio, erro)
  VALUES (a.company_id, 'resposta_automatica', a.id, f.paciente_nome, f.telefone_destino, v_final, p_instancia,
    CASE WHEN v_inst.status = 'connected' THEN 'enviando' ELSE 'falha' END, now(), f.responsavel_nome, 'texto',
    CASE WHEN v_inst.status = 'connected' THEN NULL ELSE 'NUMERO_DESCONECTADO' END)
  RETURNING id INTO v_rf;
  IF v_inst.status <> 'connected' THEN RETURN jsonb_build_object('enviar',false,'resultado',v_res,'motivo','desconectado'); END IF;
  RETURN jsonb_build_object('enviar',true,'resultado',v_res,'fila_id',v_rf,'telefone',f.telefone_destino,'texto',v_final);
END $function$;
REVOKE ALL ON FUNCTION public.whatsapp_resposta_processar(uuid,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_resposta_processar(uuid,text,text,text,text,text,text) TO service_role;

-- View da fila com a resposta do paciente
CREATE OR REPLACE VIEW public.whatsapp_fila_envios_v WITH (security_invoker = false) AS
 SELECT id, company_id, tipo, agendamento_id, paciente_nome,
    (("left"(telefone_destino, 5) || '****'::text) || "right"(telefone_destino, 3)) AS telefone_mascarado,
    modelo_posicao, "left"(texto_final, 80) AS texto_resumo, instancia_id, status, agendada_para, enviada_em,
    erro, criado_por, criado_em, atualizado_em, formato_envio, motivo_plano_b, responsavel_nome,
    resposta_acao, respondida_em
   FROM whatsapp_fila_envios f
  WHERE company_id = get_user_company_id(auth.uid()) AND whatsapp_tem_permissao('whatsapp.fila'::text);