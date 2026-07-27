ALTER TABLE public.attendance_orders DROP CONSTRAINT IF EXISTS attendance_orders_origin_id_fkey;
ALTER TABLE public.attendance_orders ADD CONSTRAINT attendance_orders_origin_id_fkey FOREIGN KEY (origin_id) REFERENCES public.origins(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';