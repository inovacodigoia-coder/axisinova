
WITH ranked AS (
  SELECT id, establishment_id,
         first_value(id) OVER (PARTITION BY establishment_id ORDER BY created_at, id) AS keep_id
  FROM public.origins
  WHERE establishment_id IS NOT NULL
), dups AS (
  SELECT id AS dup_id, keep_id FROM ranked WHERE id <> keep_id
)
UPDATE public.attendance_orders ao SET origin_id = d.keep_id FROM dups d WHERE ao.origin_id = d.dup_id;

WITH ranked AS (
  SELECT id, establishment_id,
         first_value(id) OVER (PARTITION BY establishment_id ORDER BY created_at, id) AS keep_id
  FROM public.origins
  WHERE establishment_id IS NOT NULL
), dups AS (
  SELECT id AS dup_id, keep_id FROM ranked WHERE id <> keep_id
)
UPDATE public.external_accesses ea SET origin_id = d.keep_id FROM dups d WHERE ea.origin_id = d.dup_id;

WITH ranked AS (
  SELECT id, establishment_id,
         first_value(id) OVER (PARTITION BY establishment_id ORDER BY created_at, id) AS keep_id
  FROM public.origins
  WHERE establishment_id IS NOT NULL
), dups AS (
  SELECT id AS dup_id, keep_id FROM ranked WHERE id <> keep_id
)
UPDATE public.user_origin_preferences p SET origin_id = d.keep_id
FROM dups d
WHERE p.origin_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM public.user_origin_preferences p2
    WHERE p2.user_id = p.user_id AND p2.origin_id = d.keep_id
  );

WITH ranked AS (
  SELECT id, establishment_id,
         first_value(id) OVER (PARTITION BY establishment_id ORDER BY created_at, id) AS keep_id
  FROM public.origins
  WHERE establishment_id IS NOT NULL
)
DELETE FROM public.origins o
USING ranked r
WHERE o.id = r.id AND r.id <> r.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS origins_establishment_id_unique
  ON public.origins (establishment_id)
  WHERE establishment_id IS NOT NULL;
