CREATE OR REPLACE FUNCTION public.whatsapp_reenfileirar_confirmacao(p_agendamento_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_c uuid; v_d date; v_h smallint; r jsonb;
BEGIN
  SELECT company_id, date INTO v_c, v_d FROM appointments WHERE id = p_agendamento_id;
  IF v_c IS NULL OR v_c <> get_user_company_id(auth.uid()) THEN
    RETURN jsonb_build_object('ok',false,'codigo','AGENDAMENTO_NAO_ENCONTRADO','mensagem','Agendamento não encontrado.','fila_id',null,'agendada_para',null);
  END IF;
  r := whatsapp_cancelar_envios_agendamento(p_agendamento_id);
  SELECT horas_antes INTO v_h FROM whatsapp_fila_envios
   WHERE agendamento_id = p_agendamento_id AND status = 'cancelada' AND horas_antes IS NOT NULL
   ORDER BY criado_em DESC LIMIT 1;
  IF v_h IS NULL THEN
    RETURN jsonb_build_object('ok',true,'codigo','SEM_CONFIRMACAO_ANTERIOR','mensagem','Confirmação estava desligada.','fila_id',null,'agendada_para',null);
  END IF;
  RETURN whatsapp_enfileirar_confirmacao(p_agendamento_id, v_h, v_d - (v_h / 24)::int);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_reenfileirar_confirmacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_reenfileirar_confirmacao(uuid) TO authenticated;