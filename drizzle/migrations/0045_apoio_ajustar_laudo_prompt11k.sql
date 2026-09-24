ALTER TABLE public.lab_exam_parameters ADD COLUMN IF NOT EXISTS tamanho_maximo integer;
COMMENT ON COLUMN public.lab_exam_parameters.tamanho_maximo IS 'Tamanho máximo do valor (TamanhoMaximo do modelo do apoio); texto > 255 = texto longo';

ALTER TABLE public.apoio_resultado_versao DROP CONSTRAINT apoio_resultado_versao_situacao_check;
ALTER TABLE public.apoio_resultado_versao ADD CONSTRAINT apoio_resultado_versao_situacao_check CHECK (situacao = ANY (ARRAY['importado','pendente_depara','pendente_formato','incompleto','substituido','divergente','confirmado','descartado']));
ALTER TABLE public.apoio_acao_pendente DROP CONSTRAINT apoio_acao_pendente_tipo_check;
ALTER TABLE public.apoio_acao_pendente ADD CONSTRAINT apoio_acao_pendente_tipo_check CHECK (tipo = ANY (ARRAY['cancelar_no_portal','informar_no_portal','revisar_depara','resultado_incompleto','outro']));

-- Permissão de módulo genérica (ex.: lab_registers / edit)
CREATE OR REPLACE FUNCTION public.perm_modulo(_mod text, _acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid() AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->_mod,'[]'::jsonb) ? _acao));
$$;
GRANT EXECUTE ON FUNCTION public.perm_modulo(text, text) TO authenticated;

-- Dados para a prévia do ajuste
CREATE OR REPLACE FUNCTION public.apoio_laudo_ajuste_dados(_depara uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d apoio_depara_exame%ROWTYPE; def uuid; out jsonb;
BEGIN
  SELECT * INTO d FROM apoio_depara_exame WHERE id = _depara AND company_id = get_user_company_id(auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'De/Para não encontrado'; END IF;
  SELECT id INTO def FROM exam_laudos WHERE exam_id = d.exame_id AND coalesce(is_active, true) ORDER BY sort_order, created_at LIMIT 1;
  SELECT jsonb_build_object(
    'pode', apoio_tem_permissao('apoio.depara.gerenciar') AND perm_modulo('lab_registers','edit'),
    'bancada_apoio', (SELECT jsonb_build_object('id', w.id, 'name', w.name) FROM lab_workbenches w
       WHERE w.company_id = d.company_id AND w.tipo = 'apoio' AND w.apoio_id = d.apoio_id AND coalesce(w.is_active, true) ORDER BY w.created_at LIMIT 1),
    'laudos', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'code', l.code, 'name', l.name, 'padrao', l.id = def, 'parameters', coalesce(l.parameters, '[]'::jsonb),
        'bancadas', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'tipo', w.tipo, 'apoio_id', w.apoio_id)), '[]'::jsonb)
           FROM exame_laudo_bancada b JOIN lab_workbenches w ON w.id = b.bancada_id
           WHERE b.exame_id = d.exame_id AND b.ativo AND (b.laudo_id = l.id OR (b.laudo_id IS NULL AND l.id = def))),
        'com_historico', (SELECT coalesce(jsonb_agg(DISTINCT v.parameter_key), '[]'::jsonb)
           FROM lab_result_values v JOIN lab_exam_results r ON r.id = v.result_id
           WHERE r.company_id = d.company_id AND coalesce(v.value, '') <> ''
             AND (r.laudo_id = l.id OR v.laudo_id = l.id OR (l.id = def AND r.laudo_id IS NULL AND r.exam_catalog_id = d.exame_id)))
      ) ORDER BY l.sort_order, l.created_at) FROM exam_laudos l WHERE l.exam_id = d.exame_id AND coalesce(l.is_active, true)), '[]'::jsonb)
  ) INTO out;
  RETURN out;
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_laudo_ajuste_dados(uuid) TO authenticated;

-- Grava o ajuste (uma transação)
-- _modo: usar | novo | copia ; _params: [{acao, id, dbId, antes, obj}] na ordem final ; _mapas: [{codigo_formato, chave, nome_apoio, idx, casas}]
CREATE OR REPLACE FUNCTION public.apoio_laudo_ajustar(_depara uuid, _laudo uuid, _modo text, _nome text, _params jsonb, _mapas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d apoio_depara_exame%ROWTYPE; src exam_laudos%ROWTYPE; lid uuid; bid uuid; nxt int;
  p jsonb; ord bigint; acao text; obj jsonb; pid uuid; txt text; novos jsonb := '[]'::jsonb; pids uuid[] := '{}';
  uid uuid := auth.uid(); n_criar int := 0; n_ajustar int := 0; n_reap int := 0; n_excl int := 0; n_inat int := 0; m jsonb; fmts text[];
  uuid_re text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  SELECT * INTO d FROM apoio_depara_exame WHERE id = _depara AND company_id = get_user_company_id(uid);
  IF NOT FOUND THEN RAISE EXCEPTION 'De/Para não encontrado'; END IF;
  IF NOT apoio_tem_permissao('apoio.depara.gerenciar') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.depara.gerenciar"'; END IF;
  IF NOT perm_modulo('lab_registers','edit') THEN RAISE EXCEPTION 'Você não tem permissão para editar laudos e parâmetros'; END IF;
  IF _modo NOT IN ('usar','novo','copia') THEN RAISE EXCEPTION 'Modo inválido'; END IF;

  SELECT id INTO bid FROM lab_workbenches WHERE company_id = d.company_id AND tipo = 'apoio' AND apoio_id = d.apoio_id AND coalesce(is_active, true) ORDER BY created_at LIMIT 1;

  IF _modo IN ('usar','copia') THEN
    SELECT * INTO src FROM exam_laudos WHERE id = _laudo AND exam_id = d.exame_id AND company_id = d.company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Laudo não encontrado'; END IF;
  END IF;

  IF _modo = 'usar' THEN
    lid := src.id;
  ELSE
    SELECT coalesce(max(nullif(regexp_replace(code, '\D', '', 'g'), '')::int), 0) + 1 INTO nxt FROM exam_laudos WHERE exam_id = d.exame_id;
    INSERT INTO exam_laudos (company_id, exam_id, code, name, sort_order, is_active, methodology, parameters, reference_values, result_deadline_days, workbench_id, selected_materials, default_material)
    VALUES (d.company_id, d.exame_id, 'L' || lpad(nxt::text, 3, '0'), coalesce(nullif(trim(_nome), ''), 'Laudo Pardini'), nxt, true,
      src.methodology, '[]'::jsonb, coalesce(src.reference_values, '[]'::jsonb), src.result_deadline_days, bid, coalesce(src.selected_materials, '[]'::jsonb), src.default_material)
    RETURNING id INTO lid;
    IF bid IS NOT NULL THEN
      INSERT INTO exame_laudo_bancada (company_id, exame_id, bancada_id, laudo_id, ativo) VALUES (d.company_id, d.exame_id, bid, lid, true)
      ON CONFLICT (exame_id, bancada_id) DO UPDATE SET laudo_id = EXCLUDED.laudo_id, ativo = true;
    END IF;
    INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
    VALUES (d.company_id, 'exam_laudos', lid::text, CASE WHEN _modo = 'copia' THEN 'AJUSTE_LAUDO_COPIA' ELSE 'AJUSTE_LAUDO_NOVO' END,
      CASE WHEN _modo = 'copia' THEN jsonb_build_object('copia_de', src.id, 'code', src.code) END, jsonb_build_object('nome', coalesce(nullif(trim(_nome), ''), 'Laudo Pardini'), 'bancada_id', bid), uid);
  END IF;

  FOR p, ord IN SELECT e, o FROM jsonb_array_elements(coalesce(_params, '[]'::jsonb)) WITH ORDINALITY AS t(e, o) LOOP
    acao := p->>'acao'; obj := coalesce(p->'obj', '{}'::jsonb); pid := NULL;
    IF acao = 'excluir' THEN
      pids := pids || NULL::uuid;
      IF _modo = 'usar' THEN
        txt := coalesce(nullif(p->>'dbId', ''), p->>'id');
        IF txt ~ uuid_re THEN
          UPDATE apoio_depara_analito SET parametro_id = NULL WHERE parametro_id = txt::uuid AND company_id = d.company_id;
          DELETE FROM lab_exam_parameters WHERE id = txt::uuid AND company_id = d.company_id;
        END IF;
        n_excl := n_excl + 1;
        INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
        VALUES (d.company_id, 'lab_exam_parameters', coalesce(txt, ''), 'AJUSTE_LAUDO_EXCLUIR', jsonb_build_object('laudo_id', lid) || coalesce(p->'antes', '{}'::jsonb), NULL, uid);
      END IF;
      CONTINUE;
    END IF;

    IF _modo = 'usar' THEN
      txt := coalesce(nullif(p->>'dbId', ''), p->>'id');
      IF txt ~ uuid_re AND EXISTS (SELECT 1 FROM lab_exam_parameters WHERE id = txt::uuid AND company_id = d.company_id) THEN pid := txt::uuid; END IF;
      IF pid IS NULL AND acao <> 'criar' THEN
        SELECT id INTO pid FROM lab_exam_parameters WHERE company_id = d.company_id AND exam_id = d.exame_id AND (laudo_id = lid OR laudo_id IS NULL) AND name = coalesce(p->'antes'->>'name', obj->>'name') ORDER BY (laudo_id = lid) DESC NULLS LAST LIMIT 1;
      END IF;
    END IF;

    IF pid IS NULL THEN
      INSERT INTO lab_exam_parameters (company_id, exam_id, laudo_id, name, section, equipment_code, type, origin, unit, is_required, is_hidden, casas_decimais, tamanho_maximo, sort_order)
      VALUES (d.company_id, d.exame_id, lid, obj->>'name', coalesce(obj->>'section', ''), coalesce(obj->>'equipCode', ''), coalesce(obj->>'type', 'numerical'), coalesce(obj->>'origin', 'apoio'),
        coalesce(obj->>'unit', ''), coalesce((obj->>'isMandatory')::boolean, false), coalesce((obj->>'isHidden')::boolean, false),
        nullif(obj->>'decimals', '')::int, nullif(obj->>'maxLength', '')::int, ord)
      RETURNING id INTO pid;
    ELSE
      UPDATE lab_exam_parameters SET laudo_id = lid, name = obj->>'name', type = coalesce(obj->>'type', type), origin = coalesce(obj->>'origin', origin), unit = coalesce(obj->>'unit', unit),
        is_required = coalesce((obj->>'isMandatory')::boolean, is_required), is_hidden = coalesce((obj->>'isHidden')::boolean, is_hidden),
        casas_decimais = nullif(obj->>'decimals', '')::int, tamanho_maximo = nullif(obj->>'maxLength', '')::int, sort_order = ord, updated_at = now()
      WHERE id = pid;
    END IF;

    -- id da máscara: mantém o id antigo (histórico de resultados) quando reaproveita; novo = id do parâmetro
    IF _modo = 'usar' AND acao <> 'criar' AND coalesce(p->>'id', '') <> '' THEN
      obj := obj || jsonb_build_object('id', p->'id', 'dbId', pid::text);
    ELSE
      obj := obj || jsonb_build_object('id', pid::text, 'dbId', pid::text);
    END IF;
    novos := novos || jsonb_build_array(obj);
    pids := pids || pid;

    IF acao = 'criar' THEN n_criar := n_criar + 1; ELSIF acao = 'ajustar' THEN n_ajustar := n_ajustar + 1; ELSIF acao = 'inativar' THEN n_inat := n_inat + 1; ELSIF acao = 'reaproveitar' THEN n_reap := n_reap + 1; END IF;
    IF acao IN ('criar','ajustar','inativar','reaproveitar') THEN
      INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
      VALUES (d.company_id, 'lab_exam_parameters', pid::text, 'AJUSTE_LAUDO_' || upper(acao), CASE WHEN acao = 'criar' THEN NULL ELSE p->'antes' END, jsonb_build_object('laudo_id', lid) || obj, uid);
    END IF;
  END LOOP;

  UPDATE exam_laudos SET parameters = novos, updated_at = now() WHERE id = lid;

  -- De/Para por formato
  SELECT array_agg(DISTINCT x->>'codigo_formato') INTO fmts FROM jsonb_array_elements(coalesce(_mapas, '[]'::jsonb)) x;
  IF fmts IS NOT NULL THEN
    DELETE FROM apoio_depara_analito WHERE depara_exame_id = d.id AND codigo_formato = ANY(fmts);
    FOR m IN SELECT * FROM jsonb_array_elements(_mapas) LOOP
      pid := pids[(m->>'idx')::int + 1];
      IF pid IS NULL THEN CONTINUE; END IF;
      INSERT INTO apoio_depara_analito (company_id, depara_exame_id, codigo_formato, chave_analito, nome_apoio, parametro_id, ignorar, casas_decimais)
      VALUES (d.company_id, d.id, m->>'codigo_formato', m->>'chave', m->>'nome_apoio', pid, false, nullif(m->>'casas', '')::int)
      ON CONFLICT (depara_exame_id, codigo_formato, chave_analito) DO UPDATE SET parametro_id = EXCLUDED.parametro_id, ignorar = false, nome_apoio = EXCLUDED.nome_apoio, casas_decimais = EXCLUDED.casas_decimais;
    END LOOP;
  END IF;
  UPDATE apoio_depara_exame SET modelo_mudou = false WHERE id = d.id;

  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (d.company_id, 'exam_laudos', lid::text, 'AJUSTE_LAUDO_PARDINI', jsonb_build_object('modo', _modo, 'depara_id', d.id),
    jsonb_build_object('criados', n_criar, 'ajustados', n_ajustar, 'reaproveitados', n_reap, 'excluidos', n_excl, 'inativados', n_inat, 'formatos', to_jsonb(fmts)), uid);

  RETURN jsonb_build_object('laudo_id', lid, 'criados', n_criar, 'ajustados', n_ajustar, 'reaproveitados', n_reap, 'excluidos', n_excl, 'inativados', n_inat);
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_laudo_ajustar(uuid, uuid, text, text, jsonb, jsonb) TO authenticated;

-- Concluir ação: "resultado incompleto" justificado libera a pendência
CREATE OR REPLACE FUNCTION public.apoio_acao_concluir(_id uuid, _observacao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r apoio_acao_pendente%ROWTYPE; pe apoio_pedido_exame%ROWTYPE;
BEGIN
  SELECT * INTO r FROM apoio_acao_pendente WHERE id = _id AND company_id = get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ação não encontrada'; END IF;
  IF r.tipo = 'resultado_incompleto' THEN
    IF NOT (apoio_tem_permissao('apoio.resultado.conferir') OR apoio_tem_permissao('apoio.manual.operar')) THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.resultado.conferir"'; END IF;
  ELSIF NOT apoio_tem_permissao('apoio.manual.operar') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.manual.operar"'; END IF;
  IF r.concluida_em IS NOT NULL THEN RAISE EXCEPTION 'Esta ação já foi concluída'; END IF;
  IF length(trim(coalesce(_observacao,''))) < 3 THEN RAISE EXCEPTION 'Informe a observação (ex.: cancelado no portal às 10h por Fulano)'; END IF;
  UPDATE apoio_acao_pendente SET concluida_em = now(), concluida_por = auth.uid(), observacao = trim(_observacao) WHERE id = _id;
  IF r.tipo = 'resultado_incompleto' AND NOT EXISTS (SELECT 1 FROM apoio_acao_pendente WHERE pedido_exame_id = r.pedido_exame_id AND tipo = 'resultado_incompleto' AND concluida_em IS NULL) THEN
    UPDATE apoio_resultado_versao SET situacao = 'importado' WHERE pedido_exame_id = r.pedido_exame_id AND situacao = 'incompleto';
    SELECT * INTO pe FROM apoio_pedido_exame WHERE id = r.pedido_exame_id;
    IF pe.status = 'importado_com_pendencia' AND NOT EXISTS (SELECT 1 FROM apoio_resultado_versao WHERE pedido_exame_id = pe.id AND situacao IN ('pendente_depara','pendente_formato','divergente')) THEN
      PERFORM apoio_analise__status(pe, 'importado', 'manual', 'Resultado incompleto justificado: ' || trim(_observacao));
    END IF;
  END IF;
END $$;