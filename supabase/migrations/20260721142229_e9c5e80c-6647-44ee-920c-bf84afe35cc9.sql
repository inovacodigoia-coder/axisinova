-- Create measurement_units table
CREATE TABLE public.measurement_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurement_units TO authenticated;
GRANT ALL ON public.measurement_units TO service_role;

-- Enable RLS
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage measurement_units of their company"
ON public.measurement_units
FOR ALL
TO authenticated
USING (company_id IN (
    SELECT id FROM public.companies 
    WHERE id = measurement_units.company_id
));

-- Seed data for all existing companies
INSERT INTO public.measurement_units (name, active, company_id)
SELECT u.name, true, c.id
FROM public.companies c
CROSS JOIN (VALUES 
  ('/mm³'), ('%'), ('cel/µL'), ('copies/mL'), ('fl'), ('g/24h'), ('g/dL'), ('g/L'), ('g%'), ('mEq/L'), 
  ('mg/24h'), ('mg/dL'), ('mg/L'), ('mil/mm³'), ('milhões/mm³'), ('mL/24h'), ('mL/min'), ('mL/min/1.73m²'), 
  ('mm/h'), ('mm³'), ('mmHg'), ('mmol/L'), ('mUI/L'), ('mUI/mL'), ('ng/dL'), ('ng/L-teste'), ('ng/mL'), 
  ('pg'), ('pg/mL'), ('pH'), ('seg'), ('segundos'), ('título'), ('U/L'), ('UI/L'), ('UI/mL'), ('µg/dL'), 
  ('µmol/L'), ('µUI/mL')
) AS u(name)
ON CONFLICT (company_id, name) DO NOTHING;