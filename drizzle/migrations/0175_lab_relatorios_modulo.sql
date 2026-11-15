-- Relatórios Gerenciais do laboratório: liberação por empresa (desligado por padrão; só a labsaude ativa)
CREATE TABLE public.lab_relatorios_modulo (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT false,
  alterado_por uuid,
  alterado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_relatorios_modulo TO authenticated;
GRANT ALL ON public.lab_relatorios_modulo TO service_role;
ALTER TABLE public.lab_relatorios_modulo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relatórios gerenciais lê situação do módulo da própria empresa" ON public.lab_relatorios_modulo FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

INSERT INTO public.lab_relatorios_modulo (company_id, ativo)
SELECT id, true FROM public.companies WHERE id = '7858af33-878e-40c4-9305-e912cc6655c3'
ON CONFLICT (company_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.lab_relatorios_modulo_ativo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND coalesce((SELECT ativo FROM public.lab_relatorios_modulo
    WHERE company_id = public.get_user_company_id(auth.uid())), false);
$$;
REVOKE EXECUTE ON FUNCTION public.lab_relatorios_modulo_ativo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_relatorios_modulo_ativo() TO authenticated;

-- Permissão: exige o módulo ligado na empresa (sem exceção para administrador)
CREATE OR REPLACE FUNCTION public.lab_relatorios_tem_permissao()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.lab_relatorios_modulo_ativo()
    AND (
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

-- Mesmo relatório + quem liberou (lb), quem pediu a recoleta (rb), número do pedido em toda linha e o nome dos analistas.
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
      nullif(trim(x.e->'recollection'->>'requestedBy'), '') AS rec_por,
      CASE WHEN r.status = 'released' THEN r.released_at END AS released_at,
      CASE WHEN r.status = 'released' THEN r.released_by END AS released_by
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
  ), sel AS (
    SELECT * FROM base b
    WHERE b.created_at BETWEEN p_de AND p_ate OR b.released_at BETWEEN p_de AND p_ate OR b.rec_at BETWEEN p_de AND p_ate
  )
  SELECT jsonb_build_object(
    'exames', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'o', b.order_id, 'u', b.urgente, 'c', b.created_at, 'og', b.origem, 'e', b.exam_id, 'x', b.exam_name,
        'b', b.bancada, 't', b.tipo, 'ca', b.collected_at, 'la', b.released_at, 'ra', b.rec_at, 'rm', b.rec_motivo,
        'lb', b.released_by, 'p', b.protocol,
        'n', CASE WHEN b.rec_at IS NOT NULL THEN b.patient_name END,
        'cb', CASE WHEN b.rec_at IS NOT NULL THEN b.collected_by END,
        'rb', CASE WHEN b.rec_at IS NOT NULL THEN b.rec_por END)))
      FROM sel b
    ), '[]'::jsonb),
    'analistas', coalesce((
      SELECT jsonb_object_agg(pr.id::text, coalesce(nullif(trim(pr.full_name), ''), 'Usuário sem nome'))
      FROM public.profiles pr WHERE pr.id IN (SELECT DISTINCT released_by FROM sel WHERE released_by IS NOT NULL)
    ), '{}'::jsonb),
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