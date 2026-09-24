ALTER TABLE public.apoio_preco_importacao ADD COLUMN IF NOT EXISTS removida_em timestamptz, ADD COLUMN IF NOT EXISTS removida_por uuid;

CREATE OR REPLACE FUNCTION public.apoio_remover_tabela_ficticia(_apoio_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid; bloq jsonb; n int; nimp int; reab int;
BEGIN
  SELECT company_id INTO c FROM apoio_laboratorio WHERE id = _apoio_id;
  IF c IS NULL OR c <> get_user_company_id(auth.uid()) THEN RAISE EXCEPTION 'Laboratório de apoio não encontrado'; END IF;
  IF NOT apoio_modulo_liberado(c) THEN RAISE EXCEPTION 'Módulo Apoio não liberado para a empresa'; END IF;
  IF NOT apoio_tem_permissao('apoio.catalogo.gerenciar') THEN RAISE EXCEPTION 'Você não tem permissão para remover a tabela fictícia'; END IF;

  SELECT jsonb_agg(DISTINCT jsonb_build_object('id', pe.id, 'codigo', pe.codigo_apoio, 'exame', e.name, 'custo', pe.custo_previsto, 'status', pe.status))
    INTO bloq
    FROM apoio_pedido_exame pe
    JOIN apoio_preco p ON p.apoio_id = pe.apoio_id AND p.codigo = pe.codigo_apoio AND p.ficticio AND p.preco = pe.custo_previsto
    LEFT JOIN exams e ON e.id = pe.exame_id
   WHERE pe.apoio_id = _apoio_id AND NOT pe.preco_ficticio
     AND pe.status NOT IN ('aguardando_remessa', 'cancelado');
  IF bloq IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'Há exames já transmitidos usando preço fictício sem a marcação de fictício', 'exames', bloq);
  END IF;

  -- Reabre a vigência real que a fictícia tinha fechado
  WITH f AS (SELECT codigo, min(vigencia_inicio) ini FROM apoio_preco WHERE apoio_id = _apoio_id AND ficticio GROUP BY codigo)
  UPDATE apoio_preco p SET vigencia_fim = NULL FROM f
   WHERE p.apoio_id = _apoio_id AND NOT p.ficticio AND p.codigo = f.codigo AND p.vigencia_fim = f.ini - 1
     AND NOT EXISTS (SELECT 1 FROM apoio_preco o WHERE o.apoio_id = _apoio_id AND o.codigo = p.codigo AND NOT o.ficticio AND o.vigencia_inicio > p.vigencia_inicio);
  GET DIAGNOSTICS reab = ROW_COUNT;

  DELETE FROM apoio_preco WHERE apoio_id = _apoio_id AND ficticio;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE apoio_preco_importacao SET removida_em = now(), removida_por = auth.uid()
   WHERE apoio_id = _apoio_id AND ficticia AND removida_em IS NULL;
  GET DIAGNOSTICS nimp = ROW_COUNT;

  INSERT INTO apoio_auditoria(company_id, tabela, registro_id, acao, depois, usuario_id)
  VALUES (c, 'apoio_preco', _apoio_id::text, 'REMOVER_TABELA_FICTICIA', jsonb_build_object('precos_removidos', n, 'importacoes_marcadas', nimp, 'vigencias_reabertas', reab), auth.uid());

  RETURN jsonb_build_object('ok', true, 'precos_removidos', n, 'importacoes_marcadas', nimp, 'vigencias_reabertas', reab);
END $$;
REVOKE ALL ON FUNCTION public.apoio_remover_tabela_ficticia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apoio_remover_tabela_ficticia(uuid) TO authenticated;