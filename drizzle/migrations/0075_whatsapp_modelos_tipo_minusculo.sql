CREATE OR REPLACE FUNCTION public.whatsapp_render_modelo(p_texto text, p_paciente text, p_tipo text, p_primeira_vez boolean, p_medico text, p_data_hora timestamp with time zone)
 RETURNS text LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pac text := btrim(coalesce(p_paciente,''));
  v_tipo text := lower(btrim(coalesce(p_tipo,'')));
  v_dh text := '';
  v_local timestamp;
  v_dias text[] := ARRAY['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  r text := coalesce(p_texto,'');
BEGIN
  IF v_tipo <> '' AND coalesce(p_primeira_vez,false) THEN v_tipo := v_tipo || ' (1ª vez)'; END IF;
  IF p_data_hora IS NOT NULL THEN
    v_local := p_data_hora AT TIME ZONE 'America/Fortaleza';
    v_dh := v_dias[extract(dow from v_local)::int + 1] || ', ' || to_char(v_local,'DD/MM/YYYY') || ' às ' || to_char(v_local,'HH24:MI');
  END IF;
  r := replace(r,'{paciente}',v_pac);
  r := replace(r,'{primeiro_nome}',split_part(v_pac,' ',1));
  r := replace(r,'{tipo}',v_tipo);
  r := replace(r,'{medico}',btrim(coalesce(p_medico,'')));
  r := replace(r,'{data_hora}',v_dh);
  r := regexp_replace(r,'[ \t]{2,}',' ','g');
  r := regexp_replace(r,' +([,.!?;:])','\1','g');
  RETURN btrim(r);
END $function$;

CREATE OR REPLACE FUNCTION public.whatsapp_modelo_padrao(p_posicao integer)
 RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT CASE p_posicao
    WHEN 1 THEN 'Olá, {primeiro_nome}! Tudo bem? Passando para confirmar seu agendamento: {tipo} com {medico} em {data_hora}. Responda SIM para confirmar ou NÃO caso precise remarcar.'
    WHEN 2 THEN 'Oi, {paciente}! Você tem um agendamento de {tipo} com {medico} em {data_hora}. Pode confirmar sua presença respondendo SIM?'
    WHEN 3 THEN '{primeiro_nome}, tudo certo para {data_hora}? Está agendado: {tipo} com {medico}. Responda SIM para confirmar ou NÃO para remarcarmos.'
  END
$function$;

CREATE OR REPLACE FUNCTION public.whatsapp_criar_modelos_padrao(_company uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.whatsapp_modelos_mensagem (company_id, posicao, texto)
  SELECT _company, p, public.whatsapp_modelo_padrao(p) FROM generate_series(1,3) p
  ON CONFLICT (company_id, tipo, posicao) DO NOTHING;
  INSERT INTO public.whatsapp_config_empresa (company_id) VALUES (_company) ON CONFLICT DO NOTHING;
END $function$;

UPDATE public.whatsapp_modelos_mensagem m
   SET texto = public.whatsapp_modelo_padrao(m.posicao)
 WHERE m.texto = CASE m.posicao
    WHEN 1 THEN 'Olá, {paciente}! Tudo bem? Passando para confirmar sua {tipo} com {medico} em {data_hora}. Responda SIM para confirmar ou NÃO caso precise remarcar.'
    WHEN 2 THEN 'Oi, {paciente}! Sua {tipo} com {medico} está agendada para {data_hora}. Pode confirmar sua presença respondendo SIM?'
    WHEN 3 THEN '{paciente}, tudo certo para {data_hora}? Temos {tipo} marcada com {medico}. Responda SIM para confirmar ou NÃO para remarcarmos.'
   END
   AND NOT EXISTS (SELECT 1 FROM public.whatsapp_auditoria a
                    WHERE a.acao = 'modelo_alterado' AND a.antes->>'modelo_id' = m.id::text);