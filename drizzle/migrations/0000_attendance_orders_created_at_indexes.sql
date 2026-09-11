CREATE INDEX IF NOT EXISTS idx_attendance_orders_company_created_at
  ON public.attendance_orders (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_orders_company_status_created_at
  ON public.attendance_orders (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exams_company ON public.exams (company_id);
CREATE INDEX IF NOT EXISTS idx_lab_workbenches_company ON public.lab_workbenches (company_id);
CREATE INDEX IF NOT EXISTS idx_patients_company_name ON public.patients (company_id, name);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_failed ON public.login_attempts (ip_address, attempted_at DESC) WHERE success = false;