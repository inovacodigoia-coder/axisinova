CREATE OR REPLACE FUNCTION public.whatsapp_render_modelo(p_texto text, p_paciente text, p_tipo text, p_primeira_vez boolean, p_medico text, p_data_hora timestamptz)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_pac text := btrim(coalesce(p_paciente,''));
  v_tipo text := btrim(coalesce(p_tipo,''));
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
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_modelo_padrao(p_posicao int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_posicao
    WHEN 1 THEN 'Olá, {paciente}! Tudo bem? Passando para confirmar sua {tipo} com {medico} em {data_hora}. Responda SIM para confirmar ou NÃO caso precise remarcar.'
    WHEN 2 THEN 'Oi, {paciente}! Sua {tipo} com {medico} está agendada para {data_hora}. Pode confirmar sua presença respondendo SIM?'
    WHEN 3 THEN '{paciente}, tudo certo para {data_hora}? Temos {tipo} marcada com {medico}. Responda SIM para confirmar ou NÃO para remarcarmos.'
  END
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_modelo_salvar(p_id uuid, p_texto text, p_ativo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE m public.whatsapp_modelos_mensagem; v_txt text; v_outros int;
BEGIN
  SELECT * INTO m FROM public.whatsapp_modelos_mensagem WHERE id = p_id;
  IF m.id IS NULL OR m.company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) OR NOT public.whatsapp_tem_permissao('configuracoes.whatsapp') THEN
    RAISE EXCEPTION 'Sem permissão para alterar este modelo';
  END IF;
  v_txt := btrim(regexp_replace(coalesce(p_texto,''), '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'));
  IF length(v_txt) < 1 THEN RAISE EXCEPTION 'O texto não pode ficar vazio'; END IF;
  IF length(v_txt) > 600 THEN RAISE EXCEPTION 'O texto passa de 600 caracteres'; END IF;
  IF NOT p_ativo THEN
    SELECT count(*) INTO v_outros FROM public.whatsapp_modelos_mensagem
     WHERE company_id = m.company_id AND tipo = m.tipo AND ativo AND id <> m.id;
    IF v_outros = 0 THEN RAISE EXCEPTION 'Mantenha ao menos uma mensagem ativa.'; END IF;
  END IF;
  UPDATE public.whatsapp_modelos_mensagem SET texto = v_txt, ativo = p_ativo WHERE id = p_id;
  INSERT INTO public.whatsapp_auditoria(company_id, acao, antes, depois, usuario_id)
  VALUES (m.company_id, 'modelo_alterado',
    jsonb_build_object('modelo_id', m.id, 'posicao', m.posicao, 'texto', m.texto, 'ativo', m.ativo),
    jsonb_build_object('modelo_id', m.id, 'posicao', m.posicao, 'texto', v_txt, 'ativo', p_ativo),
    auth.uid());
END $$;

REVOKE ALL ON FUNCTION public.whatsapp_modelo_salvar(uuid,text,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_modelo_salvar(uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_render_modelo(text,text,text,boolean,text,timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_modelo_padrao(int) TO authenticated, service_role;

DROP POLICY IF EXISTS wa_mod_update ON public.whatsapp_modelos_mensagem;