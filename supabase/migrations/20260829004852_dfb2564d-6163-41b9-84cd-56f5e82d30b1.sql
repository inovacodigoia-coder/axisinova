DROP TRIGGER IF EXISTS update_attendance_orders_updated_at ON public.attendance_orders;
CREATE TRIGGER update_attendance_orders_updated_at
BEFORE UPDATE ON public.attendance_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: alinha updated_at ao evento mais recente conhecido (coleta mais recente nos lab_guides)
-- para pedidos já coletados cujo updated_at ficou congelado na criação.
UPDATE public.attendance_orders o
SET updated_at = GREATEST(o.updated_at, sub.latest_collected)
FROM (
  SELECT o2.id,
         MAX((e ->> 'collectedAt')::timestamptz) AS latest_collected
  FROM public.attendance_orders o2,
       LATERAL jsonb_array_elements(COALESCE(o2.lab_guides, '[]'::jsonb)) g,
       LATERAL jsonb_array_elements(COALESCE(g -> 'exams', '[]'::jsonb)) e
  WHERE e ? 'collectedAt' AND (e ->> 'collectedAt') ~ '^\d{4}-'
  GROUP BY o2.id
) sub
WHERE sub.id = o.id AND sub.latest_collected > o.updated_at;