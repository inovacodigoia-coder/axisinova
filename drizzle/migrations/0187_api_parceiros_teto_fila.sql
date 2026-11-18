-- API de Parceiros (Etapa 2B): teto da fila "Pedidos Recebidos" no POST /partner-orders.
-- Aguardando autorização = status 'received' (ainda não autorizado) ou 'error' (falhou ao autorizar e volta para a fila).
-- Uma única consulta indexada conta o parceiro e a empresa; limites ajustáveis em api_limites_config.

CREATE INDEX IF NOT EXISTS partner_orders_fila_pendente_idx
  ON public.partner_orders (company_id, partner_id)
  WHERE status IN ('received', 'error');

-- Padrões das regras (sem linha em api_limites_config). Mesmo corpo da 0185 + as duas regras da fila.
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
      ('oauth_falhas_ip', 20, 900, 900),
      ('fila_pendentes_parceiro', 500, 60, NULL),
      ('fila_pendentes_empresa', 2000, 60, NULL)
    ) AS d(r, l, j, b) WHERE d.r = _regra;
  END IF;
  IF limite IS NULL THEN
    RAISE EXCEPTION 'Regra de limite desconhecida: %', _regra;
  END IF;
  janela := coalesce(janela, 60);
END;
$$;

-- POST /partner-orders: limite por minuto (parceiro + empresa) e teto da fila numa só chamada.
-- Recusa quando já há >= limite pedidos aguardando (o 501º do parceiro e o 2.001º da empresa).
CREATE OR REPLACE FUNCTION public.api_partner_post_pre(_partner_id uuid, _company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lim jsonb;
  v_parc integer;
  v_emp integer;
  v_qtd_parc integer;
  v_qtd_emp integer;
BEGIN
  IF _partner_id IS NULL OR _company_id IS NULL THEN
    RETURN jsonb_build_object('permitido', true, 'retry_after', 0);
  END IF;
  v_lim := public.api_limite_consumir(jsonb_build_array(
    jsonb_build_object('regra', 'partner_post_parceiro', 'chave', _partner_id::text),
    jsonb_build_object('regra', 'partner_post_empresa', 'chave', _company_id::text)));
  IF coalesce((v_lim->>'permitido')::boolean, true) IS NOT TRUE THEN
    RETURN v_lim;
  END IF;

  SELECT limite INTO v_parc FROM public.api__limite('fila_pendentes_parceiro');
  SELECT limite INTO v_emp FROM public.api__limite('fila_pendentes_empresa');

  -- No máximo v_emp linhas lidas do índice parcial; se a empresa não chegou ao teto, a contagem do parceiro é exata.
  SELECT count(*) FILTER (WHERE f.partner_id = _partner_id), count(*)
    INTO v_qtd_parc, v_qtd_emp
    FROM (
      SELECT po.partner_id FROM public.partner_orders po
       WHERE po.company_id = _company_id AND po.status IN ('received', 'error')
       LIMIT v_emp
    ) f;

  IF v_qtd_parc >= v_parc THEN
    RETURN jsonb_build_object('permitido', false, 'retry_after', 0, 'error_code', 'QUEUE_FULL',
                              'escopo', 'parceiro', 'limite', v_parc);
  END IF;
  IF v_qtd_emp >= v_emp THEN
    RETURN jsonb_build_object('permitido', false, 'retry_after', 0, 'error_code', 'QUEUE_FULL',
                              'escopo', 'empresa', 'limite', v_emp);
  END IF;
  RETURN v_lim;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.api__limite(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api_partner_post_pre(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_partner_post_pre(uuid, uuid) TO service_role;