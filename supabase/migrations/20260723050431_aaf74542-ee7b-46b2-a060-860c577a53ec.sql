ALTER TABLE public.convenios
ADD COLUMN IF NOT EXISTS exam_prices jsonb NOT NULL DEFAULT '[]'::jsonb;