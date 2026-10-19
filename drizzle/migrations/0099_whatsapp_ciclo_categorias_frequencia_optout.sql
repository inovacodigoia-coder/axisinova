CREATE OR REPLACE FUNCTION public.whatsapp_automacao_categoria(p_tipo text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_tipo IS NULL OR p_tipo IN ('teste','confirmacao_agendamento','resposta_automatica') THEN NULL
    WHEN regexp_replace(p_tipo, '^ciclo_', '') IN ('inclusao_agenda','pre_atendimento') THEN 'servico'
    ELSE 'relacionamento'
  END
$$;
COMMENT ON FUNCTION public.whatsapp_automacao_categoria(text) IS 'Categoria derivada do tipo: avisos de agendamento são serviço; demais automações, incluindo tipos futuros, são relacionamento. Não classifica confirmações, respostas ou testes como automação.';
REVOKE ALL ON FUNCTION public.whatsapp_automacao_categoria(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_automacao_categoria(text) TO authenticated, service_role;

DO $migration$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.whatsapp__ciclo_um(uuid,text,timestamptz)'::regprocedure);
  IF md5(d) <> 'd9f5a8728f15ec3649eb67058ecaa5bf' THEN RAISE EXCEPTION 'Definição de enfileiramento mudou; revisar antes de aplicar'; END IF;
  d := replace(d, 'IF whatsapp_optout_tem(a.company_id, v_tel) THEN', 'IF public.whatsapp_automacao_categoria(p_tipo) = ''relacionamento'' AND whatsapp_optout_tem(a.company_id, v_tel) THEN');
  EXECUTE d;

  d := pg_get_functiondef('public.whatsapp_reservar_envios()'::regprocedure);
  IF md5(d) <> '7068293820e682acfd6b745ba371039b' THEN RAISE EXCEPTION 'Definição de reserva mudou; revisar antes de aplicar'; END IF;
  d := replace(d, 'IF v_ok AND msg.tipo LIKE ''ciclo_%'' AND whatsapp_optout_tem', 'IF v_ok AND public.whatsapp_automacao_categoria(msg.tipo) = ''relacionamento'' AND whatsapp_optout_tem');
  d := replace(d, 'IF msg.tipo LIKE ''ciclo_%'' THEN', 'IF public.whatsapp_automacao_categoria(msg.tipo) = ''relacionamento'' THEN');
  d := replace(d, 'WHERE x.company_id = emp.id AND x.tipo LIKE ''ciclo_%'' AND x.id <> msg.id', 'WHERE x.company_id = emp.id AND public.whatsapp_automacao_categoria(x.tipo) = ''relacionamento'' AND x.id <> msg.id');
  EXECUTE d;

  d := pg_get_functiondef('public.whatsapp_optout_processar(uuid,text,text)'::regprocedure);
  IF md5(d) <> '1e4d31a0f08d28431afdbca89e9538f6' THEN RAISE EXCEPTION 'Definição de SAIR mudou; revisar antes de aplicar'; END IF;
  d := replace(d, 'AND tipo LIKE ''ciclo_%'' AND whatsapp_tel_canonico', 'AND public.whatsapp_automacao_categoria(tipo) = ''relacionamento'' AND whatsapp_tel_canonico');
  d := replace(d, 'Pronto, {primeiro_nome}. Você não receberá mais mensagens automáticas. Para voltar a receber, responda VOLTAR.', 'Pronto, {primeiro_nome}. Você não receberá mais mensagens automáticas de relacionamento. Avisos dos seus agendamentos continuam. Para voltar a receber tudo, responda VOLTAR.');
  EXECUTE d;

  d := pg_get_functiondef('public.inovachat_optout_definir(uuid,boolean)'::regprocedure);
  IF md5(d) <> 'b85c3434d4e227fc634d9d10a2105ce7' THEN RAISE EXCEPTION 'Definição de opt-out manual mudou; revisar antes de aplicar'; END IF;
  d := replace(d, 'AND tipo LIKE ''ciclo_%'' AND whatsapp_tel_canonico', 'AND public.whatsapp_automacao_categoria(tipo) = ''relacionamento'' AND whatsapp_tel_canonico');
  EXECUTE d;
END
$migration$;