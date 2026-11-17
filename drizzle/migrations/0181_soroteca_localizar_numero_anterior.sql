CREATE OR REPLACE FUNCTION public.soroteca_localizar(p_termo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_t text := upper(trim(coalesce(p_termo, '')));
  v_seq int; v_hits jsonb := '[]'::jsonb; v_modo text := 'nenhum';
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF length(v_t) < 2 THEN RETURN jsonb_build_object('modo', 'nenhum', 'pedidos', '[]'::jsonb); END IF;
  SELECT sequence_id INTO v_seq FROM public.companies WHERE id = v_company;

  CREATE TEMP TABLE IF NOT EXISTS _sor_hit(order_id uuid, tubo_indice int) ON COMMIT DROP;
  -- sempre com filtro (o banco recusa DELETE sem WHERE)
  DELETE FROM _sor_hit WHERE order_id IS NOT NULL OR order_id IS NULL;

  -- 1) tubo já guardado
  INSERT INTO _sor_hit SELECT order_id, tubo_indice FROM public.soroteca_amostra
    WHERE company_id = v_company AND (upper(codigo_amostra) = v_t OR codigo_alfanumerico = v_t);
  IF FOUND THEN v_modo := 'tubo'; END IF;

  -- 2) código da amostra (protocolo-tubo[-empresa]) ou nº do pedido
  IF v_modo = 'nenhum' THEN
    INSERT INTO _sor_hit
    SELECT o.id, (SELECT min(i) FROM generate_series(1, 40) i
                  WHERE upper(public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), i, coalesce(o.empresa_seq, v_seq))) = v_t)
    FROM public.attendance_orders o
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND (upper(coalesce(o.order_number, o.protocol, '')) = v_t
        OR upper(coalesce(o.order_number, o.protocol, '')) IN (regexp_replace(v_t, '-[^-]*$', ''), regexp_replace(v_t, '-[^-]*-[^-]*$', '')));
    DELETE FROM _sor_hit h USING public.attendance_orders o
      WHERE o.id = h.order_id AND h.tubo_indice IS NULL AND upper(coalesce(o.order_number, o.protocol, '')) <> v_t;
    IF EXISTS (SELECT 1 FROM _sor_hit WHERE tubo_indice IS NOT NULL) THEN v_modo := 'tubo';
    ELSIF EXISTS (SELECT 1 FROM _sor_hit) THEN v_modo := 'pedido'; END IF;
  END IF;

  -- 3) código de barras alfanumérico de tubo ainda não guardado (pedidos dos últimos 400 dias)
  IF v_modo = 'nenhum' AND v_t ~ '^[A-Z][A-Z0-9]{7}[0-9]$' THEN
    INSERT INTO _sor_hit
    SELECT o.id, i
    FROM public.attendance_orders o
    CROSS JOIN LATERAL generate_series(1, least(40, 2 + 2 * (
      SELECT count(*) FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e)::int)) i
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND o.created_at >= now() - interval '400 days'
      AND public.soroteca_hash_amostra(public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), i, coalesce(o.empresa_seq, v_seq))) = v_t;
    IF FOUND THEN v_modo := 'tubo'; END IF;
  END IF;

  -- 3b) a etiqueta antiga de um pedido que recebeu número novo (correção de números repetidos)
  --     lê como o número que ficou com o outro paciente: mostra os dois para não guardar no errado
  IF v_modo = 'tubo' AND NOT EXISTS (SELECT 1 FROM public.soroteca_amostra
       WHERE company_id = v_company AND (upper(codigo_amostra) = v_t OR codigo_alfanumerico = v_t)) THEN
    INSERT INTO _sor_hit
    SELECT r.order_id, h.tubo_indice
      FROM _sor_hit h
      JOIN public.attendance_orders o ON o.id = h.order_id
      JOIN public.attendance_order_renumeracao r ON r.company_id = v_company AND r.order_id <> o.id
           AND r.numero_anterior = coalesce(o.order_number, o.protocol)
      JOIN public.attendance_orders o2 ON o2.id = r.order_id AND o2.status::text NOT IN ('deleted', 'cancelled')
     WHERE h.tubo_indice IS NOT NULL;
  END IF;

  -- 4) nome do paciente (30 pedidos mais recentes)
  IF v_modo = 'nenhum' AND length(v_t) >= 3 AND v_t !~ '[0-9]' THEN
    INSERT INTO _sor_hit
    SELECT o.id, NULL FROM public.attendance_orders o LEFT JOIN public.patients pt ON pt.id = o.patient_id
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND coalesce(pt.name, o.patient_name, '') ILIKE '%' || trim(p_termo) || '%'
    ORDER BY o.created_at DESC LIMIT 30;
    IF FOUND THEN v_modo := 'paciente'; END IF;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'order_id', o.id, 'protocolo', coalesce(o.order_number, o.protocol), 'empresa_seq', coalesce(o.empresa_seq, v_seq),
      'patient_id', o.patient_id, 'patient_name', coalesce(pt.name, o.patient_name), 'patient_birth', pt.birth_date,
      'is_urgent', coalesce(o.is_urgent, false), 'created_at', o.created_at, 'lab_guides', coalesce(o.lab_guides, '[]'::jsonb),
      'tubo_indice', h.tubo_indice,
      'resultados', (SELECT coalesce(jsonb_object_agg(split_part(r.exam_ref, ':', 2), r.status), '{}'::jsonb)
                     FROM public.lab_exam_results r WHERE r.company_id = v_company AND r.order_id = o.id),
      'guardados', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'tubo_indice', a.tubo_indice, 'codigo_amostra', a.codigo_amostra,
                      'status', a.status, 'equipamento_id', a.equipamento_id, 'equipamento_nome', e.nome, 'prateleira_id', a.prateleira_id, 'prateleira_nome', sp.nome, 'linha', a.linha, 'coluna', a.coluna)), '[]'::jsonb)
                    FROM public.soroteca_amostra a LEFT JOIN public.soroteca_equipamento e ON e.id = a.equipamento_id
                    LEFT JOIN public.soroteca_prateleira sp ON sp.id = a.prateleira_id
                    WHERE a.company_id = v_company AND a.order_id = o.id))
      ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_hits
  FROM (SELECT DISTINCT ON (order_id) order_id, tubo_indice FROM _sor_hit ORDER BY order_id, tubo_indice NULLS LAST) h
  JOIN public.attendance_orders o ON o.id = h.order_id
  LEFT JOIN public.patients pt ON pt.id = o.patient_id;
  RETURN jsonb_build_object('modo', v_modo, 'pedidos', v_hits);
END $function$;