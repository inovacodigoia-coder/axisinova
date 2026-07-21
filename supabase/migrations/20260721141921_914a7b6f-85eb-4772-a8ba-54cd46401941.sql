ALTER TABLE public.exams ADD COLUMN type text DEFAULT 'clinical' CHECK (type IN ('clinical', 'lab'));

UPDATE public.exams SET type = 'clinical' WHERE type IS NULL;

-- Re-apply grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;