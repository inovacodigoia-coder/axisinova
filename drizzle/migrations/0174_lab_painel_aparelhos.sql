CREATE INDEX IF NOT EXISTS idx_instrument_events_company_equip_created
  ON public.instrument_events (company_id, upper(btrim(equipment_id)), created_at DESC);

CREATE OR REPLACE FUNCTION public.lab_painel_aparelhos()
RETURNS TABLE (
  equipment_id uuid, nome text, bancada text, identificador text,
  ultima_comunicacao timestamptz, ultimo_status text, ultimo_erro text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid;
BEGIN
  IF NOT public.lab_painel_tem_permissao() THEN
    RAISE EXCEPTION 'Sem permissão para o Painel Operacional' USING ERRCODE = '42501';
  END IF;
  v_company := public.get_user_company_id(auth.uid());
  RETURN QUERY
  SELECT e.id, e.name, e.connection_type, e.serial_number,
         ev.created_at, ev.status, ev.error_message
  FROM public.lab_equipments e
  LEFT JOIN LATERAL (
    SELECT ie.created_at, ie.status, ie.error_message
    FROM public.instrument_events ie
    WHERE ie.company_id = v_company
      AND upper(btrim(ie.equipment_id)) = upper(btrim(e.serial_number))
    ORDER BY ie.created_at DESC
    LIMIT 1
  ) ev ON true
  WHERE e.company_id = v_company AND coalesce(e.is_active, true)
  ORDER BY e.name;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_aparelhos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_aparelhos() TO authenticated;

CREATE OR REPLACE FUNCTION public.lab_painel_aparelho_log(p_equipment_id uuid)
RETURNS TABLE (
  criado_em timestamptz, status text, mensagem text, amostra text, exame text,
  codigo_teste text, valor text, protocolo text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid; v_serial text;
BEGIN
  IF NOT public.lab_painel_tem_permissao() THEN
    RAISE EXCEPTION 'Sem permissão para o Painel Operacional' USING ERRCODE = '42501';
  END IF;
  v_company := public.get_user_company_id(auth.uid());
  SELECT e.serial_number INTO v_serial FROM public.lab_equipments e
   WHERE e.id = p_equipment_id AND e.company_id = v_company;
  IF v_serial IS NULL THEN
    RAISE EXCEPTION 'Aparelho não encontrado' USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY
  SELECT ie.created_at, ie.status, ie.error_message, ie.sample_barcode, ie.exam_name,
         ie.test_code, ie.received_value, ie.protocol
  FROM public.instrument_events ie
  WHERE ie.company_id = v_company
    AND upper(btrim(ie.equipment_id)) = upper(btrim(v_serial))
  ORDER BY ie.created_at DESC
  LIMIT 10;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_aparelho_log(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_aparelho_log(uuid) TO authenticated;