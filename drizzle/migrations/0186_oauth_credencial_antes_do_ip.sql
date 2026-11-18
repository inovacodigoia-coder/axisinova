-- Etapa 2A.1: o /oauth-token confere client_id + segredo ANTES de qualquer bloqueio por IP.
-- Credencial válida: nunca recusada por bloqueio de IP ou do par; só o limite de emissões por client_id vale.
-- Credencial inválida/inexistente (ou pedido sem credencial utilizável): conta no limite por IP e respeita os bloqueios.
DROP FUNCTION IF EXISTS public.api_oauth_pre(text, text);

CREATE OR REPLACE FUNCTION public.api_oauth_pre(_ip text, _client_id text, _credencial_valida boolean)
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
    SELECT max(bloqueado_ate) INTO v_ate
      FROM public.api_auth_falhas
     WHERE bloqueado_ate > now()
       AND ((regra = 'oauth_falhas_ip' AND chave = v_ip)
            OR (v_cid <> '' AND regra = 'oauth_falhas_par' AND chave = v_cid || '|' || v_ip));
  END IF;

  IF coalesce(_credencial_valida, false) THEN
    -- emissões bem-sucedidas: só o limite por client_id
    IF v_cid <> '' THEN
      SELECT * INTO v_lim FROM public.api__limite('oauth_client_sucesso');
      SELECT contagem INTO v_cont FROM public.api_limite_contadores
       WHERE regra = 'oauth_client_sucesso' AND chave = v_cid AND janela_inicio = public.api__janela_inicio(v_lim.janela);
      IF coalesce(v_cont, 0) >= v_lim.limite THEN
        RETURN jsonb_build_object('permitido', false, 'error_code', 'RATE_LIMITED',
          'retry_after', public.api__segundos_ate(public.api__janela_inicio(v_lim.janela) + make_interval(secs => v_lim.janela)));
      END IF;
    END IF;
    RETURN jsonb_build_object('permitido', true, 'retry_after', 0, 'bloqueio_ignorado', v_ate IS NOT NULL);
  END IF;

  -- credencial inválida ou inexistente: mesma resposta para os dois casos
  IF v_ip IS NOT NULL THEN
    v_rate := public.api__consumir('oauth_ip', v_ip);
    IF v_ate IS NOT NULL THEN
      RETURN jsonb_build_object('permitido', false, 'retry_after', public.api__segundos_ate(v_ate), 'error_code', 'LOCKED');
    END IF;
    IF v_rate > 0 THEN
      RETURN jsonb_build_object('permitido', false, 'retry_after', v_rate, 'error_code', 'RATE_LIMITED');
    END IF;
  END IF;
  RETURN jsonb_build_object('permitido', true, 'retry_after', 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.api_oauth_pre(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_oauth_pre(text, text, boolean) TO service_role;