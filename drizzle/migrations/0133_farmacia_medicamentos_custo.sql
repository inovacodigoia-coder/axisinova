CREATE OR REPLACE FUNCTION public.farmacia_tem_permissao(_acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'farmacia','[]'::jsonb) ? ('farmacia.medicamentos.' || _acao)));
$$;
REVOKE EXECUTE ON FUNCTION public.farmacia_tem_permissao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.farmacia_tem_permissao(text) TO authenticated;

CREATE TABLE public.farmacia_medicamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  codigo integer NOT NULL,
  nome text NOT NULL,
  principio_ativo text,
  apresentacao text,
  forma text,
  unidade text NOT NULL DEFAULT 'unidade',
  custo numeric(14,4),
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, codigo)
);
GRANT SELECT ON public.farmacia_medicamentos TO authenticated;
GRANT ALL ON public.farmacia_medicamentos TO service_role;
ALTER TABLE public.farmacia_medicamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY farmacia_medicamentos_sel ON public.farmacia_medicamentos FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE TABLE public.farmacia_medicamento_custos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  medicamento_id uuid NOT NULL REFERENCES public.farmacia_medicamentos(id),
  custo_anterior numeric(14,4),
  custo_novo numeric(14,4),
  alterado_por uuid,
  alterado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.farmacia_medicamento_custos TO authenticated;
GRANT ALL ON public.farmacia_medicamento_custos TO service_role;
ALTER TABLE public.farmacia_medicamento_custos ENABLE ROW LEVEL SECURITY;
CREATE POLICY farmacia_medicamento_custos_sel ON public.farmacia_medicamento_custos FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.farmacia_tem_permissao('ver'));

ALTER TABLE public.prescription_items ADD COLUMN medicamento_id uuid REFERENCES public.farmacia_medicamentos(id);
ALTER TABLE public.prescription_items ADD COLUMN quantidade_dispensada numeric;
ALTER TABLE public.pharmacy_dispensations ADD COLUMN solicitante text;
ALTER TABLE public.pharmacy_dispensations ADD COLUMN retirado_por text;
ALTER TABLE public.pharmacy_dispensations ADD COLUMN setor_solicitante text;
ALTER TABLE public.prescriptions ADD COLUMN origem text NOT NULL DEFAULT 'leito';
ALTER TABLE public.prescriptions ADD COLUMN appointment_ref text;
ALTER TABLE public.prescriptions ALTER COLUMN occupancy_id DROP NOT NULL;
ALTER TABLE public.prescriptions ALTER COLUMN bed_id DROP NOT NULL;

-- Exclusão bloqueada se já usado
CREATE OR REPLACE FUNCTION public.farmacia_medicamento_delete_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.prescription_items WHERE medicamento_id = OLD.id) THEN
    RAISE EXCEPTION 'Medicamento já usado em prescrição: apenas inative';
  END IF;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.farmacia_medicamento_delete_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER farmacia_medicamento_delete_guard BEFORE DELETE ON public.farmacia_medicamentos FOR EACH ROW EXECUTE FUNCTION public.farmacia_medicamento_delete_guard();

CREATE OR REPLACE FUNCTION public.farmacia_medicamento_salvar(_id uuid, _dados jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := public.get_user_company_id(auth.uid()); m farmacia_medicamentos; novo numeric; rid uuid;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Sem login'; END IF;
  IF coalesce(trim(_dados->>'nome'),'') = '' THEN RAISE EXCEPTION 'Informe o nome'; END IF;
  novo := nullif(_dados->>'custo','')::numeric;
  IF novo IS NOT NULL AND novo < 0 THEN RAISE EXCEPTION 'Custo inválido'; END IF;
  IF _id IS NULL THEN
    IF NOT public.farmacia_tem_permissao('criar') THEN RAISE EXCEPTION 'Sem permissão para cadastrar medicamento'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('farmacia_med_' || cid::text));
    INSERT INTO farmacia_medicamentos(company_id, codigo, nome, principio_ativo, apresentacao, forma, unidade, custo, created_by)
    VALUES (cid, coalesce((SELECT max(codigo) FROM farmacia_medicamentos WHERE company_id = cid),0)+1,
      trim(_dados->>'nome'), nullif(trim(_dados->>'principio_ativo'),''), nullif(trim(_dados->>'apresentacao'),''),
      nullif(trim(_dados->>'forma'),''), coalesce(nullif(trim(_dados->>'unidade'),''),'unidade'), novo, auth.uid())
    RETURNING id INTO rid;
    IF novo IS NOT NULL THEN
      INSERT INTO farmacia_medicamento_custos(company_id, medicamento_id, custo_anterior, custo_novo, alterado_por) VALUES (cid, rid, NULL, novo, auth.uid());
    END IF;
    RETURN rid;
  END IF;
  IF NOT public.farmacia_tem_permissao('editar') THEN RAISE EXCEPTION 'Sem permissão para editar medicamento'; END IF;
  SELECT * INTO m FROM farmacia_medicamentos WHERE id = _id AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Medicamento não encontrado'; END IF;
  UPDATE farmacia_medicamentos SET nome = trim(_dados->>'nome'), principio_ativo = nullif(trim(_dados->>'principio_ativo'),''),
    apresentacao = nullif(trim(_dados->>'apresentacao'),''), forma = nullif(trim(_dados->>'forma'),''),
    unidade = coalesce(nullif(trim(_dados->>'unidade'),''),'unidade'), custo = novo, updated_at = now() WHERE id = _id;
  IF m.custo IS DISTINCT FROM novo THEN
    INSERT INTO farmacia_medicamento_custos(company_id, medicamento_id, custo_anterior, custo_novo, alterado_por) VALUES (cid, _id, m.custo, novo, auth.uid());
  END IF;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.farmacia_medicamento_ativo(_id uuid, _ativo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.farmacia_tem_permissao('inativar') THEN RAISE EXCEPTION 'Sem permissão para inativar medicamento'; END IF;
  UPDATE farmacia_medicamentos SET ativo = _ativo, updated_at = now() WHERE id = _id AND company_id = public.get_user_company_id(auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Medicamento não encontrado'; END IF;
END $$;

-- Itens da prescrição: só cadastrados e ativos (aplica a qualquer prescrição nova)
CREATE OR REPLACE FUNCTION public.farmacia_item_valida()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m farmacia_medicamentos;
BEGIN
  SELECT * INTO m FROM farmacia_medicamentos WHERE id = NEW.medicamento_id AND company_id = NEW.company_id;
  IF NOT FOUND OR NOT m.ativo THEN RAISE EXCEPTION 'Selecione um medicamento cadastrado e ativo'; END IF;
  NEW.medication := m.nome || coalesce(' ' || m.apresentacao, '');
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.farmacia_item_valida() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER farmacia_item_valida BEFORE INSERT ON public.prescription_items FOR EACH ROW EXECUTE FUNCTION public.farmacia_item_valida();

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
    INSERT INTO prescription_items(company_id, prescription_id, medicamento_id, medication, dose, route, interval_hours, doses_count, first_dose_at)
    VALUES (o.company_id, pid, nullif(it->>'medicamento_id','')::uuid, coalesce(it->>'medication',''), it->>'dose', coalesce(it->>'route','VO'), ih, greatest(1,coalesce((it->>'doses_count')::int,1)), first)
    RETURNING id, doses_count INTO iid, n;
    INSERT INTO medication_doses(company_id, prescription_item_id, prescription_id, occupancy_id, dose_number, scheduled_at)
    SELECT o.company_id, iid, pid, o.id, g, first + ((g-1)*ih) * interval '1 hour' FROM generate_series(1,n) g;
  END LOOP;
  INSERT INTO pharmacy_dispensations(company_id, prescription_id, urgent) VALUES (o.company_id, pid, _urgent);
  RETURN pid;
END $$;

-- Prescrição do atendimento médico → fila da Farmácia (sem leito/aprazamento)
CREATE OR REPLACE FUNCTION public.prescription_create_atendimento(_appointment_ref text, _patient_name text, _doctor_name text, _notes text, _items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); pid uuid; it jsonb;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Sem login'; END IF;
  IF jsonb_array_length(coalesce(_items,'[]'::jsonb))=0 THEN RAISE EXCEPTION 'Informe ao menos um medicamento'; END IF;
  SELECT id INTO pid FROM prescriptions WHERE company_id = cid AND origem = 'atendimento' AND appointment_ref = _appointment_ref;
  IF FOUND THEN RETURN pid; END IF;
  INSERT INTO prescriptions(company_id, patient_name, doctor_name, notes, created_by, origem, appointment_ref)
  VALUES (cid, coalesce(_patient_name,'Paciente'), _doctor_name, _notes, auth.uid(), 'atendimento', _appointment_ref) RETURNING id INTO pid;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO prescription_items(company_id, prescription_id, medicamento_id, medication, dose, route, interval_hours, doses_count, first_dose_at)
    VALUES (cid, pid, nullif(it->>'medicamento_id','')::uuid, coalesce(it->>'medication',''), it->>'dose', coalesce(it->>'route','VO'), 0, greatest(1,coalesce((it->>'doses_count')::int,1)), now());
  END LOOP;
  INSERT INTO pharmacy_dispensations(company_id, prescription_id, urgent, setor_solicitante) VALUES (cid, pid, false, 'Atendimento médico');
  RETURN pid;
END $$;

-- Dispensação com quantidades, solicitante e quem retirou; valor congelado no BI
CREATE OR REPLACE FUNCTION public.farmacia_dispensar(_dispensation_id uuid, _itens jsonb, _solicitante text, _retirado_por text, _setor text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d pharmacy_dispensations; p prescriptions; it record; q numeric; m farmacia_medicamentos; ep uuid; pat uuid;
BEGIN
  IF coalesce(trim(_solicitante),'') = '' OR coalesce(trim(_retirado_por),'') = '' THEN RAISE EXCEPTION 'Informe quem solicitou e quem retirou'; END IF;
  SELECT * INTO d FROM pharmacy_dispensations WHERE id=_dispensation_id AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND OR d.status <> 'pending' THEN RAISE EXCEPTION 'Solicitação não pendente'; END IF;
  SELECT * INTO p FROM prescriptions WHERE id = d.prescription_id;
  SELECT o.hospital_episode_id, o.patient_id INTO ep, pat FROM bed_occupancies o WHERE o.id = p.occupancy_id;
  FOR it IN SELECT * FROM prescription_items WHERE prescription_id = d.prescription_id LOOP
    q := nullif((SELECT e->>'quantidade' FROM jsonb_array_elements(coalesce(_itens,'[]'::jsonb)) e WHERE e->>'item_id' = it.id::text LIMIT 1),'')::numeric;
    IF q IS NULL OR q <= 0 THEN RAISE EXCEPTION 'Informe a quantidade entregue de %', it.medication; END IF;
    UPDATE prescription_items SET quantidade_dispensada = q WHERE id = it.id;
    m := NULL;
    IF it.medicamento_id IS NOT NULL THEN SELECT * INTO m FROM farmacia_medicamentos WHERE id = it.medicamento_id; END IF;
    INSERT INTO bi_consumo_itens(company_id, hospital_episode_id, patient_id, tipo, item_codigo, item_nome, quantidade, dose, administrado_em, valor_unitario, sem_valor_cadastrado, origem_tabela, origem_id, detalhes)
    VALUES (d.company_id, ep, pat, 'medicacao', m.codigo::text, it.medication, q, it.dose, now(), m.custo, m.custo IS NULL, 'prescription_items', it.id,
      jsonb_build_object('valor_total', m.custo * q, 'solicitante', trim(_solicitante), 'retirado_por', trim(_retirado_por), 'setor', coalesce(_setor, d.setor_solicitante), 'dispensacao_id', d.id));
  END LOOP;
  UPDATE pharmacy_dispensations SET status='dispensed', dispensed_by=auth.uid(), dispensed_at=now(),
    solicitante = trim(_solicitante), retirado_por = trim(_retirado_por), setor_solicitante = coalesce(_setor, setor_solicitante)
  WHERE id = d.id;
END $$;

REVOKE EXECUTE ON FUNCTION public.farmacia_medicamento_salvar(uuid,jsonb), public.farmacia_medicamento_ativo(uuid,boolean),
  public.prescription_create_atendimento(text,text,text,text,jsonb), public.farmacia_dispensar(uuid,jsonb,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.farmacia_medicamento_salvar(uuid,jsonb), public.farmacia_medicamento_ativo(uuid,boolean),
  public.prescription_create_atendimento(text,text,text,text,jsonb), public.farmacia_dispensar(uuid,jsonb,text,text,text) TO authenticated;
-- Dispensação antiga sem quantidade não é mais usada
REVOKE EXECUTE ON FUNCTION public.pharmacy_dispense(uuid) FROM authenticated;

-- Correção do gatilho do BI (campo inexistente prescribed_by → created_by)
CREATE OR REPLACE FUNCTION public.bi_trg_prescriptions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE oc record;
BEGIN
  SELECT o.hospital_episode_id, o.patient_id INTO oc FROM public.bed_occupancies o WHERE o.id = NEW.occupancy_id;
  PERFORM public.bi_evento(NEW.company_id, oc.hospital_episode_id, oc.patient_id, NULL, 'medicacao_prescricao', 'medicacao', CASE WHEN NEW.origem='atendimento' THEN 'Atendimento médico' ELSE 'Posto de Coleta' END, NULL, NEW.created_by, 'prescriptions', NEW.id, '{}'::jsonb);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'prescriptions', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;

-- Administração: só evento (o consumo com valor agora nasce na dispensação, sem duplicar)
CREATE OR REPLACE FUNCTION public.bi_trg_medication_doses()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ctx record;
BEGIN
  IF NEW.administered_at IS NOT NULL AND OLD.administered_at IS NULL THEN
    SELECT o.hospital_episode_id, o.patient_id, pi.medication, pi.dose INTO ctx
      FROM public.prescription_items pi JOIN public.bed_occupancies o ON o.id = NEW.occupancy_id
      WHERE pi.id = NEW.prescription_item_id;
    PERFORM public.bi_evento(NEW.company_id, ctx.hospital_episode_id, ctx.patient_id, NULL, 'medicacao_administracao', 'medicacao', 'Posto de Coleta', NULL, NEW.administered_by, 'medication_doses', NEW.id,
      jsonb_build_object('medicamento', ctx.medication, 'dose', ctx.dose, 'dose_numero', NEW.dose_number));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'medication_doses', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;