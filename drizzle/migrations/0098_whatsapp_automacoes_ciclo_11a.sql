-- Etapa 11A: automações de ciclo do paciente
ALTER TABLE public.whatsapp_config_empresa
  ADD COLUMN IF NOT EXISTS ciclo_pausado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciclo_limite_dia smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ciclo_limite_semana smallint NOT NULL DEFAULT 3;
ALTER TABLE public.whatsapp_config_empresa ADD CONSTRAINT whatsapp_cfg_ciclo_limites_chk
  CHECK (ciclo_limite_dia BETWEEN 1 AND 10 AND ciclo_limite_semana BETWEEN 1 AND 30);

ALTER TABLE public.whatsapp_fila_envios
  ADD COLUMN IF NOT EXISTS automacao_id uuid,
  ADD COLUMN IF NOT EXISTS ciclo_adiamentos smallint NOT NULL DEFAULT 0;
ALTER TABLE public.whatsapp_fila_envios DROP CONSTRAINT whatsapp_fila_envios_tipo_check;
ALTER TABLE public.whatsapp_fila_envios ADD CONSTRAINT whatsapp_fila_envios_tipo_check CHECK (tipo = ANY (ARRAY[
  'teste','confirmacao_agendamento','resposta_automatica','ciclo_inclusao_agenda','ciclo_pre_atendimento','ciclo_pos_atendimento']));
CREATE INDEX IF NOT EXISTS whatsapp_fila_ciclo_tel_idx ON public.whatsapp_fila_envios (company_id, telefone_destino, enviada_em) WHERE tipo LIKE 'ciclo_%';

-- regras
CREATE TABLE public.whatsapp_automacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('inclusao_agenda','pre_atendimento','pos_atendimento')),
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 80),
  ativo boolean NOT NULL DEFAULT false,
  deslocamento_minutos integer NOT NULL DEFAULT 0 CHECK (deslocamento_minutos BETWEEN 0 AND 43200),
  horario_fixo time,
  filtro_tipos_atendimento text[],
  filtro_medicos uuid[],
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 1000),
  incluir_aviso_saida boolean NOT NULL DEFAULT false,
  ordem smallint NOT NULL DEFAULT 0,
  padrao boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);
CREATE INDEX whatsapp_automacoes_emp_idx ON public.whatsapp_automacoes(company_id, tipo);
CREATE UNIQUE INDEX whatsapp_automacoes_padrao_uk ON public.whatsapp_automacoes(company_id, tipo) WHERE padrao;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_automacoes TO authenticated;
GRANT ALL ON public.whatsapp_automacoes TO service_role;
ALTER TABLE public.whatsapp_automacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automacoes_ler" ON public.whatsapp_automacoes FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp'));
CREATE POLICY "automacoes_criar" ON public.whatsapp_automacoes FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp') AND NOT padrao);
CREATE POLICY "automacoes_editar" ON public.whatsapp_automacoes FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "automacoes_excluir" ON public.whatsapp_automacoes FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp') AND NOT padrao);

CREATE TABLE public.whatsapp_automacoes_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  automacao_id uuid,
  acao text NOT NULL,
  texto_anterior text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_automacoes_auditoria TO authenticated;
GRANT ALL ON public.whatsapp_automacoes_auditoria TO service_role;
ALTER TABLE public.whatsapp_automacoes_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automacoes_aud_ler" ON public.whatsapp_automacoes_auditoria FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp'));

CREATE OR REPLACE FUNCTION public.whatsapp_automacoes_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.ativo AND position('[escreva aqui' in lower(NEW.texto)) > 0 THEN
      RAISE EXCEPTION 'Edite as orientações antes de ativar.' USING ERRCODE = 'P0001';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      NEW.company_id := OLD.company_id; NEW.tipo := OLD.tipo; NEW.padrao := OLD.padrao; NEW.criado_em := OLD.criado_em;
    END IF;
    NEW.atualizado_em := now();
    NEW.atualizado_por := coalesce(auth.uid(), NEW.atualizado_por);
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO whatsapp_automacoes_auditoria(company_id, automacao_id, acao, texto_anterior, dados_anteriores, usuario_id)
    VALUES (OLD.company_id, OLD.id, 'excluir', OLD.texto, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.whatsapp_automacoes_aud_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO whatsapp_automacoes_auditoria(company_id, automacao_id, acao, texto_anterior, dados_anteriores, dados_novos, usuario_id)
  VALUES (NEW.company_id, NEW.id, lower(TG_OP), CASE WHEN TG_OP='UPDATE' THEN OLD.texto END,
          CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW), auth.uid());
  RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_automacoes_antes BEFORE INSERT OR UPDATE OR DELETE ON public.whatsapp_automacoes
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_automacoes_trg();
CREATE TRIGGER whatsapp_automacoes_depois AFTER INSERT OR UPDATE ON public.whatsapp_automacoes
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_automacoes_aud_trg();

-- textos padrão (espelho em src/lib/whatsappModelo.ts)
CREATE OR REPLACE FUNCTION public.whatsapp_automacao_padrao(p_tipo text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_tipo
    WHEN 'inclusao_agenda' THEN jsonb_build_object('nome','Inclusão na agenda','deslocamento',5,'horario',NULL,'filtro',NULL,'aviso',false,
      'texto','Olá, {primeiro_nome}! Seu agendamento foi realizado: {tipo} com {medico} em {data_hora}. Qualquer alteração, fale com a nossa equipe.')
    WHEN 'pre_atendimento' THEN jsonb_build_object('nome','Pré-atendimento','deslocamento',1440,'horario','18:00','filtro',jsonb_build_array('Exame','Procedimento'),'aviso',false,
      'texto','Olá, {primeiro_nome}! Lembrete do seu atendimento: {tipo} com {medico} em {data_hora}. Orientações: [escreva aqui as orientações de preparo].')
    WHEN 'pos_atendimento' THEN jsonb_build_object('nome','Pós-atendimento','deslocamento',120,'horario',NULL,'filtro',NULL,'aviso',true,
      'texto','Olá, {primeiro_nome}! Foi um prazer atender você hoje. Se precisar de algo, estamos à disposição. Cuide-se! 💚')
  END
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_automacoes_criar_padrao(p_company uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE t text; d jsonb; o smallint := 0;
BEGIN
  FOREACH t IN ARRAY ARRAY['inclusao_agenda','pre_atendimento','pos_atendimento'] LOOP
    d := whatsapp_automacao_padrao(t); o := o + 1;
    INSERT INTO whatsapp_automacoes(company_id, tipo, nome, ativo, deslocamento_minutos, horario_fixo, filtro_tipos_atendimento, texto, incluir_aviso_saida, ordem, padrao)
    SELECT p_company, t, d->>'nome', false, (d->>'deslocamento')::int, (d->>'horario')::time,
      CASE WHEN d->'filtro' IS NULL OR jsonb_typeof(d->'filtro') <> 'array' THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(d->'filtro')) END,
      d->>'texto', (d->>'aviso')::boolean, o, true
    WHERE NOT EXISTS (SELECT 1 FROM whatsapp_automacoes WHERE company_id = p_company AND tipo = t AND padrao);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacoes_criar_padrao(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp_automacoes_liberacao_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.whatsapp_habilitado AND NOT coalesce(OLD.whatsapp_habilitado, false) THEN
    PERFORM whatsapp_automacoes_criar_padrao(NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_automacoes_liberacao AFTER UPDATE OF whatsapp_habilitado ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_automacoes_liberacao_trg();

-- restaurar padrão (só regras padrão)
CREATE OR REPLACE FUNCTION public.whatsapp_automacao_restaurar(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r record; d jsonb;
BEGIN
  IF NOT whatsapp_tem_permissao('configuracoes.whatsapp') THEN RETURN 'SEM_PERMISSAO'; END IF;
  SELECT * INTO r FROM whatsapp_automacoes WHERE id = p_id AND company_id = get_user_company_id(auth.uid());
  IF r.id IS NULL OR NOT r.padrao THEN RETURN 'NAO_ENCONTRADA'; END IF;
  d := whatsapp_automacao_padrao(r.tipo);
  UPDATE whatsapp_automacoes SET nome = d->>'nome', ativo = false, deslocamento_minutos = (d->>'deslocamento')::int,
    horario_fixo = (d->>'horario')::time, filtro_medicos = NULL,
    filtro_tipos_atendimento = CASE WHEN jsonb_typeof(d->'filtro') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(d->'filtro')) END,
    texto = d->>'texto', incluir_aviso_saida = (d->>'aviso')::boolean
  WHERE id = p_id;
  RETURN 'OK';
END $$;
GRANT EXECUTE ON FUNCTION public.whatsapp_automacao_restaurar(uuid) TO authenticated;

-- configuração de ciclo (pausa e limites)
CREATE OR REPLACE FUNCTION public.whatsapp_ciclo_config(p_pausado boolean DEFAULT NULL, p_limite_dia smallint DEFAULT NULL, p_limite_semana smallint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_c uuid := get_user_company_id(auth.uid()); c record;
BEGIN
  IF v_c IS NULL OR NOT whatsapp_tem_permissao('configuracoes.whatsapp') THEN RETURN jsonb_build_object('ok',false,'codigo','SEM_PERMISSAO'); END IF;
  INSERT INTO whatsapp_config_empresa(company_id) VALUES (v_c) ON CONFLICT DO NOTHING;
  IF p_pausado IS NOT NULL OR p_limite_dia IS NOT NULL OR p_limite_semana IS NOT NULL THEN
    IF (p_limite_dia IS NOT NULL AND p_limite_dia NOT BETWEEN 1 AND 10) OR (p_limite_semana IS NOT NULL AND p_limite_semana NOT BETWEEN 1 AND 30) THEN
      RETURN jsonb_build_object('ok',false,'codigo','LIMITE_INVALIDO');
    END IF;
    SELECT * INTO c FROM whatsapp_config_empresa WHERE company_id = v_c;
    UPDATE whatsapp_config_empresa SET ciclo_pausado = coalesce(p_pausado, ciclo_pausado),
      ciclo_limite_dia = coalesce(p_limite_dia, ciclo_limite_dia), ciclo_limite_semana = coalesce(p_limite_semana, ciclo_limite_semana)
     WHERE company_id = v_c;
    INSERT INTO whatsapp_automacoes_auditoria(company_id, acao, dados_anteriores, dados_novos, usuario_id)
    VALUES (v_c, 'config_ciclo', jsonb_build_object('pausado',c.ciclo_pausado,'dia',c.ciclo_limite_dia,'semana',c.ciclo_limite_semana),
      jsonb_build_object('pausado',p_pausado,'dia',p_limite_dia,'semana',p_limite_semana), auth.uid());
  END IF;
  SELECT * INTO c FROM whatsapp_config_empresa WHERE company_id = v_c;
  RETURN jsonb_build_object('ok',true,'pausado',c.ciclo_pausado,'limite_dia',c.ciclo_limite_dia,'limite_semana',c.ciclo_limite_semana);
END $$;
GRANT EXECUTE ON FUNCTION public.whatsapp_ciclo_config(boolean, smallint, smallint) TO authenticated;

-- opt-out
CREATE TABLE public.whatsapp_optout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  telefone text NOT NULL CHECK (telefone ~ '^55[0-9]{10,11}$'),
  origem text NOT NULL CHECK (origem IN ('paciente','manual')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid,
  UNIQUE (company_id, telefone)
);
GRANT ALL ON public.whatsapp_optout TO service_role;
ALTER TABLE public.whatsapp_optout ENABLE ROW LEVEL SECURITY;

CREATE VIEW public.whatsapp_optout_v AS
  SELECT id, company_id, left(telefone,5) || '****' || right(telefone,3) AS telefone_mascarado, origem, criado_em
    FROM public.whatsapp_optout
   WHERE company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp');
GRANT SELECT ON public.whatsapp_optout_v TO authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp_optout_tem(p_company uuid, p_tel text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM whatsapp_optout o WHERE o.company_id = p_company AND whatsapp_tel_canonico(o.telefone) = whatsapp_tel_canonico(p_tel))
$$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_optout_tem(uuid, text) FROM PUBLIC, anon, authenticated;

-- InovaChat: estado e ação manual
CREATE OR REPLACE FUNCTION public.inovachat_optout_estado(p_contato uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record; o record;
BEGIN
  SELECT * INTO c FROM whatsapp_contatos WHERE id = p_contato AND company_id = get_user_company_id(auth.uid());
  IF c.id IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT origem, criado_em INTO o FROM whatsapp_optout x WHERE x.company_id = c.company_id AND whatsapp_tel_canonico(x.telefone) = whatsapp_tel_canonico(c.telefone) LIMIT 1;
  RETURN jsonb_build_object('ok',true,'optout',o.origem IS NOT NULL,'origem',o.origem,'desde',o.criado_em);
END $$;
GRANT EXECUTE ON FUNCTION public.inovachat_optout_estado(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.inovachat_optout_definir(p_contato uuid, p_bloquear boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record; v_tel text;
BEGIN
  IF NOT inovachat_usuario_tem(auth.uid(), 'inovachat.gerenciar') THEN RETURN 'SEM_PERMISSAO'; END IF;
  SELECT * INTO c FROM whatsapp_contatos WHERE id = p_contato AND company_id = get_user_company_id(auth.uid());
  IF c.id IS NULL THEN RETURN 'NAO_ENCONTRADO'; END IF;
  v_tel := coalesce(whatsapp_normalizar_celular(c.telefone), c.telefone);
  IF p_bloquear THEN
    INSERT INTO whatsapp_optout(company_id, telefone, origem, criado_por)
    SELECT c.company_id, v_tel, 'manual', auth.uid()
     WHERE v_tel ~ '^55[0-9]{10,11}$' AND NOT whatsapp_optout_tem(c.company_id, v_tel);
    UPDATE whatsapp_fila_envios SET status='cancelada', erro='OPTOUT', atualizado_em=now()
     WHERE company_id = c.company_id AND status='agendada' AND tipo LIKE 'ciclo_%' AND whatsapp_tel_canonico(telefone_destino) = whatsapp_tel_canonico(v_tel);
  ELSE
    DELETE FROM whatsapp_optout WHERE company_id = c.company_id AND whatsapp_tel_canonico(telefone) = whatsapp_tel_canonico(c.telefone);
  END IF;
  INSERT INTO whatsapp_automacoes_auditoria(company_id, acao, dados_novos, usuario_id)
  VALUES (c.company_id, CASE WHEN p_bloquear THEN 'optout_manual' ELSE 'optout_reativar' END, jsonb_build_object('contato_id', c.id), auth.uid());
  RETURN 'OK';
END $$;
GRANT EXECUTE ON FUNCTION public.inovachat_optout_definir(uuid, boolean) TO authenticated;

-- webhook: SAIR / PARAR / VOLTAR (service role)
CREATE OR REPLACE FUNCTION public.whatsapp_optout_processar(p_instancia uuid, p_telefone text, p_acao text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_inst record; v_tel text; v_tem boolean; v_nome text; v_emp text; v_txt text; v_rf uuid;
BEGIN
  SELECT id, company_id, status INTO v_inst FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_inst.id IS NULL OR p_acao NOT IN ('sair','voltar') THEN RETURN jsonb_build_object('enviar',false,'resultado','ignorada_dados'); END IF;
  v_tel := coalesce(whatsapp_normalizar_celular(p_telefone), regexp_replace(coalesce(p_telefone,''),'\D','','g'));
  IF v_tel !~ '^55[0-9]{10,11}$' THEN RETURN jsonb_build_object('enviar',false,'resultado','sem_telefone'); END IF;
  v_tem := whatsapp_optout_tem(v_inst.company_id, v_tel);
  IF p_acao = 'sair' THEN
    IF v_tem THEN RETURN jsonb_build_object('enviar',false,'resultado','ja_optout'); END IF;
    INSERT INTO whatsapp_optout(company_id, telefone, origem) VALUES (v_inst.company_id, v_tel, 'paciente') ON CONFLICT DO NOTHING;
    UPDATE whatsapp_fila_envios SET status='cancelada', erro='OPTOUT', atualizado_em=now()
     WHERE company_id = v_inst.company_id AND status='agendada' AND tipo LIKE 'ciclo_%' AND whatsapp_tel_canonico(telefone_destino) = whatsapp_tel_canonico(v_tel);
  ELSE
    IF NOT v_tem THEN RETURN jsonb_build_object('enviar',false,'resultado','nao_optout'); END IF;
    DELETE FROM whatsapp_optout WHERE company_id = v_inst.company_id AND whatsapp_tel_canonico(telefone) = whatsapp_tel_canonico(v_tel);
  END IF;
  SELECT coalesce(p.name, c.nome_exibicao) INTO v_nome FROM whatsapp_contatos c LEFT JOIN patients p ON p.id = c.paciente_id
   WHERE c.company_id = v_inst.company_id AND whatsapp_tel_canonico(c.telefone) = whatsapp_tel_canonico(v_tel) LIMIT 1;
  IF v_nome IS NULL THEN
    SELECT paciente_nome INTO v_nome FROM whatsapp_fila_envios WHERE company_id = v_inst.company_id AND paciente_nome IS NOT NULL
       AND whatsapp_tel_canonico(telefone_destino) = whatsapp_tel_canonico(v_tel) ORDER BY criado_em DESC LIMIT 1;
  END IF;
  SELECT coalesce(nullif(btrim(nome_fantasia),''), name) INTO v_emp FROM companies WHERE id = v_inst.company_id;
  v_txt := CASE WHEN p_acao = 'sair'
    THEN 'Pronto, {primeiro_nome}. Você não receberá mais mensagens automáticas. Para voltar a receber, responda VOLTAR.'
    ELSE 'Combinado! Você voltará a receber nossas mensagens.' END;
  v_txt := whatsapp_cabecalho(v_emp, whatsapp_render_modelo(v_txt, v_nome, NULL, false, NULL, NULL, NULL));
  IF v_inst.status <> 'connected' THEN RETURN jsonb_build_object('enviar',false,'resultado',p_acao,'motivo','desconectado'); END IF;
  INSERT INTO whatsapp_fila_envios(company_id, tipo, paciente_nome, telefone_destino, texto_final, instancia_id, status, agendada_para, responsavel_nome, formato_envio)
  VALUES (v_inst.company_id, 'resposta_automatica', v_nome, v_tel, v_txt, p_instancia, 'enviando', now(), v_emp, 'texto')
  RETURNING id INTO v_rf;
  RETURN jsonb_build_object('enviar',true,'resultado',p_acao,'fila_id',v_rf,'telefone',v_tel,'texto',v_txt);
END $$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_optout_processar(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_optout_processar(uuid, text, text) TO service_role;

-- enfileirar uma mensagem de ciclo (interno)
CREATE OR REPLACE FUNCTION public.whatsapp__ciclo_um(p_ag uuid, p_tipo text, p_base timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  a record; r record; v_tipo text; v_pv boolean; v_dh timestamptz; v_quando timestamptz; v_tel text; v_t text;
  v_resp text; v_corpo text; v_conf timestamptz; v_tz constant text := 'America/Fortaleza';
BEGIN
  SELECT * INTO a FROM appointments WHERE id = p_ag;
  IF a.id IS NULL THEN RETURN 'AGENDAMENTO_NAO_ENCONTRADO'; END IF;
  v_tipo := CASE WHEN a.visit_type = 'return' THEN 'Retorno' WHEN a.appointment_type = 'exam' THEN 'Exame'
                 WHEN a.appointment_type = 'procedure' THEN 'Procedimento' ELSE 'Consulta' END;
  SELECT * INTO r FROM whatsapp_automacoes x
   WHERE x.company_id = a.company_id AND x.tipo = p_tipo AND x.ativo
     AND (coalesce(cardinality(x.filtro_tipos_atendimento),0) = 0 OR v_tipo = ANY(x.filtro_tipos_atendimento)
          OR (v_tipo = 'Retorno' AND 'Consulta' = ANY(x.filtro_tipos_atendimento)))
     AND (coalesce(cardinality(x.filtro_medicos),0) = 0 OR a.doctor_id = ANY(x.filtro_medicos))
   ORDER BY (coalesce(cardinality(x.filtro_tipos_atendimento),0) > 0)::int + (coalesce(cardinality(x.filtro_medicos),0) > 0)::int DESC, x.ordem, x.criado_em
   LIMIT 1;
  IF r.id IS NULL THEN RETURN 'SEM_REGRA_ATIVA'; END IF;
  IF EXISTS (SELECT 1 FROM whatsapp_fila_envios WHERE agendamento_id = a.id AND tipo = 'ciclo_' || p_tipo AND status NOT IN ('cancelada','falha')) THEN
    RETURN 'JA_ENFILEIRADA';
  END IF;
  v_dh := (a.date + coalesce(a.time,'00:00')) AT TIME ZONE v_tz;
  IF a.status::text = 'cancelled' OR coalesce(a.sched_status,'') IN ('cancelled','absent') THEN RETURN 'AGENDAMENTO_NAO_ATIVO'; END IF;
  IF p_tipo = 'pos_atendimento' AND coalesce(a.sched_status,'') <> 'completed' THEN RETURN 'AGENDAMENTO_NAO_FINALIZADO'; END IF;

  IF p_tipo = 'pre_atendimento' THEN
    IF v_dh <= now() THEN RETURN 'AGENDAMENTO_NO_PASSADO'; END IF;
    v_quando := v_dh - make_interval(mins => r.deslocamento_minutos);
  ELSE
    v_quando := p_base + make_interval(mins => r.deslocamento_minutos);
  END IF;
  IF r.horario_fixo IS NOT NULL THEN
    v_quando := ((v_quando AT TIME ZONE v_tz)::date + r.horario_fixo) AT TIME ZONE v_tz;
    IF p_tipo <> 'pre_atendimento' AND v_quando < p_base THEN v_quando := v_quando + interval '1 day'; END IF;
  END IF;
  IF p_tipo = 'pre_atendimento' THEN
    IF v_quando < now() OR v_quando > v_dh - interval '2 hours' THEN
      IF v_dh - now() > interval '2 hours' THEN v_quando := now(); ELSE RETURN 'EM_CIMA_DA_HORA'; END IF;
    END IF;
    -- não coincidir com a confirmação do agendamento
    SELECT agendada_para INTO v_conf FROM whatsapp_fila_envios WHERE agendamento_id = a.id AND tipo = 'confirmacao_agendamento' AND status = 'agendada' LIMIT 1;
    IF v_conf IS NOT NULL AND abs(extract(epoch FROM (v_quando - v_conf))) < 1800 THEN v_quando := v_conf + interval '30 minutes'; END IF;
  END IF;

  FOR v_t IN SELECT x FROM (
      SELECT 1 o, p.phone x FROM patients p WHERE p.id = a.patient_id
      UNION ALL SELECT 2, p.phone2 FROM patients p WHERE p.id = a.patient_id
      UNION ALL SELECT 3, a.patient_phone1 UNION ALL SELECT 4, a.patient_phone2) s ORDER BY o
  LOOP
    v_tel := whatsapp_normalizar_celular(v_t);
    EXIT WHEN v_tel IS NOT NULL;
  END LOOP;
  IF v_tel IS NULL THEN RETURN 'PACIENTE_SEM_TELEFONE_VALIDO'; END IF;
  IF whatsapp_optout_tem(a.company_id, v_tel) THEN RETURN 'OPTOUT'; END IF;

  v_pv := a.visit_type = 'first_visit' AND coalesce(a.appointment_type,'consultation') = 'consultation';
  v_resp := whatsapp_nome_responsavel(a.company_id, a.created_by);
  v_corpo := whatsapp_render_modelo(r.texto, a.patient_name, v_tipo, v_pv, a.doctor, v_dh, v_resp);
  IF r.incluir_aviso_saida THEN v_corpo := v_corpo || E'\n\nPara não receber mais mensagens automáticas, responda SAIR.'; END IF;
  BEGIN
    INSERT INTO whatsapp_fila_envios(company_id, tipo, agendamento_id, paciente_nome, telefone_destino, texto_final, status, agendada_para,
      criado_por, responsavel_nome, automacao_id, formato_envio)
    VALUES (a.company_id, 'ciclo_' || p_tipo, a.id, a.patient_name, v_tel, whatsapp_cabecalho(v_resp, v_corpo), 'agendada', v_quando,
      auth.uid(), v_resp, r.id, 'texto');
  EXCEPTION WHEN unique_violation THEN RETURN 'JA_ENFILEIRADA';
  END;
  RETURN 'ENFILEIRADA';
END $$;
REVOKE EXECUTE ON FUNCTION public.whatsapp__ciclo_um(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp_enfileirar_ciclo(p_agendamento_id uuid, p_evento text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a record; v_comp uuid; v_hab boolean; v_pausa boolean; res jsonb := '{}'::jsonb; n int := 0; c text;
BEGIN
  SELECT id, company_id INTO a FROM appointments WHERE id = p_agendamento_id;
  v_comp := get_user_company_id(auth.uid());
  IF a.id IS NULL OR v_comp IS NULL OR a.company_id <> v_comp THEN
    RETURN jsonb_build_object('ok',false,'codigo','AGENDAMENTO_NAO_ENCONTRADO','mensagem','Agendamento não encontrado.');
  END IF;
  IF p_evento NOT IN ('criado','remarcado','finalizado') THEN
    RETURN jsonb_build_object('ok',false,'codigo','EVENTO_INVALIDO','mensagem','Evento inválido.');
  END IF;
  SELECT whatsapp_habilitado INTO v_hab FROM companies WHERE id = a.company_id;
  IF NOT coalesce(v_hab,false) THEN RETURN jsonb_build_object('ok',true,'codigo','WHATSAPP_NAO_LIBERADO','mensagem','WhatsApp não liberado.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM whatsapp_instancias WHERE company_id = a.company_id) THEN
    RETURN jsonb_build_object('ok',true,'codigo','SEM_NUMERO_CADASTRADO','mensagem','Nenhum número cadastrado.');
  END IF;
  SELECT ciclo_pausado INTO v_pausa FROM whatsapp_config_empresa WHERE company_id = a.company_id;
  IF coalesce(v_pausa,false) THEN RETURN jsonb_build_object('ok',true,'codigo','CICLO_PAUSADO','mensagem','Automações pausadas.'); END IF;
  IF p_evento = 'criado' THEN
    c := whatsapp__ciclo_um(a.id, 'inclusao_agenda', now()); res := res || jsonb_build_object('inclusao_agenda', c); n := n + (c = 'ENFILEIRADA')::int;
    c := whatsapp__ciclo_um(a.id, 'pre_atendimento', now()); res := res || jsonb_build_object('pre_atendimento', c); n := n + (c = 'ENFILEIRADA')::int;
  ELSIF p_evento = 'remarcado' THEN
    UPDATE whatsapp_fila_envios SET status='cancelada', atualizado_em=now()
     WHERE agendamento_id = a.id AND tipo = 'ciclo_pre_atendimento' AND status = 'agendada';
    c := whatsapp__ciclo_um(a.id, 'pre_atendimento', now()); res := res || jsonb_build_object('pre_atendimento', c); n := n + (c = 'ENFILEIRADA')::int;
  ELSE
    c := whatsapp__ciclo_um(a.id, 'pos_atendimento', now()); res := res || jsonb_build_object('pos_atendimento', c); n := n + (c = 'ENFILEIRADA')::int;
  END IF;
  RETURN jsonb_build_object('ok',true,'codigo',CASE WHEN n > 0 THEN 'ENFILEIRADA' ELSE 'NADA_ENFILEIRADO' END,'mensagem',n || ' mensagem(ns) programada(s).','detalhe',res);
END $$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_enfileirar_ciclo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_enfileirar_ciclo(uuid, text) TO authenticated, service_role;

-- reserva: confirmações primeiro, depois ciclo; checagens de ciclo
CREATE OR REPLACE FUNCTION public.whatsapp_reservar_envios()
 RETURNS TABLE(fila_id uuid, instancia_id uuid, telefone_destino text, texto_final text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tz constant text := 'America/Fortaleza';
  v_agora_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
  v_total int := 0; emp record; inst record; msg record; ap record; v_ok boolean; v_motivo text;
  v_dia int; v_sem int; v_prox timestamptz;
BEGIN
  UPDATE whatsapp_fila_envios f SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE f.status='enviando' AND f.atualizado_em < now() - interval '5 minutes';

  FOR emp IN
    SELECT c.id, ce.ciclo_pausado, ce.ciclo_limite_dia, ce.ciclo_limite_semana FROM companies c JOIN whatsapp_config_empresa ce ON ce.company_id=c.id
     WHERE c.whatsapp_habilitado AND ce.envio_automatico_ativo
       AND v_agora_local::time >= coalesce(ce.janela_inicio,'07:00')
       AND v_agora_local::time <  coalesce(ce.janela_fim,'20:00')
  LOOP
    FOR inst IN
      SELECT i.id FROM whatsapp_instancias i
       WHERE i.company_id=emp.id AND i.status='connected' AND i.ativo_no_rodizio
         AND (i.proximo_envio_apos IS NULL OR i.proximo_envio_apos <= now())
         AND (i.limite_diario IS NULL OR (
               SELECT count(*) FROM whatsapp_fila_envios x
                WHERE x.instancia_id=i.id AND (x.tipo='confirmacao_agendamento' OR x.tipo LIKE 'ciclo_%')
                  AND x.status IN ('enviando','enviada','entregue','lida')
                  AND (coalesce(x.enviada_em, x.atualizado_em) AT TIME ZONE v_tz)::date = v_agora_local::date
             ) < i.limite_diario)
       ORDER BY i.ultimo_envio_em ASC NULLS FIRST
       FOR UPDATE SKIP LOCKED
    LOOP
      EXIT WHEN v_total >= 50;
      LOOP
        SELECT f.id, f.tipo, f.agendamento_id, f.telefone_destino, f.texto_final, f.ciclo_adiamentos INTO msg
          FROM whatsapp_fila_envios f
         WHERE f.company_id=emp.id AND f.status='agendada' AND f.agendada_para <= now()
           AND f.instancia_id IS NULL
           AND (f.tipo='confirmacao_agendamento' OR (f.tipo LIKE 'ciclo_%' AND NOT emp.ciclo_pausado))
         ORDER BY (f.tipo <> 'confirmacao_agendamento'), f.agendada_para, f.criado_em
         LIMIT 1 FOR UPDATE SKIP LOCKED;
        EXIT WHEN NOT FOUND;
        v_ok := true; v_motivo := 'AGENDAMENTO_NAO_ATIVO';
        IF msg.agendamento_id IS NOT NULL THEN
          SELECT a.status::text AS st, a.sched_status, a.date, a.time INTO ap FROM appointments a WHERE a.id=msg.agendamento_id;
          IF FOUND THEN
            IF msg.tipo = 'confirmacao_agendamento' THEN
              IF ap.st = 'cancelled' OR coalesce(ap.sched_status,'') IN ('cancelled','absent','in_progress','completed','rescheduled')
                 OR (ap.date + coalesce(ap.time,'00:00')) <= v_agora_local THEN v_ok := false; END IF;
            ELSIF msg.tipo = 'ciclo_pos_atendimento' THEN
              IF coalesce(ap.sched_status,'') <> 'completed' THEN v_ok := false; END IF;
            ELSE
              IF ap.st = 'cancelled' OR coalesce(ap.sched_status,'') IN ('cancelled','absent','rescheduled') THEN v_ok := false; END IF;
              IF msg.tipo = 'ciclo_pre_atendimento' AND (ap.date + coalesce(ap.time,'00:00')) <= v_agora_local THEN v_ok := false; END IF;
            END IF;
          ELSIF msg.tipo LIKE 'ciclo_%' THEN v_ok := false;
          END IF;
        END IF;
        IF v_ok AND msg.tipo LIKE 'ciclo_%' AND whatsapp_optout_tem(emp.id, msg.telefone_destino) THEN
          v_ok := false; v_motivo := 'OPTOUT';
        END IF;
        IF NOT v_ok THEN
          UPDATE whatsapp_fila_envios SET status='cancelada', erro=v_motivo, atualizado_em=now() WHERE id=msg.id;
          CONTINUE;
        END IF;
        IF msg.tipo LIKE 'ciclo_%' THEN
          SELECT count(*) FILTER (WHERE (coalesce(x.enviada_em, x.atualizado_em) AT TIME ZONE v_tz)::date = v_agora_local::date),
                 count(*) FILTER (WHERE (coalesce(x.enviada_em, x.atualizado_em) AT TIME ZONE v_tz)::date > v_agora_local::date - 7)
            INTO v_dia, v_sem
            FROM whatsapp_fila_envios x
           WHERE x.company_id = emp.id AND x.tipo LIKE 'ciclo_%' AND x.id <> msg.id
             AND x.status IN ('enviando','enviada','entregue','lida')
             AND whatsapp_tel_canonico(x.telefone_destino) = whatsapp_tel_canonico(msg.telefone_destino)
             AND coalesce(x.enviada_em, x.atualizado_em) > now() - interval '8 days';
          IF v_dia >= coalesce(emp.ciclo_limite_dia,1) OR v_sem >= coalesce(emp.ciclo_limite_semana,3) THEN
            IF msg.ciclo_adiamentos >= 3 THEN
              UPDATE whatsapp_fila_envios SET status='cancelada', erro='LIMITE_FREQUENCIA', atualizado_em=now() WHERE id=msg.id;
            ELSE
              v_prox := ((v_agora_local::date + 1) + time '09:00') AT TIME ZONE v_tz;
              UPDATE whatsapp_fila_envios SET agendada_para=v_prox, ciclo_adiamentos=ciclo_adiamentos+1, atualizado_em=now() WHERE id=msg.id;
            END IF;
            CONTINUE;
          END IF;
        END IF;
        UPDATE whatsapp_fila_envios SET status='enviando', instancia_id=inst.id, atualizado_em=now() WHERE id=msg.id;
        UPDATE whatsapp_instancias SET proximo_envio_apos = now() + interval '6 minutes' WHERE id=inst.id;
        v_total := v_total + 1;
        fila_id := msg.id; instancia_id := inst.id; telefone_destino := msg.telefone_destino; texto_final := msg.texto_final;
        RETURN NEXT;
        EXIT;
      END LOOP;
    END LOOP;
    EXIT WHEN v_total >= 50;
  END LOOP;
END $function$;

-- tick: considera também mensagens de ciclo (exceto empresas pausadas)
CREATE OR REPLACE FUNCTION public.whatsapp_worker_tick(p_url text, p_apikey text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE v_cod text; v_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
BEGIN
  UPDATE whatsapp_fila_envios SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE status='enviando' AND atualizado_em < now() - interval '5 minutes';
  DELETE FROM whatsapp_worker_codigos WHERE expira_em < now() OR usado_em IS NOT NULL;

  IF NOT EXISTS (
    select 1 from whatsapp_config_empresa c
    join companies co on co.id = c.company_id and co.whatsapp_habilitado
    join whatsapp_instancias i on i.company_id = c.company_id and i.status = 'connected' and i.ativo_no_rodizio
         and (i.proximo_envio_apos is null or i.proximo_envio_apos <= now())
    where c.envio_automatico_ativo
      and v_local::time >= coalesce(c.janela_inicio,'07:00') and v_local::time < coalesce(c.janela_fim,'20:00')
      and exists (select 1 from whatsapp_fila_envios f where f.company_id = c.company_id
                  and f.status='agendada' and f.agendada_para <= now()
                  and (f.tipo='confirmacao_agendamento' or (f.tipo like 'ciclo_%' and not c.ciclo_pausado)))
  ) THEN
    RETURN 'sem_trabalho';
  END IF;

  v_cod := encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO whatsapp_worker_codigos(hash, expira_em)
   VALUES (encode(extensions.digest(v_cod,'sha256'),'hex'), now() + interval '2 minutes');
  PERFORM net.http_post(url := p_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey',p_apikey,'x-worker-secret',v_cod),
    body := '{}'::jsonb, timeout_milliseconds := 10000);
  RETURN 'disparado';
END;
$function$;

-- InovaChat: mensagens de ciclo aparecem como mensagem do sistema
CREATE OR REPLACE FUNCTION public.inovachat_fila_trg()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.tipo NOT IN ('confirmacao_agendamento','resposta_automatica','ciclo_inclusao_agenda','ciclo_pre_atendimento','ciclo_pos_atendimento')
     OR NEW.message_id_uazapi IS NULL OR NEW.instancia_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('enviada','entregue','lida','falha') THEN RETURN NEW; END IF;
  BEGIN
    IF public.inovachat_registrar(NEW.instancia_id, NEW.message_id_uazapi, NEW.telefone_destino, NULL, 'saida', 'sistema', 'texto',
         NEW.texto_final, NULL, coalesce(nullif(NEW.responsavel_nome,''), 'Sistema'),
         CASE WHEN NEW.status = 'falha' THEN 'falha' ELSE NEW.status END, coalesce(NEW.enviada_em, now())) = 'duplicada' THEN
      PERFORM public.inovachat_status(NEW.instancia_id, ARRAY[NEW.message_id_uazapi], NEW.status);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END $function$;

-- regras padrão para empresas já liberadas (desativadas)
SELECT public.whatsapp_automacoes_criar_padrao(id) FROM public.companies WHERE whatsapp_habilitado;