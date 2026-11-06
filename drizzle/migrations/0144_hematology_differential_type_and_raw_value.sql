ALTER TABLE public.lab_equipments ADD COLUMN IF NOT EXISTS differential_type text CHECK (differential_type IN ('3','5'));
COMMENT ON COLUMN public.lab_equipments.differential_type IS 'Optional presentation-only differential type; NULL displays all received parameters.';
ALTER TABLE public.lab_result_values ADD COLUMN IF NOT EXISTS instrument_value text;
UPDATE public.lab_result_values SET instrument_value=value WHERE source='instrument' AND instrument_value IS NULL;
COMMENT ON COLUMN public.lab_result_values.instrument_value IS 'Last unmodified instrument value, preserved when a manual differential adjusts displayed segments.';