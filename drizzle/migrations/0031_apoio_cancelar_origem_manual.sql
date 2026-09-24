CREATE OR REPLACE FUNCTION public.apoio_cancelar_pedido_exame(_pedido uuid, _exam uuid, _motivo text DEFAULT NULL, _cancelar_no_apoio boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); r apoio_pedido_exame%ROWTYPE; ao attendance_orders%ROWTYPE; nome text; exnome text;
  bid uuid; sid uuid; vals jsonb := '{}'; f record; fid uuid; tarefa text; card uuid; usadoTexto boolean := false;
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
    VALUES (r.company_id, r.id, r.status, 'cancelado', 'manual', coalesce(nullif(_motivo,''), 'Exame cancelado no pedido'), auth.uid());
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
        SELECT id INTO fid FROM support_card_fields WHERE board_id = bid AND field_type IN ('short_text','long_text','text') AND NOT (vals ? id::text) ORDER BY position LIMIT 1;
        IF fid IS NOT NULL THEN vals := vals || jsonb_build_object(fid::text, tarefa); END IF;
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
    -- exame cancelado no apoio não volta sozinho para a fila quando as guias são regravadas
    IF EXISTS (SELECT 1 FROM apoio_pedido_exame pe JOIN apoio_pedido_exame_historico h ON h.pedido_exame_id = pe.id
               WHERE pe.pedido_id = NEW.id AND pe.exame_id = it.exam AND pe.status = 'cancelado' AND h.origem = 'manual') THEN CONTINUE; END IF;
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