CREATE INDEX IF NOT EXISTS idx_attendance_orders_company_updated_at ON public.attendance_orders (company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_orders_company_status_updated ON public.attendance_orders (company_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_orders_patient ON public.attendance_orders (patient_id);
CREATE INDEX IF NOT EXISTS idx_attendance_orders_protocol ON public.attendance_orders (protocol);