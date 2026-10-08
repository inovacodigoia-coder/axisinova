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

  -- 1) PRIMEIRO: aplicar a ação no agendamento (Confirmar Presença / pedido de remarcação ou cancelamento)
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

  -- 2) SÓ DEPOIS: resposta automática ao paciente (cabeçalho em negrito = nome do paciente)
  IF f.respostas_automaticas >= 3 THEN RETURN jsonb_build_object('enviar',false,'resultado',v_res,'motivo','limite'); END IF;
  SELECT texto, ativo INTO v_txt, v_ativo FROM whatsapp_modelos_mensagem
   WHERE company_id = a.company_id AND tipo = 'resposta_' || p_acao AND posicao = 1;
  IF v_txt IS NULL OR NOT v_ativo THEN RETURN jsonb_build_object('enviar',false,'resultado',v_res,'motivo','modelo_inativo'); END IF;
  v_tipo := CASE WHEN a.visit_type = 'return' THEN 'Retorno' WHEN a.appointment_type = 'exam' THEN 'Exame'
                 WHEN a.appointment_type = 'procedure' THEN 'Procedimento' ELSE 'Consulta' END;
  v_pv := a.visit_type = 'first_visit' AND coalesce(a.appointment_type,'consultation') = 'consultation';
  v_dh := (a.date + a.time) AT TIME ZONE 'America/Fortaleza';
  v_final := whatsapp_cabecalho(a.patient_name, whatsapp_render_modelo(v_txt, a.patient_name, v_tipo, v_pv, a.doctor, v_dh, f.responsavel_nome));
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