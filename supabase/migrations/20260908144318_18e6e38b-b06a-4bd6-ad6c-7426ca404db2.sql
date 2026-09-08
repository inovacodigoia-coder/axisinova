ALTER TABLE public.lab_settings
  ADD COLUMN IF NOT EXISTS label_margin_mm numeric NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS label_barcode_height_px integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS label_font_header numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS label_font_code numeric NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS label_font_patient numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS label_font_small numeric NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS label_font_footer numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS label_auto_fit boolean NOT NULL DEFAULT true;