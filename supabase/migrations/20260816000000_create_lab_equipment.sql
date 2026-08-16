CREATE TABLE public.lab_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL,
    type TEXT,
    brand TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_equipment TO authenticated;
GRANT ALL ON public.lab_equipment TO service_role;

-- RLS
ALTER TABLE public.lab_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company equipment"
    ON public.lab_equipment
    FOR ALL
    TO authenticated
    USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Index for performance
CREATE INDEX idx_lab_equipment_company ON public.lab_equipment(company_id);
