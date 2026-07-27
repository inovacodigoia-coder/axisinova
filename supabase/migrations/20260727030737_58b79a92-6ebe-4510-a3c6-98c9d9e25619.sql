-- Backfill origins for establishments that don't have one
INSERT INTO public.origins (company_id, establishment_id, name, internal_code)
SELECT e.company_id, e.id, e.name, e.internal_code
FROM public.establishments e
LEFT JOIN public.origins o ON o.establishment_id = e.id
WHERE o.id IS NULL;

-- Trigger: auto-create matching origin when a new establishment is inserted
CREATE OR REPLACE FUNCTION public.auto_create_origin_for_establishment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.origins WHERE establishment_id = NEW.id) THEN
    INSERT INTO public.origins (company_id, establishment_id, name, internal_code)
    VALUES (NEW.company_id, NEW.id, NEW.name, NEW.internal_code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_origin ON public.establishments;
CREATE TRIGGER trg_auto_create_origin
AFTER INSERT ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_origin_for_establishment();