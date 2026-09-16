ALTER TABLE public.instrument_events
  ADD COLUMN IF NOT EXISTS equipment_id text,
  ADD COLUMN IF NOT EXISTS sample_barcode text,
  ADD COLUMN IF NOT EXISTS test_code text,
  ADD COLUMN IF NOT EXISTS received_value text,
  ADD COLUMN IF NOT EXISTS protocol text,
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS exam_name text;

CREATE INDEX IF NOT EXISTS idx_instrument_events_company_created
  ON public.instrument_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instrument_events_sample
  ON public.instrument_events (company_id, sample_barcode);
CREATE INDEX IF NOT EXISTS idx_instrument_events_protocol
  ON public.instrument_events (company_id, protocol);

GRANT SELECT ON public.instrument_events TO authenticated;
GRANT ALL ON public.instrument_events TO service_role;

-- backfill a partir do payload já registrado
UPDATE public.instrument_events
SET equipment_id = COALESCE(equipment_id, NULLIF(payload->>'equipment_id',''), NULLIF(payload->>'instrument_code','')),
    sample_barcode = COALESCE(sample_barcode, NULLIF(payload->>'sample_barcode',''), NULLIF(payload->>'sample_id',''), NULLIF(payload->>'sample_code','')),
    test_code = COALESCE(test_code, NULLIF(payload->>'test_code',''), NULLIF(payload->>'code','')),
    received_value = COALESCE(received_value, NULLIF(payload->>'value',''))
WHERE equipment_id IS NULL AND sample_barcode IS NULL;