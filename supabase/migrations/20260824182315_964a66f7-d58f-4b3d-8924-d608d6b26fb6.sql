ALTER TABLE public.lab_exam_reference_values
  ADD COLUMN IF NOT EXISTS age_unit text NOT NULL DEFAULT 'anos';