-- Etapa 3C.2/3C: conferência só pelo hash, trava no servidor e resposta uniforme.
-- Reversão: recriar portal_fetch / portal_fetch_laudo / portal__chat_validar / portal_log_attempt
-- a partir da 0152 / 0146 (comparação com access_password, que segue guardada).
CREATE OR REPLACE FUNCTION public.portal__verificar(p_code text, p_password text, p_acao text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  v public.external_accesses%ROWTYPE;
  v_fails int;
  v_hash text;
  v_ok boolean;
  -- hash de uma senha que não existe: código inexistente gasta o mesmo tempo
  c_falso constant text := '$2a$10$lMRGVSh1/cS0TvYQp5/zIu5xlC2ekRsfOoFAEo5mkoUb/F2RtWd.q';
BEGIN
  IF p_code IS NULL OR length(p_code) > 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;
  SELECT * INTO v FROM public.external_accesses WHERE access_code = p_code LIMIT 1;
  SELECT count(*) INTO v_fails FROM public.external_access_logs
   WHERE access_code = p_code AND success = false
     AND created_at > GREATEST(now() - interval '5 minutes', COALESCE(v.falhas_zeradas_em, '-infinity'::timestamptz));
  IF v_fails >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'locked');
  END IF;
  -- senha vazia: só a abertura da tela; não conta e não revela se o código existe
  IF COALESCE(p_password, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;
  v_hash := COALESCE(v.access_password_hash, c_falso);
  v_ok := extensions.crypt(left(p_password, 72), v_hash) = v_hash
          AND v.id IS NOT NULL AND v.access_password_hash IS NOT NULL;
  IF NOT v_ok THEN
    INSERT INTO public.external_access_logs (company_id, access_id, access_code, access_type, action, success)
    VALUES (v.company_id, v.id, p_code, v.type, COALESCE(p_acao, 'login'), false);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;
  IF v.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive');
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', v.id);
END $$;
REVOKE ALL ON FUNCTION public.portal__verificar(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal__verificar(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.portal_fetch(p_code text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_access public.external_accesses%ROWTYPE;
  v_chk jsonb;
  v_orders jsonb;
  v_branding jsonb;
  v_mostra_recoleta boolean;
BEGIN
  v_chk := public.portal__verificar(p_code, p_password, 'login');
  IF NOT COALESCE((v_chk->>'ok')::boolean, false) THEN RETURN v_chk; END IF;
  SELECT * INTO v_access FROM public.external_accesses WHERE id = (v_chk->>'id')::uuid;

  v_mostra_recoleta := v_access.type IN ('parceiro','local','medico');

  SELECT jsonb_build_object('brand_name', b.brand_name, 'logo_url', b.logo_url) INTO v_branding
  FROM public.company_branding b WHERE b.company_id = v_access.company_id;

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
            'blocked', (v_access.type = ANY(COALESCE(r.portal_blocked_types, ARRAY[]::text[]))),
            'recollection', CASE
              WHEN v_mostra_recoleta AND jsonb_typeof(gx.e->'recollection') = 'object'
                THEN jsonb_build_object('requestedAt', COALESCE(gx.e->'recollection'->>'requestedAt',''))
              ELSE NULL END
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
            'blocked', false,
            'recollection', CASE
              WHEN v_mostra_recoleta AND jsonb_typeof(ge.e->'recollection') = 'object'
                THEN jsonb_build_object('requestedAt', COALESCE(ge.e->'recollection'->>'requestedAt',''))
              ELSE NULL END
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

CREATE OR REPLACE FUNCTION public.portal_fetch_laudo(p_code text, p_password text, p_exam_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_access public.external_accesses%ROWTYPE;
  v_chk jsonb;
  v_result public.lab_exam_results%ROWTYPE;
  v_order public.attendance_orders%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_exam public.exams%ROWTYPE;
  v_settings public.lab_settings%ROWTYPE;
  v_template public.lab_report_templates%ROWTYPE;
  v_values jsonb;
  v_approver_name text;
BEGIN
  v_chk := public.portal__verificar(p_code, p_password, 'view_laudo');
  IF NOT COALESCE((v_chk->>'ok')::boolean, false) THEN RETURN v_chk; END IF;
  SELECT * INTO v_access FROM public.external_accesses WHERE id = (v_chk->>'id')::uuid;

  SELECT * INTO v_result
  FROM public.lab_exam_results r
  WHERE r.id = p_exam_id
    AND r.company_id = v_access.company_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_access.type = ANY(COALESCE(v_result.portal_blocked_types, ARRAY[]::text[])) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'blocked');
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
    'sortOrder', COALESCE(v.sort_order, p.sort_order, 0),
    -- Obrig desmarcado no cadastro: o laudo esconde a linha quando o valor está vazio
    'optional', (p.is_required IS FALSE) OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(v_exam.parameters) = 'array' THEN v_exam.parameters ELSE '[]'::jsonb END
      ) cp
      WHERE (cp->>'isMandatory') = 'false'
        AND (cp->>'id' = v.parameter_key OR lower(trim(cp->>'name')) = lower(trim(COALESCE(v.parameter_name, ''))))
    )
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
$function$;

CREATE OR REPLACE FUNCTION public.portal__chat_validar(p_code text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_a public.external_accesses%ROWTYPE; v_chk jsonb;
BEGIN
  v_chk := public.portal__verificar(p_code, p_password, 'chat');
  IF NOT COALESCE((v_chk->>'ok')::boolean, false) THEN RETURN v_chk; END IF;
  SELECT * INTO v_a FROM public.external_accesses WHERE id = (v_chk->>'id')::uuid;
  IF v_a.type NOT IN ('parceiro','local','medico') THEN RETURN jsonb_build_object('ok', false, 'error', 'not_available'); END IF;
  IF NOT public.chat_interno_ativo(v_a.company_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'chat_off'); END IF;
  RETURN jsonb_build_object('ok', true, 'access_id', v_a.id, 'company_id', v_a.company_id, 'name', v_a.name);
END $function$;

-- Falhas agora são gravadas pelo servidor; o navegador só registra o acesso bem-sucedido
-- (evita contar em dobro e impede que alguém trave o código de outro chamando esta função).
CREATE OR REPLACE FUNCTION public.portal_log_attempt(p_code text, p_success boolean, p_action text DEFAULT 'login'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_access public.external_accesses%ROWTYPE;
BEGIN
  IF NOT COALESCE(p_success, false) THEN RETURN; END IF;
  SELECT * INTO v_access FROM public.external_accesses WHERE access_code = p_code LIMIT 1;
  IF v_access.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.external_access_logs (access_code, access_id, access_type, company_id, action, success)
  VALUES (p_code, v_access.id, v_access.type, v_access.company_id, left(COALESCE(p_action, 'login'), 40), true);
  UPDATE public.external_accesses SET last_access_at = now() WHERE id = v_access.id;
END;
$function$;

-- Paciente novo: senha = 4 últimos dígitos do CPF (como hoje); sem CPF, senha aleatória do servidor.
-- Senha nova pedida (_gerar_nova) segue o modelo novo (8 números). Acesso existente não muda.
CREATE OR REPLACE FUNCTION public.portal_acesso_paciente_garantir(_patient_id uuid, _nome text, _email text DEFAULT NULL, _gerar_nova boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_cid uuid; r public.external_accesses; v_cpf text; v_j jsonb;
BEGIN
  v_cid := public.get_user_company_id(auth.uid());
  IF auth.uid() IS NULL OR v_cid IS NULL THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  SELECT regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') INTO v_cpf
    FROM public.patients WHERE id = _patient_id AND company_id = v_cid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente não encontrado';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('portal_paciente:' || _patient_id::text));
  SELECT * INTO r FROM public.external_accesses
   WHERE company_id = v_cid AND type = 'paciente' AND patient_id = _patient_id
   ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    IF COALESCE(_gerar_nova, false) THEN
      RETURN public.portal_acesso_regenerar(r.id, false);
    END IF;
    RETURN public.portal__acesso_json(r);
  END IF;
  v_j := public.portal_acesso_criar(jsonb_build_object(
    'type', 'paciente', 'name', _nome, 'email', NULLIF(_email, ''), 'status', 'active',
    'patient_id', _patient_id, 'partner_origin_ids', '{}'::text[], 'permissions', '{}'::jsonb));
  IF length(v_cpf) >= 4 THEN
    UPDATE public.external_accesses
       SET access_password_hash = public.portal_senha_hash(right(v_cpf, 4)), password_kind = 'cpf'
     WHERE id = (v_j->>'id')::uuid
    RETURNING * INTO r;
    RETURN public.portal__acesso_json(r);
  END IF;
  RETURN v_j;
END $$;
REVOKE ALL ON FUNCTION public.portal_acesso_paciente_garantir(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_acesso_paciente_garantir(uuid, text, text, boolean) TO authenticated, service_role;