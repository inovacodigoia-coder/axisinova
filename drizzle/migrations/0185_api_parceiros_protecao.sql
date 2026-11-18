-- API de Parceiros (Etapa 2A): registro de requisições, limite por minuto e bloqueio por tentativas.
-- Nada aqui guarda corpo, cabeçalho de autorização, token, segredo ou dado de paciente.

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id text,
  company_id uuid,
  partner_id uuid,
  client_id text,
  endpoint text NOT NULL,
  metodo text NOT NULL,
  status_code integer NOT NULL,
  error_code text,
  ip text,
  user_agent text,
  duration_ms integer,
  CONSTRAINT api_request_logs_user_agent_len CHECK (user_agent IS NULL OR char_length(user_agent) <= 200),
  CONSTRAINT api_request_logs_client_id_len CHECK (client_id IS NULL OR char_length(client_id) <= 100)
);
COMMENT ON TABLE public.api_request_logs IS 'Uma linha por chamada às funções da API de Parceiros (oauth-token, partner-orders, list-exams-for-integration com credencial de parceiro). Sem corpo, token, segredo ou paciente. Gravada só pelo servidor; sem exclusão automática.';

GRANT SELECT ON public.api_request_logs TO authenticated;
GRANT ALL ON public.api_request_logs TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.api_request_logs FROM PUBLIC, anon, authenticated;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin e gestores leem o log da API" ON public.api_request_logs;
CREATE POLICY "Super admin e gestores leem o log da API" ON public.api_request_logs
  FOR SELECT TO authenticated
  USING (private.is_super_admin()
         OR (company_id IS NOT NULL
             AND company_id = public.get_user_company_id(auth.uid())
             AND public.is_company_manager(auth.uid())));

CREATE INDEX IF NOT EXISTS api_request_logs_company_idx ON public.api_request_logs (company_id, created_at);
CREATE INDEX IF NOT EXISTS api_request_logs_partner_idx ON public.api_request_logs (partner_id, created_at);
CREATE INDEX IF NOT EXISTS api_request_logs_ip_idx ON public.api_request_logs (ip, created_at);

-- Limites ajustáveis sem deploy (sem linha = padrão de api__limite)
CREATE TABLE IF NOT EXISTS public.api_limites_config (
  regra text PRIMARY KEY,
  limite integer NOT NULL CHECK (limite > 0),
  janela_segundos integer NOT NULL DEFAULT 60 CHECK (janela_segundos > 0),
  bloqueio_segundos integer CHECK (bloqueio_segundos IS NULL OR bloqueio_segundos > 0),
  descricao text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.api_limites_config IS 'Limites da API de Parceiros por regra (janela fixa). Editar aqui muda o limite na hora, sem novo deploy.';
GRANT ALL ON public.api_limites_config TO service_role;
REVOKE ALL ON public.api_limites_config FROM PUBLIC, anon, authenticated;
ALTER TABLE public.api_limites_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.api_limite_contadores (
  regra text NOT NULL,
  chave text NOT NULL,
  janela_inicio timestamptz NOT NULL,
  contagem integer NOT NULL DEFAULT 0,
  PRIMARY KEY (regra, chave, janela_inicio)
);
CREATE INDEX IF NOT EXISTS api_limite_contadores_janela_idx ON public.api_limite_contadores (janela_inicio);
GRANT ALL ON public.api_limite_contadores TO service_role;
REVOKE ALL ON public.api_limite_contadores FROM PUBLIC, anon, authenticated;
ALTER TABLE public.api_limite_contadores ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.api_auth_falhas (
  regra text NOT NULL,
  chave text NOT NULL,
  falhas integer NOT NULL DEFAULT 0,
  primeira_falha timestamptz NOT NULL DEFAULT now(),
  bloqueado_ate timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (regra, chave)
);
CREATE INDEX IF NOT EXISTS api_auth_falhas_updated_idx ON public.api_auth_falhas (updated_at);
GRANT ALL ON public.api_auth_falhas TO service_role;
REVOKE ALL ON public.api_auth_falhas FROM PUBLIC, anon, authenticated;
ALTER TABLE public.api_auth_falhas ENABLE ROW LEVEL SECURITY;

-- Padrões (usados quando a regra não tem linha em api_limites_config)
CREATE OR REPLACE FUNCTION public.api__limite(_regra text, OUT limite integer, OUT janela integer, OUT bloqueio integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT c.limite, c.janela_segundos, c.bloqueio_segundos INTO limite, janela, bloqueio
    FROM public.api_limites_config c WHERE c.regra = _regra;
  IF limite IS NULL THEN
    SELECT d.l, d.j, d.b INTO limite, janela, bloqueio FROM (VALUES
      ('oauth_ip', 30, 60, NULL::integer),
      ('oauth_client_sucesso', 30, 60, NULL),
      ('partner_post_parceiro', 120, 60, NULL),
      ('partner_post_empresa', 600, 60, NULL),
      ('partner_get_parceiro', 120, 60, NULL),
      ('list_exams_parceiro', 30, 60, NULL),
      ('oauth_falhas_par', 5, 900, 900),
      ('oauth_falhas_ip', 20, 900, 900)
    ) AS d(r, l, j, b) WHERE d.r = _regra;
  END IF;
  IF limite IS NULL THEN
    RAISE EXCEPTION 'Regra de limite desconhecida: %', _regra;
  END IF;
  janela := coalesce(janela, 60);
END;
$$;

CREATE OR REPLACE FUNCTION public.api__janela_inicio(_janela integer)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT to_timestamp(floor(extract(epoch FROM now()) / _janela) * _janela)
$$;

CREATE OR REPLACE FUNCTION public.api__segundos_ate(_quando timestamptz)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT greatest(1, ceil(extract(epoch FROM (_quando - now())))::integer)
$$;

-- Soma 1 no contador da janela atual; devolve 0 se dentro do limite, senão os segundos até a janela virar
CREATE OR REPLACE FUNCTION public.api__consumir(_regra text, _chave text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lim record;
  v_inicio timestamptz;
  v_contagem integer;
BEGIN
  IF coalesce(_chave, '') = '' THEN RETURN 0; END IF;
  SELECT * INTO v_lim FROM public.api__limite(_regra);
  v_inicio := public.api__janela_inicio(v_lim.janela);
  INSERT INTO public.api_limite_contadores AS c (regra, chave, janela_inicio, contagem)
  VALUES (_regra, left(_chave, 150), v_inicio, 1)
  ON CONFLICT (regra, chave, janela_inicio) DO UPDATE SET contagem = c.contagem + 1
  RETURNING c.contagem INTO v_contagem;
  IF v_contagem > v_lim.limite THEN
    RETURN public.api__segundos_ate(v_inicio + make_interval(secs => v_lim.janela));
  END IF;
  RETURN 0;
END;
$$;

-- Limpeza oportunista: só contadores e falhas antigos (nunca o log)
CREATE OR REPLACE FUNCTION public.api__limpar_contadores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF random() < 0.02 THEN
    DELETE FROM public.api_limite_contadores WHERE janela_inicio < now() - interval '2 hours';
    DELETE FROM public.api_auth_falhas
     WHERE updated_at < now() - interval '2 hours'
       AND (bloqueado_ate IS NULL OR bloqueado_ate < now());
  END IF;
END;
$$;

-- Chamadas de parceiro: consome todas as regras pedidas ([{regra, chave}]) e diz se pode seguir
CREATE OR REPLACE FUNCTION public.api_limite_consumir(_itens jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_r integer;
  v_max integer := 0;
  v_regra text;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_itens) = 'array' THEN _itens ELSE '[]'::jsonb END)
  LOOP
    v_r := public.api__consumir(v_item->>'regra', v_item->>'chave');
    IF v_r > v_max THEN v_max := v_r; v_regra := v_item->>'regra'; END IF;
  END LOOP;
  PERFORM public.api__limpar_contadores();
  RETURN jsonb_build_object('permitido', v_max = 0, 'retry_after', v_max, 'regra', v_regra,
                            'error_code', CASE WHEN v_max > 0 THEN 'RATE_LIMITED' END);
END;
$$;

-- Grava uma linha de log só com os campos permitidos (o resto do JSON é ignorado)
CREATE OR REPLACE FUNCTION public.api_log_registrar(_log jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  INSERT INTO public.api_request_logs
    (request_id, company_id, partner_id, client_id, endpoint, metodo, status_code, error_code, ip, user_agent, duration_ms)
  VALUES (
    left(nullif(_log->>'request_id', ''), 100),
    CASE WHEN _log->>'company_id' ~ v_uuid THEN (_log->>'company_id')::uuid END,
    CASE WHEN _log->>'partner_id' ~ v_uuid THEN (_log->>'partner_id')::uuid END,
    left(nullif(_log->>'client_id', ''), 100),
    left(coalesce(nullif(_log->>'endpoint', ''), 'desconhecido'), 100),
    left(coalesce(nullif(_log->>'metodo', ''), '?'), 10),
    coalesce(CASE WHEN _log->>'status_code' ~ '^\d{3}$' THEN (_log->>'status_code')::integer END, 0),
    left(nullif(_log->>'error_code', ''), 60),
    left(nullif(_log->>'ip', ''), 45),
    left(nullif(_log->>'user_agent', ''), 200),
    CASE WHEN _log->>'duration_ms' ~ '^\d{1,9}$' THEN (_log->>'duration_ms')::integer END
  );
END;
$$;

-- Conta uma falha de credencial; ao atingir o limite, bloqueia a chave por bloqueio_segundos
CREATE OR REPLACE FUNCTION public.api__falha(_regra text, _chave text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lim record;
  v_row public.api_auth_falhas;
BEGIN
  IF coalesce(_chave, '') = '' THEN RETURN; END IF;
  SELECT * INTO v_lim FROM public.api__limite(_regra);
  INSERT INTO public.api_auth_falhas AS f (regra, chave, falhas, primeira_falha, updated_at)
  VALUES (_regra, left(_chave, 200), 1, now(), now())
  ON CONFLICT (regra, chave) DO UPDATE SET
    falhas = CASE WHEN f.primeira_falha < now() - make_interval(secs => v_lim.janela) THEN 1 ELSE f.falhas + 1 END,
    primeira_falha = CASE WHEN f.primeira_falha < now() - make_interval(secs => v_lim.janela) THEN now() ELSE f.primeira_falha END,
    updated_at = now()
  RETURNING * INTO v_row;
  IF v_row.falhas >= v_lim.limite AND (v_row.bloqueado_ate IS NULL OR v_row.bloqueado_ate < now()) THEN
    UPDATE public.api_auth_falhas
       SET bloqueado_ate = now() + make_interval(secs => coalesce(v_lim.bloqueio, v_lim.janela)),
           falhas = 0, primeira_falha = now(), updated_at = now()
     WHERE regra = v_row.regra AND chave = v_row.chave;
  END IF;
END;
$$;

-- /oauth-token antes de conferir a senha: limite por IP, bloqueios (par client_id+IP e IP) e emissões por client_id.
-- Nunca bloqueia só por client_id; sem IP confiável, só o limite de emissões vale.
CREATE OR REPLACE FUNCTION public.api_oauth_pre(_ip text, _client_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid text := left(coalesce(_client_id, ''), 100);
  v_ip text := nullif(left(coalesce(_ip, ''), 45), '');
  v_rate integer := 0;
  v_ate timestamptz;
  v_lim record;
  v_cont integer;
BEGIN
  PERFORM public.api__limpar_contadores();
  IF v_ip IS NOT NULL THEN
    v_rate := public.api__consumir('oauth_ip', v_ip);
    SELECT max(bloqueado_ate) INTO v_ate
      FROM public.api_auth_falhas
     WHERE bloqueado_ate > now()
       AND ((regra = 'oauth_falhas_ip' AND chave = v_ip)
            OR (v_cid <> '' AND regra = 'oauth_falhas_par' AND chave = v_cid || '|' || v_ip));
    IF v_ate IS NOT NULL THEN
      RETURN jsonb_build_object('permitido', false, 'retry_after', public.api__segundos_ate(v_ate), 'error_code', 'LOCKED');
    END IF;
    IF v_rate > 0 THEN
      RETURN jsonb_build_object('permitido', false, 'retry_after', v_rate, 'error_code', 'RATE_LIMITED');
    END IF;
  END IF;
  IF v_cid <> '' THEN
    SELECT * INTO v_lim FROM public.api__limite('oauth_client_sucesso');
    SELECT contagem INTO v_cont FROM public.api_limite_contadores
     WHERE regra = 'oauth_client_sucesso' AND chave = v_cid AND janela_inicio = public.api__janela_inicio(v_lim.janela);
    IF coalesce(v_cont, 0) >= v_lim.limite THEN
      RETURN jsonb_build_object('permitido', false, 'error_code', 'RATE_LIMITED',
        'retry_after', public.api__segundos_ate(public.api__janela_inicio(v_lim.janela) + make_interval(secs => v_lim.janela)));
    END IF;
  END IF;
  RETURN jsonb_build_object('permitido', true, 'retry_after', 0);
END;
$$;

-- /oauth-token depois de responder: sucesso conta emissão e zera falhas do par; falha de credencial conta para os bloqueios; grava o log
CREATE OR REPLACE FUNCTION public.api_oauth_resultado(_ip text, _client_id text, _resultado text, _log jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid text := left(coalesce(_client_id, ''), 100);
  v_ip text := nullif(left(coalesce(_ip, ''), 45), '');
BEGIN
  IF _resultado = 'sucesso' AND v_cid <> '' THEN
    PERFORM public.api__consumir('oauth_client_sucesso', v_cid);
    IF v_ip IS NOT NULL THEN
      DELETE FROM public.api_auth_falhas WHERE regra = 'oauth_falhas_par' AND chave = v_cid || '|' || v_ip;
    END IF;
  ELSIF _resultado = 'falha_credencial' AND v_ip IS NOT NULL THEN
    IF v_cid <> '' THEN
      PERFORM public.api__falha('oauth_falhas_par', v_cid || '|' || v_ip);
    END IF;
    PERFORM public.api__falha('oauth_falhas_ip', v_ip);
  END IF;
  IF _log IS NOT NULL THEN
    PERFORM public.api_log_registrar(_log);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.api__limite(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api__janela_inicio(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api__segundos_ate(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api__consumir(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api__limpar_contadores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api__falha(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api_limite_consumir(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api_log_registrar(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api_oauth_pre(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api_oauth_resultado(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_limite_consumir(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_log_registrar(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_oauth_pre(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_oauth_resultado(text, text, text, jsonb) TO service_role;