CREATE OR REPLACE FUNCTION public.bancada_prontidao(_exam uuid, _bancada uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      tot := coalesce(jsonb_array_length(d.modelo), 0);
      SELECT count(*) INTO map FROM apoio_depara_analito a WHERE a.depara_exame_id = d.id AND a.codigo_formato = coalesce(d.codigo_formato,'') AND (a.parametro_id IS NOT NULL OR a.ignorar);
      IF tot = 0 THEN bl := array_append(bl, format('O modelo do apoio %s ainda não foi carregado no De/Para de analitos', nome));
      ELSIF map < tot THEN bl := array_append(bl, format('Faltam %s analito(s) para mapear no De/Para com o apoio %s', tot - map, nome)); END IF;
      IF d.modelo_mudou THEN bl := array_append(bl, 'O modelo do apoio mudou e o De/Para de analitos precisa ser revisado'::text); END IF;
      IF NOT EXISTS (SELECT 1 FROM apoio_preco x WHERE x.apoio_id = b.apoio_id AND x.codigo = d.codigo_apoio AND x.vigencia_inicio <= hoje AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= hoje)) THEN
        av := array_append(av, format('Sem preço vigente no apoio %s para este exame', nome));
      END IF;
    END IF;
  ELSE
    av := array_append(av, 'Confirme que o exame está mapeado no ServidorAisaxius/equipamento'::text);
  END IF;
  RETURN jsonb_build_object('bloqueios', to_jsonb(bl), 'avisos', to_jsonb(av), 'tipo', b.tipo, 'apoio_nome', nome, 'bancada_nome', b.name);
END $$;