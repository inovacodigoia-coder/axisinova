ALTER TABLE public.lab_settings
  ADD COLUMN IF NOT EXISTS signature_name text,
  ADD COLUMN IF NOT EXISTS signature_register text,
  ADD COLUMN IF NOT EXISTS signature_image_url text,
  ADD COLUMN IF NOT EXISTS signature_auto_on_release boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_include_register boolean NOT NULL DEFAULT true;