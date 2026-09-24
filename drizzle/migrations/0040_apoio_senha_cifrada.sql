ALTER TABLE public.apoio_laboratorio ADD COLUMN IF NOT EXISTS senha_cifrada bytea;
REVOKE SELECT (senha_cifrada) ON public.apoio_laboratorio FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apoio_senha_gravar_cifrada(_apoio_id uuid, _senha text, _chave text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(coalesce(_chave, '')) < 32 THEN RAISE EXCEPTION 'chave inválida'; END IF;
  UPDATE public.apoio_laboratorio SET senha_cifrada = extensions.pgp_sym_encrypt(_senha, _chave) WHERE id = _apoio_id;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_senha_ler_cifrada(_apoio_id uuid, _chave text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v bytea;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT senha_cifrada INTO v FROM public.apoio_laboratorio WHERE id = _apoio_id;
  IF v IS NULL THEN RETURN NULL; END IF;
  RETURN extensions.pgp_sym_decrypt(v, _chave);
END $$;

REVOKE ALL ON FUNCTION public.apoio_senha_gravar_cifrada(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apoio_senha_ler_cifrada(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_senha_gravar_cifrada(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apoio_senha_ler_cifrada(uuid, text) TO service_role;