CREATE OR REPLACE FUNCTION public.catalogo_referencia_completa_aplicar()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _src uuid := '7858af33-878e-40c4-9305-e912cc6655c3';
  _cid uuid := public.get_user_company_id(auth.uid());
  _n integer := 0;
  r record;
  _new jsonb;
BEGIN
  IF auth.uid() IS NULL OR _cid IS NULL OR NOT public.is_company_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _cid = _src THEN RETURN 0; END IF;
  FOR r IN
    SELECT t.id, t.parameters tp, s.parameters sp
    FROM exams t JOIN exams s ON s.company_id = _src
      AND upper(trim(coalesce(s.internal_code,''))) = upper(trim(coalesce(t.internal_code,'')))
      AND coalesce(s.internal_code,'') <> ''
    WHERE t.company_id = _cid AND jsonb_typeof(t.parameters)='array' AND jsonb_typeof(s.parameters)='array'
      AND s.parameters::text LIKE '%completa%'
  LOOP
    SELECT jsonb_agg(CASE WHEN sp.v IS NOT NULL
      THEN tp.v || jsonb_build_object('referenceMode','completa','referenceFullText',sp.v->'referenceFullText')
      ELSE tp.v END ORDER BY tp.o)
    INTO _new
    FROM jsonb_array_elements(r.tp) WITH ORDINALITY tp(v,o)
    LEFT JOIN LATERAL (SELECT x v FROM jsonb_array_elements(r.sp) x
      WHERE lower(trim(x->>'name')) = lower(trim(tp.v->>'name')) AND x->>'referenceMode'='completa' LIMIT 1) sp ON true;
    IF _new IS DISTINCT FROM r.tp THEN
      UPDATE exams SET parameters = _new WHERE id = r.id;
      UPDATE exam_laudos SET parameters = _new WHERE exam_id = r.id AND company_id = _cid AND jsonb_typeof(parameters)='array';
      _n := _n + 1;
    END IF;
  END LOOP;
  RETURN _n;
END $$;
REVOKE EXECUTE ON FUNCTION public.catalogo_referencia_completa_aplicar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalogo_referencia_completa_aplicar() TO authenticated;