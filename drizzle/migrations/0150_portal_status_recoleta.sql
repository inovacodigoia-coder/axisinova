-- Portal Externo acompanha o Detalhes Atendimento e a Digitação de Resultados:
-- recoleta solicitada (sem nova digitação depois) aparece como Aberto; exame cancelado
-- na guia aparece Cancelado mesmo com resultado digitado; liberado continua Liberado.
CREATE OR REPLACE FUNCTION public.portal_fetch(p_code text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_access public.external_accesses%ROWTYPE;
  v_fails int;
  v_orders jsonb;
  v_branding jsonb;
BEGIN
  SELECT * INTO v_access FROM public.external_accesses WHERE access_code = p_code LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT jsonb_build_object('brand_name', b.brand_name, 'logo_url', b.logo_url) INTO v_branding
  FROM public.company_branding b WHERE b.company_id = v_access.company_id;

  IF v_access.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive', 'branding', v_branding);
  END IF;

  SELECT count(*) INTO v_fails
  FROM public.external_access_logs
  WHERE access_code = p_code AND success = false AND created_at > now() - interval '5 minutes';

  IF v_fails >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'locked', 'branding', v_branding);
  END IF;

  IF p_password IS DISTINCT FROM v_access.access_password THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password', 'branding', v_branding);
  END IF;

  SELECT COALESCE(jsonb_agg(o ORDER BY o->>'created_at' DESC), '[]'::jsonb) INTO v_orders
  FROM (
    SELECT jsonb_build_object(
      'id', ao.id,
      'protocol', ao.protocol,
      'order_number', ao.order_number,
      'patient_name', ao.patient_name,
      'status', ao.status,
      'created_at', ao.created_at,
      'delivery_date', ao.delivery_date,
      'origin_name', ao.origin_name,
      'doctor_name', ao.doctor_name,
      'convenio_name', ao.convenio_name,
      'exams', (
        SELECT COALESCE(jsonb_agg(x ORDER BY x->>'name'), '[]'::jsonb) FROM (
          SELECT jsonb_build_object(
            'id', r.id,
            'name', r.exam_name,
            'code', r.exam_code,
            'status', CASE
              WHEN r.status = 'released' THEN 'released'
              WHEN gx.e->>'status' = 'cancelled' THEN 'cancelled'
              WHEN jsonb_typeof(gx.e->'recollection') = 'object'
                AND (r.typed_at IS NULL
                     OR r.typed_at <= COALESCE(CASE WHEN COALESCE(gx.e->'recollection'->>'requestedAt','') ~ '^\d{4}-\d{2}-\d{2}'
                                                    THEN (gx.e->'recollection'->>'requestedAt')::timestamptz END,
                                               'infinity'::timestamptz))
                THEN 'open'
              ELSE r.status END,
            'released_at', r.released_at,
            'blocked', (v_access.type = ANY(COALESCE(r.portal_blocked_types, ARRAY[]::text[])))
          ) AS x
          FROM public.lab_exam_results r
          LEFT JOIN LATERAL (
            SELECT ex AS e
            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides) = 'array' THEN ao.lab_guides ELSE '[]'::jsonb END) g,
                 jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams') = 'array' THEN g->'exams' ELSE '[]'::jsonb END) ex
            WHERE COALESCE(ex->>'examId', ex->>'id') IS NOT NULL
              AND (r.exam_ref = ao.id::text || ':' || COALESCE(ex->>'examId', ex->>'id')
                   OR r.exam_ref = COALESCE(ex->>'examId', ex->>'id')
                   OR lower(r.exam_name) = lower(ex->>'name'))
            LIMIT 1
          ) gx ON true
          WHERE r.order_id = ao.id
          UNION ALL
          SELECT jsonb_build_object(
            'id', ao.id::text || ':' || ge.k,
            'name', ge.e->>'name',
            'code', COALESCE(ge.e->>'internalCode', ge.e->>'code'),
            'status', CASE WHEN ge.e->>'status' = 'cancelled' THEN 'cancelled'
                           WHEN jsonb_typeof(ge.e->'recollection') = 'object' THEN 'open'
                           ELSE 'pending' END,
            'released_at', NULL,
            'blocked', false
          )
          FROM (
            SELECT ex AS e, COALESCE(ex->>'examId', ex->>'id') AS k
            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides) = 'array' THEN ao.lab_guides ELSE '[]'::jsonb END) g,
                 jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams') = 'array' THEN g->'exams' ELSE '[]'::jsonb END) ex
          ) ge
          WHERE ge.k IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM public.lab_exam_results r2
              WHERE r2.order_id = ao.id
                AND (r2.exam_ref = ao.id::text || ':' || ge.k
                     OR r2.exam_ref = ge.k
                     OR lower(r2.exam_name) = lower(ge.e->>'name'))
            )
        ) s2
      )
    ) AS o
    FROM public.attendance_orders ao
    WHERE ao.company_id = v_access.company_id
      AND ao.status <> 'deleted'
      AND (
        (v_access.type = 'paciente' AND ao.patient_id = v_access.patient_id)
        OR (v_access.type = 'medico' AND ao.doctor_id = v_access.doctor_id)
        OR (v_access.type = 'local' AND ao.origin_id = v_access.origin_id)
        OR (v_access.type = 'parceiro' AND ao.origin_id = ANY(COALESCE(v_access.partner_origin_ids, ARRAY[]::uuid[])))
      )
    ORDER BY ao.created_at DESC
    LIMIT 100
  ) s;

  RETURN jsonb_build_object(
    'ok', true,
    'access', jsonb_build_object('name', v_access.name, 'type', v_access.type, 'access_code', v_access.access_code),
    'company', (SELECT jsonb_build_object('name', c.name) FROM public.companies c WHERE c.id = v_access.company_id),
    'branding', v_branding,
    'orders', v_orders
  );
END;
$function$;
