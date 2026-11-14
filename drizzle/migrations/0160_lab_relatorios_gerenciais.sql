CREATE INDEX IF NOT EXISTS idx_lab_exam_results_company_released ON public.lab_exam_results (company_id, released_at);

CREATE OR REPLACE FUNCTION public.lab_relatorios_tem_permissao()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'lab','[]'::jsonb) ? 'lab.relatorios_gerenciais'));
$$;
REVOKE EXECUTE ON FUNCTION public.lab_relatorios_tem_permissao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_relatorios_tem_permissao() TO authenticated;

-- Exames do período (pedidos criados, liberados ou recoletados entre p_de e p_ate), só leitura, um único valor jsonb.
CREATE OR REPLACE FUNCTION public.lab_relatorio_gerencial(p_de timestamptz, p_ate timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_company uuid := public.get_user_company_id(auth.uid());
  v jsonb;
BEGIN
  IF NOT public.lab_relatorios_tem_permissao() THEN
    RAISE EXCEPTION 'Sem permissão para os relatórios gerenciais' USING ERRCODE = '42501';
  END IF;
  IF p_de IS NULL OR p_ate IS NULL OR p_ate < p_de OR p_ate - p_de > interval '100 days' THEN
    RAISE EXCEPTION 'Período inválido (máximo 100 dias)' USING ERRCODE = '22023';
  END IF;

  WITH alvo AS (
    SELECT o.id FROM public.attendance_orders o
    WHERE o.company_id = v_company AND o.created_at <= p_ate AND (o.created_at >= p_de OR o.updated_at >= p_de)
    UNION
    SELECT r.order_id FROM public.lab_exam_results r
    WHERE r.company_id = v_company AND r.released_at BETWEEN p_de AND p_ate AND r.order_id IS NOT NULL
  ), base AS (
    SELECT o.id AS order_id, o.protocol, coalesce(pt.name, o.patient_name) AS patient_name,
      coalesce(o.is_urgent, false) AS urgente, o.created_at,
      coalesce(nullif(trim(o.origin_name), ''), 'Sem origem') AS origem,
      x.exam_id, coalesce(x.e->>'name', x.e->>'examName', ex.name) AS exam_name,
      coalesce(nullif(x.e->>'bancadaId',''), nullif(x.e->>'workbenchId',''), ex.workbench_id::text) AS bancada,
      nullif(x.e->>'bancadaTipo','') AS tipo,
      CASE WHEN coalesce(x.e->>'collected','') = 'false' THEN NULL
           WHEN x.e->>'collectedAt' ~ '^\d{4}-\d{2}-\d{2}' THEN (x.e->>'collectedAt')::timestamptz END AS collected_at,
      nullif(x.e->>'collectedBy','') AS collected_by,
      CASE WHEN x.e->'recollection'->>'requestedAt' ~ '^\d{4}-\d{2}-\d{2}' THEN (x.e->'recollection'->>'requestedAt')::timestamptz END AS rec_at,
      nullif(trim(x.e->'recollection'->>'reason'), '') AS rec_motivo,
      CASE WHEN r.status = 'released' THEN r.released_at END AS released_at
    FROM alvo a
    JOIN public.attendance_orders o ON o.id = a.id
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
      AND coalesce(r.status, '') <> 'cancelled'
  )
  SELECT jsonb_build_object(
    'exames', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'o', b.order_id, 'u', b.urgente, 'c', b.created_at, 'og', b.origem, 'e', b.exam_id, 'x', b.exam_name,
        'b', b.bancada, 't', b.tipo, 'ca', b.collected_at, 'la', b.released_at, 'ra', b.rec_at, 'rm', b.rec_motivo,
        'p', CASE WHEN b.rec_at IS NOT NULL THEN b.protocol END,
        'n', CASE WHEN b.rec_at IS NOT NULL THEN b.patient_name END,
        'cb', CASE WHEN b.rec_at IS NOT NULL THEN b.collected_by END)))
      FROM base b
      WHERE b.created_at BETWEEN p_de AND p_ate OR b.released_at BETWEEN p_de AND p_ate OR b.rec_at BETWEEN p_de AND p_ate
    ), '[]'::jsonb),
    'criticos', coalesce((
      SELECT jsonb_agg(n.notified_at ORDER BY n.notified_at) FROM public.lab_critico_notificacao n
      WHERE n.company_id = v_company AND n.notified_at BETWEEN p_de AND p_ate
    ), '[]'::jsonb),
    'responsavel', (
      SELECT jsonb_build_object('nome', s.responsible_name, 'registro', s.responsible_register, 'logo', s.report_logo_primary_url)
      FROM public.lab_settings s WHERE s.company_id = v_company LIMIT 1)
  ) INTO v;
  RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lab_relatorio_gerencial(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_relatorio_gerencial(timestamptz, timestamptz) TO authenticated;

-- Padrão: TI/Administração, Bioquímico/Analista e Responsável Técnico.
UPDATE public.access_profiles
SET permissions = jsonb_set(coalesce(permissions, '{}'::jsonb), '{lab}',
  coalesce(permissions->'lab', '[]'::jsonb) || '["lab.relatorios_gerenciais"]'::jsonb)
WHERE NOT (coalesce(permissions->'lab', '[]'::jsonb) ? 'lab.relatorios_gerenciais')
  AND (name = 'TI – Administração' OR name ILIKE '%bioqu%' OR name ILIKE '%analista%' OR name ILIKE '%respons%t_cnic%');

CREATE OR REPLACE FUNCTION public.initialize_company_access_defaults(_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    (admin_profile_id, _company_id, 9000, 'TI – Administração', 'Gestão administrativa e TI', '{"dashboard":["view"],"scheduling":["view","create","edit","delete","export","approve"],"reception":["view","create","edit","delete","export","approve"],"totem":["view","create","edit","delete","export","approve"],"medical_record":["view","create","edit","delete","export","approve"],"billing":["view","create","edit","delete","export","approve"],"results":["view","create","edit","delete","export","approve"],"reports":["view","create","edit","delete","export","approve"],"bi":["view","create","edit","delete","export","approve"],"users":["view","create","edit","delete","export","approve"],"settings":["view","create","edit","delete","export","approve"],"registers":["view","create","edit","delete","export","approve"],"lab_technical":["view","create","edit","delete","export","approve"],"lab_registers":["view","create","edit","delete","export","approve"],"finance":["view","create","edit","delete","export","approve"],"inventory":["view","create","edit","delete","export","approve"],"pharmacy":["view","create","edit","delete","export","approve"],"serotheque":["view","create","edit","delete","export","approve"],"portals":["view","create","edit","delete","export","approve"],"lab":["lab.painel_operacional","lab.relatorios_gerenciais"]}'::jsonb, true, 'admin'),
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