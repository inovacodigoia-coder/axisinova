ALTER TABLE public.exam_laudos ADD COLUMN parameters JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.exam_laudos ADD COLUMN reference_values JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.exam_laudos l
   SET parameters = COALESCE(e.parameters, '[]'::jsonb),
       reference_values = COALESCE(e.reference_values, '[]'::jsonb)
  FROM public.exams e
 WHERE e.id = l.exam_id AND l.sort_order = 1;