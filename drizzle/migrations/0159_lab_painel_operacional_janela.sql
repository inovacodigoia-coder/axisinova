
CREATE OR REPLACE FUNCTION public.lab_painel_operacional(p_desde timestamptz)
RETURNS TABLE(order_id uuid, protocol text, patient_name text, is_urgent boolean, order_status text,
  exam_id text, exam_name text, workbench_id text, bancada_tipo text, collected_at timestamptz,
  recollection_at timestamptz, result_status text, typed_at timestamptz, released_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
#variable_conflict use_column
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF NOT public.lab_painel_tem_permissao() THEN
    RAISE EXCEPTION 'Sem permissão para o Painel Operacional' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT o.id, o.protocol, coalesce(pt.name, o.patient_name), coalesce(o.is_urgent, false), o.status::text,
    x.exam_id, coalesce(x.e->>'name', x.e->>'examName', ex.name),
    coalesce(nullif(x.e->>'bancadaId',''), nullif(x.e->>'workbenchId',''), ex.workbench_id::text),
    nullif(x.e->>'bancadaTipo',''),
    CASE WHEN coalesce(x.e->>'collected','') = 'false' THEN NULL
         WHEN x.e->>'collectedAt' ~ '^\d{4}-\d{2}-\d{2}' THEN (x.e->>'collectedAt')::timestamptz END,
    CASE WHEN x.e->'recollection'->>'requestedAt' ~ '^\d{4}-\d{2}-\d{2}' THEN (x.e->'recollection'->>'requestedAt')::timestamptz END,
    r.status, r.typed_at, r.released_at
  FROM public.attendance_orders o
  LEFT JOIN public.patients pt ON pt.id = o.patient_id
  CROSS JOIN LATERAL (
    SELECT DISTINCT ON (coalesce(e->>'examId', e->>'id')) coalesce(e->>'examId', e->>'id') AS exam_id, e,
      CASE WHEN coalesce(e->>'examId', e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           THEN coalesce(e->>'examId', e->>'id')::uuid END AS exam_uuid
    FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g,
         jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
    WHERE coalesce(e->>'examId', e->>'id') IS NOT NULL
  ) x
  LEFT JOIN public.exams ex ON ex.id = x.exam_uuid
  LEFT JOIN public.lab_exam_results r ON r.company_id = o.company_id AND r.exam_ref = o.id::text || ':' || x.exam_id
  WHERE o.company_id = v_company
    AND o.status::text NOT IN ('deleted', 'cancelled')
    AND coalesce(o.exam_mode, 'lab') <> 'clinic'
    AND (o.status::text IN ('waiting_collection', 'waiting', 'collection_done', 'in_analysis', 'validation') OR o.updated_at >= p_desde)
    AND coalesce(r.status, '') <> 'cancelled';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_operacional(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_operacional(timestamptz) TO authenticated;
