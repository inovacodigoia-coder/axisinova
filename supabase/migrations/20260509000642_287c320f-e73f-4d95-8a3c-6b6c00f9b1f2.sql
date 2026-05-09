ALTER TABLE public.queue_totems
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS access_username text,
  ADD COLUMN IF NOT EXISTS access_password text;

CREATE UNIQUE INDEX IF NOT EXISTS queue_totems_slug_unique ON public.queue_totems(slug) WHERE slug IS NOT NULL;