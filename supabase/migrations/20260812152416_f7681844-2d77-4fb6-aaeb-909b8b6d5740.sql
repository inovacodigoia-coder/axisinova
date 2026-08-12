
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_orders' AND column_name = 'delivery_status') THEN
    ALTER TABLE public.attendance_orders ADD COLUMN delivery_status text DEFAULT 'not_delivered';
  END IF;
END $$;
