CREATE OR REPLACE FUNCTION public.apoio_laudo_ajuste_cadastro(_depara uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d apoio_depara_exame%ROWTYPE; out jsonb;
BEGIN
  SELECT * INTO d FROM apoio_depara_exame WHERE id = _depara AND company_id = get_user_company_id(auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'De/Para não encontrado'; END IF;
  SELECT jsonb_build_object(
    'materiais_exame', coalesce((SELECT selected_materials FROM exams WHERE id = d.exame_id), '[]'::jsonb),
    'catalogo', (SELECT jsonb_build_object('materiais', coalesce(c.materiais,'[]'::jsonb), 'conservantes', coalesce(c.conservantes,'[]'::jsonb), 'info_comp', coalesce(c.info_comp,'[]'::jsonb))
       FROM apoio_catalogo_exame c WHERE c.apoio_id = d.apoio_id AND c.codigo = d.codigo_apoio LIMIT 1),
    'metodos', coalesce((SELECT jsonb_agg(jsonb_build_object('codigo_formato', m.codigo_formato, 'metodo', m.metodo, 'ultima_liberacao', m.ultima_liberacao) ORDER BY m.ultima_liberacao DESC NULLS LAST)
       FROM apoio_modelo_resultado m WHERE m.apoio_id = d.apoio_id AND m.cod_exm_apoio = d.codigo_apoio), '[]'::jsonb),
    'metodologias', coalesce((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'description', l.description) ORDER BY l.name)
       FROM lab_methods l WHERE l.company_id = d.company_id AND l.is_active), '[]'::jsonb),
    'prazo', (SELECT jsonb_build_object('prazo_dias', p.prazo_dias, 'ficticio', p.ficticio) FROM apoio_preco p
       WHERE p.apoio_id = d.apoio_id AND p.codigo = d.codigo_apoio AND p.vigencia_inicio <= current_date AND (p.vigencia_fim IS NULL OR p.vigencia_fim >= current_date)
       ORDER BY p.vigencia_inicio DESC LIMIT 1)
  ) INTO out;
  RETURN out;
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_laudo_ajuste_cadastro(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.apoio_laudo_ajustar(_depara uuid, _laudo uuid, _modo text, _nome text, _params jsonb, _mapas jsonb, _extras jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; d apoio_depara_exame%ROWTYPE; lid uuid; antes jsonb; novo jsonb; mat text; met text; uid uuid := auth.uid();
BEGIN
  r := apoio_laudo_ajustar(_depara, _laudo, _modo, _nome, _params, _mapas);
  lid := (r->>'laudo_id')::uuid;
  SELECT * INTO d FROM apoio_depara_exame WHERE id = _depara;
  IF jsonb_typeof(_extras->'materiais') = 'array' AND jsonb_array_length(_extras->'materiais') > 0 THEN
    SELECT coalesce(selected_materials, '[]'::jsonb) INTO antes FROM exams WHERE id = d.exame_id AND company_id = d.company_id FOR UPDATE;
    novo := antes;
    FOR mat IN SELECT trim(x) FROM jsonb_array_elements_text(_extras->'materiais') x LOOP
      IF mat <> '' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(novo) y WHERE lower(y) = lower(mat)) THEN
        novo := novo || to_jsonb(mat);
      END IF;
    END LOOP;
    IF novo <> antes THEN
      UPDATE exams SET selected_materials = novo, updated_at = now() WHERE id = d.exame_id;
      INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
      VALUES (d.company_id, 'exams', d.exame_id::text, 'AJUSTE_LAUDO_MATERIAIS', jsonb_build_object('selected_materials', antes), jsonb_build_object('selected_materials', novo), uid);
    END IF;
  END IF;
  met := nullif(trim(coalesce(_extras->>'metodologia', '')), '');
  IF met IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM lab_methods WHERE company_id = d.company_id AND lower(name) = lower(met)) THEN
      RAISE EXCEPTION 'Metodologia "%" não está cadastrada em Configurações › Metodologias', met;
    END IF;
    SELECT jsonb_build_object('methodology', methodology) INTO antes FROM exam_laudos WHERE id = lid;
    UPDATE exam_laudos SET methodology = met, updated_at = now() WHERE id = lid;
    INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
    VALUES (d.company_id, 'exam_laudos', lid::text, 'AJUSTE_LAUDO_METODOLOGIA', antes, jsonb_build_object('methodology', met), uid);
  END IF;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_laudo_ajustar(uuid, uuid, text, text, jsonb, jsonb, jsonb) TO authenticated;