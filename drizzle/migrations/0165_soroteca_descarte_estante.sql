-- Soroteca S05: (1) bipe de tubo sem DELETE sem filtro; (2) descarte da estante inteira.

-- (1) A limpeza da tabela temporária do bipe ia sem WHERE e o banco recusa ("DELETE requires a WHERE clause").
CREATE OR REPLACE FUNCTION public.soroteca_localizar(p_termo text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_t text := upper(trim(coalesce(p_termo, '')));
  v_seq int; v_hits jsonb := '[]'::jsonb; v_modo text := 'nenhum';
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF length(v_t) < 2 THEN RETURN jsonb_build_object('modo', 'nenhum', 'pedidos', '[]'::jsonb); END IF;
  SELECT sequence_id INTO v_seq FROM public.companies WHERE id = v_company;

  CREATE TEMP TABLE IF NOT EXISTS _sor_hit(order_id uuid, tubo_indice int) ON COMMIT DROP;
  -- sempre com filtro (o banco recusa DELETE sem WHERE)
  DELETE FROM _sor_hit WHERE order_id IS NOT NULL OR order_id IS NULL;

  -- 1) tubo já guardado
  INSERT INTO _sor_hit SELECT order_id, tubo_indice FROM public.soroteca_amostra
    WHERE company_id = v_company AND (upper(codigo_amostra) = v_t OR codigo_alfanumerico = v_t);
  IF FOUND THEN v_modo := 'tubo'; END IF;

  -- 2) código da amostra (protocolo-tubo[-empresa]) ou nº do pedido
  IF v_modo = 'nenhum' THEN
    INSERT INTO _sor_hit
    SELECT o.id, (SELECT min(i) FROM generate_series(1, 40) i
                  WHERE upper(public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), i, coalesce(o.empresa_seq, v_seq))) = v_t)
    FROM public.attendance_orders o
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND (upper(coalesce(o.order_number, o.protocol, '')) = v_t
        OR upper(coalesce(o.order_number, o.protocol, '')) IN (regexp_replace(v_t, '-[^-]*$', ''), regexp_replace(v_t, '-[^-]*-[^-]*$', '')));
    DELETE FROM _sor_hit h USING public.attendance_orders o
      WHERE o.id = h.order_id AND h.tubo_indice IS NULL AND upper(coalesce(o.order_number, o.protocol, '')) <> v_t;
    IF EXISTS (SELECT 1 FROM _sor_hit WHERE tubo_indice IS NOT NULL) THEN v_modo := 'tubo';
    ELSIF EXISTS (SELECT 1 FROM _sor_hit) THEN v_modo := 'pedido'; END IF;
  END IF;

  -- 3) código de barras alfanumérico de tubo ainda não guardado (pedidos dos últimos 400 dias)
  IF v_modo = 'nenhum' AND v_t ~ '^[A-Z][A-Z0-9]{7}[0-9]$' THEN
    INSERT INTO _sor_hit
    SELECT o.id, i
    FROM public.attendance_orders o
    CROSS JOIN LATERAL generate_series(1, least(40, 2 + 2 * (
      SELECT count(*) FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e)::int)) i
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND o.created_at >= now() - interval '400 days'
      AND public.soroteca_hash_amostra(public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), i, coalesce(o.empresa_seq, v_seq))) = v_t;
    IF FOUND THEN v_modo := 'tubo'; END IF;
  END IF;

  -- 4) nome do paciente (30 pedidos mais recentes)
  IF v_modo = 'nenhum' AND length(v_t) >= 3 AND v_t !~ '[0-9]' THEN
    INSERT INTO _sor_hit
    SELECT o.id, NULL FROM public.attendance_orders o LEFT JOIN public.patients pt ON pt.id = o.patient_id
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND coalesce(pt.name, o.patient_name, '') ILIKE '%' || trim(p_termo) || '%'
    ORDER BY o.created_at DESC LIMIT 30;
    IF FOUND THEN v_modo := 'paciente'; END IF;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'order_id', o.id, 'protocolo', coalesce(o.order_number, o.protocol), 'empresa_seq', coalesce(o.empresa_seq, v_seq),
      'patient_id', o.patient_id, 'patient_name', coalesce(pt.name, o.patient_name), 'patient_birth', pt.birth_date,
      'is_urgent', coalesce(o.is_urgent, false), 'created_at', o.created_at, 'lab_guides', coalesce(o.lab_guides, '[]'::jsonb),
      'tubo_indice', h.tubo_indice,
      'resultados', (SELECT coalesce(jsonb_object_agg(split_part(r.exam_ref, ':', 2), r.status), '{}'::jsonb)
                     FROM public.lab_exam_results r WHERE r.company_id = v_company AND r.order_id = o.id),
      'guardados', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'tubo_indice', a.tubo_indice, 'codigo_amostra', a.codigo_amostra,
                      'status', a.status, 'equipamento_id', a.equipamento_id, 'equipamento_nome', e.nome, 'prateleira_id', a.prateleira_id, 'prateleira_nome', sp.nome, 'linha', a.linha, 'coluna', a.coluna)), '[]'::jsonb)
                    FROM public.soroteca_amostra a LEFT JOIN public.soroteca_equipamento e ON e.id = a.equipamento_id
                    LEFT JOIN public.soroteca_prateleira sp ON sp.id = a.prateleira_id
                    WHERE a.company_id = v_company AND a.order_id = o.id))
      ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_hits
  FROM (SELECT DISTINCT ON (order_id) order_id, tubo_indice FROM _sor_hit ORDER BY order_id, tubo_indice NULLS LAST) h
  JOIN public.attendance_orders o ON o.id = h.order_id
  LEFT JOIN public.patients pt ON pt.id = o.patient_id;
  RETURN jsonb_build_object('modo', v_modo, 'pedidos', v_hits);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_localizar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_localizar(text) TO authenticated;

-- (2) Histórico da estante: descarte, inativação e reativação
ALTER TABLE public.soroteca_estante_movimento DROP CONSTRAINT soroteca_estante_movimento_tipo_check;
ALTER TABLE public.soroteca_estante_movimento ADD CONSTRAINT soroteca_estante_movimento_tipo_check
  CHECK (tipo IN ('criada', 'guardada', 'aberta', 'descartada', 'inativada', 'reativada'));
ALTER TABLE public.soroteca_estante_movimento
  ADD COLUMN motivo text,
  ADD COLUMN observacao text,
  ADD COLUMN responsavel_nome text,
  ADD COLUMN destino text CHECK (destino IS NULL OR destino IN ('reaproveitar', 'inativar'));

-- Último endereço completo do tubo ao sair (retirada/descarte): a Consulta continua mostrando onde ele estava
ALTER TABLE public.soroteca_movimento ADD COLUMN de_endereco text;

-- "B05" (mesma regra de rotuloPosicao)
CREATE OR REPLACE FUNCTION public.soroteca__posicao(p_linha int, p_coluna int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN p_linha IS NULL OR p_coluna IS NULL OR p_linha < 1 THEN NULL
    ELSE CASE WHEN p_linha <= 26 THEN chr(64 + p_linha) ELSE 'A' || chr(64 + p_linha - 26) END || lpad(p_coluna::text, 2, '0') END;
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca__posicao(int, int) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_retirar(p_amostra_id uuid, p_motivo text, p_observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_tot int; v_lib int;
  v_obs text := nullif(trim(coalesce(p_observacao, '')), '');
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para retirar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_motivo, '') NOT IN ('Recoleta solicitada', 'Consulta externa', 'Exame complementar', 'Descarte antecipado', 'Outro') THEN
    RAISE EXCEPTION 'Motivo da retirada inválido';
  END IF;
  IF p_motivo = 'Outro' AND v_obs IS NULL THEN RAISE EXCEPTION 'Descreva o motivo na observação'; END IF;
  SELECT s.*, e.nome AS eq_nome, sp.nome AS prat_nome, g.nome AS loc_nome, gp.nome AS loc_prat_nome INTO a
    FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
    LEFT JOIN public.soroteca_prateleira sp ON sp.id = s.prateleira_id
    LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
    LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
    WHERE s.id = p_amostra_id AND s.company_id = v_company FOR UPDATE OF s;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF a.status <> 'armazenada' THEN RAISE EXCEPTION 'A amostra % não está armazenada', a.codigo_amostra; END IF;
  SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
  UPDATE public.soroteca_amostra SET status = 'retirada', equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL,
    updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
  INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
    motivo, observacao, status_resultado, usuario_id, usuario_nome)
  VALUES (v_company, a.id, 'retirada', a.eq_nome, a.prat_nome, a.linha, a.coluna,
    concat_ws(' > ', a.loc_nome, nullif(a.loc_prat_nome, ''), a.eq_nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna)),
    p_motivo, left(v_obs, 500), public.soroteca__status(v_tot, v_lib), auth.uid(), public.soroteca__usuario_nome());
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_retirar(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_retirar(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_descartar(p_ids uuid[], p_motivo text, p_responsavel text, p_observacao text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_n int := 0; v_tot int; v_lib int;
  v_resp text := nullif(left(trim(coalesce(p_responsavel, '')), 120), ''); v_mot text := nullif(left(trim(coalesce(p_motivo, '')), 120), '');
  v_obs text := nullif(left(trim(coalesce(p_observacao, '')), 500), ''); v_user text := public.soroteca__usuario_nome();
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para descartar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(cardinality(p_ids), 0) = 0 THEN RAISE EXCEPTION 'Nenhuma amostra selecionada'; END IF;
  IF cardinality(p_ids) > 5000 THEN RAISE EXCEPTION 'No máximo 5.000 amostras por descarte'; END IF;
  IF v_resp IS NULL THEN RAISE EXCEPTION 'Informe o responsável pelo descarte'; END IF;
  IF v_mot IS NULL THEN RAISE EXCEPTION 'Informe o motivo do descarte'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_ids) i WHERE NOT EXISTS (SELECT 1 FROM public.soroteca_amostra s WHERE s.id = i AND s.company_id = v_company)) THEN
    RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002';
  END IF;
  FOR a IN SELECT s.*, e.nome AS eq_nome, sp.nome AS prat_nome, g.nome AS loc_nome, gp.nome AS loc_prat_nome
           FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
           LEFT JOIN public.soroteca_prateleira sp ON sp.id = s.prateleira_id
           LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
           LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
           WHERE s.id = ANY(p_ids) AND s.company_id = v_company AND s.status <> 'descartada' ORDER BY s.codigo_amostra FOR UPDATE OF s LOOP
    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
    UPDATE public.soroteca_amostra SET status = 'descartada', descartada_em = now(), equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL,
      updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
    INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
      motivo, observacao, status_resultado, responsavel_nome, usuario_id, usuario_nome)
    VALUES (v_company, a.id, 'descarte', a.eq_nome, a.prat_nome, a.linha, a.coluna,
      nullif(concat_ws(' > ', a.loc_nome, nullif(a.loc_prat_nome, ''), a.eq_nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna)), ''),
      v_mot, v_obs, public.soroteca__status(v_tot, v_lib), v_resp, auth.uid(), v_user);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_descartar(uuid[], text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_descartar(uuid[], text, text, text) TO authenticated;

-- Lista de amostras: tubo retirado/descartado mostra o último endereço que teve
CREATE OR REPLACE FUNCTION public.soroteca_amostras(p_filtros jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); f jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_st text := coalesce(nullif(f->>'situacao', ''), 'ativas'); v_cod text := upper(trim(coalesce(f->>'codigo', '')));
  v_pac text := trim(coalesce(f->>'paciente', '')); v_cpf text := regexp_replace(coalesce(f->>'paciente', ''), '\D', '', 'g');
  v_lista jsonb; v_teto int := 5000; v_n int;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  WITH base AS (
    SELECT a.*, e.nome AS equipamento_nome, sp.nome AS prateleira_nome, e.tipo AS equipamento_tipo, e.codigo AS estante_codigo,
      e.local_equipamento_id, g.nome AS local_nome, gp.nome AS local_prateleira_nome, res.total, res.liberados,
      public.soroteca__status(res.total, res.liberados) AS status_resultado,
      CASE WHEN a.status <> 'armazenada' THEN (
        SELECT coalesce(m.de_endereco, nullif(concat_ws(' > ', m.de_equipamento_nome, nullif(m.de_prateleira_nome, ''), public.soroteca__posicao(m.de_linha, m.de_coluna)), ''))
        FROM public.soroteca_movimento m WHERE m.amostra_id = a.id AND m.tipo IN ('retirada', 'descarte')
        ORDER BY m.created_at DESC LIMIT 1) END AS ultimo_endereco
    FROM public.soroteca_amostra a
    LEFT JOIN public.soroteca_equipamento e ON e.id = a.equipamento_id
    LEFT JOIN public.soroteca_prateleira sp ON sp.id = a.prateleira_id
    LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
    LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
    LEFT JOIN public.patients pt ON pt.id = a.patient_id
    CROSS JOIN LATERAL public.soroteca__resultados(a.company_id, a.order_id, a.exame_ids) res
    WHERE a.company_id = v_company
      AND (v_st = 'todas' OR (v_st = 'ativas' AND a.status IN ('armazenada', 'retirada')) OR a.status = v_st)
      AND (v_cod = '' OR upper(a.codigo_amostra) = v_cod OR a.codigo_alfanumerico = v_cod OR upper(coalesce(a.protocolo, '')) = v_cod)
      AND (v_pac = '' OR coalesce(pt.name, a.patient_name, '') ILIKE '%' || v_pac || '%'
           OR (length(v_cpf) >= 11 AND regexp_replace(coalesce(pt.cpf, ''), '\D', '', 'g') = v_cpf))
      AND (nullif(f->>'equipamento_id', '') IS NULL OR a.equipamento_id::text = f->>'equipamento_id' OR e.local_equipamento_id::text = f->>'equipamento_id')
      AND (nullif(f->>'workbench_id', '') IS NULL OR a.workbench_id = f->>'workbench_id')
      AND (nullif(f->>'order_id', '') IS NULL OR a.order_id::text = f->>'order_id')
      AND (nullif(f->>'de', '') IS NULL OR a.armazenada_em >= ((f->>'de')::date::timestamp AT TIME ZONE 'America/Sao_Paulo'))
      AND (nullif(f->>'ate', '') IS NULL OR a.armazenada_em < (((f->>'ate')::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
      AND (nullif(f->>'vence_ate', '') IS NULL OR a.validade <= (f->>'vence_ate')::timestamptz)
  ), filtrada AS (
    SELECT * FROM base
    WHERE nullif(f->>'status_resultado', '') IS NULL
       OR (f->>'status_resultado' = 'descartada' AND status = 'descartada')
       OR (f->>'status_resultado' <> 'descartada' AND status <> 'descartada' AND status_resultado = f->>'status_resultado')
    ORDER BY coalesce(validade, armazenada_em) NULLS LAST, codigo_amostra
    LIMIT v_teto + 1
  )
  SELECT count(*), coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'codigo_amostra', codigo_amostra, 'codigo_alfanumerico', codigo_alfanumerico, 'order_id', order_id,
      'tubo_indice', tubo_indice, 'protocolo', protocolo, 'patient_name', patient_name, 'workbench_id', workbench_id,
      'bancada_nome', bancada_nome, 'tubo_nome', tubo_nome, 'exames_nomes', to_jsonb(exames_nomes), 'tem_apoio', tem_apoio,
      'coletada_em', coletada_em, 'validade', validade, 'status', status, 'equipamento_id', equipamento_id,
      'equipamento_nome', equipamento_nome, 'prateleira_id', prateleira_id, 'prateleira_nome', prateleira_nome,
      'equipamento_tipo', equipamento_tipo, 'estante_codigo', estante_codigo, 'local_equipamento_id', local_equipamento_id,
      'local_nome', local_nome, 'local_prateleira_nome', local_prateleira_nome, 'linha', linha, 'coluna', coluna, 'armazenada_em', armazenada_em,
      'descartada_em', descartada_em, 'total', total, 'liberados', liberados, 'status_resultado', status_resultado, 'ultimo_endereco', ultimo_endereco)
      ORDER BY coalesce(validade, armazenada_em) NULLS LAST, codigo_amostra), '[]'::jsonb)
  INTO v_n, v_lista FROM filtrada;
  IF v_n > v_teto THEN v_lista := v_lista - v_teto; END IF;
  RETURN jsonb_build_object('amostras', v_lista, 'limitado', v_n > v_teto);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) TO authenticated;

-- Estantes ativas para a aba "Por estante": tubos, mais antigo, vencidos, vencendo (aviso) e pendentes
CREATE OR REPLACE FUNCTION public.soroteca_estantes_descarte()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_aviso int;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce((SELECT aviso_dias FROM public.soroteca_config WHERE company_id = v_company), 7) INTO v_aviso;
  RETURN jsonb_build_object('aviso_dias', v_aviso, 'estantes', coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', e.id, 'codigo', e.codigo, 'nome', e.nome, 'situacao', e.situacao,
        'local_equipamento_nome', g.nome, 'local_prateleira_nome', gp.nome, 'tubos', t.tubos, 'mais_antigo', t.mais_antigo,
        'vencidos', t.vencidos, 'vencendo', t.vencendo, 'pendentes', t.pendentes)
      ORDER BY t.mais_antigo NULLS LAST, e.codigo)
    FROM public.soroteca_equipamento e
    LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
    LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS tubos, min(coalesce(a.coletada_em, a.armazenada_em)) AS mais_antigo,
        count(*) FILTER (WHERE a.validade < now())::int AS vencidos,
        count(*) FILTER (WHERE a.validade >= now() AND a.validade <= now() + make_interval(days => v_aviso))::int AS vencendo,
        count(*) FILTER (WHERE r.total > r.liberados)::int AS pendentes
      FROM public.soroteca_amostra a CROSS JOIN LATERAL public.soroteca__resultados(a.company_id, a.order_id, a.exame_ids) r
      WHERE a.equipamento_id = e.id AND a.status = 'armazenada') t
    WHERE e.company_id = v_company AND e.tipo = 'estante' AND e.ativo), '[]'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estantes_descarte() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estantes_descarte() TO authenticated;

-- Tubos de uma estante para conferir antes do descarte (exames pendentes por nome)
CREATE OR REPLACE FUNCTION public.soroteca_estante_conferir(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT s.*, g.nome AS g_nome, gp.nome AS gp_nome INTO e FROM public.soroteca_equipamento s
    LEFT JOIN public.soroteca_equipamento g ON g.id = s.local_equipamento_id LEFT JOIN public.soroteca_prateleira gp ON gp.id = s.local_prateleira_id
    WHERE s.id = p_id AND s.company_id = v_company;
  IF e.id IS NULL OR e.tipo <> 'estante' THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  RETURN jsonb_build_object(
    'id', e.id, 'codigo', e.codigo, 'nome', e.nome, 'ativo', e.ativo, 'situacao', e.situacao,
    'local_equipamento_nome', e.g_nome, 'local_prateleira_nome', e.gp_nome,
    'tubos', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'codigo_amostra', a.codigo_amostra, 'patient_name', a.patient_name,
        'linha', a.linha, 'coluna', a.coluna, 'validade', a.validade, 'coletada_em', a.coletada_em, 'armazenada_em', a.armazenada_em,
        'pendentes', (SELECT coalesce(jsonb_agg(coalesce(r.exam_name, a.exames_nomes[x.n], x.eid) ORDER BY x.n), '[]'::jsonb)
                      FROM unnest(a.exame_ids) WITH ORDINALITY x(eid, n)
                      LEFT JOIN public.lab_exam_results r ON r.company_id = a.company_id AND r.exam_ref = a.order_id::text || ':' || x.eid
                      WHERE coalesce(r.status, '') NOT IN ('released', 'cancelled')))
        ORDER BY a.linha, a.coluna), '[]'::jsonb)
      FROM public.soroteca_amostra a WHERE a.equipamento_id = e.id AND a.status = 'armazenada'));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_conferir(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_conferir(uuid) TO authenticated;

-- Descarta a estante inteira: cada tubo vira "descartada" (com histórico), a estante sai da geladeira
-- e fica vazia (reaproveitar) ou inativa. Tubo pendente ou no prazo só com p_forcar + justificativa.
CREATE OR REPLACE FUNCTION public.soroteca_estante_descartar(p_id uuid, p_motivo text, p_responsavel text, p_observacao text,
  p_destino text, p_forcar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record; a record; v_tot int; v_lib int; v_n int := 0;
  v_tubos int; v_risco int; v_origem text; v_mot_tubo text; v_obs_tubo text; v_ids uuid[] := '{}';
  v_resp text := nullif(left(trim(coalesce(p_responsavel, '')), 120), ''); v_mot text := trim(coalesce(p_motivo, ''));
  v_obs text := nullif(left(trim(coalesce(p_observacao, '')), 500), ''); v_user text := public.soroteca__usuario_nome();
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para descartar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_destino, '') NOT IN ('reaproveitar', 'inativar') THEN
    RAISE EXCEPTION 'Escolha o que fazer com a estante: reaproveitar ou inativar';
  END IF;
  IF v_mot NOT IN ('Prazo de retenção vencido', 'Estante danificada', 'Outro') THEN RAISE EXCEPTION 'Motivo do descarte inválido'; END IF;
  IF v_mot = 'Outro' AND v_obs IS NULL THEN RAISE EXCEPTION 'Descreva o motivo do descarte'; END IF;
  IF v_resp IS NULL THEN RAISE EXCEPTION 'Informe o responsável pelo descarte'; END IF;

  SELECT s.*, g.nome AS g_nome, gp.nome AS gp_nome INTO e FROM public.soroteca_equipamento s
    LEFT JOIN public.soroteca_equipamento g ON g.id = s.local_equipamento_id LEFT JOIN public.soroteca_prateleira gp ON gp.id = s.local_prateleira_id
    WHERE s.id = p_id AND s.company_id = v_company FOR UPDATE OF s;
  IF e.id IS NULL OR e.tipo <> 'estante' THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF NOT e.ativo THEN RAISE EXCEPTION 'A estante % já está inativa', e.codigo; END IF;
  v_origem := nullif(concat_ws(' > ', e.g_nome, nullif(e.gp_nome, '')), '');

  PERFORM 1 FROM public.soroteca_amostra WHERE equipamento_id = e.id AND status = 'armazenada' FOR UPDATE;
  SELECT count(*), count(*) FILTER (WHERE x.validade IS NULL OR x.validade >= now() OR r.total > r.liberados)
    INTO v_tubos, v_risco
    FROM public.soroteca_amostra x CROSS JOIN LATERAL public.soroteca__resultados(x.company_id, x.order_id, x.exame_ids) r
    WHERE x.equipamento_id = e.id AND x.status = 'armazenada';
  IF v_tubos = 0 AND p_destino = 'reaproveitar' THEN
    RAISE EXCEPTION 'A estante % está vazia: não há tubos para descartar (só dá para inativar)', e.codigo;
  END IF;
  IF v_risco > 0 AND NOT coalesce(p_forcar, false) THEN
    RAISE EXCEPTION 'A estante % tem % tubo(s) com exame pendente ou dentro do prazo: marque "Descartar mesmo assim"', e.codigo, v_risco;
  END IF;
  IF v_risco > 0 AND v_obs IS NULL THEN
    RAISE EXCEPTION 'Explique por que descartar tubo(s) com exame pendente ou dentro do prazo';
  END IF;

  v_mot_tubo := CASE WHEN v_mot = 'Outro' THEN v_obs ELSE v_mot END;
  v_obs_tubo := concat_ws(' · ', 'Descarte da estante ' || e.codigo, CASE WHEN v_mot <> 'Outro' THEN v_obs END);
  FOR a IN SELECT x.*, sp.nome AS prat_nome FROM public.soroteca_amostra x LEFT JOIN public.soroteca_prateleira sp ON sp.id = x.prateleira_id
           WHERE x.equipamento_id = e.id AND x.status = 'armazenada' ORDER BY x.linha, x.coluna LOOP
    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
    UPDATE public.soroteca_amostra SET status = 'descartada', descartada_em = now(), equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL,
      updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
    INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
      motivo, observacao, status_resultado, responsavel_nome, usuario_id, usuario_nome)
    VALUES (v_company, a.id, 'descarte', e.nome, a.prat_nome, a.linha, a.coluna,
      concat_ws(' > ', e.g_nome, nullif(e.gp_nome, ''), e.nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna)),
      left(v_mot_tubo, 120), left(v_obs_tubo, 500), public.soroteca__status(v_tot, v_lib), v_resp, auth.uid(), v_user);
    v_ids := v_ids || a.id;
    v_n := v_n + 1;
  END LOOP;

  UPDATE public.soroteca_equipamento SET situacao = 'em_preenchimento', local_equipamento_id = NULL, local_prateleira_id = NULL, local_em = NULL,
    ativo = (p_destino = 'reaproveitar'), updated_at = now()
  WHERE id = e.id;
  INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, equipamento_nome, prateleira_nome, tubos,
    motivo, observacao, responsavel_nome, destino, usuario_id, usuario_nome)
  VALUES (v_company, e.id, CASE WHEN v_n > 0 THEN 'descartada' ELSE 'inativada' END, e.nome, e.g_nome, e.gp_nome, v_n,
    v_mot, v_obs, v_resp, p_destino, auth.uid(), v_user);
  RETURN jsonb_build_object('tubos', v_n, 'codigo', e.codigo, 'origem', v_origem, 'destino', p_destino, 'ids', to_jsonb(v_ids));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_descartar(uuid, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_descartar(uuid, text, text, text, text, boolean) TO authenticated;

-- Estante inativa volta a ser usada (vazia, em preenchimento)
CREATE OR REPLACE FUNCTION public.soroteca_estante_reativar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record;
BEGIN
  IF NOT (public.soroteca_tem_permissao('soroteca.descartar') OR public.soroteca_tem_permissao('soroteca.configurar')) THEN
    RAISE EXCEPTION 'Sem permissão para reativar estantes da Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company FOR UPDATE;
  IF e.id IS NULL OR e.tipo <> 'estante' THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF e.ativo THEN RETURN; END IF;
  UPDATE public.soroteca_equipamento SET ativo = true, situacao = 'em_preenchimento', local_equipamento_id = NULL, local_prateleira_id = NULL,
    local_em = NULL, updated_at = now()
  WHERE id = e.id;
  INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, usuario_id, usuario_nome)
  VALUES (v_company, e.id, 'reativada', e.nome, auth.uid(), public.soroteca__usuario_nome());
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_reativar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_reativar(uuid) TO authenticated;