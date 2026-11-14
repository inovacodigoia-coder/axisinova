
-- Permissão do painel
CREATE OR REPLACE FUNCTION public.lab_painel_tem_permissao()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'lab','[]'::jsonb) ? 'lab.painel_operacional'));
$$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_tem_permissao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_tem_permissao() TO authenticated;

-- Exames do painel: pendentes de qualquer data + os mexidos desde p_desde (só leitura)
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
    SELECT DISTINCT ON (coalesce(e->>'examId', e->>'id')) coalesce(e->>'examId', e->>'id') AS exam_id, e
    FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g,
         jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
    WHERE coalesce(e->>'examId', e->>'id') IS NOT NULL
  ) x
  LEFT JOIN public.exams ex ON ex.id::text = x.exam_id
  LEFT JOIN public.lab_exam_results r ON r.company_id = o.company_id AND r.exam_ref = o.id::text || ':' || x.exam_id
  WHERE o.company_id = v_company
    AND o.status::text NOT IN ('deleted', 'cancelled')
    AND coalesce(o.exam_mode, 'lab') <> 'clinic'
    AND (o.status::text IN ('collection_done', 'in_analysis', 'validation', 'released') OR o.updated_at >= p_desde)
    AND coalesce(r.status, '') <> 'cancelled';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_operacional(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_operacional(timestamptz) TO authenticated;

-- Notificação de valor crítico (trilha imutável)
CREATE TABLE public.lab_critico_notificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  result_value_id uuid NOT NULL UNIQUE,
  result_id uuid NOT NULL,
  order_id uuid,
  parameter_name text,
  valor text,
  limite_critico text,
  observacao text,
  notified_by uuid NOT NULL,
  notified_by_name text,
  notified_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_critico_notificacao TO authenticated;
GRANT ALL ON public.lab_critico_notificacao TO service_role;
ALTER TABLE public.lab_critico_notificacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Painel lê notificações da empresa" ON public.lab_critico_notificacao
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.lab_painel_tem_permissao());

CREATE OR REPLACE FUNCTION public.lab_critico_notificacao_imutavel()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Registro de notificação não pode ser alterado nem excluído'; END; $$;
REVOKE EXECUTE ON FUNCTION public.lab_critico_notificacao_imutavel() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_lab_critico_notificacao_imutavel BEFORE UPDATE OR DELETE ON public.lab_critico_notificacao
  FOR EACH ROW EXECUTE FUNCTION public.lab_critico_notificacao_imutavel();

-- Candidatos a valor crítico: parâmetros com alerta crítico ligado e limite preenchido, ainda não notificados
CREATE OR REPLACE FUNCTION public.lab_painel_criticos(p_desde timestamptz)
RETURNS TABLE(value_id uuid, result_id uuid, order_id uuid, protocol text, patient_name text, is_urgent boolean,
  exam_name text, workbench_id text, parameter_name text, valor text, unidade text, referencia text,
  limite_critico text, resultado_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
#variable_conflict use_column
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF NOT public.lab_painel_tem_permissao() THEN
    RAISE EXCEPTION 'Sem permissão para o Painel Operacional' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT v.id, r.id, r.order_id, o.protocol, coalesce(pt.name, o.patient_name, r.patient_name), coalesce(o.is_urgent, false),
    coalesce(r.exam_name, ex.name), ex.workbench_id::text, v.parameter_name, v.value, v.unit, v.reference,
    p->>'criticalLimit', coalesce(v.result_datetime, r.typed_at, r.updated_at)
  FROM public.lab_exam_results r
  JOIN public.exams ex ON ex.id = r.exam_catalog_id
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ex.interfacing_parameters) = 'array' THEN ex.interfacing_parameters ELSE '[]'::jsonb END) p
  JOIN public.lab_result_values v ON v.result_id = r.id
    AND lower(trim(v.parameter_name)) = lower(trim(p->>'parameterName'))
  LEFT JOIN public.attendance_orders o ON o.id = r.order_id
  LEFT JOIN public.patients pt ON pt.id = o.patient_id
  WHERE r.company_id = v_company
    AND r.status IN ('digitized', 'released')
    AND coalesce(p->>'criticalAlert', 'false') = 'true'
    AND trim(coalesce(p->>'criticalLimit', '')) <> ''
    AND trim(coalesce(v.value, '')) <> ''
    AND coalesce(v.result_datetime, r.typed_at, r.updated_at) >= p_desde
    AND NOT EXISTS (SELECT 1 FROM public.lab_critico_notificacao n WHERE n.result_value_id = v.id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_criticos(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_criticos(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.lab_critico_marcar_notificado(p_value_id uuid, p_observacao text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_res record; v_quando timestamptz;
BEGIN
  IF NOT public.lab_painel_tem_permissao() THEN
    RAISE EXCEPTION 'Sem permissão para o Painel Operacional' USING ERRCODE = '42501';
  END IF;
  SELECT v.id, v.result_id, v.parameter_name, v.value, r.order_id, r.company_id, r.exam_catalog_id
    INTO v_res
  FROM public.lab_result_values v JOIN public.lab_exam_results r ON r.id = v.result_id
  WHERE v.id = p_value_id;
  IF v_res.id IS NULL OR v_res.company_id IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'Resultado não encontrado' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.lab_critico_notificacao (company_id, result_value_id, result_id, order_id, parameter_name, valor, limite_critico, observacao, notified_by, notified_by_name)
  VALUES (v_company, v_res.id, v_res.result_id, v_res.order_id, v_res.parameter_name, v_res.value,
    (SELECT p->>'criticalLimit' FROM public.exams ex, jsonb_array_elements(CASE WHEN jsonb_typeof(ex.interfacing_parameters)='array' THEN ex.interfacing_parameters ELSE '[]'::jsonb END) p
      WHERE ex.id = v_res.exam_catalog_id AND lower(trim(p->>'parameterName')) = lower(trim(v_res.parameter_name)) LIMIT 1),
    nullif(trim(coalesce(p_observacao, '')), ''), auth.uid(),
    (SELECT full_name FROM public.profiles WHERE id = auth.uid()))
  ON CONFLICT (result_value_id) DO NOTHING;
  SELECT notified_at INTO v_quando FROM public.lab_critico_notificacao WHERE result_value_id = p_value_id;
  RETURN v_quando;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lab_critico_marcar_notificado(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_critico_marcar_notificado(uuid, text) TO authenticated;

-- Liga a permissão nos perfis técnicos/administração já existentes
UPDATE public.access_profiles
SET permissions = jsonb_set(coalesce(permissions, '{}'::jsonb), '{lab}',
  coalesce(permissions->'lab', '[]'::jsonb) || '["lab.painel_operacional"]'::jsonb)
WHERE NOT (coalesce(permissions->'lab', '[]'::jsonb) ? 'lab.painel_operacional')
  AND (name IN ('TI – Administração', 'Digitação – Laudos')
    OR name ILIKE '%bioqu%' OR name ILIKE '%analista%' OR name ILIKE '%respons%t_cnic%');

-- Empresas novas já nascem com a permissão nos perfis TI e Digitação
CREATE OR REPLACE FUNCTION public.initialize_company_access_defaults(_company_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  reception_profile_id text := 'prof_reception_' || replace(_company_id::text, '-', '');
  admin_profile_id text := 'prof_admin_' || replace(_company_id::text, '-', '');
  lab_profile_id text := 'prof_lab_' || replace(_company_id::text, '-', '');
  reception_sector_id text := 'sec_reception_' || replace(_company_id::text, '-', '');
  admin_sector_id text := 'sec_admin_' || replace(_company_id::text, '-', '');
  lab_sector_id text := 'sec_lab_' || replace(_company_id::text, '-', '');
BEGIN
  INSERT INTO public.access_profiles (id, company_id, code, name, description, permissions, is_active, created_by)
  VALUES
    (reception_profile_id, _company_id, 7000, 'Recepção – Padrão', 'Atendimento e acolhimento de pacientes', '{"dashboard":["view"],"scheduling":["view","create","edit"],"reception":["view","create","edit"],"totem":["view","create"]}'::jsonb, true, 'admin'),
    (admin_profile_id, _company_id, 9000, 'TI – Administração', 'Gestão administrativa e TI', '{"dashboard":["view"],"scheduling":["view","create","edit","delete","export","approve"],"reception":["view","create","edit","delete","export","approve"],"totem":["view","create","edit","delete","export","approve"],"medical_record":["view","create","edit","delete","export","approve"],"billing":["view","create","edit","delete","export","approve"],"results":["view","create","edit","delete","export","approve"],"reports":["view","create","edit","delete","export","approve"],"bi":["view","create","edit","delete","export","approve"],"users":["view","create","edit","delete","export","approve"],"settings":["view","create","edit","delete","export","approve"],"registers":["view","create","edit","delete","export","approve"],"lab_technical":["view","create","edit","delete","export","approve"],"lab_registers":["view","create","edit","delete","export","approve"],"finance":["view","create","edit","delete","export","approve"],"inventory":["view","create","edit","delete","export","approve"],"pharmacy":["view","create","edit","delete","export","approve"],"serotheque":["view","create","edit","delete","export","approve"],"portals":["view","create","edit","delete","export","approve"],"lab":["lab.painel_operacional"]}'::jsonb, true, 'admin'),
    (lab_profile_id, _company_id, 1000, 'Digitação – Laudos', 'Análises clínicas e laudos', '{"dashboard":["view"],"results":["view","create","edit"],"reports":["view"],"lab_technical":["view","create","edit"],"lab_registers":["view"],"lab":["lab.painel_operacional"]}'::jsonb, true, 'admin')
  ON CONFLICT (company_id, name) DO NOTHING;

  SELECT id INTO reception_profile_id FROM public.access_profiles WHERE company_id = _company_id AND name = 'Recepção – Padrão';
  SELECT id INTO admin_profile_id FROM public.access_profiles WHERE company_id = _company_id AND name = 'TI – Administração';
  SELECT id INTO lab_profile_id FROM public.access_profiles WHERE company_id = _company_id AND name = 'Digitação – Laudos';

  INSERT INTO public.company_sectors (id, company_id, name, description, allowed_profile_ids)
  VALUES
    (admin_sector_id, _company_id, 'TI – Administração', 'Gestão administrativa e TI', ARRAY[admin_profile_id]),
    (reception_sector_id, _company_id, 'Recepção – Padrão', 'Atendimento e acolhimento de pacientes', ARRAY[reception_profile_id]),
    (lab_sector_id, _company_id, 'Digitação – Laudos', 'Análises clínicas e laudos', ARRAY[lab_profile_id])
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$function$;
