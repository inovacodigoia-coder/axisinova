
-- Mudança de status vinda da integração: nunca retrocede; sem mudança se já estiver no status ou cancelado.
CREATE OR REPLACE FUNCTION public.apoio_integ_status(_pe uuid, _novo apoio_status, _motivo text DEFAULT NULL, _dados jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r apoio_pedido_exame%ROWTYPE; ra int; rn int;
  rank jsonb := '{"aguardando_remessa":0,"em_remessa":1,"erro_transmissao":1,"transmitido":2,"recebido_apoio":3,"em_analise":4,"pendencia_tecnica":4,"nova_coleta":4,"liberado_apoio":5,"importado":6,"importado_com_pendencia":6,"liberado_local":7,"cancelado":99}';
BEGIN
  SELECT * INTO r FROM apoio_pedido_exame WHERE id = _pe FOR UPDATE;
  IF NOT FOUND OR r.status = _novo OR r.status = 'cancelado' THEN RETURN false; END IF;
  ra := (rank->>r.status::text)::int; rn := (rank->>_novo::text)::int;
  IF rn < ra THEN RETURN false; END IF;
  IF rn = ra AND NOT (
       (r.status IN ('importado','importado_com_pendencia') AND _novo IN ('importado','importado_com_pendencia'))
    OR (r.status IN ('em_analise','pendencia_tecnica','nova_coleta') AND _novo IN ('em_analise','pendencia_tecnica','nova_coleta'))
    OR (r.status = 'erro_transmissao' AND _novo = 'em_remessa')) THEN RETURN false; END IF;
  IF r.status = 'liberado_local' THEN RETURN false; END IF;
  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE apoio_pedido_exame SET status = _novo WHERE id = r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);
  INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, dados)
  VALUES (r.company_id, r.id, r.status, _novo, 'integracao', _motivo, _dados);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.apoio_integ_status(uuid, apoio_status, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_integ_status(uuid, apoio_status, text, jsonb) TO service_role;
