CREATE TABLE IF NOT EXISTS public.whatsapp_worker_tokens (
  token text PRIMARY KEY,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_worker_tokens TO service_role;
ALTER TABLE public.whatsapp_worker_tokens ENABLE ROW LEVEL SECURITY;

-- Gera um token de uso único (vale 2 min) e chama o worker. Usado só pelo agendador.
CREATE OR REPLACE FUNCTION public.whatsapp_worker_disparar(p_url text, p_apikey text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_tok text := encode(extensions.gen_random_bytes(32),'hex');
BEGIN
  DELETE FROM whatsapp_worker_tokens WHERE criado_em < now() - interval '2 minutes';
  INSERT INTO whatsapp_worker_tokens(token) VALUES (v_tok);
  RETURN net.http_post(url := p_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey',p_apikey,'x-worker-secret',v_tok),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_worker_disparar(text, text) FROM PUBLIC, anon, authenticated;

-- Consome o token (retorna true uma única vez)
CREATE OR REPLACE FUNCTION public.whatsapp_worker_consumir_token(p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
  DELETE FROM whatsapp_worker_tokens WHERE token = p_token AND criado_em > now() - interval '2 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_worker_consumir_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_worker_consumir_token(text) TO service_role;