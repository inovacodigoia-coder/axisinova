ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS reference_values JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS confirmation_questions JSONB DEFAULT '[]'::jsonb;

-- Ensure permissions
GRANT ALL ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
