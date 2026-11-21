-- access_password é NOT NULL no banco: a senha protegida grava texto vazio (nunca a senha) no lugar de NULL.
CREATE OR REPLACE FUNCTION public.external_accesses_senha_hash_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.access_password IS NOT NULL AND NEW.access_password <> ''
     AND (TG_OP = 'INSERT' OR NEW.access_password IS DISTINCT FROM OLD.access_password) THEN
    NEW.access_password_hash := public.portal_senha_hash(NEW.access_password);
    NEW.access_password := '';
    NEW.falhas_zeradas_em := now();
    NEW.senha_gerada_em := now();
    NEW.senha_gerada_por := auth.uid();
    IF TG_OP = 'UPDATE' THEN
      INSERT INTO public.external_access_senha_log (company_id, access_id, evento, user_id)
      VALUES (NEW.company_id, NEW.id, 'alterada_tela_antiga', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.portal_acesso_criar(_dados jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_cid uuid; d public.external_accesses; r public.external_accesses; s text;
BEGIN
  v_cid := public.get_user_company_id(auth.uid());
  IF auth.uid() IS NULL OR v_cid IS NULL THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  d := jsonb_populate_record(NULL::public.external_accesses, COALESCE(_dados, '{}'::jsonb));
  s := public.portal_senha_gerar();
  INSERT INTO public.external_accesses (company_id, type, name, email, status, patient_id, doctor_id, origin_id,
    partner_origin_ids, partner_type, cnpj, responsible_name, phone, crm, specialty, permissions,
    access_code, access_password, access_password_hash, password_kind, senha_gerada_em, senha_gerada_por, created_by)
  VALUES (v_cid, d.type, d.name, d.email, COALESCE(d.status, 'active'), d.patient_id, d.doctor_id, d.origin_id,
    COALESCE(d.partner_origin_ids, '{}'), d.partner_type, d.cnpj, d.responsible_name, d.phone, d.crm, d.specialty,
    COALESCE(d.permissions, '{}'::jsonb), public.generate_external_access_code(), '', public.portal_senha_hash(s),
    'random', now(), auth.uid(), auth.uid())
  RETURNING * INTO r;
  RETURN public.portal__acesso_json(r) || jsonb_build_object('senha', s);
END $$;

CREATE OR REPLACE FUNCTION public.portal_acesso_regenerar(_id uuid, _novo_codigo boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_cid uuid; r public.external_accesses; s text;
BEGIN
  v_cid := public.get_user_company_id(auth.uid());
  IF auth.uid() IS NULL OR v_cid IS NULL THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.external_accesses WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR r.company_id IS DISTINCT FROM v_cid THEN
    RAISE EXCEPTION 'Acesso não encontrado';
  END IF;
  s := public.portal_senha_gerar();
  UPDATE public.external_accesses SET
    access_password = '',
    access_password_hash = public.portal_senha_hash(s),
    password_kind = 'random',
    access_code = CASE WHEN COALESCE(_novo_codigo, false) THEN public.generate_external_access_code() ELSE access_code END,
    falhas_zeradas_em = now(), senha_gerada_em = now(), senha_gerada_por = auth.uid()
  WHERE id = _id RETURNING * INTO r;
  INSERT INTO public.external_access_senha_log (company_id, access_id, evento, user_id)
  VALUES (r.company_id, r.id, CASE WHEN COALESCE(_novo_codigo, false) THEN 'novo_codigo' ELSE 'regenerada' END, auth.uid());
  RETURN public.portal__acesso_json(r) || jsonb_build_object('senha', s);
END $$;