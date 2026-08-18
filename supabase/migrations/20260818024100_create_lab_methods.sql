CREATE TABLE public.lab_methods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for performance
CREATE INDEX idx_lab_methods_company_id ON public.lab_methods(company_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_methods TO authenticated;
GRANT ALL ON public.lab_methods TO service_role;

-- RLS
ALTER TABLE public.lab_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage methods of their own company"
    ON public.lab_methods
    FOR ALL
    TO authenticated
    USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Insert defaults for each existing company (optional, but good for UX)
-- In a real scenario, we might want to do this via Edge Function or just let the first user do it.
-- For the "default 4", we will handle them in the frontend via an upsert/check if empty logic or just static initial state.
