DO $$
DECLARE def text; novo_def text; r record; n int := 0;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND proname = 'apoio_laudo_ajustar' LOOP
    def := pg_get_functiondef(r.oid);
    novo_def := regexp_replace(def,
      '(EXCEPTION WHEN OTHERS THEN\s+RAISE EXCEPTION ''\[AJUSTE\] Falha ao gravar o material)',
      'UPDATE exam_laudos l SET selected_materials = (
          SELECT coalesce(jsonb_agg(DISTINCT v), ''[]''::jsonb) FROM (
            SELECT jsonb_array_elements_text(coalesce(l.selected_materials, ''[]''::jsonb)) v
            UNION SELECT jsonb_array_elements_text(novo)) s)
        WHERE l.exam_id = d.exame_id AND (l.id = lid OR l.sort_order = (SELECT min(sort_order) FROM exam_laudos WHERE exam_id = d.exame_id));
    \1');
    IF novo_def <> def THEN EXECUTE novo_def; n := n + 1; END IF;
  END LOOP;
  IF n = 0 THEN RAISE EXCEPTION 'trecho não encontrado'; END IF;
END $$;

UPDATE exam_laudos l SET selected_materials = (
  SELECT coalesce(jsonb_agg(DISTINCT v), '[]'::jsonb) FROM (
    SELECT jsonb_array_elements_text(coalesce(l.selected_materials,'[]'::jsonb)) v
    UNION SELECT jsonb_array_elements_text(e.selected_materials)) s)
FROM exams e
WHERE e.id = l.exam_id AND e.selected_materials::text ILIKE '%DIVERSOS%';