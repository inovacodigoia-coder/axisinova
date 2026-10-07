ALTER TABLE public.whatsapp_fila_envios
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS formato_envio text CHECK (formato_envio IN ('botoes','texto_numerado','texto')),
  ADD COLUMN IF NOT EXISTS codigo_resposta text,
  ADD COLUMN IF NOT EXISTS motivo_plano_b text;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_fila_envios_codigo_resposta_uk ON public.whatsapp_fila_envios(codigo_resposta) WHERE codigo_resposta IS NOT NULL;
ALTER TABLE public.whatsapp_config_empresa
  ADD COLUMN IF NOT EXISTS formato_confirmacao text NOT NULL DEFAULT 'botoes' CHECK (formato_confirmacao IN ('botoes','texto_numerado'));

CREATE OR REPLACE FUNCTION public.whatsapp_gerar_codigo_resposta()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path TO 'public','pg_temp' AS $$
DECLARE c text; i int;
BEGIN
  FOR i IN 1..20 LOOP
    c := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM whatsapp_fila_envios WHERE codigo_resposta = c);
  END LOOP;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_gerar_codigo_resposta() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_gerar_codigo_resposta() TO service_role;

UPDATE public.whatsapp_fila_envios SET codigo_resposta = public.whatsapp_gerar_codigo_resposta()
 WHERE tipo = 'confirmacao_agendamento' AND status = 'agendada' AND codigo_resposta IS NULL;

CREATE OR REPLACE FUNCTION public.whatsapp_limpar_nome(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT nullif(btrim(regexp_replace(translate(coalesce(p,''), '*_~', ''), '\s+', ' ', 'g')), '')
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_nome_responsavel(p_company uuid, p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(
    (SELECT whatsapp_limpar_nome(full_name) FROM profiles WHERE id = p_user),
    (SELECT whatsapp_limpar_nome(coalesce(nullif(nome_fantasia,''), name)) FROM companies WHERE id = p_company))
$$;
REVOKE ALL ON FUNCTION public.whatsapp_nome_responsavel(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_nome_responsavel(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_render_modelo(p_texto text, p_paciente text, p_tipo text, p_primeira_vez boolean, p_medico text, p_data_hora timestamptz, p_responsavel text)
RETURNS text LANGUAGE plpgsql STABLE SET search_path TO 'public','pg_temp' AS $function$
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
  r := replace(r,'{responsavel}',coalesce(whatsapp_limpar_nome(p_responsavel),''));
  r := regexp_replace(r,'[ \t]{2,}',' ','g');
  r := regexp_replace(r,' +([,.!?;:])','\1','g');
  RETURN btrim(r);
END $function$;

CREATE OR REPLACE FUNCTION public.whatsapp_render_modelo(p_texto text, p_paciente text, p_tipo text, p_primeira_vez boolean, p_medico text, p_data_hora timestamptz)
RETURNS text LANGUAGE sql STABLE SET search_path TO 'public','pg_temp' AS $$
  SELECT public.whatsapp_render_modelo(p_texto, p_paciente, p_tipo, p_primeira_vez, p_medico, p_data_hora, NULL::text)
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_cabecalho(p_responsavel text, p_corpo text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN whatsapp_limpar_nome(p_responsavel) IS NULL THEN p_corpo
              ELSE '*' || whatsapp_limpar_nome(p_responsavel) || '*:' || E'\n' || p_corpo END
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_modelo_padrao(p_posicao integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$
  SELECT CASE p_posicao
    WHEN 1 THEN 'Olá, {primeiro_nome}! Tudo bem? Passando para confirmar seu agendamento: {tipo} com {medico} em {data_hora}. Tudo certo?'
    WHEN 2 THEN 'Oi, {paciente}! Você tem um agendamento de {tipo} com {medico} em {data_hora}. Pode confirmar sua presença?'
    WHEN 3 THEN '{primeiro_nome}, tudo certo para {data_hora}? Está agendado: {tipo} com {medico}. Confirma para nós?'
  END
$function$;

CREATE OR REPLACE FUNCTION public.whatsapp_formato_salvar(p_formato text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_c uuid := get_user_company_id(auth.uid()); v_antes text;
BEGIN
  IF v_c IS NULL OR NOT whatsapp_tem_permissao('configuracoes.whatsapp') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_formato NOT IN ('botoes','texto_numerado') THEN RAISE EXCEPTION 'Formato inválido'; END IF;
  INSERT INTO whatsapp_config_empresa(company_id) VALUES (v_c) ON CONFLICT DO NOTHING;
  SELECT formato_confirmacao INTO v_antes FROM whatsapp_config_empresa WHERE company_id = v_c;
  UPDATE whatsapp_config_empresa SET formato_confirmacao = p_formato WHERE company_id = v_c;
  INSERT INTO whatsapp_auditoria(company_id, acao, antes, depois, usuario_id)
  VALUES (v_c, 'formato_confirmacao', jsonb_build_object('formato', v_antes), jsonb_build_object('formato', p_formato), auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_formato_salvar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_formato_salvar(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp_enfileirar_confirmacao(p_agendamento_id uuid, p_horas_antes smallint, p_data_envio date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  a record; v_comp uuid; v_hab boolean; v_tel text; v_t text; v_dh timestamptz;
  v_prox smallint; v_pos smallint; v_txt text; v_tipo text; v_pv boolean;
  v_quando timestamptz; v_id uuid; v_exist uuid; v_conectado boolean; i int; v_resp text;
BEGIN
  SELECT * INTO a FROM appointments WHERE id = p_agendamento_id;
  v_comp := get_user_company_id(auth.uid());
  IF a.id IS NULL OR v_comp IS NULL OR a.company_id <> v_comp THEN
    RETURN jsonb_build_object('ok',false,'codigo','AGENDAMENTO_NAO_ENCONTRADO','mensagem','Agendamento não encontrado.','fila_id',null,'agendada_para',null);
  END IF;
  IF p_horas_antes NOT IN (24,48) THEN
    RETURN jsonb_build_object('ok',false,'codigo','ANTECEDENCIA_INVALIDA','mensagem','Antecedência deve ser 24 ou 48 horas.','fila_id',null,'agendada_para',null);
  END IF;
  SELECT whatsapp_habilitado INTO v_hab FROM companies WHERE id = a.company_id;
  IF NOT coalesce(v_hab,false) THEN
    RETURN jsonb_build_object('ok',false,'codigo','WHATSAPP_NAO_LIBERADO','mensagem','WhatsApp não liberado para a empresa.','fila_id',null,'agendada_para',null);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM whatsapp_instancias WHERE company_id = a.company_id) THEN
    RETURN jsonb_build_object('ok',false,'codigo','SEM_NUMERO_CADASTRADO','mensagem','Nenhum número de WhatsApp cadastrado.','fila_id',null,'agendada_para',null);
  END IF;
  v_dh := (a.date + a.time) AT TIME ZONE 'America/Fortaleza';
  IF v_dh <= now() THEN
    RETURN jsonb_build_object('ok',false,'codigo','AGENDAMENTO_NO_PASSADO','mensagem','O agendamento já passou.','fila_id',null,'agendada_para',null);
  END IF;
  SELECT id INTO v_exist FROM whatsapp_fila_envios
   WHERE agendamento_id = a.id AND tipo='confirmacao_agendamento' AND status NOT IN ('cancelada','falha') LIMIT 1;
  IF v_exist IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'codigo','JA_ENFILEIRADA','mensagem','Confirmação já programada.','fila_id',v_exist,
      'agendada_para',(SELECT agendada_para FROM whatsapp_fila_envios WHERE id=v_exist));
  END IF;
  FOR v_t IN SELECT x FROM (
      SELECT 1 o, p.phone x FROM patients p WHERE p.id = a.patient_id
      UNION ALL SELECT 2, p.phone2 FROM patients p WHERE p.id = a.patient_id
      UNION ALL SELECT 3, a.patient_phone1 UNION ALL SELECT 4, a.patient_phone2) s ORDER BY o
  LOOP
    v_tel := whatsapp_normalizar_celular(v_t);
    EXIT WHEN v_tel IS NOT NULL;
  END LOOP;
  IF v_tel IS NULL THEN
    RETURN jsonb_build_object('ok',false,'codigo','PACIENTE_SEM_TELEFONE_VALIDO','mensagem','Paciente sem celular válido.','fila_id',null,'agendada_para',null);
  END IF;
  INSERT INTO whatsapp_config_empresa(company_id, proximo_modelo) VALUES (a.company_id, 1) ON CONFLICT DO NOTHING;
  SELECT proximo_modelo INTO v_prox FROM whatsapp_config_empresa WHERE company_id = a.company_id FOR UPDATE;
  v_prox := coalesce(v_prox,1);
  FOR i IN 0..2 LOOP
    SELECT posicao, texto INTO v_pos, v_txt FROM whatsapp_modelos_mensagem
     WHERE company_id = a.company_id AND posicao = ((v_prox - 1 + i) % 3) + 1 AND ativo LIMIT 1;
    EXIT WHEN v_pos IS NOT NULL;
  END LOOP;
  IF v_pos IS NULL THEN
    RETURN jsonb_build_object('ok',false,'codigo','SEM_MODELO_ATIVO','mensagem','Nenhum modelo de mensagem ativo.','fila_id',null,'agendada_para',null);
  END IF;
  v_tipo := CASE WHEN a.visit_type = 'return' THEN 'Retorno'
                 WHEN a.appointment_type = 'exam' THEN 'Exame'
                 WHEN a.appointment_type = 'procedure' THEN 'Procedimento'
                 ELSE 'Consulta' END;
  v_pv := a.visit_type = 'first_visit' AND coalesce(a.appointment_type,'consultation') = 'consultation';
  v_resp := whatsapp_nome_responsavel(a.company_id, a.created_by);
  v_quando := (p_data_envio + time '09:00') AT TIME ZONE 'America/Fortaleza';
  IF v_quando < now() THEN v_quando := now(); END IF;
  BEGIN
    INSERT INTO whatsapp_fila_envios(company_id,tipo,agendamento_id,paciente_nome,telefone_destino,modelo_posicao,texto_final,status,agendada_para,horas_antes,criado_por,responsavel_nome,codigo_resposta)
    VALUES (a.company_id,'confirmacao_agendamento',a.id,a.patient_name,v_tel,v_pos,
      whatsapp_cabecalho(v_resp, whatsapp_render_modelo(v_txt,a.patient_name,v_tipo,v_pv,a.doctor,v_dh,v_resp)),
      'agendada',v_quando,p_horas_antes,auth.uid(),v_resp,whatsapp_gerar_codigo_resposta())
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_exist FROM whatsapp_fila_envios WHERE agendamento_id=a.id AND tipo='confirmacao_agendamento' AND status NOT IN ('cancelada','falha') LIMIT 1;
    RETURN jsonb_build_object('ok',true,'codigo','JA_ENFILEIRADA','mensagem','Confirmação já programada.','fila_id',v_exist,'agendada_para',null);
  END;
  UPDATE whatsapp_config_empresa SET proximo_modelo = (v_pos % 3) + 1 WHERE company_id = a.company_id;
  v_conectado := EXISTS (SELECT 1 FROM whatsapp_instancias WHERE company_id=a.company_id AND status='connected');
  IF NOT v_conectado THEN
    RETURN jsonb_build_object('ok',true,'codigo','NENHUM_NUMERO_CONECTADO','mensagem','Programada, mas nenhum número conectado.','fila_id',v_id,'agendada_para',v_quando);
  END IF;
  RETURN jsonb_build_object('ok',true,'codigo','ENFILEIRADA','mensagem','Confirmação programada.','fila_id',v_id,'agendada_para',v_quando);
END $function$;

CREATE OR REPLACE VIEW public.whatsapp_fila_envios_v WITH (security_invoker = false) AS
 SELECT id, company_id, tipo, agendamento_id, paciente_nome,
    (("left"(telefone_destino, 5) || '****'::text) || "right"(telefone_destino, 3)) AS telefone_mascarado,
    modelo_posicao, "left"(texto_final, 80) AS texto_resumo, instancia_id, status, agendada_para, enviada_em,
    erro, criado_por, criado_em, atualizado_em, formato_envio, motivo_plano_b, responsavel_nome
   FROM whatsapp_fila_envios f
  WHERE company_id = get_user_company_id(auth.uid()) AND whatsapp_tem_permissao('whatsapp.fila'::text);