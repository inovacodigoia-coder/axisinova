INSERT INTO public.measurement_units (name, active, company_id)
SELECT name, true, (SELECT id FROM public.companies WHERE slug = 'comp_demo' LIMIT 1)
FROM (VALUES 
  ('/mm³'), ('%'), ('cel/µL'), ('copies/mL'), ('fl'), ('g/24h'), ('g/dL'), ('g/L'), ('g%'), ('mEq/L'), 
  ('mg/24h'), ('mg/dL'), ('mg/L'), ('mil/mm³'), ('milhões/mm³'), ('mL/24h'), ('mL/min'), ('mL/min/1.73m²'), 
  ('mm/h'), ('mm³'), ('mmHg'), ('mmol/L'), ('mUI/L'), ('mUI/mL'), ('ng/dL'), ('ng/L-teste'), ('ng/mL'), 
  ('pg'), ('pg/mL'), ('pH'), ('seg'), ('segundos'), ('título'), ('U/L'), ('UI/L'), ('UI/mL'), ('µg/dL'), 
  ('µmol/L'), ('µUI/mL')
) AS t(name)
ON CONFLICT (name, company_id) DO NOTHING;
