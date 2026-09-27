CREATE OR REPLACE FUNCTION public.internacao_tem_permissao(_acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'inpatient','[]'::jsonb) ? _acao));
$$;

CREATE OR REPLACE FUNCTION public.admission_approve(_request_id uuid, _bed_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests; b inpatient_beds;
BEGIN
  IF NOT internacao_tem_permissao('approve') THEN RAISE EXCEPTION 'Sem permissão de Regulação (Internação › Aprovar)'; END IF;
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR r.status<>'pending' THEN RAISE EXCEPTION 'Solicitação não está pendente'; END IF;
  SELECT * INTO b FROM inpatient_beds WHERE id=_bed_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR NOT b.is_active THEN RAISE EXCEPTION 'Leito inválido'; END IF;
  IF b.status<>'free' THEN RAISE EXCEPTION 'Leito não está livre'; END IF;
  UPDATE admission_requests SET status='approved', approved_unit_id=b.unit_id, bed_id=b.id, decided_by=auth.uid(), decided_at=now() WHERE id=r.id;
  PERFORM _inp_set(b.id, 'reserved', r.id, 'Vaga aprovada — reservado para '||r.patient_name);
END $function$;

CREATE OR REPLACE FUNCTION public.admission_confirm_transfer(_request_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests; pb beds;
BEGIN
  IF NOT internacao_tem_permissao('approve') THEN RAISE EXCEPTION 'Sem permissão de Regulação (Internação › Aprovar)'; END IF;
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR r.status<>'approved' THEN RAISE EXCEPTION 'Só é possível confirmar a transferência de uma vaga aprovada'; END IF;
  IF r.origin_occupancy_id IS NOT NULL THEN
    SELECT * INTO pb FROM beds WHERE id=r.origin_bed_id FOR UPDATE;
    IF pb.status='occupied' AND pb.current_occupancy_id=r.origin_occupancy_id THEN PERFORM bed_release(pb.id, 'internacao'); END IF;
  ELSIF r.origin_inpatient_bed_id IS NOT NULL THEN
    UPDATE admission_requests SET status='transferred', ended_by=auth.uid(), ended_at=now()
      WHERE id=(SELECT current_request_id FROM inpatient_beds WHERE id=r.origin_inpatient_bed_id) AND status='admitted';
    PERFORM _inp_set(r.origin_inpatient_bed_id, 'cleaning', r.id, 'Paciente transferido — higienização');
  END IF;
  UPDATE admission_requests SET status='admitted', admitted_by=auth.uid(), admitted_at=now() WHERE id=r.id;
  PERFORM _inp_set(r.bed_id, 'occupied', r.id, 'Paciente chegou ao leito');
END $function$;

CREATE OR REPLACE FUNCTION public.admission_refuse(_request_id uuid, _reason text, _suggested_unit_id uuid DEFAULT NULL::uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests;
BEGIN
  IF NOT internacao_tem_permissao('approve') THEN RAISE EXCEPTION 'Sem permissão de Regulação (Internação › Aprovar)'; END IF;
  IF coalesce(trim(_reason),'')='' THEN RAISE EXCEPTION 'A justificativa da recusa é obrigatória'; END IF;
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR r.status<>'pending' THEN RAISE EXCEPTION 'Solicitação não está pendente'; END IF;
  UPDATE admission_requests SET status='refused', refusal_reason=trim(_reason), suggested_unit_id=_suggested_unit_id, decided_by=auth.uid(), decided_at=now() WHERE id=r.id;
  IF _suggested_unit_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM inpatient_units WHERE id=_suggested_unit_id AND company_id=cid AND is_active) THEN RAISE EXCEPTION 'Setor sugerido inválido'; END IF;
    INSERT INTO admission_requests(company_id, patient_name, patient_id, origin_type, origin_label, origin_occupancy_id, origin_bed_id, origin_inpatient_bed_id,
      requested_unit_id, reason, urgency, notes, doctor_name, requested_by)
    VALUES (cid, r.patient_name, r.patient_id, r.origin_type, r.origin_label, r.origin_occupancy_id, r.origin_bed_id, r.origin_inpatient_bed_id,
      _suggested_unit_id, r.reason, r.urgency, concat_ws(' · ', r.notes, 'Redirecionado: '||trim(_reason)), r.doctor_name, r.requested_by);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.inpatient_discharge(_bed_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cid uuid := get_user_company_id(auth.uid()); b inpatient_beds;
BEGIN
  IF NOT internacao_tem_permissao('approve') THEN RAISE EXCEPTION 'Sem permissão de Regulação (Internação › Aprovar)'; END IF;
  SELECT * INTO b FROM inpatient_beds WHERE id=_bed_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR b.status<>'occupied' THEN RAISE EXCEPTION 'Leito não está ocupado'; END IF;
  IF EXISTS (SELECT 1 FROM admission_requests WHERE origin_inpatient_bed_id=b.id AND status IN ('pending','approved')) THEN
    RAISE EXCEPTION 'Há transferência em andamento — cancele-a antes de dar alta'; END IF;
  UPDATE admission_requests SET status='discharged', ended_by=auth.uid(), ended_at=now() WHERE id=b.current_request_id;
  PERFORM _inp_set(b.id, 'cleaning', b.current_request_id, 'Alta — higienização');
END $function$;

ALTER TABLE public.triage_entries ADD COLUMN IF NOT EXISTS destination_sector_id text REFERENCES public.company_sectors(id) ON DELETE SET NULL;
ALTER TABLE public.triage_entries ADD COLUMN IF NOT EXISTS sent_to_doctor_at timestamptz;
ALTER TABLE public.triage_entries ADD COLUMN IF NOT EXISTS doctor_started_at timestamptz;
ALTER TABLE public.triage_entries ADD COLUMN IF NOT EXISTS doctor_started_by uuid;