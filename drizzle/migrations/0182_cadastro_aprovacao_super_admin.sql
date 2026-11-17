-- Cadastro gratuito pela tela de login fica "Aguardando aprovação" até o Super Admin liberar.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cadastro_publico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cadastro_aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cadastro_aprovado_por uuid;

COMMENT ON COLUMN public.companies.cadastro_publico IS 'Empresa criada pelo cadastro gratuito da tela de login.';

-- 1. Cadastro público agora nasce pendente.
CREATE OR REPLACE FUNCTION public.empresa_cadastro_publico(_razao_social text, _cnpj text, _nome_fantasia text, _segmento text, _telefone text, _email text, _website text, _plano text, _cep text, _logradouro text, _numero text, _complemento text, _bairro text, _cidade text, _estado text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_cnpj_digitos text := regexp_replace(coalesce(_cnpj, ''), '\D', '', 'g');
  v_plano text := CASE WHEN _plano IN ('Starter', 'Pro', 'Enterprise') THEN _plano ELSE 'Pro' END;
  v_txt text;
BEGIN
  IF length(btrim(coalesce(_razao_social, ''))) = 0 OR length(_razao_social) > 200 THEN
    RAISE EXCEPTION 'Razão social inválida' USING ERRCODE = '22023';
  END IF;
  IF length(v_cnpj_digitos) <> 14 OR length(_cnpj) > 20 THEN
    RAISE EXCEPTION 'CNPJ inválido' USING ERRCODE = '22023';
  END IF;
  FOREACH v_txt IN ARRAY ARRAY[_nome_fantasia, _segmento, _telefone, _email, _website, _cep, _logradouro, _numero, _complemento, _bairro, _cidade, _estado] LOOP
    IF length(coalesce(v_txt, '')) > 200 THEN
      RAISE EXCEPTION 'Campo do cadastro muito longo' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  PERFORM pg_advisory_xact_lock(hashtext('empresa_cnpj:' || v_cnpj_digitos));
  IF EXISTS (SELECT 1 FROM public.companies c WHERE regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g') = v_cnpj_digitos) THEN
    RAISE EXCEPTION 'duplicate key value violates unique constraint "companies_cnpj_unique"' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.companies (
    name, cnpj, nome_fantasia, segmento, telefone, email, website, plano, status, cadastro_publico,
    cep, logradouro, numero, complemento, bairro, cidade, estado, valor_mensal
  ) VALUES (
    btrim(_razao_social), btrim(_cnpj), nullif(btrim(coalesce(_nome_fantasia, '')), ''),
    nullif(btrim(coalesce(_segmento, '')), ''), nullif(btrim(coalesce(_telefone, '')), ''),
    nullif(btrim(coalesce(_email, '')), ''), nullif(btrim(coalesce(_website, '')), ''),
    v_plano, 'pending', true,
    nullif(btrim(coalesce(_cep, '')), ''), nullif(btrim(coalesce(_logradouro, '')), ''),
    nullif(btrim(coalesce(_numero, '')), ''), nullif(btrim(coalesce(_complemento, '')), ''),
    nullif(btrim(coalesce(_bairro, '')), ''), nullif(btrim(coalesce(_cidade, '')), ''),
    nullif(btrim(coalesce(_estado, '')), ''),
    CASE v_plano WHEN 'Starter' THEN 490 WHEN 'Enterprise' THEN 2490 ELSE 990 END
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 2. Novo login: só o create-user (marca app_metadata.provisionado) escolhe empresa e função.
--    Cadastro público só vira administrador da própria empresa pendente recém-criada, e inativo.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  raw_role text := new.raw_user_meta_data->>'role';
  mapped_role public.app_role;
  v_company uuid;
  v_active boolean := true;
  v_confiavel boolean := coalesce(new.raw_app_meta_data->>'provisionado', '') = 'true';
BEGIN
  BEGIN
    v_company := nullif(new.raw_user_meta_data->>'company_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_company := NULL;
  END;

  IF NOT v_confiavel THEN
    IF v_company IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(hashtext('empresa_primeiro_admin:' || v_company::text));
    END IF;
    IF v_company IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = v_company AND c.status = 'pending' AND c.cadastro_publico)
       AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.company_id = v_company) THEN
      raw_role := 'company_admin';
    ELSE
      v_company := NULL;
      raw_role := 'other';
    END IF;
    v_active := false;
  END IF;

  BEGIN
    mapped_role := raw_role::public.app_role;
  EXCEPTION WHEN others THEN
    mapped_role := 'other'::public.app_role;
  END;

  INSERT INTO public.profiles (id, full_name, cpf, role, company_id, badge_code, is_active)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    coalesce(raw_role, 'other'),
    v_company,
    new.raw_user_meta_data->>'badge_code',
    v_active
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, mapped_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$function$;

-- 3. Lista de cadastros aguardando aprovação (Super Admin).
CREATE OR REPLACE FUNCTION public.empresa_cadastros_pendentes()
 RETURNS TABLE (
   company_id uuid, razao_social text, nome_fantasia text, cnpj text, segmento text,
   telefone text, email text, cidade text, estado text, plano text, criado_em timestamptz,
   admin_nome text, admin_email text, admin_email_confirmado boolean
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Só o Super Admin pode ver os cadastros pendentes' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, c.name, c.nome_fantasia, c.cnpj, c.segmento, c.telefone, c.email, c.cidade, c.estado,
           c.plano, c.created_at, p.full_name, u.email::text, (u.email_confirmed_at IS NOT NULL)
      FROM public.companies c
      LEFT JOIN LATERAL (
        SELECT pr.id, pr.full_name FROM public.profiles pr
         WHERE pr.company_id = c.id ORDER BY pr.created_at LIMIT 1
      ) p ON true
      LEFT JOIN auth.users u ON u.id = p.id
     WHERE c.status = 'pending'
     ORDER BY c.created_at;
END;
$function$;

-- 4. Aprovar: libera a empresa e o administrador do cadastro.
CREATE OR REPLACE FUNCTION public.empresa_aprovar_cadastro(_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_status text;
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Só o Super Admin pode aprovar cadastros' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO v_status FROM public.companies WHERE id = _company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Este cadastro não está aguardando aprovação' USING ERRCODE = '22023';
  END IF;
  UPDATE public.companies
     SET status = 'active', cadastro_aprovado_em = now(), cadastro_aprovado_por = auth.uid()
   WHERE id = _company_id;
  UPDATE public.profiles SET is_active = true WHERE company_id = _company_id AND is_active = false;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.empresa_cadastros_pendentes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.empresa_aprovar_cadastro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.empresa_cadastros_pendentes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.empresa_aprovar_cadastro(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;