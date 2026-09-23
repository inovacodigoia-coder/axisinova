ALTER TABLE public.exam_laudos
  ADD COLUMN IF NOT EXISTS result_deadline_days integer,
  ADD COLUMN IF NOT EXISTS workbench_id uuid,
  ADD COLUMN IF NOT EXISTS selected_materials jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_material text;

UPDATE public.exam_laudos l
   SET result_deadline_days = COALESCE(l.result_deadline_days, e.result_deadline_days),
       workbench_id = COALESCE(l.workbench_id, e.workbench_id),
       selected_materials = COALESCE(NULLIF(l.selected_materials, '[]'::jsonb), e.selected_materials, '[]'::jsonb),
       default_material = COALESCE(l.default_material, e.default_material)
  FROM public.exams e
 WHERE e.id = l.exam_id;