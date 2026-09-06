-- Replicação global: qualquer empresa pode criar equipamentos e eles aparecem para todas

CREATE OR REPLACE FUNCTION public.replicate_master_lab_equipment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.source_equipment_id IS NULL THEN
      DELETE FROM public.lab_equipments WHERE source_equipment_id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.source_equipment_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lab_equipments (company_id, name, serial_number, connection_type, manufacturer, model, is_active, source_equipment_id)
    SELECT c.id, NEW.name, NEW.serial_number, NEW.connection_type, NEW.manufacturer, NEW.model, NEW.is_active, NEW.id
      FROM public.companies c
     WHERE c.id <> NEW.company_id
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.lab_equipments r
       SET name = NEW.name,
           serial_number = NEW.serial_number,
           connection_type = NEW.connection_type,
           manufacturer = NEW.manufacturer,
           model = NEW.model,
           is_active = NEW.is_active
     WHERE r.source_equipment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_lab_equipments_for_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.lab_equipments (company_id, name, serial_number, connection_type, manufacturer, model, is_active, source_equipment_id)
  SELECT NEW.id, e.name, e.serial_number, e.connection_type, e.manufacturer, e.model, e.is_active, e.id
    FROM public.lab_equipments e
   WHERE e.source_equipment_id IS NULL
     AND e.company_id <> NEW.id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill: todo equipamento original vira compartilhado com as demais empresas
INSERT INTO public.lab_equipments (company_id, name, serial_number, connection_type, manufacturer, model, is_active, source_equipment_id)
SELECT c.id, e.name, e.serial_number, e.connection_type, e.manufacturer, e.model, e.is_active, e.id
  FROM public.lab_equipments e
  CROSS JOIN public.companies c
 WHERE e.source_equipment_id IS NULL
   AND c.id <> e.company_id
   AND NOT EXISTS (
     SELECT 1 FROM public.lab_equipments r
      WHERE r.company_id = c.id AND r.source_equipment_id = e.id
   )
ON CONFLICT DO NOTHING;

REVOKE EXECUTE ON FUNCTION public.replicate_master_lab_equipment() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_lab_equipments_for_new_company() FROM anon, authenticated, public;