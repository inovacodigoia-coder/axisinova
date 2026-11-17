-- Número do pedido é único na empresa, mesmo depois de "Mudar origem".
-- Antes a sequência era contada só pelos pedidos que ESTÃO na origem; ao mudar a origem de um
-- pedido, a origem antiga voltava a gerar o mesmo número para outro paciente.

-- 1) Numeração: o sufixo (código da origem) é o espaço de números; conta todos os pedidos da
--    empresa com esse sufixo, onde quer que estejam hoje, e nunca devolve um número já usado na empresa.
CREATE OR REPLACE FUNCTION public.next_attendance_order_number(_company_id uuid, _origin_id uuid, _origin_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  nxt integer;
  suffix text := lpad(coalesce(nullif(regexp_replace(coalesce(_origin_code,'00'), '\D', '', 'g'), ''), '0'), 2, '0');
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_company_id::text || ':pedido:' || suffix));

  SELECT coalesce(max(nullif(regexp_replace(split_part(order_number, '-', 1), '\D', '', 'g'), '')::int), 0) + 1
    INTO nxt
    FROM public.attendance_orders
   WHERE company_id = _company_id
     AND split_part(order_number, '-', 2) = suffix;

  WHILE EXISTS (
    SELECT 1 FROM public.attendance_orders
     WHERE company_id = _company_id
       AND (order_number = nxt::text || '-' || suffix OR protocol = nxt::text || '-' || suffix)
  ) LOOP
    nxt := nxt + 1;
  END LOOP;

  RETURN nxt::text || '-' || suffix;
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_attendance_orders_company_number
  ON public.attendance_orders (company_id, order_number);
CREATE INDEX IF NOT EXISTS idx_attendance_orders_company_number_suffix
  ON public.attendance_orders (company_id, (split_part(order_number, '-', 2)));

-- 2) Trava: nenhum pedido novo (ou renumerado) pode repetir um número já usado na empresa,
--    em qualquer origem. Pedidos antigos já repetidos continuam editáveis (só checa quando o número muda).
CREATE OR REPLACE FUNCTION public.attendance_orders_numero_unico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.order_number IS NOT DISTINCT FROM OLD.order_number
     AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.company_id::text || ':numero:' || NEW.order_number));
  IF EXISTS (
    SELECT 1 FROM public.attendance_orders
     WHERE company_id = NEW.company_id AND order_number = NEW.order_number AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'O número de pedido % já existe nesta empresa', NEW.order_number
      USING ERRCODE = 'unique_violation', HINT = 'numero_pedido_repetido';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.attendance_orders_numero_unico() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_attendance_orders_numero_unico ON public.attendance_orders;
CREATE TRIGGER trg_attendance_orders_numero_unico
  BEFORE INSERT OR UPDATE OF order_number, company_id ON public.attendance_orders
  FOR EACH ROW EXECUTE FUNCTION public.attendance_orders_numero_unico();
