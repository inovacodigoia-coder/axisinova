ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS selected_materials JSONB DEFAULT '[]'::jsonb, 
ADD COLUMN IF NOT EXISTS default_material TEXT; 

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated; 
GRANT ALL ON public.exams TO service_role;