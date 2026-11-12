CREATE OR REPLACE FUNCTION public.lab_coleta_programar(_pedido uuid, _exame_ids text[], _data timestamp with time zone, _justificativa text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o record; guides jsonb; antes jsonb; n int; nome text; ref timestamptz; delta interval;
BEGIN
  IF NOT public.coleta_tem_permissao('coleta.programar') THEN RAISE EXCEPTION 'Seu perfil não pode programar coleta'; END IF;
  IF length(trim(coalesce(_justificativa,''))) < 5 THEN RAISE EXCEPTION 'Justificativa obrigatória (mínimo 5 caracteres)'; END IF;
  IF _data IS NULL OR _data <= now() THEN RAISE EXCEPTION 'A coleta programada precisa ser em data futura'; END IF;
  SELECT * INTO o FROM public.attendance_orders WHERE id = _pedido AND company_id = public.get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.apoio_pedido_exame pe WHERE pe.pedido_id = _pedido AND pe.exame_id::text = ANY(_exame_ids)
             AND pe.status NOT IN ('aguardando_remessa','em_remessa','cancelado')) THEN
    RAISE EXCEPTION 'Há exame já transmitido ao apoio; não é possível programar';
  END IF;
  SELECT full_name INTO nome FROM public.profiles WHERE id = auth.uid();
  SELECT coalesce(jsonb_agg(jsonb_build_object('exame', coalesce(ex->>'examId', ex->>'id'), 'nome', ex->>'name', 'collectedAt', ex->>'collectedAt'))
         FILTER (WHERE coalesce(ex->>'examId', ex->>'id') = ANY(_exame_ids)), '[]'::jsonb),
         min((ex->>'collectedAt')::timestamptz) FILTER (WHERE coalesce(ex->>'examId', ex->>'id') = ANY(_exame_ids))
    INTO antes, ref
    FROM jsonb_array_elements(coalesce(o.lab_guides,'[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams','[]'::jsonb)) ex;
  n := jsonb_array_length(antes);
  IF n = 0 THEN RAISE EXCEPTION 'Nenhum exame encontrado'; END IF;
  delta := _data - coalesce(ref, now());
  SELECT jsonb_agg(jsonb_set(g, '{exams}', coalesce((SELECT jsonb_agg(CASE WHEN coalesce(ex->>'examId', ex->>'id') = ANY(_exame_ids) THEN
           ex || jsonb_build_object('collectedAt', to_jsonb(_data), 'coletaProgramada', true)
              || CASE WHEN ex ? 'expectedDeliveryDate' AND nullif(ex->>'expectedDeliveryDate','') IS NOT NULL THEN jsonb_build_object('expectedDeliveryDate', to_jsonb((ex->>'expectedDeliveryDate')::timestamptz + delta)) ELSE '{}'::jsonb END
              || CASE WHEN ex ? 'previsaoEntrega' AND nullif(ex->>'previsaoEntrega','') IS NOT NULL THEN jsonb_build_object('previsaoEntrega', to_jsonb((ex->>'previsaoEntrega')::timestamptz + delta)) ELSE '{}'::jsonb END
              || CASE WHEN ex ? 'deliveryDate' AND nullif(ex->>'deliveryDate','') IS NOT NULL THEN jsonb_build_object('deliveryDate', to_jsonb((ex->>'deliveryDate')::timestamptz + delta)) ELSE '{}'::jsonb END
           ELSE ex END) FROM jsonb_array_elements(coalesce(g->'exams','[]'::jsonb)) ex), '[]'::jsonb)))
    INTO guides FROM jsonb_array_elements(coalesce(o.lab_guides,'[]'::jsonb)) g;
  -- Prazo do pedido = maior prazo entre os exames (não acumula a cada exame programado)
  UPDATE public.attendance_orders SET lab_guides = guides, coleta_programada_para = _data,
         delivery_date = coalesce((
           SELECT max(d::timestamptz)
             FROM jsonb_array_elements(coalesce(guides,'[]'::jsonb)) g2,
                  jsonb_array_elements(coalesce(g2->'exams','[]'::jsonb)) ex2,
                  LATERAL (VALUES (ex2->>'expectedDeliveryDate'), (ex2->>'deliveryDate'), (ex2->>'previsaoEntrega')) v(d)
            WHERE d ~ '^\d{4}-\d{2}-\d{2}'
         ), delivery_date)
   WHERE id = _pedido;
  INSERT INTO public.apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (o.company_id, 'coleta_horario', _pedido::text, 'programacao',
          jsonb_build_object('exames', antes, 'delivery_date', o.delivery_date),
          jsonb_build_object('collectedAt', _data, 'justificativa', _justificativa, 'usuario', nome), auth.uid());
  RETURN n;
END $function$;
