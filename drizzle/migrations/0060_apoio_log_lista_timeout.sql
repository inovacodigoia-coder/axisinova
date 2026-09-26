DROP FUNCTION IF EXISTS public.apoio_log_lista(timestamptz, timestamptz, uuid, text, text, text, uuid, integer, integer);
CREATE FUNCTION public.apoio_log_lista(_ini timestamp with time zone DEFAULT (now() - '7 days'::interval), _fim timestamp with time zone DEFAULT now(), _apoio uuid DEFAULT NULL::uuid, _tipo text DEFAULT NULL::text, _situacao text DEFAULT NULL::text, _busca text DEFAULT NULL::text, _remessa uuid DEFAULT NULL::uuid, _limite integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, apoio_id uuid, apoio_nome text, tipo text, origem text, usuario_nome text, http_status integer, duracao_ms integer, codigos text[], texto_pardini text, falha_interna boolean, sem_conexao boolean, login_recusado boolean, recuperado boolean, situacao text, cod_lote text, remessa_id uuid, remessa_numero bigint, resolvido_em timestamp with time zone, resolvido_obs text, total bigint, timeout_s integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      coalesce(l.erro,'') ~* '(login|senha|autentica|401|403)' AS login,
      CASE WHEN coalesce(l.erro,'') ~* '(tempo esgotado|timeout)'
        THEN coalesce(nullif(substring(l.erro from '([0-9]+)\s*s\)'),'')::int, round(coalesce(l.duracao_ms,0)/1000.0)::int) END AS tmo
    FROM public.apoio_chamada_log l
    WHERE l.company_id = c AND l.created_at BETWEEN _ini AND _fim AND (_apoio IS NULL OR l.apoio_id = _apoio)
  ), enr AS (
    SELECT b.*,
      (b.tp = 'transmitir' AND b.cods && ARRAY['10023','10217'] AND EXISTS (
        SELECT 1 FROM public.apoio_chamada_log x WHERE x.apoio_id = b.apoio_id AND x.created_at BETWEEN b.created_at AND b.created_at + interval '3 minutes'
          AND x.requisicao LIKE '%SolicitaLote%' AND x.requisicao LIKE '%CodLoteLab&gt;' || b.lote || '&lt;%'
          AND x.erro IS NULL AND coalesce(x.resposta,'') ILIKE '%RegistroAdmitido%')) AS recup,
      coalesce((SELECT u.remessa_id FROM public.apoio_lote_usado u WHERE u.company_id = c AND u.cod_lote_lab::text = b.lote AND u.remessa_id IS NOT NULL LIMIT 1),
               (SELECT r.id FROM public.apoio_remessa r WHERE r.company_id = c AND r.apoio_id = b.apoio_id AND r.cod_lote_lab::text = b.lote LIMIT 1),
               (SELECT pe.remessa_id FROM public.apoio_pedido_exame pe WHERE pe.company_id = c AND pe.apoio_id = b.apoio_id AND pe.remessa_id IS NOT NULL
                  AND pe.cod_ped_apoio = substring(b.requisicao from '<codPedApoio[^>]*>([^<]*)<') ORDER BY pe.created_at LIMIT 1)) AS rem
    FROM base b
  ), fin AS (
    SELECT e.*, CASE
      WHEN e.recup THEN 'aviso'
      WHEN e.erro IS NOT NULL OR e.http_status >= 400 OR e.interna OR cardinality(e.cods) > 0 THEN 'erro'
      ELSE 'sucesso' END AS sit
    FROM enr e
  )
  SELECT f.id, f.created_at, f.apoio_id, a.nome, f.tp, f.origem, p.full_name, f.http_status, f.duracao_ms, f.cods, f.txt,
    f.interna, f.rede, f.login, f.recup, f.sit, f.lote, f.rem, r.cod_lote_lab, f.resolvido_em, f.resolvido_obs, count(*) OVER (), f.tmo
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
END $function$;
GRANT EXECUTE ON FUNCTION public.apoio_log_lista(timestamptz, timestamptz, uuid, text, text, text, uuid, integer, integer) TO authenticated;