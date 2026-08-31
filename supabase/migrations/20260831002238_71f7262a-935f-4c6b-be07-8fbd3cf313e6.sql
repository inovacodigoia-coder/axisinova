CREATE OR REPLACE FUNCTION public.portal_fetch_laudo(p_code text, p_password text, p_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access public.external_accesses%ROWTYPE;
  v_fails int;
  v_result public.lab_exam_results%ROWTYPE;
  v_order public.attendance_orders%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_exam public.exams%ROWTYPE;
  v_settings public.lab_settings%ROWTYPE;
  v_template public.lab_report_templates%ROWTYPE;
  v_values jsonb;
  v_approver_name text;
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

  SELECT * INTO v_result
  FROM public.lab_exam_results r
  WHERE r.id = p_exam_id
    AND r.company_id = v_access.company_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_result.status <> 'released' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_released');
  END IF;

  SELECT * INTO v_order
  FROM public.attendance_orders ao
  WHERE ao.id = v_result.order_id
    AND ao.company_id = v_access.company_id
    AND ao.status <> 'deleted'
    AND (
      (v_access.type = 'paciente' AND ao.patient_id = v_access.patient_id)
      OR (v_access.type = 'medico' AND ao.doctor_id = v_access.doctor_id)
      OR (v_access.type = 'local' AND ao.origin_id = v_access.origin_id)
      OR (v_access.type = 'parceiro' AND ao.origin_id = ANY(COALESCE(v_access.partner_origin_ids, ARRAY[]::uuid[])))
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_patient FROM public.patients p WHERE p.id = v_order.patient_id LIMIT 1;

  IF v_result.exam_catalog_id IS NOT NULL THEN
    SELECT * INTO v_exam FROM public.exams e WHERE e.id = v_result.exam_catalog_id LIMIT 1;
  END IF;

  IF v_exam.report_template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM public.lab_report_templates t WHERE t.id = v_exam.report_template_id LIMIT 1;
  END IF;

  SELECT * INTO v_settings FROM public.lab_settings s WHERE s.company_id = v_access.company_id LIMIT 1;

  SELECT full_name INTO v_approver_name FROM public.profiles pr WHERE pr.id = v_result.released_by LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'parameterKey', v.parameter_key,
    'parameterName', COALESCE(v.parameter_name, p.name, v.parameter_key),
    'value', v.value,
    'unit', COALESCE(v.unit, p.unit),
    'referenceRange', COALESCE(v.reference, p.reference_values),
    'flag', v.flag,
    'section', p.section,
    'sortOrder', COALESCE(v.sort_order, p.sort_order, 0)
  ) ORDER BY COALESCE(v.sort_order, p.sort_order, 0)), '[]'::jsonb)
  INTO v_values
  FROM public.lab_result_values v
  LEFT JOIN public.lab_exam_parameters p ON p.id::text = v.parameter_key AND p.company_id = v_access.company_id
  WHERE v.result_id = v_result.id;

  RETURN jsonb_build_object(
    'ok', true,
    'laudo', jsonb_build_object(
      'protocol', v_order.protocol,
      'patientName', v_order.patient_name,
      'patientBirthDate', v_patient.birth_date,
      'patientGender', v_patient.gender,
      'registeredAt', v_order.created_at,
      'collectionTime', v_order.updated_at,
      'approvedAt', v_result.released_at,
      'approvedBy', v_approver_name,
      'originName', v_order.origin_name,
      'doctorName', v_order.doctor_name,
      'doctorCRM', v_order.doctor_crm,
      'exam', jsonb_build_object(
        'id', v_result.id,
        'name', v_result.exam_name,
        'code', v_result.exam_code,
        'material', v_exam.default_material,
        'methodology', v_exam.methodology,
        'reportObservations', v_exam.report_observations,
        'internalObservations', v_result.notes,
        'singlePage', COALESCE(v_exam.report_single_page, false),
        'template', CASE WHEN v_template.id IS NULL THEN NULL ELSE jsonb_build_object(
          'header_html', v_template.header_html,
          'body_html', v_template.body_html,
          'footer_html', v_template.footer_html
        ) END,
        'results', v_values
      ),
      'settings', jsonb_build_object(
        'labName', v_settings.lab_name,
        'headerTitle', v_settings.report_header_title,
        'headerSubtitle', v_settings.report_header_subtitle,
        'logoPrimaryUrl', v_settings.report_logo_primary_url,
        'logoSecondaryUrl', v_settings.report_logo_secondary_url,
        'institutionalWarning', v_settings.report_institutional_warning,
        'footerText', v_settings.report_footer_text,
        'signatureName', v_settings.signature_name,
        'signatureRegister', v_settings.signature_register,
        'signatureImageUrl', v_settings.signature_image_url,
        'signatureAutoOnRelease', v_settings.signature_auto_on_release,
        'signatureIncludeRegister', v_settings.signature_include_register
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_fetch_laudo(text, text, uuid) TO anon, authenticated;