-- Etapa 11B: seis automações de relacionamento, links, validade, NPS
ALTER TABLE public.whatsapp_config_empresa
  ADD COLUMN IF NOT EXISTS link_google text CHECK (link_google IS NULL OR (char_length(link_google) <= 500 AND link_google ~ '^https://')),
  ADD COLUMN IF NOT EXISTS link_indicacao text CHECK (link_indicacao IS NULL OR (char_length(link_indicacao) <= 500 AND link_indicacao ~ '^https://')),
  ADD COLUMN IF NOT EXISTS link_cadastro text CHECK (link_cadastro IS NULL OR (char_length(link_cadastro) <= 500 AND link_cadastro ~ '^https://')),
  ADD COLUMN IF NOT EXISTS link_questionario text CHECK (link_questionario IS NULL OR (char_length(link_questionario) <= 500 AND link_questionario ~ '^https://'));

ALTER TABLE public.whatsapp_automacoes
  ADD COLUMN IF NOT EXISTS expira_apos_horas int CHECK (expira_apos_horas IS NULL OR expira_apos_horas BETWEEN 1 AND 720),
  ADD COLUMN IF NOT EXISTS filtro_primeira_vez boolean,
  ADD COLUMN IF NOT EXISTS filtro_apenas_adultos boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS meses_sem_atendimento_max smallint DEFAULT 24 CHECK (meses_sem_atendimento_max BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS intervalo_minimo_dias smallint DEFAULT 90 CHECK (intervalo_minimo_dias BETWEEN 1 AND 730),
  ADD COLUMN IF NOT EXISTS prioridade smallint,
  ADD COLUMN IF NOT EXISTS resposta_promotor text CHECK (resposta_promotor IS NULL OR char_length(resposta_promotor) <= 1000),
  ADD COLUMN IF NOT EXISTS resposta_neutro text CHECK (resposta_neutro IS NULL OR char_length(resposta_neutro) <= 1000),
  ADD COLUMN IF NOT EXISTS resposta_detrator text CHECK (resposta_detrator IS NULL OR char_length(resposta_detrator) <= 1000);
ALTER TABLE public.whatsapp_automacoes DROP CONSTRAINT IF EXISTS whatsapp_automacoes_tipo_check;
ALTER TABLE public.whatsapp_automacoes ADD CONSTRAINT whatsapp_automacoes_tipo_check CHECK (tipo = ANY (ARRAY['inclusao_agenda','pre_atendimento','pos_atendimento',
  'nps','avaliacao_google','aniversario','indicacao','atualizacao_cadastral','questionario']));

ALTER TABLE public.whatsapp_fila_envios
  ADD COLUMN IF NOT EXISTS expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS paciente_id uuid;
ALTER TABLE public.whatsapp_fila_envios DROP CONSTRAINT IF EXISTS whatsapp_fila_envios_tipo_check;
ALTER TABLE public.whatsapp_fila_envios ADD CONSTRAINT whatsapp_fila_envios_tipo_check CHECK (tipo = ANY (ARRAY['teste','confirmacao_agendamento','resposta_automatica',
  'ciclo_inclusao_agenda','ciclo_pre_atendimento','ciclo_pos_atendimento','ciclo_nps','ciclo_avaliacao_google','ciclo_aniversario',
  'ciclo_indicacao','ciclo_atualizacao_cadastral','ciclo_questionario']));
CREATE INDEX IF NOT EXISTS whatsapp_fila_expira_idx ON public.whatsapp_fila_envios (expira_em) WHERE status = 'agendada' AND expira_em IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_fila_aniv_idx ON public.whatsapp_fila_envios (company_id, paciente_id) WHERE tipo = 'ciclo_aniversario';

CREATE OR REPLACE FUNCTION public.whatsapp_automacao_categoria(p_tipo text)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN p_tipo IS NULL OR p_tipo IN ('teste','confirmacao_agendamento','resposta_automatica') THEN NULL
    WHEN regexp_replace(p_tipo, '^ciclo_', '') IN ('inclusao_agenda','pre_atendimento') THEN 'servico'
    WHEN regexp_replace(p_tipo, '^ciclo_', '') IN ('pos_atendimento','nps','avaliacao_google','aniversario','indicacao','atualizacao_cadastral','questionario') THEN 'relacionamento'
    ELSE 'relacionamento'
  END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_automacao_prioridade(p_tipo text)
 RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE regexp_replace(coalesce(p_tipo,''), '^ciclo_', '')
    WHEN 'aniversario' THEN 1 WHEN 'pos_atendimento' THEN 2 WHEN 'nps' THEN 3 WHEN 'avaliacao_google' THEN 4
    WHEN 'atualizacao_cadastral' THEN 5 WHEN 'questionario' THEN 6 WHEN 'indicacao' THEN 7 ELSE 0 END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_automacao_link_faltando(p_company uuid, p_texto text)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT CASE
    WHEN position('{link_google}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_google),'') = '' THEN 'link_google'
    WHEN position('{link_indicacao}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_indicacao),'') = '' THEN 'link_indicacao'
    WHEN position('{link_cadastro}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_cadastro),'') = '' THEN 'link_cadastro'
    WHEN position('{link_questionario}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_questionario),'') = '' THEN 'link_questionario'
  END FROM (SELECT 1) x LEFT JOIN whatsapp_config_empresa c ON c.company_id = p_company $$;

CREATE OR REPLACE FUNCTION public.whatsapp_render_links(p_texto text, p_company uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE c record; v_emp text; r text := coalesce(p_texto,''); k text; v text;
BEGIN
  SELECT * INTO c FROM whatsapp_config_empresa WHERE company_id = p_company;
  SELECT coalesce(nullif(btrim(nome_fantasia),''), name) INTO v_emp FROM companies WHERE id = p_company;
  r := replace(r, '{empresa}', coalesce(v_emp,''));
  FOREACH k IN ARRAY ARRAY['link_google','link_indicacao','link_cadastro','link_questionario'] LOOP
    v := CASE k WHEN 'link_google' THEN c.link_google WHEN 'link_indicacao' THEN c.link_indicacao
                WHEN 'link_cadastro' THEN c.link_cadastro ELSE c.link_questionario END;
    IF coalesce(btrim(v),'') = '' THEN
      r := regexp_replace(r, '\s*[^.!?]*\{' || k || '\}[^.!?]*[.!?]?', '', 'g');
    ELSE
      r := replace(r, '{' || k || '}', btrim(v));
    END IF;
  END LOOP;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_automacao_padrao(p_tipo text)
 RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE p_tipo
    WHEN 'inclusao_agenda' THEN jsonb_build_object('nome','Inclusão na agenda','deslocamento',5,'horario',NULL,'filtro',NULL,'aviso',false,
      'texto','Olá, {primeiro_nome}! Seu agendamento foi realizado: {tipo} com {medico} em {data_hora}. Qualquer alteração, fale com a nossa equipe.')
    WHEN 'pre_atendimento' THEN jsonb_build_object('nome','Pré-atendimento','deslocamento',1440,'horario','18:00','filtro',jsonb_build_array('Exame','Procedimento'),'aviso',false,
      'texto','Olá, {primeiro_nome}! Lembrete do seu atendimento: {tipo} com {medico} em {data_hora}. Orientações: [escreva aqui as orientações de preparo].')
    WHEN 'pos_atendimento' THEN jsonb_build_object('nome','Pós-atendimento','deslocamento',120,'horario',NULL,'filtro',NULL,'aviso',true,
      'texto','Olá, {primeiro_nome}! Foi um prazer atender você hoje. Se precisar de algo, estamos à disposição. Cuide-se! 💚')
    WHEN 'nps' THEN jsonb_build_object('nome','Pesquisa de satisfação (NPS)','deslocamento',1440,'horario',NULL,'filtro',NULL,'aviso',true,
      'texto','Olá, {primeiro_nome}! Sua opinião é muito importante para nós. Em uma escala de 0 a 10, o quanto você recomendaria {empresa} a amigos ou familiares? Responda apenas com o número.',
      'promotor','Muito obrigado pela nota, {primeiro_nome}! Ficamos muito felizes. Se puder, deixe sua avaliação no Google: {link_google}',
      'neutro','Obrigado pela sua resposta, {primeiro_nome}! Vamos continuar trabalhando para melhorar.',
      'detrator','Obrigado por nos contar, {primeiro_nome}. Sentimos muito que sua experiência não tenha sido a melhor. Se quiser, responda aqui com o que podemos melhorar.')
    WHEN 'avaliacao_google' THEN jsonb_build_object('nome','Avaliação no Google','deslocamento',1440,'horario',NULL,'filtro',NULL,'aviso',true,
      'texto','Olá, {primeiro_nome}! Ficamos felizes em atender você. Se puder, deixe sua avaliação no Google, isso ajuda muito: {link_google}')
    WHEN 'aniversario' THEN jsonb_build_object('nome','Aniversário','deslocamento',0,'horario','09:00','filtro',NULL,'aviso',true,
      'texto','Feliz aniversário, {primeiro_nome}! 🎉 A equipe {empresa} deseja muita saúde e alegria hoje e sempre.')
    WHEN 'indicacao' THEN jsonb_build_object('nome','Indicação','deslocamento',2880,'horario',NULL,'filtro',NULL,'aviso',true,
      'texto','Olá, {primeiro_nome}! Gostou do nosso atendimento? Indique {empresa} para um amigo ou familiar: {link_indicacao}. Ele será muito bem recebido! 💚')
    WHEN 'atualizacao_cadastral' THEN jsonb_build_object('nome','Atualização cadastral','deslocamento',60,'horario',NULL,'filtro',NULL,'aviso',true,'primeira_vez',true,
      'texto','Olá, {primeiro_nome}! Para manter seu cadastro sempre atualizado, acesse: {link_cadastro}. Leva menos de 2 minutos.')
    WHEN 'questionario' THEN jsonb_build_object('nome','Questionário','deslocamento',60,'horario',NULL,'filtro',NULL,'aviso',true,
      'texto','Olá, {primeiro_nome}! Pedimos 2 minutos para responder este questionário: {link_questionario}. Sua resposta nos ajuda a cuidar melhor de você.')
  END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_automacoes_criar_padrao(p_company uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE t text; d jsonb; o smallint := 0;
BEGIN
  FOREACH t IN ARRAY ARRAY['inclusao_agenda','pre_atendimento','pos_atendimento','nps','avaliacao_google','aniversario','indicacao','atualizacao_cadastral','questionario'] LOOP
    d := whatsapp_automacao_padrao(t); o := o + 1;
    INSERT INTO whatsapp_automacoes(company_id, tipo, nome, ativo, deslocamento_minutos, horario_fixo, filtro_tipos_atendimento, texto, incluir_aviso_saida, ordem, padrao,
      filtro_primeira_vez, resposta_promotor, resposta_neutro, resposta_detrator, prioridade)
    SELECT p_company, t, d->>'nome', false, (d->>'deslocamento')::int, (d->>'horario')::time,
      CASE WHEN d->'filtro' IS NULL OR jsonb_typeof(d->'filtro') <> 'array' THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(d->'filtro')) END,
      d->>'texto', (d->>'aviso')::boolean, o, true,
      (d->>'primeira_vez')::boolean, d->>'promotor', d->>'neutro', d->>'detrator', whatsapp_automacao_prioridade(t)::smallint
    WHERE NOT EXISTS (SELECT 1 FROM whatsapp_automacoes WHERE company_id = p_company AND tipo = t AND padrao);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_automacoes_trg()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_falta text;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.ativo AND position('[escreva aqui' in lower(NEW.texto)) > 0 THEN
      RAISE EXCEPTION 'Edite as orientações antes de ativar.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.ativo AND (TG_OP = 'INSERT' OR NOT OLD.ativo OR NEW.texto IS DISTINCT FROM OLD.texto) THEN
      v_falta := whatsapp_automacao_link_faltando(NEW.company_id, NEW.texto);
      IF v_falta IS NOT NULL THEN
        RAISE EXCEPTION 'Preencha o link % na seção Links antes de ativar.', CASE v_falta WHEN 'link_google' THEN 'do Google'
          WHEN 'link_indicacao' THEN 'de indicação' WHEN 'link_cadastro' THEN 'de atualização cadastral' ELSE 'do questionário' END USING ERRCODE = 'P0001';
      END IF;
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

CREATE OR REPLACE FUNCTION public.whatsapp__regra_aplicavel(p_company uuid, p_tipo text, p_tipo_at text, p_medico uuid, p_primeira boolean)
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT x.id FROM whatsapp_automacoes x
   WHERE x.company_id = p_company AND x.tipo = p_tipo AND x.ativo
     AND (coalesce(cardinality(x.filtro_tipos_atendimento),0) = 0 OR p_tipo_at = ANY(x.filtro_tipos_atendimento)
          OR (p_tipo_at = 'Retorno' AND 'Consulta' = ANY(x.filtro_tipos_atendimento)))
     AND (coalesce(cardinality(x.filtro_medicos),0) = 0 OR p_medico = ANY(x.filtro_medicos))
     AND (NOT coalesce(x.filtro_primeira_vez,false) OR coalesce(p_primeira,false))
   ORDER BY (coalesce(cardinality(x.filtro_tipos_atendimento),0) > 0)::int + (coalesce(cardinality(x.filtro_medicos),0) > 0)::int
            + coalesce(x.filtro_primeira_vez,false)::int DESC, x.ordem, x.criado_em
   LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.whatsapp__regra_aplicavel(uuid,text,text,uuid,boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp__ciclo_um(p_ag uuid, p_tipo text, p_base timestamp with time zone)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  a record; r record; v_rid uuid; v_tipo text; v_pv boolean; v_dh timestamptz; v_quando timestamptz; v_tel text; v_t text;
  v_resp text; v_corpo text; v_conf timestamptz; v_tz constant text := 'America/Fortaleza'; v_expira timestamptz;
  v_pos boolean := p_tipo IN ('pos_atendimento','nps','avaliacao_google','indicacao','atualizacao_cadastral','questionario');
BEGIN
  SELECT * INTO a FROM appointments WHERE id = p_ag;
  IF a.id IS NULL THEN RETURN 'AGENDAMENTO_NAO_ENCONTRADO'; END IF;
  v_tipo := CASE WHEN a.visit_type = 'return' THEN 'Retorno' WHEN a.appointment_type = 'exam' THEN 'Exame'
                 WHEN a.appointment_type = 'procedure' THEN 'Procedimento' ELSE 'Consulta' END;
  v_rid := whatsapp__regra_aplicavel(a.company_id, p_tipo, v_tipo, a.doctor_id, a.visit_type = 'first_visit');
  IF v_rid IS NULL THEN RETURN 'SEM_REGRA_ATIVA'; END IF;
  SELECT * INTO r FROM whatsapp_automacoes WHERE id = v_rid;
  IF EXISTS (SELECT 1 FROM whatsapp_fila_envios WHERE agendamento_id = a.id AND tipo = 'ciclo_' || p_tipo AND status NOT IN ('cancelada','falha')) THEN
    RETURN 'JA_ENFILEIRADA';
  END IF;
  v_dh := (a.date + coalesce(a.time,'00:00')) AT TIME ZONE v_tz;
  IF a.status::text = 'cancelled' OR coalesce(a.sched_status,'') IN ('cancelled','absent') THEN RETURN 'AGENDAMENTO_NAO_ATIVO'; END IF;
  IF v_pos AND coalesce(a.sched_status,'') <> 'completed' THEN RETURN 'AGENDAMENTO_NAO_FINALIZADO'; END IF;
  IF whatsapp_automacao_link_faltando(a.company_id, r.texto) IS NOT NULL THEN RETURN 'SEM_LINK'; END IF;
  IF p_tipo = 'avaliacao_google' AND whatsapp__regra_aplicavel(a.company_id, 'nps', v_tipo, a.doctor_id, a.visit_type = 'first_visit') IS NOT NULL THEN
    RETURN 'PRECEDENCIA_NPS';
  END IF;

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
  IF public.whatsapp_automacao_categoria(p_tipo) = 'relacionamento' AND whatsapp_optout_tem(a.company_id, v_tel) THEN RETURN 'OPTOUT'; END IF;
  IF p_tipo = 'nps' AND EXISTS (
      SELECT 1 FROM whatsapp_fila_envios x LEFT JOIN appointments ap ON ap.id = x.agendamento_id
       WHERE x.company_id = a.company_id AND x.tipo = 'ciclo_nps' AND x.status NOT IN ('cancelada','falha')
         AND x.criado_em > now() - make_interval(days => coalesce(r.intervalo_minimo_dias, 90))
         AND (whatsapp_tel_canonico(x.telefone_destino) = whatsapp_tel_canonico(v_tel)
              OR (a.patient_id IS NOT NULL AND ap.patient_id = a.patient_id))) THEN
    RETURN 'NPS_RECENTE';
  END IF;

  IF public.whatsapp_automacao_categoria(p_tipo) = 'relacionamento' THEN
    v_expira := v_quando + make_interval(hours => coalesce(r.expira_apos_horas,
      CASE WHEN p_tipo IN ('nps','avaliacao_google') THEN 72 ELSE 168 END));
  END IF;

  v_pv := a.visit_type = 'first_visit' AND coalesce(a.appointment_type,'consultation') = 'consultation';
  v_resp := whatsapp_nome_responsavel(a.company_id, a.created_by);
  v_corpo := whatsapp_render_modelo(whatsapp_render_links(r.texto, a.company_id), a.patient_name, v_tipo, v_pv, a.doctor, v_dh, v_resp);
  IF r.incluir_aviso_saida THEN v_corpo := v_corpo || E'\n\nPara não receber mais mensagens automáticas, responda SAIR.'; END IF;
  BEGIN
    INSERT INTO whatsapp_fila_envios(company_id, tipo, agendamento_id, paciente_id, paciente_nome, telefone_destino, texto_final, status, agendada_para,
      criado_por, responsavel_nome, automacao_id, formato_envio, expira_em)
    VALUES (a.company_id, 'ciclo_' || p_tipo, a.id, a.patient_id, a.patient_name, v_tel, whatsapp_cabecalho(v_resp, v_corpo), 'agendada', v_quando,
      auth.uid(), v_resp, r.id, 'texto', v_expira);
  EXCEPTION WHEN unique_violation THEN RETURN 'JA_ENFILEIRADA';
  END;
  RETURN 'ENFILEIRADA';
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_enfileirar_ciclo(p_agendamento_id uuid, p_evento text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE a record; v_comp uuid; v_hab boolean; v_pausa boolean; res jsonb := '{}'::jsonb; n int := 0; c text; t text;
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
    FOREACH t IN ARRAY ARRAY['pos_atendimento','nps','avaliacao_google','indicacao','atualizacao_cadastral','questionario'] LOOP
      c := whatsapp__ciclo_um(a.id, t, now()); res := res || jsonb_build_object(t, c); n := n + (c = 'ENFILEIRADA')::int;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('ok',true,'codigo',CASE WHEN n > 0 THEN 'ENFILEIRADA' ELSE 'NADA_ENFILEIRADO' END,'mensagem',n || ' mensagem(ns) programada(s).','detalhe',res);
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_reservar_envios()
 RETURNS TABLE(fila_id uuid, instancia_id uuid, telefone_destino text, texto_final text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_tz constant text := 'America/Fortaleza';
  v_agora_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
  v_total int := 0; emp record; inst record; msg record; ap record; v_ok boolean; v_motivo text;
  v_dia int; v_sem int; v_prox timestamptz;
BEGIN
  UPDATE whatsapp_fila_envios f SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE f.status='enviando' AND f.atualizado_em < now() - interval '5 minutes';
  UPDATE whatsapp_fila_envios f SET status='cancelada', erro='EXPIRADA', atualizado_em=now()
   WHERE f.status='agendada' AND f.expira_em IS NOT NULL AND f.expira_em < now();

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
        SELECT f.id, f.tipo, f.agendamento_id, f.telefone_destino, f.texto_final, f.ciclo_adiamentos, f.expira_em INTO msg
          FROM whatsapp_fila_envios f
         WHERE f.company_id=emp.id AND f.status='agendada' AND f.agendada_para <= now()
           AND f.instancia_id IS NULL
           AND (f.tipo='confirmacao_agendamento' OR (f.tipo LIKE 'ciclo_%' AND NOT emp.ciclo_pausado))
         ORDER BY (f.tipo <> 'confirmacao_agendamento'), (public.whatsapp_automacao_categoria(f.tipo) = 'relacionamento'),
                  public.whatsapp_automacao_prioridade(f.tipo), f.agendada_para, f.criado_em
         LIMIT 1 FOR UPDATE SKIP LOCKED;
        EXIT WHEN NOT FOUND;
        v_ok := true; v_motivo := 'AGENDAMENTO_NAO_ATIVO';
        IF msg.expira_em IS NOT NULL AND msg.expira_em < now() THEN v_ok := false; v_motivo := 'EXPIRADA'; END IF;
        IF v_ok AND msg.agendamento_id IS NOT NULL THEN
          SELECT a.status::text AS st, a.sched_status, a.date, a.time INTO ap FROM appointments a WHERE a.id=msg.agendamento_id;
          IF FOUND THEN
            IF msg.tipo = 'confirmacao_agendamento' THEN
              IF ap.st = 'cancelled' OR coalesce(ap.sched_status,'') IN ('cancelled','absent','in_progress','completed','rescheduled')
                 OR (ap.date + coalesce(ap.time,'00:00')) <= v_agora_local THEN v_ok := false; END IF;
            ELSIF msg.tipo IN ('ciclo_pos_atendimento','ciclo_nps','ciclo_avaliacao_google','ciclo_indicacao','ciclo_atualizacao_cadastral','ciclo_questionario') THEN
              IF coalesce(ap.sched_status,'') <> 'completed' THEN v_ok := false; END IF;
            ELSE
              IF ap.st = 'cancelled' OR coalesce(ap.sched_status,'') IN ('cancelled','absent','rescheduled') THEN v_ok := false; END IF;
              IF msg.tipo = 'ciclo_pre_atendimento' AND (ap.date + coalesce(ap.time,'00:00')) <= v_agora_local THEN v_ok := false; END IF;
            END IF;
          ELSIF public.whatsapp_automacao_categoria(msg.tipo) = 'relacionamento' THEN v_ok := false;
          END IF;
        END IF;
        IF v_ok AND public.whatsapp_automacao_categoria(msg.tipo) = 'relacionamento' AND whatsapp_optout_tem(emp.id, msg.telefone_destino) THEN
          v_ok := false; v_motivo := 'OPTOUT';
        END IF;
        IF NOT v_ok THEN
          UPDATE whatsapp_fila_envios SET status='cancelada', erro=v_motivo, atualizado_em=now() WHERE id=msg.id;
          CONTINUE;
        END IF;
        IF public.whatsapp_automacao_categoria(msg.tipo) = 'relacionamento' THEN
          SELECT count(*) FILTER (WHERE (coalesce(x.enviada_em, x.atualizado_em) AT TIME ZONE v_tz)::date = v_agora_local::date),
                 count(*) FILTER (WHERE (coalesce(x.enviada_em, x.atualizado_em) AT TIME ZONE v_tz)::date > v_agora_local::date - 7)
            INTO v_dia, v_sem
            FROM whatsapp_fila_envios x
           WHERE x.company_id = emp.id AND public.whatsapp_automacao_categoria(x.tipo) = 'relacionamento' AND x.id <> msg.id
             AND x.status IN ('enviando','enviada','entregue','lida')
             AND whatsapp_tel_canonico(x.telefone_destino) = whatsapp_tel_canonico(msg.telefone_destino)
             AND coalesce(x.enviada_em, x.atualizado_em) > now() - interval '8 days';
          IF v_dia >= coalesce(emp.ciclo_limite_dia,1) OR v_sem >= coalesce(emp.ciclo_limite_semana,3) THEN
            v_prox := ((v_agora_local::date + 1) + time '09:00') AT TIME ZONE v_tz;
            IF msg.expira_em IS NOT NULL AND v_prox > msg.expira_em THEN
              UPDATE whatsapp_fila_envios SET status='cancelada', erro='EXPIRADA', atualizado_em=now() WHERE id=msg.id;
            ELSIF msg.ciclo_adiamentos >= 3 THEN
              UPDATE whatsapp_fila_envios SET status='cancelada', erro='LIMITE_FREQUENCIA', atualizado_em=now() WHERE id=msg.id;
            ELSE
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
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_aniversario_rodar(p_hoje date DEFAULT NULL)
 RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_tz constant text := 'America/Fortaleza';
  v_hoje date := coalesce(p_hoje, (now() AT TIME ZONE 'America/Fortaleza')::date);
  v_bissexto boolean; r record; p record; n int := 0; v_tel text; v_emp text; v_quando timestamptz; v_fim timestamptz; v_corpo text;
BEGIN
  v_bissexto := extract(day FROM (make_date(extract(year FROM v_hoje)::int, 3, 1) - 1)) = 29;
  v_fim := (v_hoje + time '23:59:59') AT TIME ZONE v_tz;
  FOR r IN
    SELECT DISTINCT ON (x.company_id) x.* FROM whatsapp_automacoes x
      JOIN companies c ON c.id = x.company_id
      LEFT JOIN whatsapp_config_empresa ce ON ce.company_id = x.company_id
     WHERE x.tipo = 'aniversario' AND x.ativo AND c.whatsapp_habilitado AND NOT coalesce(ce.ciclo_pausado,false)
       AND EXISTS (SELECT 1 FROM whatsapp_instancias i WHERE i.company_id = x.company_id)
     ORDER BY x.company_id, x.ordem, x.criado_em
  LOOP
    SELECT coalesce(nullif(btrim(nome_fantasia),''), name) INTO v_emp FROM companies WHERE id = r.company_id;
    v_quando := (v_hoje + coalesce(r.horario_fixo, time '09:00')) AT TIME ZONE v_tz;
    IF v_quando < now() THEN v_quando := now(); END IF;
    FOR p IN
      SELECT pt.id, pt.name, pt.phone, pt.phone2 FROM patients pt
       WHERE pt.company_id = r.company_id AND pt.birth_date IS NOT NULL
         AND ((extract(month FROM pt.birth_date) = extract(month FROM v_hoje) AND extract(day FROM pt.birth_date) = extract(day FROM v_hoje))
              OR (to_char(pt.birth_date,'MMDD') = '0229' AND to_char(v_hoje,'MMDD') = '0228' AND NOT v_bissexto))
         AND (NOT coalesce(r.filtro_apenas_adultos,true) OR age(v_hoje, pt.birth_date) >= interval '18 years')
         AND EXISTS (SELECT 1 FROM appointments ap WHERE ap.patient_id = pt.id AND ap.company_id = r.company_id
                       AND ap.sched_status = 'completed' AND ap.date >= v_hoje - make_interval(months => coalesce(r.meses_sem_atendimento_max,24)))
         AND NOT EXISTS (SELECT 1 FROM whatsapp_fila_envios f WHERE f.company_id = r.company_id AND f.tipo = 'ciclo_aniversario'
                       AND f.paciente_id = pt.id AND extract(year FROM (f.criado_em AT TIME ZONE v_tz)) = extract(year FROM v_hoje))
    LOOP
      v_tel := coalesce(whatsapp_normalizar_celular(p.phone), whatsapp_normalizar_celular(p.phone2));
      CONTINUE WHEN v_tel IS NULL OR whatsapp_optout_tem(r.company_id, v_tel);
      v_corpo := whatsapp_render_modelo(whatsapp_render_links(r.texto, r.company_id), p.name, NULL, false, NULL, NULL, v_emp);
      IF r.incluir_aviso_saida THEN v_corpo := v_corpo || E'\n\nPara não receber mais mensagens automáticas, responda SAIR.'; END IF;
      INSERT INTO whatsapp_fila_envios(company_id, tipo, paciente_id, paciente_nome, telefone_destino, texto_final, status, agendada_para,
        responsavel_nome, automacao_id, formato_envio, expira_em)
      VALUES (r.company_id, 'ciclo_aniversario', p.id, p.name, v_tel, whatsapp_cabecalho(v_emp, v_corpo), 'agendada', v_quando,
        v_emp, r.id, 'texto', v_fim);
      n := n + 1;
    END LOOP;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_aniversario_rodar(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_aniversario_rodar(date) TO service_role;

CREATE TABLE IF NOT EXISTS public.whatsapp_nps_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fila_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_fila_envios(id) ON DELETE CASCADE,
  agendamento_id uuid,
  paciente_id uuid,
  paciente_nome text,
  medico_id uuid,
  medico_nome text,
  tipo_atendimento text,
  nota smallint NOT NULL CHECK (nota BETWEEN 0 AND 10),
  categoria text NOT NULL CHECK (categoria IN ('promotor','neutro','detrator')),
  comentario text CHECK (comentario IS NULL OR char_length(comentario) <= 500),
  comentario_em timestamptz,
  respondida_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_nps_emp_idx ON public.whatsapp_nps_respostas (company_id, respondida_em DESC);
GRANT SELECT ON public.whatsapp_nps_respostas TO authenticated;
GRANT ALL ON public.whatsapp_nps_respostas TO service_role;
ALTER TABLE public.whatsapp_nps_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nps leitura" ON public.whatsapp_nps_respostas FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid())
         AND (whatsapp_tem_permissao('configuracoes.whatsapp') OR inovachat_tem_permissao('inovachat.gerenciar')));

CREATE OR REPLACE FUNCTION public.whatsapp__nps_avisar(p_company uuid, p_tel text, p_titulo text, p_msg text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_rota text := '/app/configuracoes/whatsapp?aba=satisfacao'; v_conv uuid;
BEGIN
  IF (SELECT coalesce(inovachat_habilitado,false) FROM companies WHERE id = p_company) THEN
    SELECT cv.id INTO v_conv FROM whatsapp_conversas cv JOIN whatsapp_contatos ct ON ct.id = cv.contato_id
     WHERE cv.company_id = p_company AND whatsapp_tel_canonico(ct.telefone) = whatsapp_tel_canonico(p_tel)
     ORDER BY cv.ultima_mensagem_em DESC NULLS LAST LIMIT 1;
    IF v_conv IS NOT NULL THEN v_rota := '/app/inovachat?c=' || v_conv; END IF;
  END IF;
  INSERT INTO user_notifications(company_id, user_id, category, priority, title, message, action_route)
  SELECT p_company, p.id, 'system', 'high', p_titulo, p_msg, v_rota
    FROM profiles p
   WHERE p.company_id = p_company AND coalesce(p.is_active, true)
     AND (p.is_admin = true OR p.role = 'company_admin' OR inovachat_usuario_tem(p.id, 'inovachat.gerenciar'));
END $$;
REVOKE ALL ON FUNCTION public.whatsapp__nps_avisar(uuid,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp_nps_processar(p_instancia uuid, p_telefone text, p_texto text, p_quoted text, p_pode_comentar boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_inst record; f record; a record; r record; nr record; v_m text[]; v_nota int; v_cat text; v_txt text; v_emp text; v_nome text;
  v_rid uuid; v_rf uuid; v_q text[]; v_tipo text; v_cmd text;
BEGIN
  SELECT id, company_id, status INTO v_inst FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_inst.id IS NULL OR coalesce(btrim(p_texto),'') = '' THEN RETURN jsonb_build_object('tratada',false); END IF;
  SELECT coalesce(nullif(btrim(nome_fantasia),''), name) INTO v_emp FROM companies WHERE id = v_inst.company_id;
  v_m := regexp_match(p_texto, '^\s*([0-9]{1,2})\s*[!.]*\s*$');

  IF v_m IS NOT NULL AND v_m[1]::int <= 10 THEN
    v_nota := v_m[1]::int;
    IF coalesce(p_quoted,'') <> '' THEN
      v_q := ARRAY[p_quoted, split_part(p_quoted, ':', 2)];
      SELECT * INTO f FROM whatsapp_fila_envios WHERE message_id_uazapi = ANY(v_q) AND instancia_id = p_instancia LIMIT 1;
      IF f.id IS NOT NULL AND f.tipo <> 'ciclo_nps' THEN RETURN jsonb_build_object('tratada',false); END IF;
    END IF;
    IF f.id IS NULL THEN
      SELECT * INTO f FROM whatsapp_fila_envios x
       WHERE x.instancia_id = p_instancia AND x.status IN ('enviada','entregue','lida')
         AND whatsapp_tel_canonico(x.telefone_destino) = whatsapp_tel_canonico(p_telefone)
         AND ((x.tipo = 'ciclo_nps' AND x.enviada_em > now() - interval '72 hours'
               AND NOT EXISTS (SELECT 1 FROM whatsapp_nps_respostas n WHERE n.fila_id = x.id))
           OR (x.tipo = 'confirmacao_agendamento' AND x.enviada_em > now() - interval '7 days' AND x.resposta_acao IS NULL))
       ORDER BY x.enviada_em DESC LIMIT 1;
    END IF;
    IF f.id IS NULL OR f.tipo <> 'ciclo_nps' OR f.company_id <> v_inst.company_id
       OR whatsapp_tel_canonico(f.telefone_destino) <> whatsapp_tel_canonico(p_telefone)
       OR f.enviada_em IS NULL OR f.enviada_em < now() - interval '72 hours' THEN
      RETURN jsonb_build_object('tratada',false);
    END IF;
    SELECT * INTO a FROM appointments WHERE id = f.agendamento_id;
    v_tipo := CASE WHEN a.id IS NULL THEN NULL WHEN a.visit_type = 'return' THEN 'Retorno' WHEN a.appointment_type = 'exam' THEN 'Exame'
                   WHEN a.appointment_type = 'procedure' THEN 'Procedimento' ELSE 'Consulta' END;
    v_cat := CASE WHEN v_nota >= 9 THEN 'promotor' WHEN v_nota >= 7 THEN 'neutro' ELSE 'detrator' END;
    v_nome := coalesce(a.patient_name, f.paciente_nome);
    INSERT INTO whatsapp_nps_respostas(company_id, fila_id, agendamento_id, paciente_id, paciente_nome, medico_id, medico_nome, tipo_atendimento, nota, categoria)
    VALUES (f.company_id, f.id, f.agendamento_id, coalesce(f.paciente_id, a.patient_id), v_nome, a.doctor_id, a.doctor, v_tipo, v_nota, v_cat)
    ON CONFLICT (fila_id) DO NOTHING RETURNING id INTO v_rid;
    IF v_rid IS NULL THEN RETURN jsonb_build_object('tratada',true,'enviar',false,'resultado','nps_repetida'); END IF;
    UPDATE whatsapp_fila_envios SET respondida_em = now(), atualizado_em = now() WHERE id = f.id;
    SELECT * INTO r FROM whatsapp_automacoes WHERE id = f.automacao_id;
    v_txt := CASE v_cat WHEN 'promotor' THEN coalesce(r.resposta_promotor, whatsapp_automacao_padrao('nps')->>'promotor')
                        WHEN 'neutro' THEN coalesce(r.resposta_neutro, whatsapp_automacao_padrao('nps')->>'neutro')
                        ELSE coalesce(r.resposta_detrator, whatsapp_automacao_padrao('nps')->>'detrator') END;
    IF v_cat = 'detrator' THEN
      PERFORM whatsapp__nps_avisar(f.company_id, f.telefone_destino, 'Nota baixa na pesquisa de satisfação',
        coalesce(v_nome,'Um paciente') || ' deu nota ' || v_nota || ' na pesquisa de satisfação.');
    END IF;
  ELSE
    IF NOT coalesce(p_pode_comentar,true) THEN RETURN jsonb_build_object('tratada',false); END IF;
    v_cmd := lower(regexp_replace(btrim(p_texto), '[!.\s]+$', ''));
    IF v_cmd IN ('sair','parar','voltar','parar mensagens','não quero mais receber','nao quero mais receber') THEN RETURN jsonb_build_object('tratada',false); END IF;
    SELECT n.*, f2.telefone_destino AS tel INTO nr FROM whatsapp_nps_respostas n JOIN whatsapp_fila_envios f2 ON f2.id = n.fila_id
     WHERE n.company_id = v_inst.company_id AND n.categoria = 'detrator' AND n.comentario IS NULL
       AND n.respondida_em > now() - interval '48 hours'
       AND whatsapp_tel_canonico(f2.telefone_destino) = whatsapp_tel_canonico(p_telefone)
     ORDER BY n.respondida_em DESC LIMIT 1 FOR UPDATE OF n;
    IF nr.id IS NULL THEN RETURN jsonb_build_object('tratada',false); END IF;
    UPDATE whatsapp_nps_respostas SET comentario = left(btrim(p_texto), 500), comentario_em = now() WHERE id = nr.id;
    PERFORM whatsapp__nps_avisar(nr.company_id, nr.tel, 'Comentário na pesquisa de satisfação',
      coalesce(nr.paciente_nome,'Um paciente') || ' enviou um comentário sobre a nota ' || nr.nota || '.');
    v_nome := nr.paciente_nome;
    v_txt := 'Recebemos seu retorno. Muito obrigado, vamos analisar com atenção.';
    SELECT * INTO f FROM whatsapp_fila_envios WHERE id = nr.fila_id;
  END IF;

  v_txt := whatsapp_cabecalho(v_emp, whatsapp_render_modelo(whatsapp_render_links(v_txt, f.company_id), v_nome, NULL, false, NULL, NULL, v_emp));
  IF v_inst.status <> 'connected' THEN RETURN jsonb_build_object('tratada',true,'enviar',false,'motivo','desconectado'); END IF;
  INSERT INTO whatsapp_fila_envios(company_id, tipo, agendamento_id, paciente_id, paciente_nome, telefone_destino, texto_final, instancia_id,
    status, agendada_para, responsavel_nome, formato_envio)
  VALUES (f.company_id, 'resposta_automatica', f.agendamento_id, f.paciente_id, v_nome, f.telefone_destino, v_txt, p_instancia,
    'enviando', now(), v_emp, 'texto')
  RETURNING id INTO v_rf;
  RETURN jsonb_build_object('tratada',true,'enviar',true,'fila_id',v_rf,'telefone',f.telefone_destino,'texto',v_txt);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_nps_processar(uuid,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_nps_processar(uuid,text,text,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_links_config(p_links jsonb DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_c uuid := get_user_company_id(auth.uid()); c record; k text; v text; v_atalho text; v_tit text;
BEGIN
  IF v_c IS NULL OR NOT whatsapp_tem_permissao('configuracoes.whatsapp') THEN RETURN jsonb_build_object('ok',false,'codigo','SEM_PERMISSAO'); END IF;
  INSERT INTO whatsapp_config_empresa(company_id) VALUES (v_c) ON CONFLICT DO NOTHING;
  IF p_links IS NOT NULL THEN
    FOREACH k IN ARRAY ARRAY['link_google','link_indicacao','link_cadastro','link_questionario'] LOOP
      IF p_links ? k THEN
        v := nullif(btrim(coalesce(p_links->>k,'')),'');
        IF v IS NOT NULL AND (char_length(v) > 500 OR v !~ '^https://') THEN
          RETURN jsonb_build_object('ok',false,'codigo','LINK_INVALIDO','campo',k);
        END IF;
        IF v IS NULL AND EXISTS (SELECT 1 FROM whatsapp_automacoes WHERE company_id = v_c AND ativo AND position('{' || k || '}' in texto) > 0) THEN
          RETURN jsonb_build_object('ok',false,'codigo','LINK_EM_USO','campo',k);
        END IF;
      END IF;
    END LOOP;
    SELECT * INTO c FROM whatsapp_config_empresa WHERE company_id = v_c;
    UPDATE whatsapp_config_empresa SET
      link_google = CASE WHEN p_links ? 'link_google' THEN nullif(btrim(coalesce(p_links->>'link_google','')),'') ELSE link_google END,
      link_indicacao = CASE WHEN p_links ? 'link_indicacao' THEN nullif(btrim(coalesce(p_links->>'link_indicacao','')),'') ELSE link_indicacao END,
      link_cadastro = CASE WHEN p_links ? 'link_cadastro' THEN nullif(btrim(coalesce(p_links->>'link_cadastro','')),'') ELSE link_cadastro END,
      link_questionario = CASE WHEN p_links ? 'link_questionario' THEN nullif(btrim(coalesce(p_links->>'link_questionario','')),'') ELSE link_questionario END
     WHERE company_id = v_c;
    INSERT INTO whatsapp_automacoes_auditoria(company_id, acao, dados_anteriores, dados_novos, usuario_id)
    VALUES (v_c, 'config_links', jsonb_build_object('google',c.link_google,'indicacao',c.link_indicacao,'cadastro',c.link_cadastro,'questionario',c.link_questionario),
      p_links, auth.uid());
    SELECT * INTO c FROM whatsapp_config_empresa WHERE company_id = v_c;
    FOREACH k IN ARRAY ARRAY['link_indicacao','link_cadastro','link_questionario'] LOOP
      v := CASE k WHEN 'link_indicacao' THEN c.link_indicacao WHEN 'link_cadastro' THEN c.link_cadastro ELSE c.link_questionario END;
      v_atalho := CASE k WHEN 'link_indicacao' THEN '/indicacao' WHEN 'link_cadastro' THEN '/cadastro' ELSE '/questionario' END;
      v_tit := CASE k WHEN 'link_indicacao' THEN 'Indicação' WHEN 'link_cadastro' THEN 'Atualização cadastral' ELSE 'Questionário' END;
      CONTINUE WHEN v IS NULL;
      v := CASE k WHEN 'link_indicacao' THEN 'Indique a gente para um amigo ou familiar: ' || v
                  WHEN 'link_cadastro' THEN 'Para atualizar seu cadastro, acesse: ' || v
                  ELSE 'Responda nosso questionário: ' || v END;
      UPDATE whatsapp_respostas_rapidas SET texto = v, ativo = true, atualizado_em = now()
       WHERE company_id = v_c AND atalho = v_atalho;
      IF NOT FOUND THEN
        INSERT INTO whatsapp_respostas_rapidas(company_id, titulo, atalho, texto, ativo, criado_por) VALUES (v_c, v_tit, v_atalho, v, true, auth.uid());
      END IF;
    END LOOP;
  END IF;
  SELECT * INTO c FROM whatsapp_config_empresa WHERE company_id = v_c;
  RETURN jsonb_build_object('ok',true,'link_google',c.link_google,'link_indicacao',c.link_indicacao,'link_cadastro',c.link_cadastro,'link_questionario',c.link_questionario);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_links_config(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_links_config(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.inovachat_nps_ultima(p_contato uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT CASE WHEN NOT inovachat_tem_permissao('inovachat.visualizar') THEN NULL ELSE (
    SELECT jsonb_build_object('nota', n.nota, 'respondida_em', n.respondida_em)
      FROM whatsapp_contatos ct
      JOIN whatsapp_fila_envios f ON f.company_id = ct.company_id AND f.tipo = 'ciclo_nps'
        AND whatsapp_tel_canonico(f.telefone_destino) = whatsapp_tel_canonico(ct.telefone)
      JOIN whatsapp_nps_respostas n ON n.fila_id = f.id
     WHERE ct.id = p_contato AND ct.company_id = get_user_company_id(auth.uid())
     ORDER BY n.respondida_em DESC LIMIT 1) END $$;
REVOKE ALL ON FUNCTION public.inovachat_nps_ultima(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inovachat_nps_ultima(uuid) TO authenticated;

SELECT public.whatsapp_automacoes_criar_padrao(c.id) FROM public.companies c WHERE c.whatsapp_habilitado;

SELECT cron.schedule('whatsapp-aniversario-diario', '0 9 * * *', $$SELECT public.whatsapp_aniversario_rodar()$$);
