
CREATE TABLE IF NOT EXISTS public.queue_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  queue_line_id uuid NOT NULL,
  queue_line_name text NOT NULL,
  prefix text NOT NULL,
  number integer NOT NULL,
  display_code text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  patient_name text,
  guiche_id uuid,
  guiche_name text,
  attendant_name text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  called_at timestamptz,
  attendance_started_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_unit ON public.queue_tickets(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_company ON public.queue_tickets(company_id);

ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY queue_tickets_select ON public.queue_tickets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY queue_tickets_insert ON public.queue_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY queue_tickets_update ON public.queue_tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY queue_tickets_delete ON public.queue_tickets FOR DELETE TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
ALTER TABLE public.queue_tickets REPLICA IDENTITY FULL;
