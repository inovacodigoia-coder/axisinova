CREATE OR REPLACE FUNCTION public.whatsapp_nps_processar(p_instancia uuid, p_telefone text, p_texto text, p_quoted text, p_pode_comentar boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_inst record; f record; a record; r record; nr record; v_m text[]; v_nota int; v_cat text; v_txt text; v_emp text; v_nome text;
  v_rid uuid; v_rf uuid; v_q text[]; v_tipo text; v_cmd text;
BEGIN
  SELECT id, company_id, status INTO v_inst FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_inst.id IS NULL OR coalesce(btrim(p_texto),'') = '' THEN RETURN jsonb_build_object('tratada',false); END IF;
  SELECT coalesce(nullif(btrim(nome_fantasia),''), name) INTO v_emp FROM companies WHERE id = v_inst.company_id;
  SELECT * INTO f FROM whatsapp_fila_envios WHERE false; -- registro vazio, campos NULL
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
