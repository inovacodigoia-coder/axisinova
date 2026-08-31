CREATE OR REPLACE FUNCTION public.portal_fetch(p_code text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access public.external_accesses%ROWTYPE;
  v_fails int;
  v_orders jsonb;
BEGIN
  SELECT * INTO v_access FROM public.external_accesses WHERE access_code = p_code LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_access.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive');
  END IF;

  SELECT count(*) INTO v_fails
  FROM public.external_access_logs
  WHERE access_code = p_code AND success = false AND created_at > now() - interval '5 minutes';

  IF v_fails >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'locked');
  END IF;

  IF p_password IS DISTINCT FROM v_access.access_password THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
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
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', r.id,
          'name', r.exam_name,
          'code', r.exam_code,
          'status', r.status,
          'released_at', r.released_at
        ) ORDER BY r.exam_name), '[]'::jsonb)
        FROM public.lab_exam_results r
        WHERE r.order_id = ao.id
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
    'access', jsonb_build_object(
      'name', v_access.name,
      'type', v_access.type,
      'access_code', v_access.access_code
    ),
    'company', (SELECT jsonb_build_object('name', c.name) FROM public.companies c WHERE c.id = v_access.company_id),
    'orders', v_orders
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_log_attempt(p_code text, p_success boolean, p_action text DEFAULT 'login')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_access public.external_accesses%ROWTYPE;
BEGIN
  SELECT * INTO v_access FROM public.external_accesses WHERE access_code = p_code LIMIT 1;
  INSERT INTO public.external_access_logs (access_code, access_id, access_type, company_id, action, success)
  VALUES (p_code, v_access.id, v_access.type, v_access.company_id, p_action, COALESCE(p_success, false));
  IF p_success AND v_access.id IS NOT NULL THEN
    UPDATE public.external_accesses SET last_access_at = now() WHERE id = v_access.id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_fetch(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_log_attempt(text, boolean, text) TO anon, authenticated;