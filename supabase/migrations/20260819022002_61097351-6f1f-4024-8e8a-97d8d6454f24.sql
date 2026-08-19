CREATE UNIQUE INDEX IF NOT EXISTS attendance_orders_unique_number
  ON public.attendance_orders (company_id, coalesce(origin_id, '00000000-0000-0000-0000-000000000000'::uuid), order_number);

CREATE OR REPLACE FUNCTION public.next_attendance_order_number(_company_id uuid, _origin_id uuid, _origin_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nxt integer;
  suffix text := lpad(coalesce(nullif(regexp_replace(coalesce(_origin_code,'00'), '\D', '', 'g'), ''), '0'), 2, '0');
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_company_id::text || ':' || coalesce(_origin_id::text, 'none')));

  SELECT coalesce(max(nullif(regexp_replace(split_part(order_number, '-', 1), '\D', '', 'g'), '')::int), 0) + 1
    INTO nxt
    FROM public.attendance_orders
   WHERE company_id = _company_id
     AND origin_id IS NOT DISTINCT FROM _origin_id;

  WHILE EXISTS (
    SELECT 1 FROM public.attendance_orders
     WHERE company_id = _company_id
       AND origin_id IS NOT DISTINCT FROM _origin_id
       AND order_number = nxt::text || '-' || suffix
  ) LOOP
    nxt := nxt + 1;
  END LOOP;

  RETURN nxt::text || '-' || suffix;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_attendance_order_number(uuid, uuid, text) TO authenticated, service_role;