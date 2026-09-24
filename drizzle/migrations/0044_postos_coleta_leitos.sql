CREATE TABLE public.collection_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  hospital_id uuid,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.collection_posts(id),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied','cleaning')),
  current_occupancy_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bed_occupancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  bed_id uuid NOT NULL REFERENCES public.beds(id),
  triage_entry_id uuid,
  patient_id uuid,
  patient_name text NOT NULL,
  manchester_color text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released')),
  away boolean NOT NULL DEFAULT false,
  release_reason text,
  allocated_by uuid,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  released_by uuid,
  released_at timestamptz
);
CREATE UNIQUE INDEX uq_bed_one_active ON public.bed_occupancies(bed_id) WHERE status='active';
CREATE TABLE public.bed_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  bed_id uuid NOT NULL REFERENCES public.beds(id),
  occupancy_id uuid,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bed_referral_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  hospital_id uuid,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bed_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  occupancy_id uuid NOT NULL REFERENCES public.bed_occupancies(id),
  bed_id uuid NOT NULL REFERENCES public.beds(id),
  sector_name text NOT NULL,
  sector_id uuid,
  patient_name text NOT NULL,
  manchester_color text,
  notes text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','returned','cancelled')),
  referred_by uuid,
  referred_at timestamptz NOT NULL DEFAULT now(),
  returned_by uuid,
  returned_at timestamptz
);
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  occupancy_id uuid NOT NULL REFERENCES public.bed_occupancies(id),
  bed_id uuid NOT NULL REFERENCES public.beds(id),
  patient_name text NOT NULL,
  doctor_name text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','completed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id),
  medication text NOT NULL,
  dose text NOT NULL,
  route text NOT NULL DEFAULT 'VO',
  interval_hours numeric NOT NULL DEFAULT 0,
  doses_count integer NOT NULL DEFAULT 1 CHECK (doses_count > 0),
  first_dose_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pharmacy_dispensations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispensed','cancelled')),
  urgent boolean NOT NULL DEFAULT false,
  dispensed_by uuid,
  dispensed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.medication_doses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  prescription_item_id uuid NOT NULL REFERENCES public.prescription_items(id),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id),
  occupancy_id uuid NOT NULL REFERENCES public.bed_occupancies(id),
  dose_number integer NOT NULL,
  scheduled_at timestamptz NOT NULL,
  administered_at timestamptz,
  administered_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['collection_posts','beds','bed_occupancies','bed_status_log','bed_referral_sectors','bed_referrals','prescriptions','prescription_items','pharmacy_dispensations','medication_doses'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()))', t||'_sel', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['collection_posts','beds','bed_referral_sectors'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()))', t||'_ins', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid())) WITH CHECK (company_id = public.get_user_company_id(auth.uid()))', t||'_upd', t);
  END LOOP;
END $$;

-- helpers
CREATE OR REPLACE FUNCTION public._bed_log(_bed uuid, _occ uuid, _from text, _to text, _note text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  INSERT INTO bed_status_log(company_id, bed_id, occupancy_id, from_status, to_status, note, changed_by)
  SELECT company_id, _bed, _occ, _from, _to, _note, auth.uid() FROM beds WHERE id=_bed;
$$;
REVOKE EXECUTE ON FUNCTION public._bed_log(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bed_allocate(_bed_id uuid, _triage_entry_id uuid, _patient_name text, _patient_id uuid DEFAULT NULL, _color text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b beds; occ uuid; cid uuid := get_user_company_id(auth.uid());
BEGIN
  SELECT * INTO b FROM beds WHERE id=_bed_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leito não encontrado'; END IF;
  IF NOT b.is_active THEN RAISE EXCEPTION 'Leito inativo'; END IF;
  IF b.status='occupied' THEN RAISE EXCEPTION 'Leito já ocupado'; END IF;
  IF b.status='cleaning' THEN RAISE EXCEPTION 'Leito em higienização'; END IF;
  IF _triage_entry_id IS NOT NULL AND EXISTS (SELECT 1 FROM bed_occupancies WHERE triage_entry_id=_triage_entry_id AND status='active') THEN
    RAISE EXCEPTION 'Paciente já está em um leito';
  END IF;
  INSERT INTO bed_occupancies(company_id, bed_id, triage_entry_id, patient_id, patient_name, manchester_color, allocated_by)
  VALUES (cid, _bed_id, _triage_entry_id, _patient_id, _patient_name, _color, auth.uid()) RETURNING id INTO occ;
  UPDATE beds SET status='occupied', current_occupancy_id=occ, updated_at=now() WHERE id=_bed_id;
  PERFORM _bed_log(_bed_id, occ, b.status, 'occupied', 'Alocação');
  RETURN occ;
END $$;

CREATE OR REPLACE FUNCTION public.bed_release(_bed_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b beds; cid uuid := get_user_company_id(auth.uid());
BEGIN
  IF _reason NOT IN ('alta','internacao') THEN RAISE EXCEPTION 'Motivo inválido'; END IF;
  SELECT * INTO b FROM beds WHERE id=_bed_id AND company_id=cid FOR UPDATE;
  IF NOT FOUND OR b.status<>'occupied' THEN RAISE EXCEPTION 'Leito não está ocupado'; END IF;
  UPDATE bed_occupancies SET status='released', release_reason=_reason, released_by=auth.uid(), released_at=now(), away=false WHERE id=b.current_occupancy_id;
  UPDATE bed_referrals SET status='cancelled' WHERE occupancy_id=b.current_occupancy_id AND status IN ('waiting','in_progress');
  UPDATE pharmacy_dispensations d SET status='cancelled' FROM prescriptions p WHERE d.prescription_id=p.id AND p.occupancy_id=b.current_occupancy_id AND d.status='pending';
  UPDATE prescriptions SET status='completed' WHERE occupancy_id=b.current_occupancy_id AND status='active';
  UPDATE beds SET status='cleaning', current_occupancy_id=NULL, updated_at=now() WHERE id=_bed_id;
  PERFORM _bed_log(_bed_id, b.current_occupancy_id, 'occupied', 'cleaning', CASE _reason WHEN 'alta' THEN 'Alta do posto' ELSE 'Encaminhado para internação' END);
END $$;

CREATE OR REPLACE FUNCTION public.bed_mark_clean(_bed_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b beds;
BEGIN
  SELECT * INTO b FROM beds WHERE id=_bed_id AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND OR b.status<>'cleaning' THEN RAISE EXCEPTION 'Leito não está em higienização'; END IF;
  UPDATE beds SET status='free', updated_at=now() WHERE id=_bed_id;
  PERFORM _bed_log(_bed_id, NULL, 'cleaning', 'free', 'Higienização concluída');
END $$;

CREATE OR REPLACE FUNCTION public.bed_refer(_occupancy_id uuid, _sector_name text, _sector_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o bed_occupancies; rid uuid;
BEGIN
  SELECT * INTO o FROM bed_occupancies WHERE id=_occupancy_id AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND OR o.status<>'active' THEN RAISE EXCEPTION 'Ocupação não ativa'; END IF;
  IF o.away THEN RAISE EXCEPTION 'Paciente já está fora do leito'; END IF;
  INSERT INTO bed_referrals(company_id, occupancy_id, bed_id, sector_name, sector_id, patient_name, manchester_color, notes, referred_by)
  VALUES (o.company_id, o.id, o.bed_id, _sector_name, _sector_id, o.patient_name, o.manchester_color, _notes, auth.uid()) RETURNING id INTO rid;
  UPDATE bed_occupancies SET away=true WHERE id=o.id;
  PERFORM _bed_log(o.bed_id, o.id, 'occupied', 'occupied', 'Encaminhado para '||_sector_name);
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.bed_referral_update(_referral_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r bed_referrals;
BEGIN
  IF _status NOT IN ('in_progress','returned','cancelled') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT * INTO r FROM bed_referrals WHERE id=_referral_id AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND OR r.status IN ('returned','cancelled') THEN RAISE EXCEPTION 'Encaminhamento encerrado'; END IF;
  UPDATE bed_referrals SET status=_status,
    returned_by = CASE WHEN _status IN ('returned','cancelled') THEN auth.uid() END,
    returned_at = CASE WHEN _status IN ('returned','cancelled') THEN now() END
  WHERE id=_referral_id;
  IF _status IN ('returned','cancelled') THEN
    UPDATE bed_occupancies SET away=false WHERE id=r.occupancy_id;
    PERFORM _bed_log(r.bed_id, r.occupancy_id, 'occupied', 'occupied', 'Retornou de '||r.sector_name);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prescription_create(_occupancy_id uuid, _doctor_name text, _notes text, _items jsonb, _urgent boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o bed_occupancies; pid uuid; iid uuid; it jsonb; n int; first timestamptz; ih numeric;
BEGIN
  SELECT * INTO o FROM bed_occupancies WHERE id=_occupancy_id AND company_id=get_user_company_id(auth.uid());
  IF NOT FOUND OR o.status<>'active' THEN RAISE EXCEPTION 'Ocupação não ativa'; END IF;
  IF jsonb_array_length(coalesce(_items,'[]'::jsonb))=0 THEN RAISE EXCEPTION 'Informe ao menos um medicamento'; END IF;
  INSERT INTO prescriptions(company_id, occupancy_id, bed_id, patient_name, doctor_name, notes, created_by)
  VALUES (o.company_id, o.id, o.bed_id, o.patient_name, _doctor_name, _notes, auth.uid()) RETURNING id INTO pid;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    first := coalesce(nullif(it->>'first_dose_at','')::timestamptz, now());
    ih := coalesce(nullif(it->>'interval_hours','')::numeric, 0);
    INSERT INTO prescription_items(company_id, prescription_id, medication, dose, route, interval_hours, doses_count, first_dose_at)
    VALUES (o.company_id, pid, it->>'medication', it->>'dose', coalesce(it->>'route','VO'), ih, greatest(1,coalesce((it->>'doses_count')::int,1)), first)
    RETURNING id, doses_count INTO iid, n;
    INSERT INTO medication_doses(company_id, prescription_item_id, prescription_id, occupancy_id, dose_number, scheduled_at)
    SELECT o.company_id, iid, pid, o.id, g, first + ((g-1)*ih) * interval '1 hour' FROM generate_series(1,n) g;
  END LOOP;
  INSERT INTO pharmacy_dispensations(company_id, prescription_id, urgent) VALUES (o.company_id, pid, _urgent);
  RETURN pid;
END $$;

CREATE OR REPLACE FUNCTION public.pharmacy_dispense(_dispensation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE pharmacy_dispensations SET status='dispensed', dispensed_by=auth.uid(), dispensed_at=now()
  WHERE id=_dispensation_id AND company_id=get_user_company_id(auth.uid()) AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não pendente'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dose_administer(_dose_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d medication_doses;
BEGIN
  SELECT * INTO d FROM medication_doses WHERE id=_dose_id AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dose não encontrada'; END IF;
  IF d.administered_at IS NOT NULL THEN RAISE EXCEPTION 'Dose já administrada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pharmacy_dispensations WHERE prescription_id=d.prescription_id AND status='dispensed') THEN
    RAISE EXCEPTION 'Medicação ainda não dispensada pela farmácia';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM prescriptions WHERE id=d.prescription_id AND status='active') THEN
    RAISE EXCEPTION 'Prescrição não está ativa';
  END IF;
  UPDATE medication_doses SET administered_at=now(), administered_by=auth.uid(), notes=_notes WHERE id=_dose_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.bed_allocate(uuid,uuid,text,uuid,text), public.bed_release(uuid,text), public.bed_mark_clean(uuid), public.bed_refer(uuid,text,uuid,text), public.bed_referral_update(uuid,text), public.prescription_create(uuid,text,text,jsonb,boolean), public.pharmacy_dispense(uuid), public.dose_administer(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bed_allocate(uuid,uuid,text,uuid,text), public.bed_release(uuid,text), public.bed_mark_clean(uuid), public.bed_refer(uuid,text,uuid,text), public.bed_referral_update(uuid,text), public.prescription_create(uuid,text,text,jsonb,boolean), public.pharmacy_dispense(uuid), public.dose_administer(uuid,text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.beds, public.bed_occupancies, public.bed_referrals, public.medication_doses, public.pharmacy_dispensations;