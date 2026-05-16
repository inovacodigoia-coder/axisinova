ALTER TABLE public.queue_tickets
ADD COLUMN IF NOT EXISTS tv_id uuid,
ADD COLUMN IF NOT EXISTS call_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_queue_tickets_tv_called
ON public.queue_tickets(tv_id, status, called_at DESC);

UPDATE public.queue_tickets
SET call_count = CASE WHEN status = 'waiting' THEN 0 ELSE GREATEST(call_count, 1) END
WHERE call_count = 0;