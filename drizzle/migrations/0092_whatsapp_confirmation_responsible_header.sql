DO $migration$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef('public.whatsapp_resposta_processar(uuid,text,text,text,text,text,text)'::regprocedure) INTO v_def;
 IF position('whatsapp_cabecalho(a.patient_name, whatsapp_render_modelo' in v_def) = 0 THEN RAISE EXCEPTION 'Cabeçalho atual não corresponde ao esperado'; END IF;
 v_def := replace(v_def, 'whatsapp_cabecalho(a.patient_name, whatsapp_render_modelo(v_txt, a.patient_name, v_tipo, v_pv, a.doctor, v_dh, f.responsavel_nome))', 'whatsapp_cabecalho(CASE WHEN p_acao = ''confirmar'' THEN f.responsavel_nome ELSE a.patient_name END, CASE WHEN p_acao = ''confirmar'' AND coalesce(whatsapp_limpar_nome(f.responsavel_nome), '''') <> '''' THEN E''\n'' ELSE '''' END || whatsapp_render_modelo(v_txt, a.patient_name, v_tipo, v_pv, a.doctor, v_dh, f.responsavel_nome))');
 v_def := replace(v_def, 'cabeçalho em negrito = nome do paciente', 'confirmação com cabeçalho do responsável e paciente no corpo');
 EXECUTE v_def;
END $migration$;
CREATE OR REPLACE FUNCTION public.whatsapp_resposta_padrao(p_tipo text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$
 SELECT CASE p_tipo
 WHEN 'resposta_confirmar' THEN E'{primeiro_nome} seu agendamento foi confirmado com sucesso.\n\nAgradecemos a sua confiança e ficamos à disposição caso precise alterar o horário ou obter mais informações.\n\nTenha um excelente dia! Até {dia_semana}! 💚🙏'
 WHEN 'resposta_remarcar' THEN 'Recebemos seu pedido de remarcação. Nossa equipe entrará em contato em breve para combinar um novo horário. 💚'
 WHEN 'resposta_cancelar' THEN 'Recebemos seu pedido de cancelamento. Nossa equipe vai confirmar com você em breve. 🙏'
 END
$function$;