DROP FUNCTION IF EXISTS public.apoio_analise_concluir(uuid, jsonb, text, text);
CREATE FUNCTION public.apoio_analise_concluir(_pe uuid, _valores jsonb DEFAULT NULL::jsonb, _nota text DEFAULT NULL::text, _executor text DEFAULT NULL::text, _metodo text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r apoio_pedido_exame%ROWTYPE; v apoio_resultado_versao%ROWTYPE; dp apoio_depara_exame%ROWTYPE; manual boolean; n int;
BEGIN
  r := apoio_analise__pe(_pe);
  SELECT coalesce(modo_contingencia,false) INTO manual FROM apoio_laboratorio WHERE id = r.apoio_id;
  SELECT * INTO dp FROM apoio_depara_exame WHERE company_id = r.company_id AND exame_id = r.exame_id AND apoio_id = r.apoio_id ORDER BY ativo DESC, updated_at DESC LIMIT 1;
  IF coalesce(dp.exige_pdf,false) AND NOT EXISTS (SELECT 1 FROM apoio_documento WHERE pedido_exame_id = r.id AND tipo IN ('laudo_pdf','anexo_manual')) THEN
    RAISE EXCEPTION 'Este exame exige o PDF do laudo do apoio. Anexe o PDF para concluir';
  END IF;
  IF EXISTS (SELECT 1 FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND situacao = 'divergente') THEN
    RAISE EXCEPTION 'Resultado divergente entre o digitado e a integração: escolha uma versão antes de concluir';
  END IF;
  SELECT * INTO v FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND situacao NOT IN ('substituido','descartado') ORDER BY created_at DESC LIMIT 1;

  IF v.id IS NULL OR v.origem = 'manual' THEN
    IF r.status IN ('importado','importado_com_pendencia','liberado_local') AND v.id IS NOT NULL THEN RETURN jsonb_build_object('ok', true); END IF;
    IF NOT manual THEN RAISE EXCEPTION 'Aguardando resultado do apoio. A digitação só é liberada com o apoio em modo manual'; END IF;
    IF NOT apoio_tem_permissao('apoio.manual.operar') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.manual.operar"'; END IF;
    INSERT INTO apoio_resultado_versao (company_id, pedido_exame_id, cod_ped_apoio, cod_exm_apoio, codigo_formato, origem, conteudo, hash, situacao, digitado_por, executor_informado)
    VALUES (r.company_id, r.id, r.cod_ped_apoio, r.codigo_apoio, dp.codigo_formato, 'manual',
      jsonb_strip_nulls(jsonb_build_object('valores', coalesce(_valores,'{}'::jsonb), 'nota', _nota, 'metodo', nullif(trim(coalesce(_metodo,'')),''))),
      md5(r.id::text || clock_timestamp()::text || coalesce(_valores::text,'')), 'importado', auth.uid(), nullif(trim(coalesce(_executor,'')),''));
    PERFORM apoio_analise__status(r, 'importado', 'manual', 'Resultado digitado manualmente');
    RETURN jsonb_build_object('ok', true, 'manual', true);
  END IF;

  IF coalesce(dp.modelo_mudou,false) THEN RAISE EXCEPTION 'O modelo do apoio mudou. Revise o De/Para deste exame'; END IF;
  SELECT count(*) INTO n FROM jsonb_array_elements(coalesce(v.conteudo->'analitos','[]'::jsonb)) x
   WHERE NOT EXISTS (SELECT 1 FROM apoio_depara_analito a WHERE a.depara_exame_id = dp.id AND a.chave_analito = x->>'chave' AND (a.ignorar OR a.parametro_id IS NOT NULL));
  IF n > 0 THEN RAISE EXCEPTION 'Faltam % parâmetros sem mapeamento no De/Para', n; END IF;
  IF coalesce(v.retificacao,'') NOT IN ('','N','0') AND v.ciente_em IS NULL THEN RAISE EXCEPTION 'Confirme a retificação do apoio antes de concluir'; END IF;
  IF _executor IS NOT NULL THEN UPDATE apoio_resultado_versao SET executor_informado = nullif(trim(_executor),'') WHERE id = v.id; END IF;
  IF r.status NOT IN ('liberado_apoio','importado','importado_com_pendencia') THEN RAISE EXCEPTION 'O exame ainda não foi liberado pelo apoio'; END IF;
  IF r.status = 'liberado_apoio' THEN PERFORM apoio_analise__status(r, 'importado', 'sistema', 'Concluído na Análise'); END IF;
  RETURN jsonb_build_object('ok', true);
END $function$;
GRANT EXECUTE ON FUNCTION public.apoio_analise_concluir(uuid, jsonb, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apoio_metodos_laudo(_pedidos uuid[])
 RETURNS TABLE(pedido_id uuid, exame_id uuid, metodo text, codigo_formato text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT pe.pedido_id, pe.exame_id, nullif(trim(v.conteudo->>'metodo'),''), v.codigo_formato
  FROM apoio_pedido_exame pe
  JOIN LATERAL (SELECT x.conteudo, x.codigo_formato FROM apoio_resultado_versao x
                WHERE x.pedido_exame_id = pe.id AND x.situacao NOT IN ('substituido','descartado','divergente')
                ORDER BY x.created_at DESC LIMIT 1) v ON true
  WHERE pe.company_id = get_user_company_id(auth.uid()) AND pe.pedido_id = ANY(_pedidos) AND pe.status <> 'cancelado'
$$;
GRANT EXECUTE ON FUNCTION public.apoio_metodos_laudo(uuid[]) TO authenticated;