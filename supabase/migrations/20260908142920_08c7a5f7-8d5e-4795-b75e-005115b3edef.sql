ALTER TABLE public.lab_settings
  ADD COLUMN IF NOT EXISTS label_width_mm numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS label_height_mm numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS label_rotation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS label_copies integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS label_preset text;