CREATE OR REPLACE FUNCTION public.apoio_laudo_ajustar(_depara uuid, _laudo uuid, _modo text, _nome text, _params jsonb, _mapas jsonb, _extras jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb; d apoio_depara_exame%ROWTYPE; lid uuid; antes jsonb; novo jsonb; mat text; met text; uid uuid := auth.uid(); etapa text;
BEGIN
  BEGIN
    r := apoio_laudo_ajustar(_depara, _laudo, _modo, _nome, _params, _mapas);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '[AJUSTE]%' THEN RAISE; END IF;
    RAISE EXCEPTION '[AJUSTE] Falha ao gravar os parâmetros do laudo' USING DETAIL = SQLERRM;
  END;
  lid := (r->>'laudo_id')::uuid;
  SELECT * INTO d FROM apoio_depara_exame WHERE id = _depara;
  IF jsonb_typeof(_extras->'materiais') = 'array' AND jsonb_array_length(_extras->'materiais') > 0 THEN
    etapa := (SELECT string_agg(x, ', ') FROM jsonb_array_elements_text(_extras->'materiais') x);
    BEGIN
      SELECT coalesce(selected_materials, '[]'::jsonb) INTO antes FROM exams WHERE id = d.exame_id AND company_id = d.company_id FOR UPDATE;
      novo := antes;
      FOR mat IN SELECT trim(x) FROM jsonb_array_elements_text(_extras->'materiais') x LOOP
        IF mat <> '' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(novo) y WHERE lower(y) = lower(mat)) THEN
          novo := novo || to_jsonb(mat);
        END IF;
      END LOOP;
      IF novo <> antes THEN
        UPDATE exams SET selected_materials = novo WHERE id = d.exame_id;
        INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
        VALUES (d.company_id, 'exams', d.exame_id::text, 'AJUSTE_LAUDO_MATERIAIS', jsonb_build_object('selected_materials', antes), jsonb_build_object('selected_materials', novo), uid);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '[AJUSTE] Falha ao gravar o material %', etapa USING DETAIL = SQLERRM;
    END;
  END IF;
  met := nullif(trim(coalesce(_extras->>'metodologia', '')), '');
  IF met IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM lab_methods WHERE company_id = d.company_id AND lower(name) = lower(met)) THEN
      RAISE EXCEPTION '[AJUSTE] A metodologia "%" não está cadastrada em Configurações › Metodologias', met;
    END IF;
    BEGIN
      SELECT jsonb_build_object('methodology', methodology) INTO antes FROM exam_laudos WHERE id = lid;
      UPDATE exam_laudos SET methodology = met, updated_at = now() WHERE id = lid;
      INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
      VALUES (d.company_id, 'exam_laudos', lid::text, 'AJUSTE_LAUDO_METODOLOGIA', antes, jsonb_build_object('methodology', met), uid);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '[AJUSTE] Falha ao gravar a metodologia %', met USING DETAIL = SQLERRM;
    END;
  END IF;
  RETURN r;
END $function$;