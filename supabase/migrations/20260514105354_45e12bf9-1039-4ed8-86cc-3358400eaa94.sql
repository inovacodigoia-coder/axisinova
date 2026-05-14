ALTER TABLE public.queue_tvs
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS access_username TEXT,
  ADD COLUMN IF NOT EXISTS access_password TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS queue_tvs_slug_unique ON public.queue_tvs(slug) WHERE slug IS NOT NULL;