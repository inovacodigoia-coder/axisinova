-- Mudar origem: liberado para qualquer status do atendimento (exceto excluído/cancelado),
-- para o paciente aparecer no Portal Externo da nova origem em qualquer fase.
CREATE OR REPLACE FUNCTION public.atendimento_mudar_origem(_order_id uuid, _origin_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ord record; v_org record; v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login obrigatório'; END IF;
  IF NOT public.atendimento_detalhes_tem_permissao('atendimento.origem') THEN RAISE EXCEPTION 'Seu perfil não tem permissão para mudar a origem'; END IF;
  v_company := public.get_user_company_id(auth.uid());
  SELECT * INTO v_ord FROM attendance_orders WHERE id = _order_id AND company_id = v_company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atendimento não encontrado'; END IF;
  IF v_ord.status IN ('deleted', 'cancelled') THEN RAISE EXCEPTION 'Não é possível mudar a origem de atendimento excluído ou cancelado'; END IF;
  SELECT * INTO v_org FROM origins WHERE id = _origin_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Origem inválida'; END IF;
  IF v_ord.origin_id = _origin_id THEN RAISE EXCEPTION 'O atendimento já está nesta origem'; END IF;
  UPDATE attendance_orders SET origin_id = v_org.id,
    origin_code = COALESCE(NULLIF(regexp_replace(COALESCE(v_org.internal_code,''),'\D','','g'),'')::int, 0),
    origin_name = v_org.name, updated_at = now()
  WHERE id = _order_id;
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (v_company, 'attendance_orders', _order_id::text, 'mudar_origem',
    jsonb_build_object('origin_id', v_ord.origin_id, 'origin_name', v_ord.origin_name),
    jsonb_build_object('origin_id', v_org.id, 'origin_name', v_org.name), auth.uid());
  RETURN jsonb_build_object('origin_id', v_org.id, 'origin_name', v_org.name);
END $$;
REVOKE EXECUTE ON FUNCTION public.atendimento_mudar_origem(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atendimento_mudar_origem(uuid, uuid) TO authenticated;

-- Portal: exames ainda sem resultado (Aguardando) também aparecem no pedido.
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
            'status', r.status,
            'released_at', r.released_at,
            'blocked', (v_access.type = ANY(COALESCE(r.portal_blocked_types, ARRAY[]::text[])))
          ) AS x
          FROM public.lab_exam_results r
          WHERE r.order_id = ao.id
          UNION ALL
          SELECT jsonb_build_object(
            'id', ao.id::text || ':' || ge.k,
            'name', ge.e->>'name',
            'code', COALESCE(ge.e->>'internalCode', ge.e->>'code'),
            'status', CASE WHEN ge.e->>'status' = 'cancelled' THEN 'cancelled' ELSE 'pending' END,
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