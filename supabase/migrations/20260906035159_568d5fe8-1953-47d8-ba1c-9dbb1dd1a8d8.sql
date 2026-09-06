ALTER TABLE public.lab_equipments ALTER COLUMN is_active SET DEFAULT false;
UPDATE public.lab_equipments SET is_active = false;

CREATE POLICY "Super admins manage all equipments"
ON public.lab_equipments FOR ALL TO authenticated
USING (private.is_super_admin())
WITH CHECK (private.is_super_admin());

CREATE OR REPLACE FUNCTION public.replicate_master_lab_equipment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT c.id, NEW.name, NEW.serial_number, NEW.connection_type, NEW.manufacturer, NEW.model, false, NEW.id
      FROM public.companies c
     WHERE c.id <> NEW.company_id
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.lab_equipments r
       SET name = NEW.name,
           serial_number = NEW.serial_number,
           connection_type = NEW.connection_type,
           manufacturer = NEW.manufacturer,
           model = NEW.model
     WHERE r.source_equipment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_lab_equipments_for_new_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.lab_equipments (company_id, name, serial_number, connection_type, manufacturer, model, is_active, source_equipment_id)
  SELECT NEW.id, e.name, e.serial_number, e.connection_type, e.manufacturer, e.model, false, e.id
    FROM public.lab_equipments e
   WHERE e.source_equipment_id IS NULL
     AND e.company_id <> NEW.id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_equipment_activation_by_super_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.is_active, false) AND NOT private.is_super_admin() THEN
      NEW.is_active := false;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NOT private.is_super_admin() THEN
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_equipment_activation ON public.lab_equipments;
CREATE TRIGGER enforce_equipment_activation
BEFORE INSERT OR UPDATE ON public.lab_equipments
FOR EACH ROW EXECUTE FUNCTION public.enforce_equipment_activation_by_super_admin();

REVOKE EXECUTE ON FUNCTION public.enforce_equipment_activation_by_super_admin() FROM anon, authenticated, public;