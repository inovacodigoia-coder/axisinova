ALTER TABLE public.apoio_chamada_log
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS usuario_id uuid,
  ADD COLUMN IF NOT EXISTS resolvido_em timestamptz,
  ADD COLUMN IF NOT EXISTS resolvido_por uuid,
  ADD COLUMN IF NOT EXISTS resolvido_obs text;
ALTER TABLE public.apoio_cursor
  ADD COLUMN IF NOT EXISTS falhas_desde timestamptz,
  ADD COLUMN IF NOT EXISTS falhas_n int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alerta_em timestamptz;

-- XML técnico só por RPC de admin
REVOKE SELECT ON public.apoio_chamada_log FROM authenticated;
GRANT SELECT (id, company_id, apoio_id, operacao, http_status, duracao_ms, created_at, origem, usuario_id, resolvido_em, resolvido_por, resolvido_obs) ON public.apoio_chamada_log TO authenticated;

CREATE OR REPLACE FUNCTION public.apoio_log__tipo(_op text, _req text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _op = 'getPedido' AND _req LIKE '%SolicitaLote%' THEN 'consultar_lote'
    WHEN _op = 'getPedido' AND _req LIKE '%Registro%' THEN 'transmitir'
    WHEN _op = 'getPedido' THEN 'consultar_lote'
    WHEN _op = 'getResultado' AND _req LIKE '%Modelos%' THEN 'modelos'
    WHEN _op = 'getResultado' THEN 'resultados'
    WHEN _op IN ('catalogo') THEN 'catalogo'
    WHEN _op ILIKE '%pdf%' OR _op ILIKE '%laudo%' THEN 'pdf'
    WHEN _op ILIKE '%rastre%' OR _op ILIKE '%status%' OR _op ILIKE '%amostra%' THEN 'status'
    WHEN _op ILIKE '%pendencia%' THEN 'pendencia'
    WHEN _op ILIKE '%receb%' OR _op ILIKE '%confirma%' THEN 'recebimento'
    WHEN _op ILIKE '%cancel%' THEN 'cancelamento'
    WHEN _op ILIKE '%ListaErro%' THEN 'lista_erros'
    WHEN _op = 'formato_auto' THEN 'formato_auto'
    ELSE lower(_op) END
$$;

CREATE OR REPLACE FUNCTION public.apoio_log_lista(
  _ini timestamptz DEFAULT now() - interval '7 days', _fim timestamptz DEFAULT now(),
  _apoio uuid DEFAULT NULL, _tipo text DEFAULT NULL, _situacao text DEFAULT NULL,
  _busca text DEFAULT NULL, _remessa uuid DEFAULT NULL, _limite int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE (id uuid, created_at timestamptz, apoio_id uuid, apoio_nome text, tipo text, origem text, usuario_nome text,
  http_status int, duracao_ms int, codigos text[], texto_pardini text, falha_interna boolean, sem_conexao boolean, login_recusado boolean,
  recuperado boolean, situacao text, cod_lote text, remessa_id uuid, remessa_numero bigint, resolvido_em timestamptz, resolvido_obs text, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF NOT (public.apoio_tem_permissao('apoio.relatorios.ver') OR public.apoio_tem_permissao('apoio.laboratorio.gerenciar')) THEN
    RAISE EXCEPTION 'Sem permissão para ver o log de integração';
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT l.*, public.apoio_log__tipo(l.operacao, coalesce(l.requisicao,'')) AS tp,
      substring(l.requisicao from 'CodLoteLab&gt;([^&]*)&lt;') AS lote,
      CASE WHEN l.operacao ILIKE '%ListaErro%' OR l.operacao = 'catalogo' THEN ARRAY[]::text[]
        ELSE coalesce((SELECT array_agg(DISTINCT m[1]) FROM regexp_matches(coalesce(l.erro,'') || ' ' || coalesce(left(l.resposta, 20000),''), 'ERRO #([0-9]+)', 'g') m), ARRAY[]::text[]) END AS cods,
      CASE WHEN l.operacao ILIKE '%ListaErro%' OR l.operacao = 'catalogo' THEN NULL
        ELSE (SELECT string_agg(DISTINCT trim(m[1]), ' · ') FROM regexp_matches(coalesce(l.erro,'') || ' ' || coalesce(left(l.resposta, 20000),''), 'ERRO #1[0-9]{4}:\s*([^<\]\n]{1,200})', 'g') m) END AS txt,
      (coalesce(l.erro,'') || coalesce(left(l.resposta,5000),'')) ~* '(ERRO #5001|UNDEFINED|SUBSCRIPT|Badly formed SOAP)' OR l.http_status >= 500 AS interna,
      (l.http_status IS NULL AND l.erro IS NOT NULL) OR coalesce(l.erro,'') ~* '(timeout|tempo esgotado|network|conex|dns|fetch)' AS rede,
      coalesce(l.erro,'') ~* '(login|senha|autentica|401|403)' AS login
    FROM public.apoio_chamada_log l
    WHERE l.company_id = c AND l.created_at BETWEEN _ini AND _fim AND (_apoio IS NULL OR l.apoio_id = _apoio)
  ), enr AS (
    SELECT b.*,
      (b.tp = 'transmitir' AND b.cods && ARRAY['10023','10217'] AND EXISTS (
        SELECT 1 FROM public.apoio_chamada_log x WHERE x.apoio_id = b.apoio_id AND x.created_at BETWEEN b.created_at AND b.created_at + interval '3 minutes'
          AND x.requisicao LIKE '%SolicitaLote%' AND x.requisicao LIKE '%CodLoteLab&gt;' || b.lote || '&lt;%'
          AND x.erro IS NULL AND coalesce(x.resposta,'') ILIKE '%RegistroAdmitido%')) AS recup,
      coalesce((SELECT u.remessa_id FROM public.apoio_lote_usado u WHERE u.company_id = c AND u.cod_lote_lab::text = b.lote AND u.remessa_id IS NOT NULL LIMIT 1),
               (SELECT r.id FROM public.apoio_remessa r WHERE r.company_id = c AND r.apoio_id = b.apoio_id AND r.cod_lote_lab::text = b.lote LIMIT 1)) AS rem
    FROM base b
  ), fin AS (
    SELECT e.*, CASE
      WHEN e.recup THEN 'aviso'
      WHEN e.erro IS NOT NULL OR e.http_status >= 400 OR e.interna OR cardinality(e.cods) > 0 THEN 'erro'
      ELSE 'sucesso' END AS sit
    FROM enr e
  )
  SELECT f.id, f.created_at, f.apoio_id, a.nome, f.tp, f.origem, p.full_name, f.http_status, f.duracao_ms, f.cods, f.txt,
    f.interna, f.rede, f.login, f.recup, f.sit, f.lote, f.rem, r.cod_lote_lab, f.resolvido_em, f.resolvido_obs, count(*) OVER ()
  FROM fin f
  LEFT JOIN public.apoio_laboratorio a ON a.id = f.apoio_id
  LEFT JOIN public.profiles p ON p.id = f.usuario_id
  LEFT JOIN public.apoio_remessa r ON r.id = f.rem
  WHERE (_tipo IS NULL OR f.tp = _tipo)
    AND (_situacao IS NULL OR f.sit = _situacao OR (_situacao = 'nao_sucesso' AND f.sit <> 'sucesso'))
    AND (_remessa IS NULL OR f.rem = _remessa)
    AND (_busca IS NULL OR _busca = '' OR f.lote = _busca OR _busca = ANY(f.cods) OR r.cod_lote_lab::text = _busca
         OR coalesce(f.requisicao,'') ILIKE '%CodPedLab&gt;' || _busca || '&lt;%')
  ORDER BY f.created_at DESC
  LIMIT _limite OFFSET _offset;
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_log_lista(timestamptz, timestamptz, uuid, text, text, text, uuid, int, int) TO authenticated;

-- Contagem de repetições do mesmo erro
CREATE OR REPLACE FUNCTION public.apoio_log_repeticoes(_id uuid)
RETURNS TABLE (vezes bigint, desde timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.apoio_chamada_log%ROWTYPE; c uuid := public.get_user_company_id(auth.uid());
BEGIN
  SELECT * INTO l FROM public.apoio_chamada_log WHERE id = _id AND company_id = c;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY SELECT count(*), min(x.created_at) FROM public.apoio_chamada_log x
   WHERE x.company_id = c AND x.apoio_id = l.apoio_id AND x.operacao = l.operacao
     AND coalesce(x.erro,'') = coalesce(l.erro,'') AND x.created_at > now() - interval '30 days'
     AND (x.erro IS NOT NULL OR x.http_status >= 400);
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_log_repeticoes(uuid) TO authenticated;

-- Detalhe técnico (só admin do apoio)
CREATE OR REPLACE FUNCTION public.apoio_log_tecnico(_id uuid)
RETURNS TABLE (operacao text, http_status int, duracao_ms int, requisicao text, resposta text, erro text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.apoio_tem_permissao('apoio.laboratorio.gerenciar') THEN RAISE EXCEPTION 'Só administradores do apoio veem o detalhe técnico'; END IF;
  RETURN QUERY SELECT l.operacao, l.http_status, l.duracao_ms,
    regexp_replace(coalesce(l.requisicao,''), '(<passwd[^>]*>)[\s\S]*?(</passwd>)', '\1***\2', 'gi'),
    left(l.resposta, 200000), l.erro
  FROM public.apoio_chamada_log l WHERE l.id = _id AND l.company_id = public.get_user_company_id(auth.uid());
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_log_tecnico(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.apoio_log_resolver(_id uuid, _obs text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.get_user_company_id(auth.uid()); a uuid;
BEGIN
  IF NOT public.apoio_tem_permissao('apoio.laboratorio.gerenciar') THEN RAISE EXCEPTION 'Só administradores do apoio podem marcar como resolvido'; END IF;
  UPDATE public.apoio_chamada_log SET resolvido_em = now(), resolvido_por = auth.uid(), resolvido_obs = nullif(trim(_obs),'')
   WHERE id = _id AND company_id = c RETURNING apoio_id INTO a;
  IF a IS NULL THEN RAISE EXCEPTION 'Registro não encontrado'; END IF;
  UPDATE public.apoio_cursor SET resolvido_em = now(), falhas_desde = NULL, falhas_n = 0, alerta_em = NULL WHERE apoio_id = a AND company_id = c;
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_log_resolver(uuid, text) TO authenticated;

-- Retenção: sucessos 90 dias, erros 1 ano
CREATE OR REPLACE FUNCTION public.apoio_log_limpar()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  DELETE FROM public.apoio_chamada_log
   WHERE (created_at < now() - interval '1 year')
      OR (created_at < now() - interval '90 days' AND erro IS NULL AND coalesce(http_status,200) < 400);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.apoio_log_limpar() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.unschedule('apoio-log-limpar') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apoio-log-limpar');
  PERFORM cron.schedule('apoio-log-limpar', '30 6 * * *', 'SELECT public.apoio_log_limpar()');
END $$;