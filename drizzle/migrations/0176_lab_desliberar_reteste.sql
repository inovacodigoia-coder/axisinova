-- Histórico imutável de desliberações (quem, quando, motivo e valores no momento)
CREATE TABLE public.lab_exam_desliberacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  result_id uuid NOT NULL,
  order_id uuid,
  protocol text,
  exam_ref text,
  exam_name text,
  motivo text NOT NULL,
  desliberado_por uuid NOT NULL,
  desliberado_por_nome text,
  desliberado_em timestamptz NOT NULL DEFAULT now(),
  liberado_por_antes uuid,
  liberado_em_antes timestamptz,
  valores jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX lab_exam_desliberacao_result_idx ON public.lab_exam_desliberacao (result_id, desliberado_em DESC);
CREATE INDEX lab_exam_desliberacao_company_idx ON public.lab_exam_desliberacao (company_id, desliberado_em DESC);
GRANT SELECT ON public.lab_exam_desliberacao TO authenticated;
GRANT ALL ON public.lab_exam_desliberacao TO service_role;
ALTER TABLE public.lab_exam_desliberacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members read exam unrelease history"
  ON public.lab_exam_desliberacao FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.lab_exam_desliberacao_imutavel()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'O histórico de desliberação não pode ser alterado nem apagado';
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_exam_desliberacao_imutavel() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lab_exam_desliberacao_imutavel BEFORE UPDATE OR DELETE ON public.lab_exam_desliberacao
  FOR EACH ROW EXECUTE FUNCTION public.lab_exam_desliberacao_imutavel();
CREATE TRIGGER lab_exam_desliberacao_sem_truncate BEFORE TRUNCATE ON public.lab_exam_desliberacao
  FOR EACH STATEMENT EXECUTE FUNCTION public.lab_exam_desliberacao_imutavel();

-- Nunca "Liberado" + "Reteste" juntos: não libera com reteste pendente e não liga reteste em exame liberado
CREATE OR REPLACE FUNCTION public.lab_result_reteste_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'released' AND NEW.retest_requested THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'released' THEN
      RAISE EXCEPTION 'Este exame aguarda o resultado do reteste do aparelho. Aguarde o resultado novo ou cancele o reteste antes de liberar.';
    END IF;
    IF NOT OLD.retest_requested THEN
      RAISE EXCEPTION 'Para solicitar reteste, deslibere o exame antes: clique em Desliberar.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_result_reteste_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lab_result_reteste_guard BEFORE INSERT OR UPDATE ON public.lab_exam_results
  FOR EACH ROW EXECUTE FUNCTION public.lab_result_reteste_guard();

-- Desliberar: reabre o exame (volta a digitado) guardando quem, quando, motivo e valores
CREATE OR REPLACE FUNCTION public.lab_desliberar_exame(_result_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.lab_exam_results%ROWTYPE;
  m text := btrim(coalesce(_motivo, ''));
  nome text;
  n_lib int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login obrigatório'; END IF;
  SELECT * INTO r FROM public.lab_exam_results WHERE id = _result_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'resultado não encontrado'; END IF;
  IF r.company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'sem acesso a este resultado';
  END IF;
  IF r.status IS DISTINCT FROM 'released' THEN RAISE EXCEPTION 'este exame não está liberado'; END IF;
  IF m = '' THEN RAISE EXCEPTION 'informe o motivo para desliberar'; END IF;

  SELECT nullif(btrim(p.full_name), '') INTO nome FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.lab_exam_desliberacao(company_id, result_id, order_id, protocol, exam_ref, exam_name, motivo,
    desliberado_por, desliberado_por_nome, liberado_por_antes, liberado_em_antes, valores)
  VALUES (r.company_id, r.id, r.order_id, r.protocol, r.exam_ref, r.exam_name, m,
    auth.uid(), nome, r.released_by, r.released_at,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('parametro', v.parameter_key, 'nome', v.parameter_name,
        'valor', v.value, 'unidade', v.unit, 'origem', v.source) ORDER BY v.sort_order, v.parameter_key), '[]'::jsonb)
       FROM public.lab_result_values v WHERE v.result_id = r.id));

  UPDATE public.lab_exam_results
     SET status = 'digitized', released_by = NULL, released_at = NULL
   WHERE id = r.id;

  IF r.order_id IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE status = 'released') INTO n_lib
      FROM public.lab_exam_results WHERE order_id = r.order_id;
    UPDATE public.attendance_orders
       SET status = CASE WHEN n_lib > 0 THEN 'released' ELSE 'in_analysis' END
     WHERE id = r.order_id AND status IN ('completed', 'released');
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_desliberar_exame(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_desliberar_exame(uuid, text) TO authenticated;

-- Reteste só em exame NÃO liberado
CREATE OR REPLACE FUNCTION public.lab_solicitar_reteste(_result_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.lab_exam_results%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login obrigatório'; END IF;
  SELECT * INTO r FROM public.lab_exam_results WHERE id = _result_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'resultado não encontrado'; END IF;
  IF r.company_id IS DISTINCT FROM get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'sem acesso a este resultado';
  END IF;
  IF r.status = 'released' THEN
    RAISE EXCEPTION 'Para solicitar reteste, deslibere o exame antes: clique em Desliberar.';
  END IF;
  IF r.status = 'cancelled' THEN RAISE EXCEPTION 'exame cancelado não aceita reteste'; END IF;
  UPDATE public.lab_exam_results
    SET retest_requested = true,
        retest_requested_by = auth.uid(),
        retest_requested_at = now()
    WHERE id = _result_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_solicitar_reteste(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_solicitar_reteste(uuid) TO authenticated;

-- BI: liberar de novo depois de desliberar não conta o exame duas vezes no consumo
CREATE OR REPLACE FUNCTION public.bi_trg_lab_exam_results()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE pedido record; preco numeric; ep uuid;
BEGIN
  IF NEW.status = 'released' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'released') THEN
    SELECT o.convenio_id, o.hospital_episode_id INTO pedido FROM public.attendance_orders o WHERE o.id = NEW.order_id;
    ep := pedido.hospital_episode_id;
    PERFORM public.bi_evento(NEW.company_id, ep, NEW.patient_id, NEW.order_id, 'exame_liberacao', 'exames', 'Laboratório', NULL, NEW.released_by, 'lab_exam_results', NEW.id,
      jsonb_build_object('exame_codigo', NEW.exam_code, 'exame', NEW.exam_name));
    IF NOT EXISTS (SELECT 1 FROM public.bi_consumo_itens b
                    WHERE b.origem_tabela = 'lab_exam_results' AND b.origem_id = NEW.id AND b.tipo = 'exame') THEN
      IF pedido.convenio_id IS NOT NULL AND NEW.exam_catalog_id IS NOT NULL THEN
        SELECT (elem->>'price')::numeric INTO preco
          FROM public.convenios c, LATERAL jsonb_array_elements(coalesce(c.exam_prices,'[]'::jsonb)) elem
          WHERE c.id = pedido.convenio_id AND elem->>'examId' = NEW.exam_catalog_id::text
          LIMIT 1;
      END IF;
      INSERT INTO public.bi_consumo_itens(company_id, hospital_episode_id, patient_id, attendance_order_id, tipo, item_codigo, item_nome, quantidade, valor_unitario, sem_valor_cadastrado, origem_tabela, origem_id)
      VALUES (NEW.company_id, ep, NEW.patient_id, NEW.order_id, 'exame', NEW.exam_code, coalesce(NEW.exam_name,'Exame'), 1, preco, preco IS NULL, 'lab_exam_results', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'lab_exam_results', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $function$;