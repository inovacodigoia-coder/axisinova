-- Prazo adicional por Portal Externo (Parceiro, Local, Médico): soma dias ao prazo de cada exame dos pedidos NOVOS.
ALTER TABLE public.external_accesses ADD COLUMN IF NOT EXISTS prazo_dias_adicionais integer NOT NULL DEFAULT 0;
ALTER TABLE public.external_accesses DROP CONSTRAINT IF EXISTS external_accesses_prazo_dias_chk;
ALTER TABLE public.external_accesses ADD CONSTRAINT external_accesses_prazo_dias_chk CHECK (prazo_dias_adicionais BETWEEN 0 AND 365);
COMMENT ON COLUMN public.external_accesses.prazo_dias_adicionais IS 'Dias somados ao prazo de cada exame dos pedidos novos da origem/médico do portal; alterado só via portal_prazo_adicional_definir';

-- Só a RPC pode mudar o valor (a tabela aceita UPDATE direto de usuários da empresa)
CREATE OR REPLACE FUNCTION public.external_accesses_prazo_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.prazo_dias_adicionais IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.prazo_dias_adicionais ELSE 0 END)
     AND coalesce(current_setting('portal.prazo', true), '') <> 'on'
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'O prazo adicional do portal só pode ser alterado pela opção "Prazo adicional"';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.external_accesses_prazo_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS external_accesses_prazo_guard ON public.external_accesses;
CREATE TRIGGER external_accesses_prazo_guard BEFORE INSERT OR UPDATE OF prazo_dias_adicionais ON public.external_accesses
  FOR EACH ROW EXECUTE FUNCTION public.external_accesses_prazo_guard();

-- Define os dias para um ou vários acessos da própria empresa (admin)
CREATE OR REPLACE FUNCTION public.portal_prazo_adicional_definir(_ids uuid[], _dias integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.get_user_company_id(auth.uid()); r record; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para continuar'; END IF;
  IF NOT public.is_company_manager(auth.uid()) THEN RAISE EXCEPTION 'Apenas o administrador da empresa pode alterar o prazo adicional'; END IF;
  IF _dias IS NULL OR _dias < 0 OR _dias > 365 THEN RAISE EXCEPTION 'Informe de 0 a 365 dias'; END IF;
  IF coalesce(array_length(_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecione pelo menos um acesso'; END IF;
  PERFORM set_config('portal.prazo', 'on', true);
  FOR r IN SELECT id, name, type, prazo_dias_adicionais FROM external_accesses
           WHERE id = ANY(_ids) AND company_id = cid AND type IN ('parceiro','local','medico') FOR UPDATE LOOP
    IF r.prazo_dias_adicionais = _dias THEN CONTINUE; END IF;
    UPDATE external_accesses SET prazo_dias_adicionais = _dias WHERE id = r.id;
    INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, usuario_id, antes, depois)
    VALUES (cid, 'external_accesses', r.id::text, 'prazo_adicional_portal', auth.uid(),
      jsonb_build_object('dias', r.prazo_dias_adicionais, 'nome', r.name, 'tipo', r.type), jsonb_build_object('dias', _dias));
    n := n + 1;
  END LOOP;
  PERFORM set_config('portal.prazo', 'off', true);
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.portal_prazo_adicional_definir(uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_prazo_adicional_definir(uuid[], integer) TO authenticated;

-- Dias que valem para o pedido: maior valor entre os portais ativos ligados à origem ou ao médico
CREATE OR REPLACE FUNCTION public.portal_prazo_adicional_pedido(_company uuid, _origin uuid, _doctor uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(max(prazo_dias_adicionais), 0)::int FROM public.external_accesses
  WHERE company_id = _company AND status = 'active' AND prazo_dias_adicionais > 0 AND (
    (type IN ('parceiro','local') AND _origin IS NOT NULL AND (origin_id = _origin OR _origin = ANY(coalesce(partner_origin_ids, '{}'::uuid[]))))
    OR (type = 'medico' AND _doctor IS NOT NULL AND doctor_id = _doctor))
$$;
REVOKE EXECUTE ON FUNCTION public.portal_prazo_adicional_pedido(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Soma os dias no item (respeita corridos/úteis do exame, mantém o horário); item marcado não soma de novo
CREATE OR REPLACE FUNCTION public.portal_prazo_somar_item(_company uuid, _ex jsonb, _dias integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE base timestamptz; loc timestamp; novo timestamp; cont text;
BEGIN
  IF coalesce(_dias, 0) <= 0 OR jsonb_typeof(_ex) <> 'object' OR _ex ? 'prazoAdicionalPortal' THEN RETURN _ex; END IF;
  IF coalesce(_ex->>'expectedDeliveryDate', '') !~ '^\d{4}-\d{2}-\d{2}' THEN RETURN _ex; END IF;
  BEGIN base := (_ex->>'expectedDeliveryDate')::timestamptz; EXCEPTION WHEN others THEN RETURN _ex; END;
  cont := CASE WHEN _ex->>'prazoContagem' = 'uteis' THEN 'uteis' ELSE 'corridos' END;
  loc := base AT TIME ZONE 'America/Sao_Paulo';
  novo := public.calcular_prazo(_company, loc::date, _dias, cont) + loc::time;
  RETURN _ex || jsonb_build_object(
    'expectedDeliveryDate', to_char((novo AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'prazoAdicionalPortal', _dias,
    'prazoSemAdicionalPortal', _ex->>'expectedDeliveryDate');
END $$;
REVOKE EXECUTE ON FUNCTION public.portal_prazo_somar_item(uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;

-- Pedido novo (e exame novo incluído depois): aplica o prazo adicional; pedidos/exames já existentes não mudam
CREATE OR REPLACE FUNCTION public.attendance_orders_prazo_portal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; gi int; ei int; ex jsonb; novo jsonb; guides jsonb; changed boolean := false; antigos text[] := '{}'; maxd timestamptz;
BEGIN
  IF jsonb_typeof(NEW.lab_guides) IS DISTINCT FROM 'array' THEN RETURN NEW; END IF;
  n := public.portal_prazo_adicional_pedido(NEW.company_id, NEW.origin_id, NEW.doctor_id);
  IF n <= 0 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND jsonb_typeof(OLD.lab_guides) = 'array' THEN
    SELECT coalesce(array_agg(DISTINCT x->>'id'), '{}') INTO antigos
    FROM jsonb_array_elements(OLD.lab_guides) g,
         jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams') = 'array' THEN g->'exams' ELSE '[]'::jsonb END) x;
  END IF;
  guides := NEW.lab_guides;
  FOR gi IN 0 .. jsonb_array_length(guides) - 1 LOOP
    IF jsonb_typeof(guides->gi->'exams') IS DISTINCT FROM 'array' THEN CONTINUE; END IF;
    FOR ei IN 0 .. jsonb_array_length(guides->gi->'exams') - 1 LOOP
      ex := guides->gi->'exams'->ei;
      IF (ex->>'id') = ANY(antigos) THEN CONTINUE; END IF;
      novo := public.portal_prazo_somar_item(NEW.company_id, ex, n);
      IF novo IS DISTINCT FROM ex THEN
        guides := jsonb_set(guides, ARRAY[gi::text, 'exams', ei::text], novo);
        changed := true;
        IF maxd IS NULL OR (novo->>'expectedDeliveryDate')::timestamptz > maxd THEN maxd := (novo->>'expectedDeliveryDate')::timestamptz; END IF;
      END IF;
    END LOOP;
  END LOOP;
  IF changed THEN
    NEW.lab_guides := guides;
    IF NEW.delivery_date IS NULL OR maxd > NEW.delivery_date THEN NEW.delivery_date := maxd; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.attendance_orders_prazo_portal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS attendance_orders_prazo_portal ON public.attendance_orders;
CREATE TRIGGER attendance_orders_prazo_portal BEFORE INSERT OR UPDATE OF lab_guides ON public.attendance_orders
  FOR EACH ROW EXECUTE FUNCTION public.attendance_orders_prazo_portal();

-- Troca de bancada recalcula o prazo: mantém o adicional do portal que o item já tinha
CREATE OR REPLACE FUNCTION public.bancada_aplicar_item(_ex jsonb, _exam uuid, _bancada uuid, _origem text, _motivo text, _base date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE pz jsonb; b lab_workbenches%ROWTYPE; nome text; lid uuid; ant text := _ex->>'expectedDeliveryDate';
  extra int := coalesce(nullif(_ex->>'prazoAdicionalPortal','')::int, 0);
BEGIN
  -- _base mantido por compatibilidade: a troca sempre conta a partir de agora
  SELECT * INTO b FROM lab_workbenches WHERE id = _bancada;
  IF b.apoio_id IS NOT NULL THEN SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = b.apoio_id; END IF;
  pz := bancada_prazo(_exam, _bancada, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  lid := bancada_laudo(_exam, _bancada);
  _ex := _ex || jsonb_build_object('bancadaId', _bancada, 'bancadaNome', b.name, 'bancadaTipo', b.tipo, 'apoioId', b.apoio_id, 'apoioNome', nome,
    'laudoId', lid, 'bancadaOrigem', _origem, 'bancadaMotivo', _motivo, 'bancadaTrocadaEm', now());
  IF pz->>'prazo' IS NOT NULL THEN
    _ex := (_ex - 'prazoAdicionalPortal' - 'prazoSemAdicionalPortal') || jsonb_build_object('expectedDeliveryDate', (pz->>'prazo') || 'T15:00:00.000Z', 'prazoContagem', pz->>'contagem',
      'prazoRecalculadoTroca', true, 'prazoAnterior', ant);
    IF extra > 0 THEN _ex := public.portal_prazo_somar_item(b.company_id, _ex, extra); END IF;
  END IF;
  RETURN _ex;
END $function$;