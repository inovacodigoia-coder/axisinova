ALTER TABLE public.external_accesses
  ADD COLUMN IF NOT EXISTS access_password_hash text,
  ADD COLUMN IF NOT EXISTS senha_gerada_em timestamptz,
  ADD COLUMN IF NOT EXISTS senha_gerada_por uuid,
  ADD COLUMN IF NOT EXISTS falhas_zeradas_em timestamptz;

COMMENT ON COLUMN public.external_accesses.access_password IS
  'DEPRECATED: texto aberto guardado só para reversão (Etapa 3C.3 apaga). A verificação usa access_password_hash; nenhuma tela lê esta coluna.';
COMMENT ON COLUMN public.external_accesses.access_password_hash IS
  'Senha do portal em bcrypt (pgcrypto). Única fonte de verificação.';

-- Registro de quem gerou/regenerou a senha de cada acesso (nunca a senha)
CREATE TABLE public.external_access_senha_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  access_id uuid NOT NULL,
  evento text NOT NULL CHECK (evento IN ('gerada','regenerada','novo_codigo','convertida','alterada_tela_antiga')),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX external_access_senha_log_access_idx ON public.external_access_senha_log (access_id, created_at DESC);
CREATE INDEX external_access_senha_log_company_idx ON public.external_access_senha_log (company_id, created_at DESC);
GRANT SELECT ON public.external_access_senha_log TO authenticated;
GRANT ALL ON public.external_access_senha_log TO service_role;
ALTER TABLE public.external_access_senha_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa lê o registro de senhas do portal"
  ON public.external_access_senha_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Tamanho configurável (system_settings.portal_senha_tamanho), padrão 8, entre 6 e 12
CREATE OR REPLACE FUNCTION public.portal_senha_tamanho()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(12, GREATEST(6, COALESCE(
    (SELECT CASE WHEN jsonb_typeof(value) = 'number' THEN (value)::text::int END
       FROM public.system_settings WHERE key = 'portal_senha_tamanho'), 8)))
$$;

-- Senha trivial: menos de 3 dígitos diferentes, sequência crescente/decrescente, ou bloco repetido
CREATE OR REPLACE FUNCTION public.portal_senha_trivial(_s text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE i int; d int; n int := length(_s); sobe boolean := true; desce boolean := true;
BEGIN
  IF _s IS NULL OR _s !~ '^[0-9]+$' THEN RETURN true; END IF;
  IF (SELECT count(DISTINCT c) FROM regexp_split_to_table(_s, '') c) < 3 THEN RETURN true; END IF;
  FOR i IN 2..n LOOP
    d := (substr(_s, i, 1)::int - substr(_s, i - 1, 1)::int + 10) % 10;
    IF d <> 1 THEN sobe := false; END IF;
    IF d <> 9 THEN desce := false; END IF;
  END LOOP;
  IF sobe OR desce THEN RETURN true; END IF;
  FOR i IN 1..(n / 2) LOOP
    IF n % i = 0 AND repeat(substr(_s, 1, i), n / i) = _s THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
END $$;

-- Gera senha numérica com bytes criptográficos (sem viés: descarta bytes >= 250)
CREATE OR REPLACE FUNCTION public.portal_senha_gerar()
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE n int := public.portal_senha_tamanho(); s text; b bytea; i int; v int;
BEGIN
  LOOP
    s := '';
    WHILE length(s) < n LOOP
      b := extensions.gen_random_bytes(16);
      FOR i IN 0..15 LOOP
        v := get_byte(b, i);
        IF v < 250 AND length(s) < n THEN s := s || (v % 10)::text; END IF;
      END LOOP;
    END LOOP;
    EXIT WHEN NOT public.portal_senha_trivial(s);
  END LOOP;
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.portal_senha_hash(_s text)
RETURNS text LANGUAGE sql VOLATILE SET search_path = public, extensions AS $$
  SELECT extensions.crypt(_s, extensions.gen_salt('bf', 10))
$$;

-- Escrita de senha por tela antiga: protege na hora e não guarda o texto
CREATE OR REPLACE FUNCTION public.external_accesses_senha_hash_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.access_password IS NOT NULL AND NEW.access_password <> ''
     AND (TG_OP = 'INSERT' OR NEW.access_password IS DISTINCT FROM OLD.access_password) THEN
    NEW.access_password_hash := public.portal_senha_hash(NEW.access_password);
    NEW.access_password := NULL;
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
CREATE TRIGGER external_accesses_senha_hash
  BEFORE INSERT OR UPDATE OF access_password ON public.external_accesses
  FOR EACH ROW EXECUTE FUNCTION public.external_accesses_senha_hash_trg();

CREATE OR REPLACE FUNCTION public.external_accesses_senha_log_ins_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.access_password_hash IS NOT NULL THEN
    INSERT INTO public.external_access_senha_log (company_id, access_id, evento, user_id)
    VALUES (NEW.company_id, NEW.id, 'gerada', auth.uid());
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER external_accesses_senha_log_ins
  AFTER INSERT ON public.external_accesses
  FOR EACH ROW EXECUTE FUNCTION public.external_accesses_senha_log_ins_trg();

-- Registro sem colunas de senha (texto e hash)
CREATE OR REPLACE FUNCTION public.portal__acesso_json(r public.external_accesses)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT to_jsonb(r) - 'access_password' - 'access_password_hash'
$$;

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
    COALESCE(d.permissions, '{}'::jsonb), public.generate_external_access_code(), NULL, public.portal_senha_hash(s),
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
    access_password = NULL,
    access_password_hash = public.portal_senha_hash(s),
    password_kind = 'random',
    access_code = CASE WHEN COALESCE(_novo_codigo, false) THEN public.generate_external_access_code() ELSE access_code END,
    falhas_zeradas_em = now(), senha_gerada_em = now(), senha_gerada_por = auth.uid()
  WHERE id = _id RETURNING * INTO r;
  INSERT INTO public.external_access_senha_log (company_id, access_id, evento, user_id)
  VALUES (r.company_id, r.id, CASE WHEN COALESCE(_novo_codigo, false) THEN 'novo_codigo' ELSE 'regenerada' END, auth.uid());
  RETURN public.portal__acesso_json(r) || jsonb_build_object('senha', s);
END $$;

-- Acesso do paciente na recepção: reaproveita (sem senha) ou cria/regenera (senha só nesta resposta)
CREATE OR REPLACE FUNCTION public.portal_acesso_paciente_garantir(_patient_id uuid, _nome text, _email text DEFAULT NULL, _gerar_nova boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_cid uuid; r public.external_accesses;
BEGIN
  v_cid := public.get_user_company_id(auth.uid());
  IF auth.uid() IS NULL OR v_cid IS NULL THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = _patient_id AND company_id = v_cid) THEN
    RAISE EXCEPTION 'Paciente não encontrado';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('portal_paciente:' || _patient_id::text));
  SELECT * INTO r FROM public.external_accesses
   WHERE company_id = v_cid AND type = 'paciente' AND patient_id = _patient_id
   ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    IF COALESCE(_gerar_nova, false) THEN
      RETURN public.portal_acesso_regenerar(r.id, false);
    END IF;
    RETURN public.portal__acesso_json(r);
  END IF;
  RETURN public.portal_acesso_criar(jsonb_build_object(
    'type', 'paciente', 'name', _nome, 'email', NULLIF(_email, ''), 'status', 'active',
    'patient_id', _patient_id, 'partner_origin_ids', '{}'::text[], 'permissions', '{}'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.portal_senha_tamanho() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_senha_trivial(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_senha_gerar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_senha_hash(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal__acesso_json(public.external_accesses) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.external_accesses_senha_hash_trg() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.external_accesses_senha_log_ins_trg() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_acesso_criar(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_acesso_regenerar(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_acesso_paciente_garantir(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_acesso_criar(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_acesso_regenerar(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_acesso_paciente_garantir(uuid, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portal_senha_gerar() TO service_role;
GRANT EXECUTE ON FUNCTION public.portal_senha_trivial(text) TO service_role;