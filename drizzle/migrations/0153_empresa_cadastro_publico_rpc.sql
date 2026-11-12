-- Self-registration creates the company only through a validated function;
-- direct INSERT by anonymous/authenticated visitors (WITH CHECK true) is removed,
-- so nobody can create companies with arbitrary plans, limits or enabled modules.
CREATE OR REPLACE FUNCTION public.empresa_cadastro_publico(
  _razao_social text,
  _cnpj text,
  _nome_fantasia text,
  _segmento text,
  _telefone text,
  _email text,
  _website text,
  _plano text,
  _cep text,
  _logradouro text,
  _numero text,
  _complemento text,
  _bairro text,
  _cidade text,
  _estado text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    name, cnpj, nome_fantasia, segmento, telefone, email, website, plano, status,
    cep, logradouro, numero, complemento, bairro, cidade, estado, valor_mensal
  ) VALUES (
    btrim(_razao_social), btrim(_cnpj), nullif(btrim(coalesce(_nome_fantasia, '')), ''),
    nullif(btrim(coalesce(_segmento, '')), ''), nullif(btrim(coalesce(_telefone, '')), ''),
    nullif(btrim(coalesce(_email, '')), ''), nullif(btrim(coalesce(_website, '')), ''),
    v_plano, 'active',
    nullif(btrim(coalesce(_cep, '')), ''), nullif(btrim(coalesce(_logradouro, '')), ''),
    nullif(btrim(coalesce(_numero, '')), ''), nullif(btrim(coalesce(_complemento, '')), ''),
    nullif(btrim(coalesce(_bairro, '')), ''), nullif(btrim(coalesce(_cidade, '')), ''),
    nullif(btrim(coalesce(_estado, '')), ''),
    CASE v_plano WHEN 'Starter' THEN 490 WHEN 'Enterprise' THEN 2490 ELSE 990 END
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_cadastro_publico(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresa_cadastro_publico(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Allow anonymous to insert company" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated to insert company during signup" ON public.companies;
