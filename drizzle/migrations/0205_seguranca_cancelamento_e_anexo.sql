CREATE OR REPLACE FUNCTION public.admission_cancel(_request_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests;
BEGIN
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR r.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Solicitação não pode ser cancelada'; END IF;
  IF NOT (r.requested_by = auth.uid() OR internacao_tem_permissao('approve')) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar esta solicitação';
  END IF;
  UPDATE admission_requests SET status='cancelled', ended_by=auth.uid(), ended_at=now() WHERE id=r.id;
  IF r.status='approved' THEN PERFORM _inp_set(r.bed_id, 'free', r.id, 'Reserva cancelada'); END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.apoio_analise_anexar_pdf(_pe uuid, _path text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r apoio_pedido_exame%ROWTYPE; id_ uuid;
BEGIN
  r := apoio_analise__pe(_pe);
  IF NOT (apoio_tem_permissao('apoio.manual.operar') OR apoio_tem_permissao('apoio.resultado.conferir')) THEN RAISE EXCEPTION 'Sem permissão para anexar o PDF'; END IF;
  IF split_part(_path, '/', 1) <> r.company_id::text THEN RAISE EXCEPTION 'Caminho inválido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='apoio-documentos' AND o.name=_path) THEN
    RAISE EXCEPTION 'Arquivo do laudo não encontrado';
  END IF;
  INSERT INTO apoio_documento (company_id, pedido_exame_id, tipo, storage_path, origem, enviado_por)
  VALUES (r.company_id, r.id, 'anexo_manual', _path, 'manual', auth.uid()) RETURNING id INTO id_;
  RETURN id_;
END $function$;