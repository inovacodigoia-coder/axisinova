ALTER TABLE public.lab_exam_reference_values
  ADD COLUMN IF NOT EXISTS use_fasting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_fasting boolean NOT NULL DEFAULT false;