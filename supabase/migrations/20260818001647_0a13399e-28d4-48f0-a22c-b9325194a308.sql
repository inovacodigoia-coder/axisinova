CREATE TABLE public.instrument_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.lab_equipments(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_test_at TIMESTAMPTZ,
  last_test_status INTEGER,
  last_test_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instrument_webhooks TO authenticated;
GRANT ALL ON public.instrument_webhooks TO service_role;

ALTER TABLE public.instrument_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company instrument webhooks"
  ON public.instrument_webhooks
  FOR ALL
  TO authenticated
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_instrument_webhooks_equipment ON public.instrument_webhooks(equipment_id);