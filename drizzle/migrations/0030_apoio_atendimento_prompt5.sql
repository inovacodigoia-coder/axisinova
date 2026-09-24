-- 1) Troca de bancada: prazo conta a partir do momento da troca e guarda o prazo anterior
CREATE OR REPLACE FUNCTION public.bancada_aplicar_item(_ex jsonb, _exam uuid, _bancada uuid, _origem text, _motivo text, _base date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE pz jsonb; b lab_workbenches%ROWTYPE; nome text; lid uuid; ant text := _ex->>'expectedDeliveryDate';
BEGIN
  -- _base mantido por compatibilidade: a troca sempre conta a partir de agora
  SELECT * INTO b FROM lab_workbenches WHERE id = _bancada;
  IF b.apoio_id IS NOT NULL THEN SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = b.apoio_id; END IF;
  pz := bancada_prazo(_exam, _bancada, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  lid := bancada_laudo(_exam, _bancada);
  _ex := _ex || jsonb_build_object('bancadaId', _bancada, 'bancadaNome', b.name, 'bancadaTipo', b.tipo, 'apoioId', b.apoio_id, 'apoioNome', nome,
    'laudoId', lid, 'bancadaOrigem', _origem, 'bancadaMotivo', _motivo, 'bancadaTrocadaEm', now());
  IF pz->>'prazo' IS NOT NULL THEN
    _ex := _ex || jsonb_build_object('expectedDeliveryDate', (pz->>'prazo') || 'T15:00:00.000Z', 'prazoContagem', pz->>'contagem',
      'prazoRecalculadoTroca', true, 'prazoAnterior', ant);
  END IF;
  RETURN _ex;
END $$;

CREATE OR REPLACE FUNCTION public.bancada_trocar_cadastro(_exam uuid, _bancada uuid, _motivo text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e exams%ROWTYPE; ob lab_workbenches%ROWTYPE; nb lab_workbenches%ROWTYPE; pr jsonb; it record; movidos int := 0; ficam int := 0; naomov jsonb := '[]';
  ao attendance_orders%ROWTYPE; guides jsonb; ex jsonb; st text; antes jsonb := '[]'; cid uuid := get_user_company_id(auth.uid());
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
    antes := antes || jsonb_build_object('pedido_id', it.pedido_id, 'pedido', it.order_number, 'item', it.gi||':'||it.ei, 'prazo_anterior', ex->>'expectedDeliveryDate');
    ex := bancada_aplicar_item(ex, _exam, _bancada, 'troca_cadastro', _motivo, NULL);
    guides := jsonb_set(ao.lab_guides, ARRAY[it.gi::text, 'exams', it.ei::text], ex);
    UPDATE attendance_orders SET lab_guides = guides WHERE id = ao.id;
    movidos := movidos + 1;
  END LOOP;

  PERFORM set_config('bancada.troca', 'on', true);
  UPDATE exams SET workbench_id = _bancada WHERE id = _exam;
  PERFORM set_config('bancada.troca', 'off', true);

  INSERT INTO exame_bancada_troca (company_id, exame_id, bancada_de, bancada_para, tipo, motivo, usuario_id, itens_movidos, detalhes)
  VALUES (cid, _exam, e.workbench_id, _bancada, 'cadastro', _motivo, auth.uid(), movidos,
    jsonb_build_object('ficaram', ficam, 'nao_movidos', naomov, 'avisos', pr->'avisos', 'prazos_anteriores', antes));
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, usuario_id, antes, depois)
  VALUES (cid, 'exams', _exam, 'troca_bancada', auth.uid(), jsonb_build_object('bancada', e.workbench_id), jsonb_build_object('bancada', _bancada, 'movidos', movidos, 'motivo', _motivo));
  RETURN jsonb_build_object('movidos', movidos, 'ficaram', ficam, 'nao_movidos', naomov);
END $$;

CREATE OR REPLACE FUNCTION public.bancada_trocar_pontual(_pedido uuid, _gi integer, _ei integer, _bancada uuid, _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ao attendance_orders%ROWTYPE; ex jsonb; exam uuid; e exams%ROWTYPE; ob lab_workbenches%ROWTYPE; nb lab_workbenches%ROWTYPE; pr jsonb; st text; col boolean; ant text; cid uuid := get_user_company_id(auth.uid());
BEGIN
  IF nullif(trim(coalesce(_motivo,'')),'') IS NULL THEN RAISE EXCEPTION 'Informe o motivo da troca'; END IF;
  IF NOT apoio_tem_permissao('apoio.bancada.trocar_pontual') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.bancada.trocar_pontual"'; END IF;
  SELECT * INTO ao FROM attendance_orders WHERE id = _pedido AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF coalesce(ao.status,'') IN ('deleted','cancelled') THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  ex := ao.lab_guides->_gi->'exams'->_ei;
  IF ex IS NULL THEN RAISE EXCEPTION 'Exame não encontrado no pedido'; END IF;
  exam := (ex->>'id')::uuid;
  ant := ex->>'expectedDeliveryDate';
  SELECT * INTO e FROM exams WHERE id = exam;
  SELECT * INTO nb FROM lab_workbenches WHERE id = _bancada AND company_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bancada não encontrada'; END IF;
  SELECT * INTO ob FROM lab_workbenches WHERE id = coalesce(nullif(ex->>'bancadaId','')::uuid, e.workbench_id);
  IF ob.id IS NOT DISTINCT FROM _bancada THEN RAISE EXCEPTION 'O exame já está nesta bancada'; END IF;
  IF bancada_item_tem_resultado(_pedido, exam) THEN RAISE EXCEPTION 'Este exame já tem resultado e não pode trocar de bancada'; END IF;
  pr := bancada_prontidao(exam, _bancada);
  IF jsonb_array_length(pr->'bloqueios') > 0 THEN RAISE EXCEPTION 'Troca bloqueada: %', pr->'bloqueios'->>0; END IF;
  col := bancada_item_coletado(ao.status, ex);

  IF coalesce(ob.tipo,'interna') = 'apoio' THEN
    st := bancada_cancelar_apoio(_pedido, exam, _motivo);
    IF st NOT IN ('cancelado','sem_apoio') THEN
      RAISE EXCEPTION 'O exame já foi transmitido ao apoio (status %). Cancele no apoio primeiro.', st;
    END IF;
    ex := ex - 'integracaoCancelada';
  ELSIF nb.tipo = 'apoio' AND col THEN
    ex := ex || jsonb_build_object('integracaoCancelada', true);
  END IF;

  ex := bancada_aplicar_item(ex, exam, _bancada, 'troca_pontual', _motivo, NULL);
  UPDATE attendance_orders SET lab_guides = jsonb_set(ao.lab_guides, ARRAY[_gi::text, 'exams', _ei::text], ex) WHERE id = ao.id;

  INSERT INTO exame_bancada_troca (company_id, exame_id, bancada_de, bancada_para, tipo, pedido_id, pedido_item_ref, motivo, usuario_id, itens_movidos, detalhes)
  VALUES (cid, exam, ob.id, _bancada, 'pontual', _pedido, _gi||':'||_ei, _motivo, auth.uid(), 1,
    jsonb_build_object('coletado', col, 'avisos', pr->'avisos', 'prazo_anterior', ant, 'prazo_novo', ex->>'expectedDeliveryDate'));
  RETURN jsonb_build_object('ok', true, 'item', ex);
END $$;

-- 2) Criação da linha do apoio: modo pela contingência, info complementar do atendimento; cancela junto com o pedido
CREATE OR REPLACE FUNCTION public.attendance_orders_criar_apoio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; cod text; preco numeric; fict boolean; contg boolean; r record; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF coalesce(NEW.status,'') IN ('deleted','cancelled') THEN
    IF TG_OP = 'UPDATE' AND coalesce(OLD.status,'') NOT IN ('deleted','cancelled') THEN
      FOR r IN SELECT id, status, company_id FROM apoio_pedido_exame WHERE pedido_id = NEW.id AND status IN ('aguardando_remessa','em_remessa') LOOP
        PERFORM set_config('apoio.mudar_status', 'on', true);
        UPDATE apoio_pedido_exame SET status = 'cancelado', remessa_id = NULL WHERE id = r.id;
        PERFORM set_config('apoio.mudar_status', 'off', true);
        INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id)
        VALUES (r.company_id, r.id, r.status, 'cancelado', 'sistema', 'Pedido cancelado no atendimento', auth.uid());
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.lab_guides) <> 'array' THEN RETURN NEW; END IF;
  IF NOT apoio_modulo_liberado(NEW.company_id) THEN RETURN NEW; END IF;
  FOR it IN
    SELECT DISTINCT ON ((x->>'id')::uuid) (x->>'id')::uuid exam, (x->>'apoioId')::uuid apoio,
      CASE WHEN jsonb_typeof(x->'apoioInfo') = 'object' THEN x->'apoioInfo' ELSE '{}'::jsonb END info
    FROM jsonb_array_elements(NEW.lab_guides) g, jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams')='array' THEN g->'exams' ELSE '[]'::jsonb END) x
    WHERE x->>'bancadaTipo' = 'apoio' AND nullif(x->>'apoioId','') IS NOT NULL AND coalesce((x->>'cancelled')::boolean,false) = false
  LOOP
    IF EXISTS (SELECT 1 FROM apoio_pedido_exame pe WHERE pe.pedido_id = NEW.id AND pe.exame_id = it.exam AND pe.status <> 'cancelado') THEN CONTINUE; END IF;
    BEGIN
      cod := NULL; preco := NULL; fict := NULL;
      SELECT d.codigo_apoio INTO cod FROM apoio_depara_exame d WHERE d.exame_id = it.exam AND d.apoio_id = it.apoio AND d.ativo LIMIT 1;
      SELECT x.preco, x.ficticio INTO preco, fict FROM apoio_preco x WHERE x.apoio_id = it.apoio AND x.codigo = cod
        AND x.vigencia_inicio <= hoje AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje) ORDER BY x.vigencia_inicio DESC LIMIT 1;
      SELECT coalesce(modo_contingencia, false) INTO contg FROM apoio_laboratorio WHERE id = it.apoio;
      INSERT INTO apoio_pedido_exame (company_id, pedido_id, exame_id, apoio_id, codigo_apoio, status, modo, custo_previsto, preco_ficticio, info_complementar)
      VALUES (NEW.company_id, NEW.id, it.exam, it.apoio, cod, 'aguardando_remessa', CASE WHEN contg THEN 'manual' ELSE 'automatico' END, preco, coalesce(fict,false), it.info);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'apoio_pedido_exame não criado (pedido %, exame %): %', NEW.id, it.exam, SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END $$;

-- 3) Dados do apoio para o atendimento (info complementar, condições, opções de troca)
CREATE OR REPLACE FUNCTION public.apoio_exame_atendimento(_exam uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); e exams%ROWTYPE; opc jsonb := '[]'; b record; pr jsonb; pz jsonb; cod text; cat apoio_catalogo_exame%ROWTYPE;
  preco numeric; fict boolean; vepreco boolean := apoio_tem_permissao('apoio.financeiro.ver') OR apoio_tem_permissao('apoio.catalogo.gerenciar');
  hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT * INTO e FROM exams WHERE id = _exam AND company_id = cid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  FOR b IN SELECT w.*, a.nome apoio_nome, a.modo_contingencia FROM lab_workbenches w LEFT JOIN apoio_laboratorio a ON a.id = w.apoio_id
           WHERE w.company_id = cid AND coalesce(w.is_active, true) AND (w.tipo <> 'apoio' OR coalesce(a.ativo, false)) ORDER BY w.tipo, w.name LOOP
    pr := bancada_prontidao(_exam, b.id);
    IF jsonb_array_length(pr->'bloqueios') > 0 THEN CONTINUE; END IF;
    pz := bancada_prazo(_exam, b.id, hoje);
    cod := NULL; preco := NULL; fict := NULL; cat := NULL;
    IF b.tipo = 'apoio' THEN
      SELECT codigo_apoio INTO cod FROM apoio_depara_exame WHERE exame_id = _exam AND apoio_id = b.apoio_id AND ativo LIMIT 1;
      SELECT x.preco, x.ficticio INTO preco, fict FROM apoio_preco x WHERE x.apoio_id = b.apoio_id AND x.codigo = cod
        AND x.vigencia_inicio <= hoje AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje) ORDER BY x.vigencia_inicio DESC LIMIT 1;
      SELECT * INTO cat FROM apoio_catalogo_exame WHERE apoio_id = b.apoio_id AND codigo = cod LIMIT 1;
    END IF;
    opc := opc || jsonb_build_object('bancada_id', b.id, 'bancada_nome', b.name, 'tipo', b.tipo, 'apoio_id', b.apoio_id, 'apoio_nome', b.apoio_nome,
      'modo', CASE WHEN b.modo_contingencia THEN 'manual' ELSE 'automatico' END, 'codigo_apoio', cod,
      'preco', CASE WHEN vepreco THEN preco END, 'tem_preco', preco IS NOT NULL, 'ficticio', coalesce(fict,false),
      'info_comp', coalesce(cat.info_comp, '[]'::jsonb), 'condicoes', coalesce(cat.condicoes, '[]'::jsonb),
      'laudo_id', bancada_laudo(_exam, b.id), 'atual', b.id = e.workbench_id) || pz;
  END LOOP;
  RETURN jsonb_build_object('bancada_atual', e.workbench_id, 'opcoes', opc);
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_exame_atendimento(uuid) TO authenticated;

-- 4) Cancelar exame do pedido que foi para o apoio
CREATE OR REPLACE FUNCTION public.apoio_cancelar_pedido_exame(_pedido uuid, _exam uuid, _motivo text DEFAULT NULL, _cancelar_no_apoio boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); r apoio_pedido_exame%ROWTYPE; ao attendance_orders%ROWTYPE; nome text; exnome text;
  bid uuid; sid uuid; vals jsonb := '{}'; f record; tarefa text; card uuid; usadoTexto boolean := false;
BEGIN
  SELECT * INTO ao FROM attendance_orders WHERE id = _pedido AND company_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  SELECT * INTO r FROM apoio_pedido_exame WHERE pedido_id = _pedido AND exame_id = _exam AND status <> 'cancelado' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('resultado', 'sem_apoio'); END IF;
  SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = r.apoio_id;
  IF r.status IN ('aguardando_remessa','em_remessa') THEN
    PERFORM set_config('apoio.mudar_status', 'on', true);
    UPDATE apoio_pedido_exame SET status = 'cancelado', remessa_id = NULL WHERE id = r.id;
    PERFORM set_config('apoio.mudar_status', 'off', true);
    INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id)
    VALUES (r.company_id, r.id, r.status, 'cancelado', 'usuario', coalesce(nullif(_motivo,''), 'Exame cancelado no pedido'), auth.uid());
    RETURN jsonb_build_object('resultado', 'cancelado', 'apoio_nome', nome);
  END IF;
  IF r.status IN ('liberado_apoio','importado','importado_com_pendencia','liberado_local') THEN
    RETURN jsonb_build_object('resultado', 'finalizado', 'apoio_nome', nome, 'status', r.status);
  END IF;
  IF _cancelar_no_apoio IS NULL THEN
    RETURN jsonb_build_object('resultado', 'confirmar', 'apoio_nome', nome, 'status', r.status, 'modo', r.modo);
  END IF;
  IF NOT _cancelar_no_apoio THEN RETURN jsonb_build_object('resultado', 'mantido', 'apoio_nome', nome); END IF;

  UPDATE apoio_pedido_exame SET info_complementar = coalesce(info_complementar,'{}'::jsonb) || jsonb_build_object(
    'cancelar_no_apoio', true, 'cancelamento_solicitado_em', now(), 'cancelamento_solicitado_por', auth.uid(), 'cancelamento_motivo', _motivo)
  WHERE id = r.id;

  IF r.modo = 'manual' THEN
    SELECT name INTO exnome FROM exams WHERE id = _exam;
    tarefa := format('Cancelar no portal do %s — pedido %s, exame %s%s', nome, coalesce(ao.order_number, ao.protocol, ''), coalesce(exnome,''), coalesce(': ' || nullif(_motivo,''), ''));
    SELECT id INTO bid FROM support_boards WHERE company_id = cid ORDER BY (name ILIKE '%apoio%') DESC, created_at LIMIT 1;
    IF bid IS NOT NULL THEN
      SELECT id INTO sid FROM support_board_stages WHERE board_id = bid ORDER BY is_start DESC, position LIMIT 1;
      FOR f IN SELECT * FROM support_card_fields WHERE board_id = bid ORDER BY position LOOP
        IF f.label ILIKE '%paciente%' THEN vals := vals || jsonb_build_object(f.id::text, coalesce(ao.patient_name,''));
        ELSIF f.label ILIKE '%exame%' THEN vals := vals || jsonb_build_object(f.id::text, coalesce(exnome,''));
        ELSIF f.field_type = 'date' AND f.label ILIKE '%solicit%' THEN vals := vals || jsonb_build_object(f.id::text, to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD'));
        ELSIF NOT usadoTexto AND f.field_type IN ('short_text','long_text','text') AND (f.label ILIKE '%observ%' OR f.label ILIKE '%descri%' OR f.label ILIKE '%tarefa%') THEN
          vals := vals || jsonb_build_object(f.id::text, tarefa); usadoTexto := true;
        END IF;
      END LOOP;
      IF NOT usadoTexto THEN
        SELECT id INTO f FROM support_card_fields WHERE board_id = bid AND field_type IN ('short_text','long_text','text') AND NOT (vals ? id::text) ORDER BY position LIMIT 1;
        IF f.id IS NOT NULL THEN vals := vals || jsonb_build_object(f.id::text, tarefa); END IF;
      END IF;
      vals := vals || jsonb_build_object('tarefa', tarefa);
      INSERT INTO support_cards (company_id, board_id, stage_id, values, created_by, updated_by, source_order_id, source_protocol, source_order_number)
      VALUES (cid, bid, sid, vals, auth.uid(), auth.uid(), ao.id, ao.protocol, ao.order_number) RETURNING id INTO card;
    END IF;
    UPDATE apoio_pedido_exame SET info_complementar = info_complementar || jsonb_build_object('tarefa_cancelamento', tarefa, 'tarefa_card_id', card) WHERE id = r.id;
    RETURN jsonb_build_object('resultado', 'marcado', 'apoio_nome', nome, 'tarefa_criada', card IS NOT NULL, 'sem_quadro', bid IS NULL);
  END IF;
  RETURN jsonb_build_object('resultado', 'marcado', 'apoio_nome', nome, 'tarefa_criada', false);
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_cancelar_pedido_exame(uuid, uuid, text, boolean) TO authenticated;