ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS sequence_id integer;

CREATE SEQUENCE IF NOT EXISTS public.companies_sequence_id_seq OWNED BY public.companies.sequence_id;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.companies
)
UPDATE public.companies c
SET sequence_id = o.rn
FROM ordered o
WHERE c.id = o.id AND c.sequence_id IS NULL;

SELECT setval('public.companies_sequence_id_seq', COALESCE((SELECT MAX(sequence_id) FROM public.companies), 0) + 1, false);

ALTER TABLE public.companies ALTER COLUMN sequence_id SET DEFAULT nextval('public.companies_sequence_id_seq');
ALTER TABLE public.companies ALTER COLUMN sequence_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS companies_sequence_id_unique ON public.companies (sequence_id);