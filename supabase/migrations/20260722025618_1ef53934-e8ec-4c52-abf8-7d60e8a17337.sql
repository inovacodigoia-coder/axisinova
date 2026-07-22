
-- Create lab_equipments table
CREATE TABLE IF NOT EXISTS public.lab_equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    model TEXT,
    manufacturer TEXT,
    serial_number TEXT,
    connection_type TEXT, -- HL7, ASTM, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_equipments TO authenticated;
GRANT ALL ON public.lab_equipments TO service_role;

ALTER TABLE public.lab_equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own company's equipments"
ON public.lab_equipments
FOR ALL
TO authenticated
USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add interfacing columns to exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS interfacing_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS interfacing_parameters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS methodology TEXT;
