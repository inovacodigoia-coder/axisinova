-- 4B: Bancada Técnica decide o destino (interna x apoio)
ALTER TABLE public.lab_workbenches
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'interna',
  ADD COLUMN IF NOT EXISTS apoio_id uuid REFERENCES public.apoio_laboratorio(id);
ALTER TABLE public.lab_workbenches ADD CONSTRAINT lab_workbenches_tipo_chk CHECK (tipo IN ('interna','apoio'));
ALTER TABLE public.lab_workbenches ADD CONSTRAINT lab_workbenches_apoio_chk CHECK ((tipo = 'apoio') = (apoio_id IS NOT NULL));

CREATE OR REPLACE FUNCTION public.lab_workbench_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; r public.lab_workbenches%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.apoio_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM apoio_laboratorio a WHERE a.id = NEW.apoio_id AND a.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'O laboratório de apoio escolhido não pertence a esta empresa';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND coalesce(OLD.is_active,true) AND NOT coalesce(NEW.is_active,true)) THEN
    SELECT count(*) INTO n FROM exams e WHERE e.workbench_id = OLD.id;
    IF n > 0 THEN
      RAISE EXCEPTION 'Esta bancada é usada por % exame(s). Troque a bancada desses exames antes de excluir ou inativar.', n;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.tipo IS DISTINCT FROM NEW.tipo OR OLD.apoio_id IS DISTINCT FROM NEW.apoio_id) THEN
    SELECT count(*) INTO n FROM exams e WHERE e.workbench_id = OLD.id;
    IF n > 0 THEN
      RAISE EXCEPTION 'Não é possível mudar o tipo ou o apoio de uma bancada usada por % exame(s). Crie uma bancada nova e troque a bancada dos exames.', n;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lab_workbench_guard BEFORE INSERT OR UPDATE OR DELETE ON public.lab_workbenches
  FOR EACH ROW EXECUTE FUNCTION public.lab_workbench_guard();

-- Laudo por bancada
CREATE TABLE public.exame_laudo_bancada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  exame_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  bancada_id uuid NOT NULL REFERENCES public.lab_workbenches(id) ON DELETE CASCADE,
  laudo_id uuid REFERENCES public.exam_laudos(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exame_id, bancada_id)
);
COMMENT ON COLUMN public.exame_laudo_bancada.laudo_id IS 'Laudo usado quando o exame roda nesta bancada. NULL = laudo padrão do exame.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exame_laudo_bancada TO authenticated;
GRANT ALL ON public.exame_laudo_bancada TO service_role;
ALTER TABLE public.exame_laudo_bancada ENABLE ROW LEVEL SECURITY;
CREATE POLICY elb_select ON public.exame_laudo_bancada FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY elb_insert ON public.exame_laudo_bancada FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY elb_update ON public.exame_laudo_bancada FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid())) WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY elb_delete ON public.exame_laudo_bancada FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE TRIGGER upd_exame_laudo_bancada BEFORE UPDATE ON public.exame_laudo_bancada FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico de trocas
CREATE TABLE public.exame_bancada_troca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  exame_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  bancada_de uuid REFERENCES public.lab_workbenches(id) ON DELETE SET NULL,
  bancada_para uuid REFERENCES public.lab_workbenches(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('cadastro','pontual')),
  pedido_id uuid REFERENCES public.attendance_orders(id) ON DELETE SET NULL,
  pedido_item_ref text,
  motivo text,
  usuario_id uuid,
  itens_movidos int NOT NULL DEFAULT 0,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.exame_bancada_troca.pedido_item_ref IS 'Item do pedido: "<indice guia>:<indice exame>" dentro de attendance_orders.lab_guides';
GRANT SELECT ON public.exame_bancada_troca TO authenticated;
GRANT ALL ON public.exame_bancada_troca TO service_role;
ALTER TABLE public.exame_bancada_troca ENABLE ROW LEVEL SECURITY;
CREATE POLICY ebt_select ON public.exame_bancada_troca FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));

-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.bancada_laudo(_exam uuid, _bancada uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT laudo_id FROM exame_laudo_bancada WHERE exame_id = _exam AND bancada_id = _bancada AND ativo),
    (SELECT id FROM exam_laudos WHERE exam_id = _exam AND workbench_id = _bancada AND coalesce(is_active,true) ORDER BY sort_order LIMIT 1));
$$;

CREATE OR REPLACE FUNCTION public.bancada_tem_laudo(_exam uuid, _bancada uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM exame_laudo_bancada WHERE exame_id = _exam AND bancada_id = _bancada AND ativo)
      OR EXISTS (SELECT 1 FROM exam_laudos WHERE exam_id = _exam AND workbench_id = _bancada AND coalesce(is_active,true));
$$;

-- Prazo de um exame numa bancada (data), a partir de uma data inicial
CREATE OR REPLACE FUNCTION public.bancada_prazo(_exam uuid, _bancada uuid, _de date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b lab_workbenches%ROWTYPE; e exams%ROWTYPE; al apoio_laboratorio%ROWTYPE; cod text; dias int; lid uuid; ld int; cont text; semp boolean := false;
BEGIN
  SELECT * INTO e FROM exams WHERE id = _exam;
  SELECT * INTO b FROM lab_workbenches WHERE id = _bancada;
  IF b.tipo = 'apoio' THEN
    SELECT * INTO al FROM apoio_laboratorio WHERE id = b.apoio_id;
    SELECT codigo_apoio INTO cod FROM apoio_depara_exame WHERE exame_id = _exam AND apoio_id = b.apoio_id AND ativo LIMIT 1;
    dias := CASE WHEN cod IS NOT NULL THEN apoio_prazo_vigente(b.apoio_id, cod, _de) END;
    semp := dias IS NULL;
    dias := coalesce(dias, e.result_deadline_days);
    cont := coalesce(al.prazo_contagem, 'uteis');
    IF dias IS NULL THEN RETURN jsonb_build_object('prazo', NULL, 'contagem', cont, 'sem_prazo_apoio', semp); END IF;
    RETURN jsonb_build_object('prazo', calcular_prazo(e.company_id, _de, dias + coalesce(al.dias_transporte,0), cont), 'contagem', cont, 'sem_prazo_apoio', semp, 'codigo_apoio', cod);
  END IF;
  lid := bancada_laudo(_exam, _bancada);
  IF lid IS NOT NULL THEN SELECT result_deadline_days INTO ld FROM exam_laudos WHERE id = lid; END IF;
  dias := coalesce(ld, e.result_deadline_days);
  cont := coalesce(e.prazo_contagem, 'corridos');
  IF dias IS NULL THEN RETURN jsonb_build_object('prazo', NULL, 'contagem', cont); END IF;
  RETURN jsonb_build_object('prazo', calcular_prazo(e.company_id, _de, dias, cont), 'contagem', cont);
END $$;

-- Destino do exame (usado no atendimento)
CREATE OR REPLACE FUNCTION public.exame_destino(_exam_id uuid, _bancada_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e exams%ROWTYPE; b lab_workbenches%ROWTYPE; nome text; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT * INTO e FROM exams WHERE id = _exam_id AND company_id = get_user_company_id(auth.uid());
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO b FROM lab_workbenches WHERE id = coalesce(_bancada_id, e.workbench_id);
  IF NOT FOUND THEN RETURN jsonb_build_object('bancada_id', NULL, 'tipo', 'interna'); END IF;
  IF b.apoio_id IS NOT NULL THEN SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = b.apoio_id; END IF;
  RETURN jsonb_build_object('bancada_id', b.id, 'bancada_nome', b.name, 'tipo', b.tipo, 'apoio_id', b.apoio_id, 'apoio_nome', nome,
    'laudo_id', bancada_laudo(e.id, b.id)) || bancada_prazo(e.id, b.id, hoje);
END $$;

-- Prontidão da bancada nova
CREATE OR REPLACE FUNCTION public.bancada_prontidao(_exam uuid, _bancada uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b lab_workbenches%ROWTYPE; d apoio_depara_exame%ROWTYPE; bl text[] := '{}'; av text[] := '{}'; tot int; map int; nome text; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT * INTO b FROM lab_workbenches WHERE id = _bancada AND company_id = get_user_company_id(auth.uid());
  IF NOT FOUND THEN RETURN jsonb_build_object('bloqueios', jsonb_build_array('Bancada não encontrada'), 'avisos', '[]'::jsonb); END IF;
  IF NOT coalesce(b.is_active, true) THEN bl := bl || 'A bancada está inativa'; END IF;
  IF NOT bancada_tem_laudo(_exam, _bancada) THEN bl := bl || format('Nenhum laudo ligado a este exame na bancada "%s" (aba Laudo do Exame › Laudo por bancada)', b.name); END IF;
  IF b.tipo = 'apoio' THEN
    SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = b.apoio_id;
    SELECT * INTO d FROM apoio_depara_exame WHERE exame_id = _exam AND apoio_id = b.apoio_id AND ativo LIMIT 1;
    IF NOT FOUND THEN
      bl := bl || format('Este exame não tem De/Para ativo com o apoio %s (Terceirização › Exames terceirizados)', nome);
    ELSE
      tot := coalesce(jsonb_array_length(d.modelo), 0);
      SELECT count(*) INTO map FROM apoio_depara_analito a WHERE a.depara_exame_id = d.id AND a.codigo_formato = coalesce(d.codigo_formato,'') AND (a.parametro_id IS NOT NULL OR a.ignorar);
      IF tot = 0 THEN bl := bl || format('O modelo do apoio %s ainda não foi carregado no De/Para de analitos', nome);
      ELSIF map < tot THEN bl := bl || format('Faltam %s analito(s) para mapear no De/Para com o apoio %s', tot - map, nome); END IF;
      IF d.modelo_mudou THEN bl := bl || 'O modelo do apoio mudou e o De/Para de analitos precisa ser revisado'; END IF;
      IF NOT EXISTS (SELECT 1 FROM apoio_preco x WHERE x.apoio_id = b.apoio_id AND x.codigo = d.codigo_apoio AND x.vigencia_inicio <= hoje AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje)) THEN
        av := av || format('Sem preço vigente no apoio %s para este exame', nome);
      END IF;
    END IF;
  ELSE
    av := av || 'Confirme que o exame está mapeado no ServidorAisaxius/equipamento';
  END IF;
  RETURN jsonb_build_object('bloqueios', to_jsonb(bl), 'avisos', to_jsonb(av), 'tipo', b.tipo, 'apoio_nome', nome, 'bancada_nome', b.name);
END $$;

-- Situação de um item (coletado / com resultado)
CREATE OR REPLACE FUNCTION public.bancada_item_coletado(_order_status text, _ex jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(_order_status,'') IN ('collection_done','in_analysis','validation','released','completed')
      OR coalesce((_ex->>'collected')::boolean,false) OR coalesce((_ex->>'isColeta')::boolean,false)
      OR nullif(_ex->>'collectedAt','') IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.bancada_item_tem_resultado(_order uuid, _exam uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM lab_exam_results r WHERE r.order_id = _order AND r.exam_catalog_id = _exam
    AND (r.status IN ('digitized','released') OR EXISTS (SELECT 1 FROM lab_result_values v WHERE v.result_id = r.id)));
$$;

-- Itens de pedidos em aberto de um exame
CREATE OR REPLACE FUNCTION public.bancada_itens_exame(_exam uuid)
RETURNS TABLE(pedido_id uuid, order_number text, paciente text, criado_em timestamptz, gi int, ei int, bancada_id uuid, origem text, coletado boolean, apoio_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ao.id, coalesce(ao.order_number, ao.protocol), ao.patient_name, ao.created_at, (g.o - 1)::int, (x.o - 1)::int,
    coalesce(nullif(x.ex->>'bancadaId','')::uuid, e.workbench_id), coalesce(x.ex->>'bancadaOrigem','cadastro'),
    bancada_item_coletado(ao.status, x.ex),
    (SELECT pe.status::text FROM apoio_pedido_exame pe WHERE pe.pedido_id = ao.id AND pe.exame_id = _exam AND pe.status <> 'cancelado' ORDER BY pe.created_at DESC LIMIT 1)
  FROM exams e
  JOIN attendance_orders ao ON ao.company_id = e.company_id
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides)='array' THEN ao.lab_guides ELSE '[]'::jsonb END) WITH ORDINALITY g(gd, o)
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(g.gd->'exams')='array' THEN g.gd->'exams' ELSE '[]'::jsonb END) WITH ORDINALITY x(ex, o)
  WHERE e.id = _exam AND (x.ex->>'id') = _exam::text
    AND coalesce(ao.status,'') NOT IN ('deleted','cancelled','completed','released')
    AND coalesce((x.ex->>'cancelled')::boolean,false) = false;
$$;

CREATE OR REPLACE FUNCTION public.bancada_troca_previa(_exam uuid, _bancada uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e exams%ROWTYPE; nb lab_workbenches%ROWTYPE; mover jsonb := '[]'; ficam jsonb := '[]'; naomov jsonb := '[]'; it record; j jsonb;
BEGIN
  SELECT * INTO e FROM exams WHERE id = _exam AND company_id = get_user_company_id(auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame não encontrado'; END IF;
  SELECT * INTO nb FROM lab_workbenches WHERE id = _bancada;
  FOR it IN SELECT * FROM bancada_itens_exame(_exam) WHERE bancada_id IS NOT DISTINCT FROM e.workbench_id ORDER BY criado_em LOOP
    j := jsonb_build_object('pedido_id', it.pedido_id, 'pedido', it.order_number, 'paciente', it.paciente, 'data', it.criado_em, 'ref', it.gi||':'||it.ei);
    IF it.coletado THEN ficam := ficam || j;
    ELSIF it.apoio_status IS NOT NULL AND it.apoio_status <> 'aguardando_remessa' AND coalesce(nb.tipo,'interna') = 'interna' THEN
      naomov := naomov || (j || jsonb_build_object('motivo', 'não movido: já em remessa'));
    ELSE mover := mover || j; END IF;
  END LOOP;
  RETURN jsonb_build_object('mover', mover, 'ficam', ficam, 'nao_movidos', naomov);
END $$;

-- Aplica a bancada num item (JSON) e devolve o item novo
CREATE OR REPLACE FUNCTION public.bancada_aplicar_item(_ex jsonb, _exam uuid, _bancada uuid, _origem text, _motivo text, _base date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE pz jsonb; b lab_workbenches%ROWTYPE; nome text; lid uuid;
BEGIN
  SELECT * INTO b FROM lab_workbenches WHERE id = _bancada;
  IF b.apoio_id IS NOT NULL THEN SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = b.apoio_id; END IF;
  pz := bancada_prazo(_exam, _bancada, _base);
  lid := bancada_laudo(_exam, _bancada);
  _ex := _ex || jsonb_build_object('bancadaId', _bancada, 'bancadaNome', b.name, 'bancadaTipo', b.tipo, 'apoioId', b.apoio_id, 'apoioNome', nome,
    'laudoId', lid, 'bancadaOrigem', _origem, 'bancadaMotivo', _motivo, 'bancadaTrocadaEm', now());
  IF pz->>'prazo' IS NOT NULL THEN
    _ex := _ex || jsonb_build_object('expectedDeliveryDate', (pz->>'prazo') || 'T15:00:00.000Z', 'prazoContagem', pz->>'contagem');
  END IF;
  RETURN _ex;
END $$;

-- Cancela o apoio_pedido_exame de um item (sai da remessa se preciso)
CREATE OR REPLACE FUNCTION public.bancada_cancelar_apoio(_pedido uuid, _exam uuid, _motivo text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r apoio_pedido_exame%ROWTYPE;
BEGIN
  SELECT * INTO r FROM apoio_pedido_exame WHERE pedido_id = _pedido AND exame_id = _exam AND status <> 'cancelado' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN 'sem_apoio'; END IF;
  IF r.status NOT IN ('aguardando_remessa','em_remessa') THEN RETURN r.status::text; END IF;
  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE apoio_pedido_exame SET status = 'cancelado', remessa_id = NULL WHERE id = r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);
  INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id)
  VALUES (r.company_id, r.id, r.status, 'cancelado', 'sistema', coalesce('Troca de bancada: ' || nullif(_motivo,''), 'Troca de bancada'), auth.uid());
  RETURN 'cancelado';
END $$;

-- Troca no cadastro
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
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, usuario_id, dados_antes, dados_depois)
  SELECT cid, 'exams', _exam, 'troca_bancada', auth.uid(), jsonb_build_object('bancada', e.workbench_id), jsonb_build_object('bancada', _bancada, 'movidos', movidos)
  WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='apoio_auditoria' AND column_name='dados_depois');
  RETURN jsonb_build_object('movidos', movidos, 'ficaram', ficam, 'nao_movidos', naomov);
END $$;

-- Troca pontual (um item de um pedido)
CREATE OR REPLACE FUNCTION public.bancada_trocar_pontual(_pedido uuid, _gi int, _ei int, _bancada uuid, _motivo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ao attendance_orders%ROWTYPE; ex jsonb; exam uuid; e exams%ROWTYPE; ob lab_workbenches%ROWTYPE; nb lab_workbenches%ROWTYPE; pr jsonb; st text; col boolean; cid uuid := get_user_company_id(auth.uid());
BEGIN
  IF nullif(trim(coalesce(_motivo,'')),'') IS NULL THEN RAISE EXCEPTION 'Informe o motivo da troca'; END IF;
  IF NOT apoio_tem_permissao('apoio.bancada.trocar_pontual') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.bancada.trocar_pontual"'; END IF;
  SELECT * INTO ao FROM attendance_orders WHERE id = _pedido AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF coalesce(ao.status,'') IN ('deleted','cancelled') THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  ex := ao.lab_guides->_gi->'exams'->_ei;
  IF ex IS NULL THEN RAISE EXCEPTION 'Exame não encontrado no pedido'; END IF;
  exam := (ex->>'id')::uuid;
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
    -- já pode ter ido ao ServidorAisaxius: avisar com status cancelled
    ex := ex || jsonb_build_object('integracaoCancelada', true);
  END IF;

  ex := bancada_aplicar_item(ex, exam, _bancada, 'troca_pontual', _motivo, (ao.created_at AT TIME ZONE 'America/Sao_Paulo')::date);
  UPDATE attendance_orders SET lab_guides = jsonb_set(ao.lab_guides, ARRAY[_gi::text, 'exams', _ei::text], ex) WHERE id = ao.id;

  INSERT INTO exame_bancada_troca (company_id, exame_id, bancada_de, bancada_para, tipo, pedido_id, pedido_item_ref, motivo, usuario_id, itens_movidos, detalhes)
  VALUES (cid, exam, ob.id, _bancada, 'pontual', _pedido, _gi||':'||_ei, _motivo, auth.uid(), 1, jsonb_build_object('coletado', col, 'avisos', pr->'avisos'));
  RETURN jsonb_build_object('ok', true, 'item', ex);
END $$;

-- Guarda: troca envolvendo bancada de apoio só pela função
CREATE OR REPLACE FUNCTION public.exams_bancada_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.workbench_id IS DISTINCT FROM OLD.workbench_id AND auth.uid() IS NOT NULL
     AND coalesce(current_setting('bancada.troca', true),'') <> 'on'
     AND EXISTS (SELECT 1 FROM lab_workbenches w WHERE w.id IN (OLD.workbench_id, NEW.workbench_id) AND w.tipo = 'apoio') THEN
    RAISE EXCEPTION 'Troca de bancada envolvendo laboratório de apoio deve ser feita pela confirmação da troca (prontidão e prévia)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER exams_bancada_guard BEFORE UPDATE OF workbench_id ON public.exams FOR EACH ROW EXECUTE FUNCTION public.exams_bancada_guard();

-- Congela bancada/laudo em cada item do pedido
CREATE OR REPLACE FUNCTION public.attendance_orders_congelar_bancada() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gi int; ei int; ex jsonb; guides jsonb; changed boolean := false; e exams%ROWTYPE; b lab_workbenches%ROWTYPE; nome text;
BEGIN
  IF jsonb_typeof(NEW.lab_guides) <> 'array' THEN RETURN NEW; END IF;
  guides := NEW.lab_guides;
  FOR gi IN 0 .. jsonb_array_length(guides) - 1 LOOP
    IF jsonb_typeof(guides->gi->'exams') <> 'array' THEN CONTINUE; END IF;
    FOR ei IN 0 .. jsonb_array_length(guides->gi->'exams') - 1 LOOP
      ex := guides->gi->'exams'->ei;
      IF nullif(ex->>'bancadaId','') IS NOT NULL OR nullif(ex->>'id','') IS NULL THEN CONTINUE; END IF;
      BEGIN
        SELECT * INTO e FROM exams WHERE id = (ex->>'id')::uuid AND company_id = NEW.company_id;
      EXCEPTION WHEN others THEN CONTINUE; END;
      IF e.id IS NULL OR e.workbench_id IS NULL THEN CONTINUE; END IF;
      SELECT * INTO b FROM lab_workbenches WHERE id = e.workbench_id;
      nome := NULL;
      IF b.apoio_id IS NOT NULL THEN SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = b.apoio_id; END IF;
      ex := ex || jsonb_build_object('bancadaId', b.id, 'bancadaNome', b.name, 'bancadaTipo', b.tipo, 'apoioId', b.apoio_id, 'apoioNome', nome,
        'laudoId', coalesce(nullif(ex->>'laudoId','')::uuid, bancada_laudo(e.id, b.id)), 'bancadaOrigem', 'cadastro');
      guides := jsonb_set(guides, ARRAY[gi::text, 'exams', ei::text], ex);
      changed := true;
    END LOOP;
  END LOOP;
  IF changed THEN NEW.lab_guides := guides; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER attendance_orders_congelar_bancada BEFORE INSERT OR UPDATE OF lab_guides ON public.attendance_orders
  FOR EACH ROW EXECUTE FUNCTION public.attendance_orders_congelar_bancada();

-- Cria apoio_pedido_exame para itens em bancada de apoio
CREATE OR REPLACE FUNCTION public.attendance_orders_criar_apoio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; cod text; preco numeric; fict boolean; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF coalesce(NEW.status,'') IN ('deleted','cancelled') OR jsonb_typeof(NEW.lab_guides) <> 'array' THEN RETURN NEW; END IF;
  IF NOT apoio_modulo_liberado(NEW.company_id) THEN RETURN NEW; END IF;
  FOR it IN
    SELECT DISTINCT (x->>'id')::uuid exam, (x->>'apoioId')::uuid apoio
    FROM jsonb_array_elements(NEW.lab_guides) g, jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams')='array' THEN g->'exams' ELSE '[]'::jsonb END) x
    WHERE x->>'bancadaTipo' = 'apoio' AND nullif(x->>'apoioId','') IS NOT NULL AND coalesce((x->>'cancelled')::boolean,false) = false
  LOOP
    IF EXISTS (SELECT 1 FROM apoio_pedido_exame pe WHERE pe.pedido_id = NEW.id AND pe.exame_id = it.exam AND pe.status <> 'cancelado') THEN CONTINUE; END IF;
    BEGIN
      SELECT d.codigo_apoio INTO cod FROM apoio_depara_exame d WHERE d.exame_id = it.exam AND d.apoio_id = it.apoio AND d.ativo LIMIT 1;
      SELECT x.preco, x.ficticio INTO preco, fict FROM apoio_preco x WHERE x.apoio_id = it.apoio AND x.codigo = cod
        AND x.vigencia_inicio <= hoje AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje) ORDER BY x.vigencia_inicio DESC LIMIT 1;
      INSERT INTO apoio_pedido_exame (company_id, pedido_id, exame_id, apoio_id, codigo_apoio, status, modo, custo_previsto, preco_ficticio)
      VALUES (NEW.company_id, NEW.id, it.exam, it.apoio, cod, 'aguardando_remessa', 'automatico', preco, coalesce(fict,false));
    EXCEPTION WHEN others THEN
      RAISE WARNING 'apoio_pedido_exame não criado (pedido %, exame %): %', NEW.id, it.exam, SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER attendance_orders_criar_apoio AFTER INSERT OR UPDATE OF lab_guides, status ON public.attendance_orders
  FOR EACH ROW EXECUTE FUNCTION public.attendance_orders_criar_apoio();

GRANT EXECUTE ON FUNCTION public.exame_destino(uuid, uuid), public.bancada_prontidao(uuid, uuid), public.bancada_troca_previa(uuid, uuid),
  public.bancada_trocar_cadastro(uuid, uuid, text), public.bancada_trocar_pontual(uuid, int, int, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.bancada_cancelar_apoio(uuid, uuid, text), public.bancada_aplicar_item(jsonb, uuid, uuid, text, text, date) FROM PUBLIC, anon, authenticated;