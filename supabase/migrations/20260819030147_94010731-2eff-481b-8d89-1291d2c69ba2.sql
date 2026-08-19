CREATE OR REPLACE FUNCTION public.validate_attendance_order_origin_company()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.origin_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.origins o
    WHERE o.id = NEW.origin_id
      AND o.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'A origem selecionada não pertence à empresa do atendimento'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_attendance_order_origin_company ON public.attendance_orders;
CREATE TRIGGER validate_attendance_order_origin_company
BEFORE INSERT OR UPDATE OF company_id, origin_id
ON public.attendance_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_attendance_order_origin_company();