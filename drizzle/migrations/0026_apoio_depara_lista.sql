CREATE OR REPLACE FUNCTION public.apoio_depara_lista()
RETURNS TABLE(id uuid, exame_id uuid, apoio_id uuid, apoio_nome text, codigo_apoio text, descricao_apoio text, materiais jsonb, catalogo_ativo boolean,
  tem_preco boolean, preco numeric, ficticio boolean, prazo_dias integer, analitos_total integer, analitos_mapeados integer,
  exige_pdf boolean, modelo_mudou boolean, ativo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH hoje AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date d),
  perm AS (SELECT (apoio_tem_permissao('apoio.financeiro.ver') OR apoio_tem_permissao('apoio.catalogo.gerenciar')) v)
  SELECT d.id, d.exame_id, d.apoio_id, l.nome, d.codigo_apoio, c.descricao, c.materiais, coalesce(c.ativo, false),
    p.id IS NOT NULL, CASE WHEN (SELECT v FROM perm) THEN p.preco END, coalesce(p.ficticio, false), p.prazo_dias,
    coalesce(jsonb_array_length(d.modelo), 0),
    (SELECT count(*)::int FROM apoio_depara_analito a WHERE a.depara_exame_id = d.id AND a.codigo_formato = coalesce(d.codigo_formato, '') AND (a.parametro_id IS NOT NULL OR a.ignorar)),
    d.exige_pdf, d.modelo_mudou, d.ativo
  FROM apoio_depara_exame d
  JOIN apoio_laboratorio l ON l.id = d.apoio_id
  LEFT JOIN apoio_catalogo_exame c ON c.apoio_id = d.apoio_id AND c.codigo = d.codigo_apoio
  LEFT JOIN LATERAL (SELECT x.id, x.preco, x.ficticio, x.prazo_dias FROM apoio_preco x, hoje WHERE x.apoio_id = d.apoio_id AND x.codigo = d.codigo_apoio
      AND x.vigencia_inicio <= hoje.d AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje.d) ORDER BY x.vigencia_inicio DESC LIMIT 1) p ON true
  WHERE d.company_id = get_user_company_id(auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.apoio_depara_lista() TO authenticated;