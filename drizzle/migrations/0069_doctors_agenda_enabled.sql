ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS agenda_enabled boolean NOT NULL DEFAULT false;
UPDATE public.doctors SET agenda_enabled = true WHERE is_active = true;