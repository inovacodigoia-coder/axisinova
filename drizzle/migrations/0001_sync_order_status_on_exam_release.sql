CREATE OR REPLACE FUNCTION public.sync_order_status_from_results()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order uuid := COALESCE(NEW.order_id, OLD.order_id);
  v_total int;
  v_released int;
  v_current text;
  v_new text;
BEGIN
  IF v_order IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT status INTO v_current FROM public.attendance_orders WHERE id = v_order;
  IF v_current IS NULL OR v_current IN ('deleted','cancelled') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT count(*) FILTER (WHERE status <> 'cancelled'),
         count(*) FILTER (WHERE status = 'released')
    INTO v_total, v_released
    FROM public.lab_exam_results
   WHERE order_id = v_order;

  IF v_total = 0 OR v_released = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_released >= v_total THEN
    v_new := 'completed';
  ELSE
    v_new := 'released';
  END IF;

  IF v_current IS DISTINCT FROM v_new AND NOT (v_current = 'completed' AND v_new = 'released') THEN
    UPDATE public.attendance_orders SET status = v_new WHERE id = v_order;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_order_status_from_results ON public.lab_exam_results;
CREATE TRIGGER sync_order_status_from_results
AFTER INSERT OR UPDATE OR DELETE ON public.lab_exam_results
FOR EACH ROW EXECUTE FUNCTION public.sync_order_status_from_results();