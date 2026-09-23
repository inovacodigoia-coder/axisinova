-- 1) Laudos por exame
CREATE TABLE public.exam_laudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  methodology TEXT,
  report_observations TEXT,
  report_single_page BOOLEAN NOT NULL DEFAULT false,
  report_template_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX exam_laudos_exam_code_key ON public.exam_laudos (exam_id, upper(code));
CREATE INDEX exam_laudos_exam_idx ON public.exam_laudos (exam_id, sort_order);
CREATE INDEX exam_laudos_company_idx ON public.exam_laudos (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_laudos TO authenticated;
GRANT ALL ON public.exam_laudos TO service_role;

ALTER TABLE public.exam_laudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_laudos_company_scope ON public.exam_laudos
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_exam_laudos_updated_at
  BEFORE UPDATE ON public.exam_laudos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Previsão de entrega por origem (origin_id NULL = previsão geral)
CREATE TABLE public.exam_delivery_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  origin_id UUID REFERENCES public.origins(id) ON DELETE CASCADE,
  days INTEGER NOT NULL DEFAULT 0,
  hours INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  no_estimate BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX exam_delivery_estimates_origin_key
  ON public.exam_delivery_estimates (exam_id, origin_id) WHERE origin_id IS NOT NULL;
CREATE UNIQUE INDEX exam_delivery_estimates_general_key
  ON public.exam_delivery_estimates (exam_id) WHERE origin_id IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_delivery_estimates TO authenticated;
GRANT ALL ON public.exam_delivery_estimates TO service_role;

ALTER TABLE public.exam_delivery_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_delivery_estimates_company_scope ON public.exam_delivery_estimates
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_exam_delivery_estimates_updated_at
  BEFORE UPDATE ON public.exam_delivery_estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Vínculo de laudo nas configurações e resultados
ALTER TABLE public.lab_exam_parameters ADD COLUMN laudo_id UUID REFERENCES public.exam_laudos(id) ON DELETE CASCADE;
ALTER TABLE public.lab_exam_reference_values ADD COLUMN laudo_id UUID REFERENCES public.exam_laudos(id) ON DELETE CASCADE;
ALTER TABLE public.lab_exam_results ADD COLUMN laudo_id UUID REFERENCES public.exam_laudos(id) ON DELETE SET NULL;
ALTER TABLE public.lab_result_values ADD COLUMN laudo_id UUID REFERENCES public.exam_laudos(id) ON DELETE SET NULL;

-- 4) Backfill: cada exame existente ganha o "Laudo Padrão" com a configuração atual
INSERT INTO public.exam_laudos (company_id, exam_id, code, name, sort_order, is_active, methodology, report_observations, report_single_page, report_template_id)
SELECT e.company_id, e.id, 'L001', 'Laudo Padrão', 1, true, e.methodology, e.report_observations, coalesce(e.report_single_page, false), e.report_template_id
FROM public.exams e;

UPDATE public.lab_exam_parameters p
   SET laudo_id = l.id
  FROM public.exam_laudos l
 WHERE p.exam_id = l.exam_id AND l.sort_order = 1 AND p.laudo_id IS NULL;

UPDATE public.lab_exam_reference_values r
   SET laudo_id = l.id
  FROM public.exam_laudos l
 WHERE r.exam_id = l.exam_id AND l.sort_order = 1 AND r.laudo_id IS NULL;

-- 5) Previsão geral a partir do que já está no exame
INSERT INTO public.exam_delivery_estimates (company_id, exam_id, origin_id, days, hours, minutes, no_estimate)
SELECT e.company_id, e.id, NULL, coalesce(e.result_deadline_days, 0), 0, 0, false
FROM public.exams e;

CREATE INDEX lab_exam_parameters_laudo_idx ON public.lab_exam_parameters (laudo_id);
CREATE INDEX lab_exam_reference_values_laudo_idx ON public.lab_exam_reference_values (laudo_id);

COMMENT ON COLUMN public.exams.methodology IS 'DEPRECATED: substituído por exam_laudos.methodology';
COMMENT ON COLUMN public.exams.reference_values IS 'DEPRECATED: faixas vivem em lab_exam_reference_values por laudo';