CREATE TABLE public.instrument_integration_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'ServidorAisaxius',
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instrument_integration_keys TO authenticated;
GRANT ALL ON public.instrument_integration_keys TO service_role;

ALTER TABLE public.instrument_integration_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins view integration keys"
ON public.instrument_integration_keys FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Company admins create integration keys"
ON public.instrument_integration_keys FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Company admins update integration keys"
ON public.instrument_integration_keys FOR UPDATE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Company admins delete integration keys"
ON public.instrument_integration_keys FOR DELETE TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));

CREATE INDEX idx_instrument_keys_company ON public.instrument_integration_keys(company_id);

CREATE TABLE public.instrument_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'processed',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, idempotency_key)
);

GRANT SELECT ON public.instrument_events TO authenticated;
GRANT ALL ON public.instrument_events TO service_role;

ALTER TABLE public.instrument_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view instrument events"
ON public.instrument_events FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE INDEX idx_instrument_events_company ON public.instrument_events(company_id, created_at DESC);

ALTER TABLE public.lab_result_values
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS instrument_code text,
  ADD COLUMN IF NOT EXISTS flag text,
  ADD COLUMN IF NOT EXISTS result_datetime timestamptz;