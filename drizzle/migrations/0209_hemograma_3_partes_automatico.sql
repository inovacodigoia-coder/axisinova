CREATE OR REPLACE FUNCTION public.hemo3p__num(t text) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN t IS NULL OR btrim(t) = '' THEN NULL
    WHEN position(',' in t) > 0 THEN NULLIF(regexp_replace(replace(replace(btrim(t), '.', ''), ',', '.'), '[^0-9.\-]', '', 'g'), '')::numeric
    WHEN btrim(t) ~ '^\d{1,3}(\.\d{3})+$' THEN replace(btrim(t), '.', '')::numeric
    WHEN btrim(t) ~ '^-?\d+(\.\d+)?$' THEN btrim(t)::numeric
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.hemo3p__maior_resto(v numeric[], p_alvo int) RETURNS int[]
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE base int[] := '{}'; ordem int[]; falta int; k int; i int; mx int;
BEGIN
  FOR i IN 1..array_length(v,1) LOOP base := base || floor(greatest(0, v[i]))::int; END LOOP;
  falta := p_alvo - (SELECT sum(x) FROM unnest(base) x);
  SELECT array_agg(idx ORDER BY (greatest(0, v[idx]) - floor(greatest(0, v[idx]))) DESC, v[idx] DESC)
    INTO ordem FROM generate_subscripts(v, 1) idx;
  k := 1;
  WHILE falta > 0 LOOP
    base[ordem[k]] := base[ordem[k]] + 1; falta := falta - 1;
    k := k % array_length(ordem,1) + 1;
  END LOOP;
  WHILE falta < 0 LOOP
    mx := (SELECT max(x) FROM unnest(base) x);
    FOR i IN 1..array_length(base,1) LOOP IF base[i] = mx THEN base[i] := base[i] - 1; EXIT; END IF; END LOOP;
    falta := falta + 1;
  END LOOP;
  RETURN base;
END $$;

CREATE OR REPLACE FUNCTION public.hemo3p_estimar(p_result_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; cfg record; params jsonb;
  leuco numeric; linf numeric; mid numeric; gran numeric;
  k_linf text; k_seg text; k_mono text; k_eos text; k_baso text;
  a_linf text; a_seg text; a_mono text; a_eos text; a_baso text;
  res int[]; l int; s int; m int; i int;
  vals jsonb; key text; absk text; alvo text; txt text; pct int; nome text; pk record;
BEGIN
  SELECT * INTO r FROM lab_exam_results WHERE id = p_result_id;
  IF NOT FOUND THEN RETURN 'sem_resultado'; END IF;
  IF r.status = 'released' THEN RETURN 'liberado'; END IF;
  SELECT hemo3p_estimativa_ativa ativa, hemo3p_limite_leucocitos lim_l, hemo3p_limite_mid lim_m
    INTO cfg FROM lab_settings WHERE company_id = r.company_id;
  IF NOT coalesce(cfg.ativa, false) THEN RETURN 'desligado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM lab_result_values v JOIN lab_equipments e
      ON e.company_id = r.company_id AND e.serial_number = v.instrument_code AND e.is_active AND e.differential_type LIKE '3%'
     WHERE v.result_id = r.id AND v.source = 'instrument') THEN RETURN 'nao_3_partes'; END IF;

  SELECT CASE WHEN jsonb_array_length(coalesce(el.parameters::jsonb,'[]')) > 0 THEN el.parameters::jsonb END INTO params
    FROM exam_laudos el WHERE el.id = r.laudo_id;
  IF params IS NULL THEN
    SELECT ex.parameters::jsonb INTO params FROM exams ex
     WHERE ex.company_id = r.company_id AND ex.id::text = coalesce(r.exam_catalog_id::text, split_part(r.exam_ref, ':', 2));
  END IF;
  IF params IS NULL THEN RETURN 'sem_parametros'; END IF;

  FOR pk IN SELECT p->>'id' id, lower(translate(p->>'name','áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ','aaaaeeiooouc')) n FROM jsonb_array_elements(params) p LOOP
    IF pk.n ~ 'absolut' THEN
      IF pk.n ~ 'linfo' THEN a_linf := pk.id; ELSIF pk.n ~ 'segment' THEN a_seg := pk.id;
      ELSIF pk.n ~ 'monoc' THEN a_mono := pk.id; ELSIF pk.n ~ 'eosino' THEN a_eos := pk.id; ELSIF pk.n ~ 'basof' THEN a_baso := pk.id; END IF;
    ELSIF pk.n ~ 'baston|bastao' THEN NULL;
    ELSIF pk.n ~ 'linfo' THEN k_linf := pk.id; ELSIF pk.n ~ 'segment' THEN k_seg := pk.id;
    ELSIF pk.n ~ 'monoc' THEN k_mono := pk.id; ELSIF pk.n ~ 'eosino' THEN k_eos := pk.id; ELSIF pk.n ~ 'basof' THEN k_baso := pk.id; END IF;
  END LOOP;
  IF k_linf IS NULL OR k_seg IS NULL OR k_mono IS NULL OR k_eos IS NULL THEN RETURN 'sem_parametros'; END IF;

  IF EXISTS (SELECT 1 FROM lab_result_values v JOIN jsonb_array_elements(params) p ON p->>'id' = v.parameter_key
     WHERE v.result_id = r.id AND v.source = 'manual' AND coalesce(btrim(v.value),'') <> ''
       AND lower(translate(p->>'name','áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ','aaaaeeiooouc')) ~ 'baston|bastao|segment|neutro|linfo|monoc|eosino|basof'
       AND lower(p->>'name') !~ 'absolut') THEN RETURN 'lamina'; END IF;

  SELECT hemo3p__num(coalesce(v.instrument_value, v.value)) INTO leuco FROM lab_result_values v
   WHERE v.result_id = r.id AND v.source = 'instrument' AND v.parameter_name ~* 'leuc[oó]cit' LIMIT 1;
  SELECT hemo3p__num(v.instrument_value) INTO linf FROM lab_result_values v
   WHERE v.result_id = r.id AND v.parameter_key = k_linf AND v.source IN ('instrument','estimado_3_partes');
  SELECT hemo3p__num(coalesce(v.instrument_value, v.value)) INTO mid FROM lab_result_values v
   WHERE v.result_id = r.id AND v.source = 'instrument' AND v.parameter_name ~* '\mMID\M' AND v.parameter_name !~* 'absolut' LIMIT 1;
  SELECT hemo3p__num(coalesce(v.instrument_value, v.value)) INTO gran FROM lab_result_values v
   WHERE v.result_id = r.id AND v.source = 'instrument' AND v.parameter_name ~* 'granul' AND v.parameter_name !~* 'absolut' LIMIT 1;
  IF leuco IS NULL OR linf IS NULL OR mid IS NULL OR gran IS NULL THEN RETURN 'faltam_valores'; END IF;
  IF leuco < 1000 THEN leuco := leuco * 1000; END IF;
  IF leuco >= cfg.lim_l THEN RETURN 'leucocitos_acima'; END IF;
  IF mid >= cfg.lim_m THEN RETURN 'mid_alto'; END IF;

  IF round(mid) <= 1 THEN
    res := hemo3p__maior_resto(ARRAY[linf, gran], 100); l := res[1]; s := res[2];
    IF l >= s THEN l := l - 1; ELSE s := s - 1; END IF; m := 0;
  ELSE
    res := hemo3p__maior_resto(ARRAY[linf, gran, mid - 1], 99); l := res[1]; s := res[2]; m := res[3];
  END IF;

  vals := jsonb_build_object(k_linf, l, k_seg, s, k_mono, m, k_eos, 1);
  IF k_baso IS NOT NULL THEN vals := vals || jsonb_build_object(k_baso, 0); END IF;
  FOR key, pct IN SELECT j.key, j.value::int FROM jsonb_each(vals) j LOOP
    absk := CASE key WHEN k_linf THEN a_linf WHEN k_seg THEN a_seg WHEN k_mono THEN a_mono WHEN k_eos THEN a_eos WHEN k_baso THEN a_baso END;
    FOR i IN 0..1 LOOP
      CONTINUE WHEN i = 1 AND absk IS NULL;
      alvo := CASE i WHEN 0 THEN key ELSE absk END;
      txt := CASE i WHEN 0 THEN pct::text ELSE round(pct * leuco / 100)::text END;
      SELECT p->>'name' INTO nome FROM jsonb_array_elements(params) p WHERE p->>'id' = alvo;
      UPDATE lab_result_values SET value = txt, source = 'estimado_3_partes', updated_at = now()
       WHERE result_id = r.id AND parameter_key = alvo;
      IF NOT FOUND THEN
        INSERT INTO lab_result_values (company_id, result_id, parameter_key, parameter_name, value, source)
        VALUES (r.company_id, r.id, alvo, nome, txt, 'estimado_3_partes');
      END IF;
    END LOOP;
  END LOOP;
  RETURN 'aplicado';
END $$;

CREATE OR REPLACE FUNCTION public.hemo3p_valor_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parameter_name ~* 'leuc[oó]cit|linf|\mMID\M|granul' AND EXISTS (
     SELECT 1 FROM lab_settings s WHERE s.company_id = NEW.company_id AND s.hemo3p_estimativa_ativa) THEN
    BEGIN
      PERFORM hemo3p_estimar(NEW.result_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'hemo3p_estimar falhou para %: %', NEW.result_id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS hemo3p_valor ON public.lab_result_values;
CREATE TRIGGER hemo3p_valor AFTER INSERT OR UPDATE OF value, instrument_value, source ON public.lab_result_values
  FOR EACH ROW WHEN (NEW.source = 'instrument') EXECUTE FUNCTION public.hemo3p_valor_trg();

REVOKE EXECUTE ON FUNCTION public.hemo3p__num(text), public.hemo3p__maior_resto(numeric[], int),
  public.hemo3p_estimar(uuid), public.hemo3p_valor_trg() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hemo3p_estimar(uuid) TO service_role;