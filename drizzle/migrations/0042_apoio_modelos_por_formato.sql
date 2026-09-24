-- 11I: um exame do Pardini tem vários modelos (formatos) vigentes ao mesmo tempo
ALTER TABLE public.apoio_modelo_resultado DROP CONSTRAINT IF EXISTS apoio_modelo_resultado_apoio_id_cod_exm_apoio_key;
UPDATE public.apoio_modelo_resultado SET codigo_formato = '' WHERE codigo_formato IS NULL;
ALTER TABLE public.apoio_modelo_resultado ALTER COLUMN codigo_formato SET DEFAULT '';
ALTER TABLE public.apoio_modelo_resultado ALTER COLUMN codigo_formato SET NOT NULL;
ALTER TABLE public.apoio_modelo_resultado ADD COLUMN IF NOT EXISTS unidade_produtiva text, ADD COLUMN IF NOT EXISTS metodo text, ADD COLUMN IF NOT EXISTS ultima_liberacao timestamptz;
ALTER TABLE public.apoio_modelo_resultado ADD CONSTRAINT apoio_modelo_resultado_formato_key UNIQUE (apoio_id, cod_exm_apoio, codigo_formato);
UPDATE public.apoio_depara_analito a SET codigo_formato = coalesce(d.codigo_formato, '') FROM public.apoio_depara_exame d WHERE d.id = a.depara_exame_id AND a.codigo_formato IS NULL;

CREATE TABLE public.apoio_modelo_import (
  id bigserial PRIMARY KEY,
  lote uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  dados jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apoio_modelo_import_lote_idx ON public.apoio_modelo_import(lote);
GRANT SELECT, INSERT, DELETE ON public.apoio_modelo_import TO authenticated;
GRANT USAGE ON SEQUENCE public.apoio_modelo_import_id_seq TO authenticated;
GRANT ALL ON public.apoio_modelo_import TO service_role;
ALTER TABLE public.apoio_modelo_import ENABLE ROW LEVEL SECURITY;
CREATE POLICY ami_all ON public.apoio_modelo_import FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND apoio_modulo_liberado(company_id) AND apoio_tem_permissao('apoio.catalogo.gerenciar'));

CREATE OR REPLACE FUNCTION public.apoio_modelos_commit(_lote uuid, _apoio uuid, _esperado int, _origem text DEFAULT 'manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n int; ex int; cid uuid := get_user_company_id(auth.uid());
BEGIN
  IF NOT (apoio_modulo_liberado(cid) AND apoio_tem_permissao('apoio.catalogo.gerenciar')) THEN RAISE EXCEPTION 'Sem permissão para carregar modelos'; END IF;
  SELECT count(*) INTO n FROM apoio_modelo_import WHERE lote = _lote AND apoio_id = _apoio AND company_id = cid;
  IF n <> _esperado THEN
    DELETE FROM apoio_modelo_import WHERE lote = _lote;
    RAISE EXCEPTION 'Contagem não confere: esperado %, recebido %', _esperado, n;
  END IF;
  INSERT INTO apoio_modelo_resultado (company_id, apoio_id, cod_exm_apoio, codigo_formato, material_nome, exame_nome, modelo_json, unidade_produtiva, metodo, ultima_liberacao, origem, atualizado_em)
  SELECT DISTINCT ON (upper(i.dados->>'cod_exm_apoio'), coalesce(i.dados->>'codigo_formato',''))
    cid, _apoio, upper(i.dados->>'cod_exm_apoio'), coalesce(i.dados->>'codigo_formato',''), nullif(i.dados->>'material_nome',''), nullif(i.dados->>'exame_nome',''),
    coalesce(i.dados->'modelo_json','[]'::jsonb), nullif(i.dados->>'unidade_produtiva',''), nullif(i.dados->>'metodo',''), nullif(i.dados->>'ultima_liberacao','')::timestamptz,
    CASE WHEN _origem = 'automatico' THEN 'automatico' ELSE 'manual' END, now()
  FROM apoio_modelo_import i WHERE i.lote = _lote AND i.company_id = cid
  ORDER BY upper(i.dados->>'cod_exm_apoio'), coalesce(i.dados->>'codigo_formato',''), i.id DESC
  ON CONFLICT (apoio_id, cod_exm_apoio, codigo_formato) DO UPDATE SET
    material_nome = EXCLUDED.material_nome, exame_nome = EXCLUDED.exame_nome, modelo_json = EXCLUDED.modelo_json,
    unidade_produtiva = EXCLUDED.unidade_produtiva, metodo = EXCLUDED.metodo, ultima_liberacao = EXCLUDED.ultima_liberacao,
    origem = EXCLUDED.origem, atualizado_em = now();
  SELECT count(DISTINCT upper(dados->>'cod_exm_apoio')) INTO ex FROM apoio_modelo_import WHERE lote = _lote;
  DELETE FROM apoio_modelo_import WHERE lote = _lote;
  RETURN jsonb_build_object('modelos', n, 'exames', ex);
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_modelos_commit(uuid, uuid, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apoio_depara_formatos(_depara uuid)
RETURNS TABLE(codigo_formato text, cod_exm_apoio text, metodo text, unidade_produtiva text, ultima_liberacao timestamptz, total int, mapeados int, recente boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (SELECT * FROM apoio_depara_exame WHERE id = _depara AND company_id = get_user_company_id(auth.uid())),
  f AS (
    SELECT m.codigo_formato, m.cod_exm_apoio, m.metodo, m.unidade_produtiva, m.ultima_liberacao, jsonb_array_length(m.modelo_json) total,
      (SELECT count(*)::int FROM apoio_depara_analito a WHERE a.depara_exame_id = d.id AND a.codigo_formato = m.codigo_formato AND (a.parametro_id IS NOT NULL OR a.ignorar)
         AND a.chave_analito IN (SELECT e->>'chave' FROM jsonb_array_elements(m.modelo_json) e)) mapeados,
      m.ultima_liberacao >= now() - interval '1 year' rec
    FROM d JOIN apoio_modelo_resultado m ON m.apoio_id = d.apoio_id
      AND (m.cod_exm_apoio = upper(d.codigo_apoio) OR m.cod_exm_apoio LIKE upper(d.codigo_apoio) || '|%')
  )
  SELECT f.codigo_formato, f.cod_exm_apoio, f.metodo, f.unidade_produtiva, f.ultima_liberacao, f.total, f.mapeados,
    coalesce(f.rec, false) OR NOT EXISTS (SELECT 1 FROM f f2 WHERE f2.rec)
  FROM f ORDER BY f.ultima_liberacao DESC NULLS LAST, f.codigo_formato
$$;
GRANT EXECUTE ON FUNCTION public.apoio_depara_formatos(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apoio_depara_lista()
 RETURNS TABLE(id uuid, exame_id uuid, apoio_id uuid, apoio_nome text, codigo_apoio text, descricao_apoio text, materiais jsonb, catalogo_ativo boolean, tem_preco boolean, preco numeric, ficticio boolean, prazo_dias integer, analitos_total integer, analitos_mapeados integer, exige_pdf boolean, modelo_mudou boolean, ativo boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH hoje AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date d),
  perm AS (SELECT (apoio_tem_permissao('apoio.financeiro.ver') OR apoio_tem_permissao('apoio.catalogo.gerenciar')) v)
  SELECT d.id, d.exame_id, d.apoio_id, l.nome, d.codigo_apoio, c.descricao, c.materiais, coalesce(c.ativo, false),
    p.id IS NOT NULL, CASE WHEN (SELECT v FROM perm) THEN p.preco END, coalesce(p.ficticio, false), p.prazo_dias,
    coalesce(fm.tot, jsonb_array_length(d.modelo), 0),
    coalesce(fm.map, (SELECT count(*)::int FROM apoio_depara_analito a WHERE a.depara_exame_id = d.id AND a.codigo_formato = coalesce(d.codigo_formato, '') AND (a.parametro_id IS NOT NULL OR a.ignorar))),
    d.exige_pdf, d.modelo_mudou, d.ativo
  FROM apoio_depara_exame d
  JOIN apoio_laboratorio l ON l.id = d.apoio_id
  LEFT JOIN apoio_catalogo_exame c ON c.apoio_id = d.apoio_id AND c.codigo = d.codigo_apoio
  LEFT JOIN LATERAL (SELECT x.id, x.preco, x.ficticio, x.prazo_dias FROM apoio_preco x, hoje WHERE x.apoio_id = d.apoio_id AND x.codigo = d.codigo_apoio
      AND x.vigencia_inicio <= hoje.d AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje.d) ORDER BY x.vigencia_inicio DESC LIMIT 1) p ON true
  LEFT JOIN LATERAL (SELECT count(*)::int tot, count(*) FILTER (WHERE f.mapeados >= f.total)::int map FROM apoio_depara_formatos(d.id) f WHERE f.recente HAVING count(*) > 0) fm ON true
  WHERE d.company_id = get_user_company_id(auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.bancada_prontidao(_exam uuid, _bancada uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b lab_workbenches%ROWTYPE; d apoio_depara_exame%ROWTYPE; bl text[] := '{}'; av text[] := '{}'; tot int; map int; nome text; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT * INTO b FROM lab_workbenches WHERE id = _bancada AND company_id = get_user_company_id(auth.uid());
  IF NOT FOUND THEN RETURN jsonb_build_object('bloqueios', jsonb_build_array('Bancada não encontrada'), 'avisos', '[]'::jsonb); END IF;
  IF NOT coalesce(b.is_active, true) THEN bl := array_append(bl, 'A bancada está inativa'::text); END IF;
  IF NOT bancada_tem_laudo(_exam, _bancada) THEN bl := array_append(bl, format('Nenhum laudo ligado a este exame na bancada "%s" (aba Laudo do Exame › Laudo por bancada)', b.name)); END IF;
  IF b.tipo = 'apoio' THEN
    SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = b.apoio_id;
    SELECT * INTO d FROM apoio_depara_exame WHERE exame_id = _exam AND apoio_id = b.apoio_id AND ativo LIMIT 1;
    IF NOT FOUND THEN
      bl := array_append(bl, format('Este exame não tem De/Para ativo com o apoio %s (Terceirização › Exames terceirizados)', nome));
    ELSE
      IF EXISTS (SELECT 1 FROM apoio_depara_formatos(d.id)) THEN
        SELECT count(*) FILTER (WHERE f.recente AND f.mapeados < f.total) INTO map FROM apoio_depara_formatos(d.id) f;
        IF map > 0 THEN bl := array_append(bl, format('Faltam %s formato(s) do apoio %s para mapear no De/Para de analitos', map, nome)); END IF;
        tot := -1;
      ELSE
        tot := coalesce(jsonb_array_length(d.modelo), 0);
        SELECT count(*) INTO map FROM apoio_depara_analito a WHERE a.depara_exame_id = d.id AND a.codigo_formato = coalesce(d.codigo_formato,'') AND (a.parametro_id IS NOT NULL OR a.ignorar);
      END IF;
      IF tot = -1 THEN NULL;
      ELSIF tot = 0 THEN bl := array_append(bl, format('O modelo do apoio %s ainda não foi carregado no De/Para de analitos', nome));
      ELSIF map < tot THEN bl := array_append(bl, format('Faltam %s analito(s) para mapear no De/Para com o apoio %s', tot - map, nome)); END IF;
      IF d.modelo_mudou AND tot <> -1 THEN bl := array_append(bl, 'O modelo do apoio mudou e o De/Para de analitos precisa ser revisado'::text); END IF;
      IF NOT EXISTS (SELECT 1 FROM apoio_preco x WHERE x.apoio_id = b.apoio_id AND x.codigo = d.codigo_apoio AND x.vigencia_inicio <= hoje AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje)) THEN
        av := array_append(av, format('Sem preço vigente no apoio %s para este exame', nome));
      END IF;
    END IF;
  ELSE
    av := array_append(av, 'Confirme que o exame está mapeado no ServidorAisaxius/equipamento'::text);
  END IF;
  RETURN jsonb_build_object('bloqueios', to_jsonb(bl), 'avisos', to_jsonb(av), 'tipo', b.tipo, 'apoio_nome', nome, 'bancada_nome', b.name);
END $function$;

ALTER TABLE public.apoio_acao_pendente DROP CONSTRAINT apoio_acao_pendente_tipo_check;
ALTER TABLE public.apoio_acao_pendente ADD CONSTRAINT apoio_acao_pendente_tipo_check CHECK (tipo = ANY (ARRAY['cancelar_no_portal','informar_no_portal','revisar_depara','outro']));