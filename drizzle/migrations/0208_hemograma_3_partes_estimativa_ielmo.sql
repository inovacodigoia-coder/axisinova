ALTER TABLE public.lab_settings
  ADD COLUMN IF NOT EXISTS hemo3p_estimativa_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hemo3p_limite_leucocitos integer NOT NULL DEFAULT 9000,
  ADD COLUMN IF NOT EXISTS hemo3p_limite_mid numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS hemo3p_nota_laudo boolean NOT NULL DEFAULT false;

UPDATE public.lab_settings SET hemo3p_estimativa_ativa = true
 WHERE company_id = '72a06bac-d540-4280-943c-e9e9006a1b0b';

UPDATE public.exams e SET parameters = (e.parameters::jsonb || (
  SELECT jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'unit', x.unit, 'equipCode', x.code,
    'isHidden', true, 'isCalculated', false, 'formula', '', 'type', 'numerical', 'origin', 'manual',
    'allowNegative', false, 'isMandatory', false, 'options', '[]'::jsonb, 'referenceValues', '[]'::jsonb,
    'referenceMode', 'simples', 'referenceFullText', '', 'section', ''))
  FROM (VALUES ('25','MID (%)','%','10029'),('26','MID (absoluto)','/mm³','10027'),
               ('27','Granulócitos (%)','%','10030'),('28','Granulócitos (absoluto)','/mm³','10028')) x(id,name,unit,code)
))
WHERE e.id = '37ef25b4-ca47-4d50-826f-7815a49d19d7'
  AND e.company_id = '72a06bac-d540-4280-943c-e9e9006a1b0b'
  AND NOT (e.parameters::jsonb @> '[{"equipCode":"10029"}]');