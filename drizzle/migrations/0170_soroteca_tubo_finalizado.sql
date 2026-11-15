-- Soroteca S06-A: selecionar/remover tubo, tubo finalizado só sai pela Consulta (com justificativa),
-- responsável sempre o usuário logado e registro das impressões.

-- (1) Cada tubo guarda se já passou por um "Finalizar" (estante guardada na geladeira)
ALTER TABLE public.soroteca_amostra ADD COLUMN finalizada boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.soroteca_amostra.finalizada IS 'Tubo já passou por um Finalizar: só sai pela Consulta (soroteca_retirar, com justificativa)';
-- tubos guardados cuja estante foi guardada depois da última entrada do tubo
UPDATE public.soroteca_amostra a SET finalizada = true
WHERE a.status = 'armazenada'
  AND EXISTS (SELECT 1 FROM public.soroteca_estante_movimento m
              WHERE m.estante_id = a.equipamento_id AND m.tipo = 'guardada'
                AND m.created_at >= coalesce((SELECT max(x.created_at) FROM public.soroteca_movimento x
                                              WHERE x.amostra_id = a.id AND x.tipo IN ('entrada', 'movimentacao')), a.armazenada_em, a.created_at));

-- (2) Novo tipo de movimento: remoção antes de finalizar
ALTER TABLE public.soroteca_movimento DROP CONSTRAINT soroteca_movimento_tipo_check;
ALTER TABLE public.soroteca_movimento ADD CONSTRAINT soroteca_movimento_tipo_check
  CHECK (tipo IN ('entrada', 'movimentacao', 'retirada', 'descarte', 'remocao'));

-- Nome gravado nos registros: sempre o usuário da sessão
CREATE OR REPLACE FUNCTION public.soroteca__responsavel()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(nullif(trim(public.soroteca__usuario_nome()), ''), 'Usuário sem nome');
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca__responsavel() FROM PUBLIC, anon, authenticated;

-- (3) Armazenar: tubo finalizado não muda de lugar pela Entrada; toda entrada volta a ser "não finalizada"
CREATE OR REPLACE FUNCTION public.soroteca_armazenar(p_itens jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_seq int; it jsonb; o record; eq record; a record;
  v_idx int; v_codigo text; v_ids text[]; v_int text[]; v_nomes text[]; v_apoio boolean; v_coleta timestamptz;
  v_wb text; v_wb_nome text; v_lin int; v_col int; v_tot int; v_lib int; v_status text; v_user text := public.soroteca__responsavel();
  v_id uuid; v_out jsonb := '[]'::jsonb; v_ocupante text; pr record; v_pid uuid;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para armazenar amostras na Soroteca' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Nenhuma amostra para armazenar';
  END IF;
  IF jsonb_array_length(p_itens) > 200 THEN RAISE EXCEPTION 'No máximo 200 amostras por vez'; END IF;
  SELECT sequence_id INTO v_seq FROM public.companies WHERE id = v_company;

  FOR it IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    v_idx := nullif(it->>'tubo_indice', '')::int;
    v_lin := nullif(it->>'linha', '')::int; v_col := nullif(it->>'coluna', '')::int;
    IF v_idx IS NULL OR v_idx < 1 OR v_idx > 40 THEN RAISE EXCEPTION 'Tubo inválido'; END IF;

    SELECT * INTO o FROM public.attendance_orders
      WHERE id = nullif(it->>'order_id', '')::uuid AND company_id = v_company AND status::text NOT IN ('deleted', 'cancelled');
    IF o.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado' USING ERRCODE = 'P0002'; END IF;
    v_codigo := public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), v_idx, coalesce(o.empresa_seq, v_seq));

    SELECT array_agg(DISTINCT x) INTO v_ids FROM jsonb_array_elements_text(coalesce(it->'exame_ids', '[]'::jsonb)) x;
    SELECT array_agg(eid ORDER BY ord), array_agg(nome ORDER BY ord), bool_or(apoio),
           min(CASE WHEN NOT apoio THEN coleta END)
      INTO v_int, v_nomes, v_apoio, v_coleta
    FROM (
      SELECT DISTINCT ON (eid) eid, ord, nome, apoio, coleta FROM (
        SELECT coalesce(e->>'examId', e->>'id') eid, row_number() OVER () ord, coalesce(e->>'name', e->>'examName', '') nome,
          coalesce(e->>'bancadaTipo', '') = 'apoio' apoio,
          CASE WHEN coalesce(e->>'collected', '') <> 'false' AND e->>'collectedAt' ~ '^\d{4}-\d{2}-\d{2}'
               AND (e->>'collectedAt')::timestamptz <= now() + interval '5 minutes' THEN (e->>'collectedAt')::timestamptz END coleta
        FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
      ) t WHERE eid = ANY(coalesce(v_ids, '{}')) ORDER BY eid, ord
    ) s;
    IF coalesce(cardinality(v_ids), 0) = 0 OR coalesce(cardinality(v_int), 0) <> cardinality(v_ids) THEN
      RAISE EXCEPTION 'Exames do tubo % não conferem com o pedido', v_codigo;
    END IF;
    SELECT array_agg(i) , array_agg(n) INTO v_int, v_nomes FROM (
      SELECT unnest(v_int) i, unnest(v_nomes) n) z
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
                        WHERE coalesce(e->>'examId', e->>'id') = z.i AND coalesce(e->>'bancadaTipo', '') = 'apoio');
    IF coalesce(cardinality(v_int), 0) = 0 THEN
      RAISE EXCEPTION 'O tubo % só tem exames de apoio e não fica na soroteca', v_codigo;
    END IF;
    IF v_coleta IS NULL THEN RAISE EXCEPTION 'O tubo % ainda não foi coletado', v_codigo; END IF;

    SELECT wb, nm INTO v_wb, v_wb_nome FROM (
      SELECT coalesce(nullif(e->>'bancadaId', ''), nullif(e->>'workbenchId', '')) wb, max(coalesce(w.name, e->>'bancadaNome')) nm, count(*) n
      FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
      LEFT JOIN public.lab_workbenches w ON w.id::text = coalesce(nullif(e->>'bancadaId', ''), nullif(e->>'workbenchId', ''))
      WHERE coalesce(e->>'examId', e->>'id') = ANY(v_int)
      GROUP BY 1 ORDER BY n DESC, 1 NULLS LAST LIMIT 1) b;

    SELECT * INTO eq FROM public.soroteca_equipamento
      WHERE id = nullif(it->>'equipamento_id', '')::uuid AND company_id = v_company FOR UPDATE;
    IF eq.id IS NULL OR NOT eq.ativo THEN RAISE EXCEPTION 'Equipamento não encontrado ou inativo'; END IF;
    v_pid := nullif(it->>'prateleira_id', '')::uuid;
    IF v_pid IS NULL THEN
      SELECT CASE WHEN count(*) = 1 THEN min(id::text)::uuid END INTO v_pid FROM public.soroteca_prateleira WHERE equipamento_id = eq.id;
      IF v_pid IS NULL THEN RAISE EXCEPTION 'Escolha a prateleira de %', eq.nome; END IF;
    END IF;
    pr := NULL;
    SELECT * INTO pr FROM public.soroteca_prateleira WHERE id = v_pid AND equipamento_id = eq.id FOR UPDATE;
    IF pr.id IS NULL THEN RAISE EXCEPTION 'Prateleira não encontrada em %', eq.nome; END IF;
    IF v_lin IS NULL OR v_col IS NULL OR v_lin < 1 OR v_lin > pr.linhas OR v_col < 1 OR v_col > pr.colunas THEN
      RAISE EXCEPTION 'Posição fora da grade de % > %', eq.nome, pr.nome;
    END IF;

    SELECT * INTO a FROM public.soroteca_amostra WHERE company_id = v_company AND codigo_amostra = v_codigo FOR UPDATE;
    IF a.id IS NOT NULL AND a.status = 'descartada' THEN
      RAISE EXCEPTION 'A amostra % já foi descartada', v_codigo;
    END IF;
    IF a.id IS NOT NULL AND a.status = 'armazenada' AND a.prateleira_id = pr.id AND a.linha = v_lin AND a.coluna = v_col THEN
      v_out := v_out || jsonb_build_object('id', a.id, 'codigo_amostra', v_codigo, 'equipamento_nome', eq.nome, 'prateleira_id', pr.id, 'prateleira_nome', pr.nome, 'linha', v_lin, 'coluna', v_col, 'repetido', true);
      CONTINUE;
    END IF;
    IF a.id IS NOT NULL AND a.status = 'armazenada' AND a.finalizada THEN
      RAISE EXCEPTION 'Tubo % já finalizado: retire pela Consulta de Amostras antes de guardar em outro lugar', v_codigo;
    END IF;
    SELECT codigo_amostra INTO v_ocupante FROM public.soroteca_amostra
      WHERE prateleira_id = pr.id AND linha = v_lin AND coluna = v_col AND status = 'armazenada';
    IF v_ocupante IS NOT NULL THEN
      RAISE EXCEPTION 'A posição escolhida em % > % já está ocupada pela amostra %', eq.nome, pr.nome, v_ocupante;
    END IF;

    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, o.id, v_int);
    v_status := public.soroteca__status(v_tot, v_lib);

    IF a.id IS NULL THEN
      INSERT INTO public.soroteca_amostra (company_id, codigo_amostra, codigo_alfanumerico, order_id, tubo_indice, protocolo, patient_id,
        patient_name, workbench_id, bancada_nome, tubo_nome, exame_ids, exames_nomes, tem_apoio, coletada_em, validade, status,
        equipamento_id, prateleira_id, linha, coluna, armazenada_em, finalizada, updated_by)
      VALUES (v_company, v_codigo, public.soroteca_hash_amostra(v_codigo), o.id, v_idx, coalesce(o.order_number, o.protocol), o.patient_id,
        coalesce((SELECT name FROM public.patients WHERE id = o.patient_id), o.patient_name), v_wb, v_wb_nome,
        nullif(left(trim(coalesce(it->>'tubo_nome', '')), 80), ''), v_int, v_nomes, coalesce(v_apoio, false), v_coleta,
        v_coleta + make_interval(days => public.soroteca__retencao_dias(v_company, v_wb, v_wb_nome)), 'armazenada',
        eq.id, pr.id, v_lin, v_col, now(), false, auth.uid())
      RETURNING id INTO v_id;
      INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, equipamento_id, equipamento_nome, prateleira_id, prateleira_nome, linha, coluna, status_resultado, usuario_id, usuario_nome)
      VALUES (v_company, v_id, 'entrada', eq.id, eq.nome, pr.id, pr.nome, v_lin, v_col, v_status, auth.uid(), v_user);
    ELSE
      UPDATE public.soroteca_amostra SET status = 'armazenada', equipamento_id = eq.id, prateleira_id = pr.id, linha = v_lin, coluna = v_col,
        armazenada_em = CASE WHEN a.status = 'armazenada' THEN armazenada_em ELSE now() END, finalizada = false,
        updated_at = now(), updated_by = auth.uid()
      WHERE id = a.id;
      v_id := a.id;
      INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, equipamento_id, equipamento_nome, prateleira_id, prateleira_nome, linha, coluna,
        de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, status_resultado, usuario_id, usuario_nome)
      VALUES (v_company, v_id, CASE WHEN a.status = 'armazenada' THEN 'movimentacao' ELSE 'entrada' END, eq.id, eq.nome, pr.id, pr.nome, v_lin, v_col,
        CASE WHEN a.status = 'armazenada' THEN (SELECT nome FROM public.soroteca_equipamento WHERE id = a.equipamento_id) END,
        CASE WHEN a.status = 'armazenada' THEN (SELECT nome FROM public.soroteca_prateleira WHERE id = a.prateleira_id) END,
        CASE WHEN a.status = 'armazenada' THEN a.linha END, CASE WHEN a.status = 'armazenada' THEN a.coluna END,
        v_status, auth.uid(), v_user);
    END IF;
    v_out := v_out || jsonb_build_object('id', v_id, 'codigo_amostra', v_codigo, 'equipamento_nome', eq.nome, 'prateleira_id', pr.id, 'prateleira_nome', pr.nome, 'linha', v_lin, 'coluna', v_col, 'repetido', false);
  END LOOP;
  RETURN v_out;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_armazenar(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_armazenar(jsonb) TO authenticated;

-- (4) Remover tubo ainda não finalizado (Entrada): só confirmação, posição fica livre, fica no histórico
CREATE OR REPLACE FUNCTION public.soroteca_remover_tubo(p_amostra_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_tot int; v_lib int; v_pos text;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para armazenar amostras na Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT s.*, e.nome AS eq_nome, e.situacao AS eq_situacao, sp.nome AS prat_nome
    INTO a FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
    LEFT JOIN public.soroteca_prateleira sp ON sp.id = s.prateleira_id
    WHERE s.id = p_amostra_id AND s.company_id = v_company FOR UPDATE OF s;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF a.status <> 'armazenada' THEN RAISE EXCEPTION 'A amostra % não está armazenada', a.codigo_amostra; END IF;
  IF a.finalizada OR a.eq_situacao = 'armazenada' THEN
    RAISE EXCEPTION 'Tubo já finalizado: retire pela Consulta de Amostras';
  END IF;
  v_pos := public.soroteca__posicao(a.linha, a.coluna);
  SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
  UPDATE public.soroteca_amostra SET status = 'retirada', equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL, finalizada = false,
    updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
  INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
    motivo, status_resultado, responsavel_nome, usuario_id, usuario_nome)
  VALUES (v_company, a.id, 'remocao', a.eq_nome, a.prat_nome, a.linha, a.coluna,
    concat_ws(' > ', a.eq_nome, nullif(a.prat_nome, ''), v_pos),
    'Removido antes de finalizar', public.soroteca__status(v_tot, v_lib), public.soroteca__responsavel(), auth.uid(), public.soroteca__responsavel());
  RETURN jsonb_build_object('codigo', a.codigo_amostra, 'posicao', v_pos);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_remover_tubo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_remover_tubo(uuid) TO authenticated;

-- (5) Retirar tubo (Consulta): mesma permissão do descarte, motivo da lista e justificativa de pelo menos 10 caracteres
CREATE OR REPLACE FUNCTION public.soroteca_retirar(p_amostra_id uuid, p_motivo text, p_observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_tot int; v_lib int;
  v_obs text := nullif(trim(coalesce(p_observacao, '')), ''); v_user text := public.soroteca__responsavel();
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para retirar tubos da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_motivo, '') NOT IN ('Repetição de exame', 'Envio ao laboratório de apoio', 'Solicitação médica', 'Guardado por engano', 'Outro') THEN
    RAISE EXCEPTION 'Motivo da retirada inválido';
  END IF;
  IF char_length(coalesce(v_obs, '')) < 10 THEN
    RAISE EXCEPTION 'A justificativa da retirada precisa ter pelo menos 10 caracteres';
  END IF;
  SELECT s.*, e.nome AS eq_nome, sp.nome AS prat_nome, g.nome AS loc_nome, gp.nome AS loc_prat_nome INTO a
    FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
    LEFT JOIN public.soroteca_prateleira sp ON sp.id = s.prateleira_id
    LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
    LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
    WHERE s.id = p_amostra_id AND s.company_id = v_company FOR UPDATE OF s;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF a.status <> 'armazenada' THEN RAISE EXCEPTION 'A amostra % não está armazenada', a.codigo_amostra; END IF;
  SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
  UPDATE public.soroteca_amostra SET status = 'retirada', equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL, finalizada = false,
    updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
  INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
    motivo, observacao, status_resultado, responsavel_nome, usuario_id, usuario_nome)
  VALUES (v_company, a.id, 'retirada', a.eq_nome, a.prat_nome, a.linha, a.coluna,
    concat_ws(' > ', a.loc_nome, nullif(a.loc_prat_nome, ''), a.eq_nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna)),
    p_motivo, left(v_obs, 500), public.soroteca__status(v_tot, v_lib), v_user, auth.uid(), v_user);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_retirar(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_retirar(uuid, text, text) TO authenticated;

-- (6) Finalizar: os tubos da estante passam a "finalizados"
CREATE OR REPLACE FUNCTION public.soroteca_estante_guardar(p_id uuid, p_equipamento_id uuid, p_prateleira_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record; g record; pr record; v_n int; v_tubos int;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para armazenar amostras na Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company FOR UPDATE;
  IF e.id IS NULL OR e.tipo <> 'estante' THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF NOT e.ativo THEN RAISE EXCEPTION 'A estante % está inativa', e.codigo; END IF;
  SELECT * INTO g FROM public.soroteca_equipamento WHERE id = p_equipamento_id AND company_id = v_company FOR UPDATE;
  IF g.id IS NULL OR g.tipo = 'estante' OR NOT g.ativo THEN RAISE EXCEPTION 'Geladeira ou freezer não encontrado ou inativo'; END IF;
  SELECT * INTO pr FROM public.soroteca_prateleira WHERE id = p_prateleira_id AND equipamento_id = g.id;
  IF pr.id IS NULL THEN RAISE EXCEPTION 'Prateleira não encontrada em %', g.nome; END IF;
  SELECT count(*) INTO v_tubos FROM public.soroteca_amostra WHERE equipamento_id = e.id AND status = 'armazenada';
  IF v_tubos = 0 THEN RAISE EXCEPTION 'A estante % está vazia: bipe pelo menos um tubo antes de guardar', e.codigo; END IF;
  IF e.situacao = 'armazenada' AND e.local_prateleira_id = pr.id THEN
    RETURN jsonb_build_object('equipamento_nome', g.nome, 'prateleira_nome', pr.nome, 'tubos', v_tubos);
  END IF;
  SELECT count(*) INTO v_n FROM public.soroteca_equipamento WHERE local_prateleira_id = pr.id AND situacao = 'armazenada' AND id <> e.id;
  IF v_n >= pr.linhas * pr.colunas THEN
    RAISE EXCEPTION 'A % de % já está cheia (% de % estantes)', pr.nome, g.nome, v_n, pr.linhas * pr.colunas;
  END IF;
  UPDATE public.soroteca_amostra SET finalizada = true, updated_at = now(), updated_by = auth.uid()
    WHERE equipamento_id = e.id AND status = 'armazenada' AND NOT finalizada;
  UPDATE public.soroteca_equipamento SET situacao = 'armazenada', local_equipamento_id = g.id, local_prateleira_id = pr.id, local_em = now(), updated_at = now()
    WHERE id = e.id;
  INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, equipamento_nome, prateleira_nome, tubos, usuario_id, usuario_nome)
  VALUES (v_company, e.id, 'guardada', e.nome, g.nome, pr.nome, v_tubos, auth.uid(), public.soroteca__responsavel());
  RETURN jsonb_build_object('equipamento_nome', g.nome, 'prateleira_nome', pr.nome, 'tubos', v_tubos);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_guardar(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_guardar(uuid, uuid, uuid) TO authenticated;

-- (7) Descarte em lote / manual: responsável = usuário da sessão (p_responsavel é ignorado)
CREATE OR REPLACE FUNCTION public.soroteca_descartar_amostras(p_ids uuid[], p_motivo text, p_responsavel text, p_observacao text, p_tipo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_n int := 0; v_tot int; v_lib int; v_desc uuid; v_qtd int;
  v_user text := public.soroteca__responsavel(); v_resp text := v_user; v_mot text := nullif(left(trim(coalesce(p_motivo, '')), 120), '');
  v_obs text := nullif(left(trim(coalesce(p_observacao, '')), 500), ''); v_end text;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para descartar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_tipo, '') NOT IN ('lote', 'manual') THEN RAISE EXCEPTION 'Tipo de descarte inválido'; END IF;
  IF coalesce(cardinality(p_ids), 0) = 0 THEN RAISE EXCEPTION 'Nenhuma amostra selecionada'; END IF;
  IF cardinality(p_ids) > 5000 THEN RAISE EXCEPTION 'No máximo 5.000 amostras por descarte'; END IF;
  IF v_mot IS NULL THEN RAISE EXCEPTION 'Informe o motivo do descarte'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_ids) i WHERE NOT EXISTS (SELECT 1 FROM public.soroteca_amostra s WHERE s.id = i AND s.company_id = v_company)) THEN
    RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.soroteca_amostra WHERE id = ANY(p_ids) AND company_id = v_company AND status <> 'descartada' FOR UPDATE;
  SELECT count(*) INTO v_qtd FROM public.soroteca_amostra WHERE id = ANY(p_ids) AND company_id = v_company AND status <> 'descartada';
  IF v_qtd = 0 THEN RETURN jsonb_build_object('tubos', 0, 'descarte_id', NULL); END IF;
  INSERT INTO public.soroteca_descarte (company_id, tipo, motivo, observacao, responsavel_nome, usuario_id, usuario_nome, tubos)
  VALUES (v_company, p_tipo, v_mot, v_obs, v_resp, auth.uid(), v_user, v_qtd) RETURNING id INTO v_desc;

  FOR a IN SELECT s.*, e.nome AS eq_nome, sp.nome AS prat_nome, g.nome AS loc_nome, gp.nome AS loc_prat_nome
           FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
           LEFT JOIN public.soroteca_prateleira sp ON sp.id = s.prateleira_id
           LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
           LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
           WHERE s.id = ANY(p_ids) AND s.company_id = v_company AND s.status <> 'descartada' ORDER BY s.codigo_amostra LOOP
    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
    v_end := nullif(concat_ws(' > ', a.loc_nome, nullif(a.loc_prat_nome, ''), a.eq_nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna)), '');
    UPDATE public.soroteca_amostra SET status = 'descartada', descartada_em = now(), equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL,
      finalizada = false, updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
    INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
      motivo, observacao, status_resultado, responsavel_nome, usuario_id, usuario_nome)
    VALUES (v_company, a.id, 'descarte', a.eq_nome, a.prat_nome, a.linha, a.coluna, v_end,
      v_mot, v_obs, public.soroteca__status(v_tot, v_lib), v_resp, auth.uid(), v_user);
    v_n := v_n + 1;
    INSERT INTO public.soroteca_descarte_item (descarte_id, company_id, amostra_id, ordem, posicao, endereco, codigo_amostra, patient_name, bancada_nome,
      coletada_em, validade, pendente, no_prazo)
    VALUES (v_desc, v_company, a.id, v_n, public.soroteca__posicao(a.linha, a.coluna), v_end, a.codigo_amostra, a.patient_name, a.bancada_nome,
      a.coletada_em, a.validade, coalesce(v_tot, 0) > coalesce(v_lib, 0), a.validade IS NULL OR a.validade >= now());
  END LOOP;
  RETURN jsonb_build_object('tubos', v_n, 'descarte_id', v_desc);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_descartar_amostras(uuid[], text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_descartar_amostras(uuid[], text, text, text, text) TO authenticated;

-- (8) Descarte da estante inteira: responsável = usuário da sessão (p_responsavel é ignorado)
CREATE OR REPLACE FUNCTION public.soroteca_estante_descartar(p_id uuid, p_motivo text, p_responsavel text, p_observacao text,
  p_destino text, p_forcar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record; a record; v_tot int; v_lib int; v_n int := 0;
  v_tubos int; v_risco int; v_origem text; v_mot_tubo text; v_obs_tubo text; v_ids uuid[] := '{}'; v_desc uuid; v_end text;
  v_user text := public.soroteca__responsavel(); v_resp text := v_user; v_mot text := trim(coalesce(p_motivo, ''));
  v_obs text := nullif(left(trim(coalesce(p_observacao, '')), 500), '');
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para descartar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_destino, '') NOT IN ('reaproveitar', 'inativar') THEN
    RAISE EXCEPTION 'Escolha o que fazer com a estante: reaproveitar ou inativar';
  END IF;
  IF v_mot NOT IN ('Prazo de retenção vencido', 'Estante danificada', 'Outro') THEN RAISE EXCEPTION 'Motivo do descarte inválido'; END IF;
  IF v_mot = 'Outro' AND v_obs IS NULL THEN RAISE EXCEPTION 'Descreva o motivo do descarte'; END IF;

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

  IF v_tubos > 0 THEN
    INSERT INTO public.soroteca_descarte (company_id, tipo, estante_id, estante_codigo, estante_origem, motivo, observacao, responsavel_nome, usuario_id, usuario_nome, tubos)
    VALUES (v_company, 'estante', e.id, e.codigo, v_origem, v_mot, v_obs, v_resp, auth.uid(), v_user, v_tubos) RETURNING id INTO v_desc;
  END IF;
  v_mot_tubo := CASE WHEN v_mot = 'Outro' THEN v_obs ELSE v_mot END;
  v_obs_tubo := concat_ws(' · ', 'Descarte da estante ' || e.codigo, CASE WHEN v_mot <> 'Outro' THEN v_obs END);
  FOR a IN SELECT x.*, sp.nome AS prat_nome FROM public.soroteca_amostra x LEFT JOIN public.soroteca_prateleira sp ON sp.id = x.prateleira_id
           WHERE x.equipamento_id = e.id AND x.status = 'armazenada' ORDER BY x.linha, x.coluna LOOP
    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
    v_end := concat_ws(' > ', e.g_nome, nullif(e.gp_nome, ''), e.nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna));
    UPDATE public.soroteca_amostra SET status = 'descartada', descartada_em = now(), equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL,
      finalizada = false, updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
    INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
      motivo, observacao, status_resultado, responsavel_nome, usuario_id, usuario_nome)
    VALUES (v_company, a.id, 'descarte', e.nome, a.prat_nome, a.linha, a.coluna, v_end,
      left(v_mot_tubo, 120), left(v_obs_tubo, 500), public.soroteca__status(v_tot, v_lib), v_resp, auth.uid(), v_user);
    v_ids := v_ids || a.id;
    v_n := v_n + 1;
    INSERT INTO public.soroteca_descarte_item (descarte_id, company_id, amostra_id, ordem, posicao, endereco, codigo_amostra, patient_name, bancada_nome,
      coletada_em, validade, pendente, no_prazo)
    VALUES (v_desc, v_company, a.id, v_n, public.soroteca__posicao(a.linha, a.coluna), v_end, a.codigo_amostra, a.patient_name, a.bancada_nome,
      a.coletada_em, a.validade, coalesce(v_tot, 0) > coalesce(v_lib, 0), a.validade IS NULL OR a.validade >= now());
  END LOOP;

  UPDATE public.soroteca_equipamento SET situacao = 'em_preenchimento', local_equipamento_id = NULL, local_prateleira_id = NULL, local_em = NULL,
    ativo = (p_destino = 'reaproveitar'), updated_at = now()
  WHERE id = e.id;
  INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, equipamento_nome, prateleira_nome, tubos,
    motivo, observacao, responsavel_nome, destino, descarte_id, usuario_id, usuario_nome)
  VALUES (v_company, e.id, CASE WHEN v_n > 0 THEN 'descartada' ELSE 'inativada' END, e.nome, e.g_nome, e.gp_nome, v_n,
    v_mot, v_obs, v_resp, p_destino, v_desc, auth.uid(), v_user);
  RETURN jsonb_build_object('tubos', v_n, 'codigo', e.codigo, 'origem', v_origem, 'destino', p_destino, 'ids', to_jsonb(v_ids), 'descarte_id', v_desc);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_descartar(uuid, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_descartar(uuid, text, text, text, text, boolean) TO authenticated;

-- (9) Config: "Responsável pelo descarte padrão" deixa de existir (o responsável é sempre o usuário logado)
COMMENT ON COLUMN public.soroteca_config.responsavel_descarte IS 'DEPRECATED: o responsável pelo descarte é sempre o usuário da sessão';
CREATE OR REPLACE FUNCTION public.soroteca_config_salvar(p_aviso_dias int, p_responsavel text, p_retencao jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); k text; v jsonb; v_ret jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.configurar') THEN
    RAISE EXCEPTION 'Sem permissão para configurar a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF p_aviso_dias IS NULL OR p_aviso_dias < 1 OR p_aviso_dias > 90 THEN RAISE EXCEPTION 'Aviso de vencimento deve ficar entre 1 e 90 dias'; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(coalesce(p_retencao, '{}'::jsonb)) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.lab_workbenches WHERE id::text = k AND company_id = v_company) THEN
      RAISE EXCEPTION 'Bancada não encontrada';
    END IF;
    IF jsonb_typeof(v) <> 'number' OR (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric) OR (v #>> '{}')::int < 1 OR (v #>> '{}')::int > 3650 THEN
      RAISE EXCEPTION 'Prazo de retenção deve ser um número inteiro entre 1 e 3650 dias';
    END IF;
    v_ret := v_ret || jsonb_build_object(k, (v #>> '{}')::int);
  END LOOP;
  INSERT INTO public.soroteca_config (company_id, aviso_dias, retencao_bancadas, updated_at, updated_by)
  VALUES (v_company, p_aviso_dias, v_ret, now(), auth.uid())
  ON CONFLICT (company_id) DO UPDATE SET aviso_dias = EXCLUDED.aviso_dias,
    retencao_bancadas = EXCLUDED.retencao_bancadas, updated_at = now(), updated_by = auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_config_salvar(int, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_config_salvar(int, text, jsonb) TO authenticated;

-- (10) Impressões de etiqueta e folha: quem imprimiu é sempre o usuário da sessão
CREATE TABLE public.soroteca_impressao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  tipo text NOT NULL CHECK (tipo IN ('etiqueta', 'folha_descarte')),
  equipamento_id uuid REFERENCES public.soroteca_equipamento(id),
  descarte_id uuid REFERENCES public.soroteca_descarte(id),
  alvo_codigo text,
  reimpressao boolean NOT NULL DEFAULT false,
  usuario_id uuid,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((tipo = 'etiqueta') = (equipamento_id IS NOT NULL) AND (tipo = 'folha_descarte') = (descarte_id IS NOT NULL))
);
CREATE INDEX soroteca_impressao_empresa_idx ON public.soroteca_impressao (company_id, created_at DESC);
GRANT SELECT ON public.soroteca_impressao TO authenticated;
GRANT ALL ON public.soroteca_impressao TO service_role;
ALTER TABLE public.soroteca_impressao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê impressões da empresa" ON public.soroteca_impressao FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));
CREATE TRIGGER trg_soroteca_impressao_imutavel BEFORE UPDATE OR DELETE ON public.soroteca_impressao
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_movimento_imutavel();

CREATE OR REPLACE FUNCTION public.soroteca_impressao_registrar(p_tipo text, p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_cod text; v_re boolean;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF p_tipo = 'etiqueta' THEN
    SELECT coalesce(codigo, nome) INTO v_cod FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company;
    IF v_cod IS NULL THEN RAISE EXCEPTION 'Equipamento não encontrado' USING ERRCODE = 'P0002'; END IF;
    v_re := EXISTS (SELECT 1 FROM public.soroteca_impressao WHERE equipamento_id = p_id AND tipo = 'etiqueta');
    INSERT INTO public.soroteca_impressao (company_id, tipo, equipamento_id, alvo_codigo, reimpressao, usuario_id, usuario_nome)
    VALUES (v_company, 'etiqueta', p_id, v_cod, v_re, auth.uid(), public.soroteca__responsavel());
  ELSIF p_tipo = 'folha_descarte' THEN
    SELECT coalesce(estante_codigo, tipo) INTO v_cod FROM public.soroteca_descarte WHERE id = p_id AND company_id = v_company;
    IF v_cod IS NULL THEN RAISE EXCEPTION 'Folha de descarte não encontrada' USING ERRCODE = 'P0002'; END IF;
    v_re := EXISTS (SELECT 1 FROM public.soroteca_impressao WHERE descarte_id = p_id AND tipo = 'folha_descarte');
    INSERT INTO public.soroteca_impressao (company_id, tipo, descarte_id, alvo_codigo, reimpressao, usuario_id, usuario_nome)
    VALUES (v_company, 'folha_descarte', p_id, v_cod, v_re, auth.uid(), public.soroteca__responsavel());
  ELSE
    RAISE EXCEPTION 'Tipo de impressão inválido';
  END IF;
  RETURN jsonb_build_object('reimpressao', v_re);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_impressao_registrar(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_impressao_registrar(text, uuid) TO authenticated;

-- (11) Lista de amostras: informa se o tubo já foi finalizado; remoção também guarda o último endereço
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
        FROM public.soroteca_movimento m WHERE m.amostra_id = a.id AND m.tipo IN ('retirada', 'descarte', 'remocao')
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
      'descartada_em', descartada_em, 'total', total, 'liberados', liberados, 'status_resultado', status_resultado, 'ultimo_endereco', ultimo_endereco, 'finalizada', finalizada)
      ORDER BY coalesce(validade, armazenada_em) NULLS LAST, codigo_amostra), '[]'::jsonb)
  INTO v_n, v_lista FROM filtrada;
  IF v_n > v_teto THEN v_lista := v_lista - v_teto; END IF;
  RETURN jsonb_build_object('amostras', v_lista, 'limitado', v_n > v_teto);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) TO authenticated;