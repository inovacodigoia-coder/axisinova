CREATE TABLE public.attendance_origins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(company_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_origins TO authenticated;
GRANT ALL ON public.attendance_origins TO service_role;

ALTER TABLE public.attendance_origins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company origins"
ON public.attendance_origins
FOR ALL
TO authenticated
USING (company_id = auth.get_company_id())
WITH CHECK (company_id = auth.get_company_id());

-- Create a function to seed the default origin for new companies
-- In a real scenario, this would be triggered by company creation.
-- For now, we'll provide the UI to manage it and seed it.
