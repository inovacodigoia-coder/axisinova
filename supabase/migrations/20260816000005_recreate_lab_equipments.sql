DROP TABLE IF EXISTS public.lab_equipments CASCADE;

CREATE TABLE public.lab_equipments (
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_equipments TO authenticated;
GRANT ALL ON public.lab_equipments TO service_role;

ALTER TABLE public.lab_equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company equipment"
    ON public.lab_equipments
    FOR ALL
    TO authenticated
    USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_lab_equipments_company ON public.lab_equipments(company_id);
