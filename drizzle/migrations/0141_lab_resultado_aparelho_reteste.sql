-- Estado de reteste por exame (consumido por um resultado novo do aparelho)
ALTER TABLE public.lab_exam_results
  ADD COLUMN retest_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN retest_requested_by uuid,
  ADD COLUMN retest_requested_at timestamptz;

-- Histórico/auditoria de valores substituídos (aparelho ou digitação)
CREATE TABLE public.lab_result_value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  result_id uuid NOT NULL REFERENCES public.lab_exam_results(id) ON DELETE CASCADE,
  parameter_key text NOT NULL,
  parameter_name text,
  value text,
  unit text,
  source text,
  instrument_code text,
  flag text,
  result_datetime timestamptz,
  reason text NOT NULL,
  replaced_by text NOT NULL DEFAULT 'instrument',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lab_result_value_history_result_idx
  ON public.lab_result_value_history (result_id, parameter_key, created_at DESC);
GRANT SELECT ON public.lab_result_value_history TO authenticated;
GRANT ALL ON public.lab_result_value_history TO service_role;
ALTER TABLE public.lab_result_value_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members read lab result value history"
  ON public.lab_result_value_history FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Solicitar reteste: só exame liberado, mesma empresa do usuário
CREATE OR REPLACE FUNCTION public.lab_solicitar_reteste(_result_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.lab_exam_results%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'login obrigatório';
  END IF;
  SELECT * INTO r FROM public.lab_exam_results WHERE id = _result_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'resultado não encontrado';
  END IF;
  IF r.company_id IS DISTINCT FROM get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'sem acesso a este resultado';
  END IF;
  IF r.status <> 'released' THEN
    RAISE EXCEPTION 'só é possível pedir reteste de exame liberado';
  END IF;
  UPDATE public.lab_exam_results
    SET retest_requested = true,
        retest_requested_by = auth.uid(),
        retest_requested_at = now()
    WHERE id = _result_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_solicitar_reteste(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_solicitar_reteste(uuid) TO authenticated;

-- Cancelar pedido de reteste (antes de chegar resultado novo)
CREATE OR REPLACE FUNCTION public.lab_cancelar_reteste(_result_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.lab_exam_results%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'login obrigatório';
  END IF;
  SELECT * INTO r FROM public.lab_exam_results WHERE id = _result_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'resultado não encontrado';
  END IF;
  IF r.company_id IS DISTINCT FROM get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'sem acesso a este resultado';
  END IF;
  UPDATE public.lab_exam_results
    SET retest_requested = false,
        retest_requested_by = NULL,
        retest_requested_at = NULL
    WHERE id = _result_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_cancelar_reteste(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_cancelar_reteste(uuid) TO authenticated;