ALTER TABLE public.lab_exam_reference_values ADD COLUMN IF NOT EXISTS is_pregnant boolean DEFAULT false;

-- Ensure privileges are granted
GRANT ALL ON public.lab_exam_reference_values TO authenticated;
GRANT ALL ON public.lab_exam_reference_values TO service_role;