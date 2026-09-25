CREATE TABLE public.inpatient_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  hospital_id uuid,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.inpatient_beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  unit_id uuid NOT NULL REFERENCES public.inpatient_units(id),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free','reserved','occupied','cleaning')),
  current_request_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  patient_name text NOT NULL,
  patient_id uuid,
  origin_type text NOT NULL CHECK (origin_type IN ('post','consultorio','inpatient')),
  origin_label text,
  origin_occupancy_id uuid,
  origin_bed_id uuid,
  origin_inpatient_bed_id uuid,
  requested_unit_id uuid NOT NULL REFERENCES public.inpatient_units(id),
  approved_unit_id uuid REFERENCES public.inpatient_units(id),
  bed_id uuid REFERENCES public.inpatient_beds(id),
  reason text NOT NULL,
  urgency text NOT NULL DEFAULT 'eletiva' CHECK (urgency IN ('eletiva','urgente')),
  notes text,
  doctor_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','refused','cancelled','admitted','discharged','transferred')),
  refusal_reason text,
  suggested_unit_id uuid REFERENCES public.inpatient_units(id),
  requested_by uuid, requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid, decided_at timestamptz,
  admitted_by uuid, admitted_at timestamptz,
  ended_by uuid, ended_at timestamptz
);
CREATE TABLE public.inpatient_bed_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  bed_id uuid NOT NULL REFERENCES public.inpatient_beds(id),
  request_id uuid,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['inpatient_units','inpatient_beds','admission_requests','inpatient_bed_log'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()))', t||'_sel', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['inpatient_units','inpatient_beds'] LOOP
    EXECUTE format('GRANT INSERT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()))', t||'_ins', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid())) WITH CHECK (company_id = public.get_user_company_id(auth.uid()))', t||'_upd', t);
  END LOOP;
END $$;
-- status do leito só muda por RPC
CREATE OR REPLACE FUNCTION public.inpatient_beds_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_setting('app.inpatient_rpc', true) IS DISTINCT FROM '1' AND
     (NEW.status IS DISTINCT FROM OLD.status OR NEW.current_request_id IS DISTINCT FROM OLD.current_request_id) THEN
    RAISE EXCEPTION 'Status do leito só pode ser alterado pelo fluxo de internação';
  END IF;
  IF NOT NEW.is_active AND OLD.is_active AND NEW.status IN ('reserved','occupied') THEN
    RAISE EXCEPTION 'Leito reservado ou ocupado não pode ser inativado';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inpatient_beds_guard BEFORE UPDATE ON public.inpatient_beds FOR EACH ROW EXECUTE FUNCTION public.inpatient_beds_guard();

CREATE OR REPLACE FUNCTION public._inp_set(_bed uuid, _to text, _req uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b inpatient_beds;
BEGIN
  SELECT * INTO b FROM inpatient_beds WHERE id=_bed;
  PERFORM set_config('app.inpatient_rpc','1',true);
  UPDATE inpatient_beds SET status=_to, current_request_id=CASE WHEN _to IN ('free','cleaning') THEN NULL ELSE _req END, updated_at=now() WHERE id=_bed;
  PERFORM set_config('app.inpatient_rpc','0',true);
  INSERT INTO inpatient_bed_log(company_id, bed_id, request_id, from_status, to_status, note, changed_by)
  VALUES (b.company_id, _bed, _req, b.status, _to, _note, auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public._inp_set(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admission_request_create(_patient_name text, _requested_unit_id uuid, _reason text,
  _urgency text DEFAULT 'eletiva', _notes text DEFAULT NULL, _doctor_name text DEFAULT NULL, _patient_id uuid DEFAULT NULL,
  _origin_occupancy_id uuid DEFAULT NULL, _origin_inpatient_bed_id uuid DEFAULT NULL, _origin_label text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); o bed_occupancies; ib inpatient_beds; r admission_requests; rid uuid; otype text := 'consultorio'; lbl text := _origin_label;
BEGIN
  IF coalesce(trim(_patient_name),'')='' THEN RAISE EXCEPTION 'Informe o paciente'; END IF;
  IF coalesce(trim(_reason),'')='' THEN RAISE EXCEPTION 'Informe o motivo/diagnóstico'; END IF;
  IF NOT EXISTS (SELECT 1 FROM inpatient_units WHERE id=_requested_unit_id AND company_id=cid AND is_active) THEN RAISE EXCEPTION 'Setor de internação inválido'; END IF;
  IF _origin_occupancy_id IS NOT NULL THEN
    SELECT * INTO o FROM bed_occupancies WHERE id=_origin_occupancy_id AND company_id=cid AND status='active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Paciente não está mais no leito do posto'; END IF;
    IF EXISTS (SELECT 1 FROM admission_requests WHERE origin_occupancy_id=o.id AND status IN ('pending','approved')) THEN RAISE EXCEPTION 'Já existe solicitação de internação em andamento para este paciente'; END IF;
    otype := 'post';
    SELECT coalesce(lbl, p.name||' · '||b.name) INTO lbl FROM beds b JOIN collection_posts p ON p.id=b.post_id WHERE b.id=o.bed_id;
  ELSIF _origin_inpatient_bed_id IS NOT NULL THEN
    SELECT * INTO ib FROM inpatient_beds WHERE id=_origin_inpatient_bed_id AND company_id=cid;
    IF NOT FOUND OR ib.status<>'occupied' THEN RAISE EXCEPTION 'Leito de origem não está ocupado'; END IF;
    IF EXISTS (SELECT 1 FROM admission_requests WHERE origin_inpatient_bed_id=ib.id AND status IN ('pending','approved')) THEN RAISE EXCEPTION 'Já existe transferência em andamento para este paciente'; END IF;
    SELECT * INTO r FROM admission_requests WHERE id=ib.current_request_id;
    otype := 'inpatient';
    SELECT coalesce(lbl, u.name||' · '||ib.name) INTO lbl FROM inpatient_units u WHERE u.id=ib.unit_id;
  END IF;
  INSERT INTO admission_requests(company_id, patient_name, patient_id, origin_type, origin_label, origin_occupancy_id, origin_bed_id, origin_inpatient_bed_id,
    requested_unit_id, reason, urgency, notes, doctor_name, requested_by)
  VALUES (cid, trim(_patient_name), coalesce(_patient_id, o.patient_id, r.patient_id), otype, coalesce(lbl,'Consultório'), o.id, o.bed_id, ib.id,
    _requested_unit_id, trim(_reason), CASE WHEN _urgency='urgente' THEN 'urgente' ELSE 'eletiva' END, nullif(trim(_notes),''), nullif(trim(_doctor_name),''), auth.uid())
  RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.admission_approve(_request_id uuid, _bed_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests; b inpatient_beds;
BEGIN
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR r.status<>'pending' THEN RAISE EXCEPTION 'Solicitação não está pendente'; END IF;
  SELECT * INTO b FROM inpatient_beds WHERE id=_bed_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR NOT b.is_active THEN RAISE EXCEPTION 'Leito inválido'; END IF;
  IF b.status<>'free' THEN RAISE EXCEPTION 'Leito não está livre'; END IF;
  UPDATE admission_requests SET status='approved', approved_unit_id=b.unit_id, bed_id=b.id, decided_by=auth.uid(), decided_at=now() WHERE id=r.id;
  PERFORM _inp_set(b.id, 'reserved', r.id, 'Vaga aprovada — reservado para '||r.patient_name);
END $$;

CREATE OR REPLACE FUNCTION public.admission_refuse(_request_id uuid, _reason text, _suggested_unit_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests;
BEGIN
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
END $$;

CREATE OR REPLACE FUNCTION public.admission_cancel(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests;
BEGIN
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR r.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Solicitação não pode ser cancelada'; END IF;
  UPDATE admission_requests SET status='cancelled', ended_by=auth.uid(), ended_at=now() WHERE id=r.id;
  IF r.status='approved' THEN PERFORM _inp_set(r.bed_id, 'free', r.id, 'Reserva cancelada'); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admission_confirm_transfer(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests; pb beds;
BEGIN
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR r.status<>'approved' THEN RAISE EXCEPTION 'Só é possível confirmar a transferência de uma vaga aprovada'; END IF;
  -- libera origem (só agora, na transferência efetiva)
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
END $$;

CREATE OR REPLACE FUNCTION public.inpatient_discharge(_bed_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); b inpatient_beds;
BEGIN
  SELECT * INTO b FROM inpatient_beds WHERE id=_bed_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR b.status<>'occupied' THEN RAISE EXCEPTION 'Leito não está ocupado'; END IF;
  IF EXISTS (SELECT 1 FROM admission_requests WHERE origin_inpatient_bed_id=b.id AND status IN ('pending','approved')) THEN
    RAISE EXCEPTION 'Há transferência em andamento — cancele-a antes de dar alta'; END IF;
  UPDATE admission_requests SET status='discharged', ended_by=auth.uid(), ended_at=now() WHERE id=b.current_request_id;
  PERFORM _inp_set(b.id, 'cleaning', b.current_request_id, 'Alta — higienização');
END $$;

CREATE OR REPLACE FUNCTION public.inpatient_mark_clean(_bed_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b inpatient_beds;
BEGIN
  SELECT * INTO b FROM inpatient_beds WHERE id=_bed_id AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND OR b.status<>'cleaning' THEN RAISE EXCEPTION 'Leito não está em higienização'; END IF;
  PERFORM _inp_set(b.id, 'free', NULL, 'Higienização concluída');
END $$;

REVOKE EXECUTE ON FUNCTION public.admission_request_create(text,uuid,text,text,text,text,uuid,uuid,uuid,text), public.admission_approve(uuid,uuid), public.admission_refuse(uuid,text,uuid),
  public.admission_cancel(uuid), public.admission_confirm_transfer(uuid), public.inpatient_discharge(uuid), public.inpatient_mark_clean(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admission_request_create(text,uuid,text,text,text,text,uuid,uuid,uuid,text), public.admission_approve(uuid,uuid), public.admission_refuse(uuid,text,uuid),
  public.admission_cancel(uuid), public.admission_confirm_transfer(uuid), public.inpatient_discharge(uuid), public.inpatient_mark_clean(uuid) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inpatient_beds, public.admission_requests;