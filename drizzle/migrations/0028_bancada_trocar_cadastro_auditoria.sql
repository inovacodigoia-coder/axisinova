CREATE OR REPLACE FUNCTION public.bancada_trocar_cadastro(_exam uuid, _bancada uuid, _motivo text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e exams%ROWTYPE; ob lab_workbenches%ROWTYPE; nb lab_workbenches%ROWTYPE; pr jsonb; it record; movidos int := 0; ficam int := 0; naomov jsonb := '[]';
  ao attendance_orders%ROWTYPE; guides jsonb; ex jsonb; st text; cid uuid := get_user_company_id(auth.uid());
BEGIN
  SELECT * INTO e FROM exams WHERE id = _exam AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame não encontrado'; END IF;
  SELECT * INTO nb FROM lab_workbenches WHERE id = _bancada AND company_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bancada não encontrada'; END IF;
  SELECT * INTO ob FROM lab_workbenches WHERE id = e.workbench_id;
  IF e.workbench_id IS NOT DISTINCT FROM _bancada THEN RAISE EXCEPTION 'O exame já está nesta bancada'; END IF;
  IF (nb.tipo = 'apoio' OR coalesce(ob.tipo,'interna') = 'apoio') AND NOT apoio_tem_permissao('apoio.bancada.trocar_cadastro') THEN
    RAISE EXCEPTION 'Você não tem a permissão "apoio.bancada.trocar_cadastro"';
  END IF;
  pr := bancada_prontidao(_exam, _bancada);
  IF jsonb_array_length(pr->'bloqueios') > 0 THEN RAISE EXCEPTION 'Troca bloqueada: %', pr->'bloqueios'->>0; END IF;

  FOR it IN SELECT * FROM bancada_itens_exame(_exam) WHERE bancada_id IS NOT DISTINCT FROM e.workbench_id ORDER BY pedido_id, gi, ei LOOP
    IF it.coletado THEN ficam := ficam + 1; CONTINUE; END IF;
    IF coalesce(ob.tipo,'interna') = 'apoio' THEN
      st := bancada_cancelar_apoio(it.pedido_id, _exam, _motivo);
      IF st NOT IN ('cancelado','sem_apoio') THEN
        naomov := naomov || jsonb_build_object('pedido', it.order_number, 'paciente', it.paciente, 'motivo', 'não movido: já em remessa (' || st || ')');
        CONTINUE;
      END IF;
    END IF;
    SELECT * INTO ao FROM attendance_orders WHERE id = it.pedido_id FOR UPDATE;
    ex := ao.lab_guides->it.gi->'exams'->it.ei;
    ex := bancada_aplicar_item(ex, _exam, _bancada, 'troca_cadastro', _motivo, (ao.created_at AT TIME ZONE 'America/Sao_Paulo')::date);
    guides := jsonb_set(ao.lab_guides, ARRAY[it.gi::text, 'exams', it.ei::text], ex);
    UPDATE attendance_orders SET lab_guides = guides WHERE id = ao.id;
    movidos := movidos + 1;
  END LOOP;

  PERFORM set_config('bancada.troca', 'on', true);
  UPDATE exams SET workbench_id = _bancada WHERE id = _exam;
  PERFORM set_config('bancada.troca', 'off', true);

  INSERT INTO exame_bancada_troca (company_id, exame_id, bancada_de, bancada_para, tipo, motivo, usuario_id, itens_movidos, detalhes)
  VALUES (cid, _exam, e.workbench_id, _bancada, 'cadastro', _motivo, auth.uid(), movidos, jsonb_build_object('ficaram', ficam, 'nao_movidos', naomov, 'avisos', pr->'avisos'));
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, usuario_id, antes, depois)
  VALUES (cid, 'exams', _exam, 'troca_bancada', auth.uid(), jsonb_build_object('bancada', e.workbench_id), jsonb_build_object('bancada', _bancada, 'movidos', movidos, 'motivo', _motivo));
  RETURN jsonb_build_object('movidos', movidos, 'ficaram', ficam, 'nao_movidos', naomov);
END $$;