ALTER TABLE public.lab_workbenches 
ADD COLUMN IF NOT EXISTS report_break_policy text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS report_order integer DEFAULT 0;

COMMENT ON COLUMN public.lab_workbenches.report_break_policy IS 'sequential, dedicated_page, default';