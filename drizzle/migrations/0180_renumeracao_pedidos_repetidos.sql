CREATE TABLE public.attendance_order_renumeracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.attendance_orders(id),
  numero_anterior text NOT NULL,
  numero_novo text NOT NULL,
  motivo text NOT NULL,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.attendance_order_renumeracao IS 'Trocas de número de pedido (imutável). Inserir aqui aplica a troca no pedido e registros ligados.';
CREATE INDEX idx_order_renumeracao_anterior ON public.attendance_order_renumeracao (company_id, numero_anterior);
CREATE INDEX idx_order_renumeracao_order ON public.attendance_order_renumeracao (order_id);

GRANT SELECT ON public.attendance_order_renumeracao TO authenticated;
GRANT ALL ON public.attendance_order_renumeracao TO service_role;
ALTER TABLE public.attendance_order_renumeracao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa vê as trocas de número" ON public.attendance_order_renumeracao
  FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.attendance_order_renumeracao_aplicar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o record; sufixo text; novo text;
BEGIN
  IF NEW.motivo IS NULL OR length(btrim(NEW.motivo)) < 10 THEN
    RAISE EXCEPTION 'Informe o motivo da troca do número (mínimo 10 caracteres)';
  END IF;
  SELECT id, company_id, origin_id, order_number, protocol INTO o
    FROM public.attendance_orders WHERE id = NEW.order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.apoio_pedido_exame a WHERE a.pedido_id = o.id) THEN
    RAISE EXCEPTION 'Pedido % tem exame no laboratório de apoio; o número não pode ser trocado', o.order_number;
  END IF;
  IF EXISTS (SELECT 1 FROM public.soroteca_amostra s WHERE s.order_id = o.id) THEN
    RAISE EXCEPTION 'Pedido % tem amostra na Soroteca; o número não pode ser trocado', o.order_number;
  END IF;

  sufixo := nullif(split_part(o.order_number, '-', 2), '');
  novo := public.next_attendance_order_number(o.company_id, o.origin_id, coalesce(sufixo, '00'));

  NEW.company_id := o.company_id;
  NEW.numero_anterior := o.order_number;
  NEW.numero_novo := novo;
  NEW.criado_por := auth.uid();
  NEW.criado_em := now();

  UPDATE public.attendance_orders
     SET order_number = novo,
         protocol = CASE WHEN protocol = o.order_number THEN novo ELSE protocol END
   WHERE id = o.id;
  UPDATE public.lab_exam_results SET protocol = novo
   WHERE order_id = o.id AND protocol IN (o.order_number, o.protocol);
  UPDATE public.lab_result_graphics SET protocol = novo
   WHERE order_id = o.id AND protocol IN (o.order_number, o.protocol);
  UPDATE public.triage_entries SET protocol = novo
   WHERE order_id = o.id AND protocol IN (o.order_number, o.protocol);
  UPDATE public.support_cards
     SET source_order_number = CASE WHEN source_order_number = o.order_number THEN novo ELSE source_order_number END,
         source_protocol = CASE WHEN source_protocol IN (o.order_number, o.protocol) THEN novo ELSE source_protocol END
   WHERE source_order_id = o.id;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.attendance_order_renumeracao_imutavel()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'O registro de troca de número não pode ser alterado nem apagado';
END $function$;

CREATE TRIGGER trg_order_renumeracao_aplicar BEFORE INSERT ON public.attendance_order_renumeracao
  FOR EACH ROW EXECUTE FUNCTION public.attendance_order_renumeracao_aplicar();
CREATE TRIGGER trg_order_renumeracao_imutavel BEFORE UPDATE OR DELETE ON public.attendance_order_renumeracao
  FOR EACH ROW EXECUTE FUNCTION public.attendance_order_renumeracao_imutavel();

REVOKE EXECUTE ON FUNCTION public.attendance_order_renumeracao_aplicar() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attendance_order_renumeracao_imutavel() FROM PUBLIC, anon, authenticated;

-- O status do pedido só é recalculado quando o status (ou o pedido) do resultado muda.
CREATE OR REPLACE FUNCTION public.sync_order_status_from_results()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order uuid := COALESCE(NEW.order_id, OLD.order_id);
  v_total int;
  v_released int;
  v_current text;
  v_new text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.order_id IS NOT DISTINCT FROM OLD.order_id THEN
    RETURN NEW;
  END IF;
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
$function$;