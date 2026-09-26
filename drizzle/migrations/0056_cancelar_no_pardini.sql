ALTER TABLE public.apoio_remessa DROP CONSTRAINT apoio_remessa_status_check;
ALTER TABLE public.apoio_remessa ADD CONSTRAINT apoio_remessa_status_check CHECK (status = ANY (ARRAY['aberta','conferida','transmitindo','transmitida','parcial','erro','manual','cancelada','cancelada_apoio','cancelada_parcial']));

UPDATE public.access_profiles SET permissions = jsonb_set(permissions, '{apoio}', coalesce(permissions->'apoio','[]'::jsonb) || '["apoio.remessa.cancelar"]'::jsonb)
 WHERE coalesce(permissions->'apoio','[]'::jsonb) ? 'apoio.remessa.operar' AND NOT (coalesce(permissions->'apoio','[]'::jsonb) ? 'apoio.remessa.cancelar');

CREATE OR REPLACE FUNCTION public.apoio_cancelamento_registrar(_pe uuid, _usuario uuid, _resultado text, _motivo text, _destino text, _resposta text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE; info jsonb; novo uuid; tot int; canc int; rec_ok boolean; nome_ex text; pac text;
BEGIN
  SELECT * INTO r FROM apoio_pedido_exame WHERE id = _pe FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame não encontrado'; END IF;
  info := jsonb_build_object('estado', _resultado, 'motivo', _motivo, 'destino', _destino, 'por', _usuario, 'em', now(), 'resposta', left(coalesce(_resposta,''), 500));
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (r.company_id, 'apoio_pedido_exame', r.id, 'CANCELAR_NO_APOIO', jsonb_build_object('status', r.status, 'cod_ped_apoio', r.cod_ped_apoio, 'codigo_apoio', r.codigo_apoio, 'remessa_id', r.remessa_id), info, _usuario);

  IF _resultado = 'recusado' THEN RETURN jsonb_build_object('ok', false); END IF;
  IF _resultado = 'sem_confirmacao' THEN
    UPDATE apoio_pedido_exame SET info_complementar = coalesce(info_complementar,'{}'::jsonb) || jsonb_build_object('cancel_apoio', info) WHERE id = r.id;
    RETURN jsonb_build_object('ok', false);
  END IF;
  IF _resultado <> 'cancelado' THEN RAISE EXCEPTION 'Resultado inválido'; END IF;

  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE apoio_pedido_exame SET status = 'cancelado',
    info_complementar = (coalesce(info_complementar,'{}'::jsonb) - 'cancelar_no_apoio') || jsonb_build_object('cancel_apoio', info, 'cancelado_no_apoio_em', now())
   WHERE id = r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);
  INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id, dados)
  VALUES (r.company_id, r.id, r.status, 'cancelado', 'manual', 'Cancelado no apoio: ' || _motivo, _usuario, info);

  IF _destino = 'fila' THEN
    INSERT INTO apoio_pedido_exame (company_id, pedido_id, exame_id, amostra_id, apoio_id, codigo_apoio, status, modo, custo_previsto, preco_ficticio, prazo_contagem, info_complementar)
    VALUES (r.company_id, r.pedido_id, r.exame_id, r.amostra_id, r.apoio_id, r.codigo_apoio, 'aguardando_remessa', r.modo, r.custo_previsto, r.preco_ficticio, r.prazo_contagem,
      (coalesce(r.info_complementar,'{}'::jsonb) - 'comentarios' - 'cancelar_no_apoio' - 'cancel_apoio' - 'acao_pendente_id') || jsonb_build_object('reenvio_de', r.id))
    RETURNING id INTO novo;
    UPDATE apoio_pedido_exame SET info_complementar = info_complementar || jsonb_build_object('reenvio_para', novo) WHERE id = r.id;
  ELSIF _destino = 'atendimento' THEN
    SELECT e.name INTO nome_ex FROM exams e WHERE e.id::text = r.exame_id::text;
    SELECT ao.patient_name INTO pac FROM attendance_orders ao WHERE ao.id = r.pedido_id;
    INSERT INTO lab_exam_results (company_id, order_id, exam_ref, exam_name, patient_name, status)
    VALUES (r.company_id, r.pedido_id, r.pedido_id::text || ':' || r.exame_id::text, nome_ex, pac, 'cancelled')
    ON CONFLICT (company_id, exam_ref) DO UPDATE SET status = 'cancelled', updated_at = now();
  END IF;

  IF r.recipiente_id IS NOT NULL THEN
    SELECT bool_and(status = 'cancelado') INTO rec_ok FROM apoio_pedido_exame WHERE recipiente_id = r.recipiente_id;
    IF rec_ok THEN UPDATE apoio_recipiente SET cancelado = true WHERE id = r.recipiente_id; END IF;
  END IF;
  IF r.remessa_id IS NOT NULL THEN
    SELECT count(*), count(*) FILTER (WHERE status = 'cancelado') INTO tot, canc FROM apoio_pedido_exame WHERE remessa_id = r.remessa_id;
    UPDATE apoio_remessa SET status = CASE WHEN canc >= tot THEN 'cancelada_apoio' ELSE 'cancelada_parcial' END WHERE id = r.remessa_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'novo', novo);
END $$;
REVOKE ALL ON FUNCTION public.apoio_cancelamento_registrar(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_cancelamento_registrar(uuid, uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.apoio_log_lista(_ini timestamp with time zone DEFAULT (now() - '7 days'::interval), _fim timestamp with time zone DEFAULT now(), _apoio uuid DEFAULT NULL::uuid, _tipo text DEFAULT NULL::text, _situacao text DEFAULT NULL::text, _busca text DEFAULT NULL::text, _remessa uuid DEFAULT NULL::uuid, _limite integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, apoio_id uuid, apoio_nome text, tipo text, origem text, usuario_nome text, http_status integer, duracao_ms integer, codigos text[], texto_pardini text, falha_interna boolean, sem_conexao boolean, login_recusado boolean, recuperado boolean, situacao text, cod_lote text, remessa_id uuid, remessa_numero bigint, resolvido_em timestamp with time zone, resolvido_obs text, total bigint)
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
END $function$;