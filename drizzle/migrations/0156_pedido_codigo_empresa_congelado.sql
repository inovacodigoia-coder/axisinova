ALTER TABLE public.attendance_orders ADD COLUMN IF NOT EXISTS empresa_seq integer;
COMMENT ON COLUMN public.attendance_orders.empresa_seq IS 'Número da empresa congelado na criação do pedido; compõe o código do tubo (pedido-tubo-empresa). Nunca muda.';

CREATE OR REPLACE FUNCTION public.attendance_orders_empresa_seq_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.empresa_seq IS NOT NULL THEN
    NEW.empresa_seq := OLD.empresa_seq;  -- imutável depois de gravado
    RETURN NEW;
  END IF;
  IF NEW.empresa_seq IS NULL THEN
    SELECT c.sequence_id INTO NEW.empresa_seq FROM public.companies c WHERE c.id = NEW.company_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.attendance_orders_empresa_seq_trg() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_attendance_orders_empresa_seq ON public.attendance_orders;
CREATE TRIGGER trg_attendance_orders_empresa_seq BEFORE INSERT OR UPDATE ON public.attendance_orders
FOR EACH ROW EXECUTE FUNCTION public.attendance_orders_empresa_seq_trg();

UPDATE public.attendance_orders o SET empresa_seq = c.sequence_id
FROM public.companies c WHERE c.id = o.company_id AND o.empresa_seq IS NULL;