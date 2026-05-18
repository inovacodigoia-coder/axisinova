
ALTER TABLE public.queue_tvs ADD COLUMN IF NOT EXISTS media_attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
