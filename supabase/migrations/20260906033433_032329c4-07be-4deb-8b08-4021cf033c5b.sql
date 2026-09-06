ALTER TABLE public.lab_equipments
  ADD COLUMN IF NOT EXISTS source_equipment_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS lab_equipments_company_source_idx
  ON public.lab_equipments (company_id, source_equipment_id)
  WHERE source_equipment_id IS NOT NULL;

INSERT INTO public.system_settings (key, value)
VALUES ('lab_equipments_master_company_id', to_jsonb('c3525659-4fc2-472f-be1d-1df23229108c'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.lab_equipments_master_company()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(value #>> '{}', '')::uuid
  FROM public.system_settings
  WHERE key = 'lab_equipments_master_company_id';
$$;

CREATE OR REPLACE FUNCTION public.replicate_master_lab_equipment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master uuid := public.lab_equipments_master_company();
BEGIN
  IF v_master IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.company_id = v_master AND OLD.source_equipment_id IS NULL THEN
      DELETE FROM public.lab_equipments WHERE source_equipment_id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.company_id <> v_master OR NEW.source_equipment_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lab_equipments
    (company_id, name, model, manufacturer, serial_number, connection_type, is_active, source_equipment_id)
  SELECT c.id, NEW.name, NEW.model, NEW.manufacturer, NEW.serial_number, NEW.connection_type, NEW.is_active, NEW.id
  FROM public.companies c
  WHERE c.id <> v_master
  ON CONFLICT (company_id, source_equipment_id) WHERE source_equipment_id IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    model = EXCLUDED.model,
    manufacturer = EXCLUDED.manufacturer,
    serial_number = EXCLUDED.serial_number,
    connection_type = EXCLUDED.connection_type,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS replicate_master_lab_equipment ON public.lab_equipments;
CREATE TRIGGER replicate_master_lab_equipment
AFTER INSERT OR UPDATE OR DELETE ON public.lab_equipments
FOR EACH ROW EXECUTE FUNCTION public.replicate_master_lab_equipment();

CREATE OR REPLACE FUNCTION public.seed_lab_equipments_for_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master uuid := public.lab_equipments_master_company();
BEGIN
  IF v_master IS NULL OR NEW.id = v_master THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lab_equipments
    (company_id, name, model, manufacturer, serial_number, connection_type, is_active, source_equipment_id)
  SELECT NEW.id, e.name, e.model, e.manufacturer, e.serial_number, e.connection_type, e.is_active, e.id
  FROM public.lab_equipments e
  WHERE e.company_id = v_master AND e.source_equipment_id IS NULL
  ON CONFLICT (company_id, source_equipment_id) WHERE source_equipment_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_created_seed_equipments ON public.companies;
CREATE TRIGGER on_company_created_seed_equipments
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.seed_lab_equipments_for_new_company();

-- Backfill: replicate current master equipments to all other companies
INSERT INTO public.lab_equipments
  (company_id, name, model, manufacturer, serial_number, connection_type, is_active, source_equipment_id)
SELECT c.id, e.name, e.model, e.manufacturer, e.serial_number, e.connection_type, e.is_active, e.id
FROM public.lab_equipments e
CROSS JOIN public.companies c
WHERE e.company_id = public.lab_equipments_master_company()
  AND e.source_equipment_id IS NULL
  AND c.id <> e.company_id
ON CONFLICT (company_id, source_equipment_id) WHERE source_equipment_id IS NOT NULL DO NOTHING;

CREATE TRIGGER update_lab_equipments_updated_at
BEFORE UPDATE ON public.lab_equipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();