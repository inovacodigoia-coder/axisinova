ALTER TABLE public.lab_exam_reference_values
  ADD COLUMN IF NOT EXISTS value_min NUMERIC,
  ADD COLUMN IF NOT EXISTS value_max NUMERIC;

COMMENT ON COLUMN public.lab_exam_reference_values.value_min IS 'Limite inferior do resultado quando age_unit = valor';
COMMENT ON COLUMN public.lab_exam_reference_values.value_max IS 'Limite superior do resultado quando age_unit = valor';