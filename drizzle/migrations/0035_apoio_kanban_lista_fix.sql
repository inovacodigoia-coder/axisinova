CREATE OR REPLACE FUNCTION public.apoio_kanban_lista(_desde_liberado date DEFAULT NULL)
RETURNS TABLE (id uuid, pedido_id uuid, exame_id uuid, apoio_id uuid, apoio_nome text, apoio_manual boolean, unidade_id uuid,
  status apoio_status, status_apoio_cod text, status_apoio_desc text, pedido_numero text, pedido_protocolo text, paciente_nome text,
  exame_nome text, exame_codigo text, codigo_apoio text, cod_ped_apoio text, cod_barras text[], remessa_id uuid, cod_lote_lab text,
  modo text, prazo_previsto date, situacao_prazo text, dias_em_atraso integer, critico boolean, responsavel_id uuid, responsavel_nome text,
  tem_pdf boolean, tem_pendencia boolean, retificado boolean, divergente boolean, status_desconhecido boolean,
  acao_pendente text, acao_pendente_id uuid, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cid uuid := get_user_company_id(auth.uid());
BEGIN
  IF cid IS NULL OR NOT apoio_modulo_liberado(cid) THEN RETURN; END IF;
  IF NOT (apoio_tem_permissao('apoio.kanban.ver') OR apoio_tem_permissao('apoio.manual.operar') OR apoio_tem_permissao('apoio.remessa.operar')) THEN
    RAISE EXCEPTION 'Você não tem a permissão "apoio.kanban.ver"';
  END IF;
  RETURN QUERY
  SELECT v.id, v.pedido_id, v.exame_id, v.apoio_id, v.apoio_nome, coalesce(al.modo_contingencia,false), ao.origin_id,
    v.status, v.status_apoio_cod, v.status_apoio_desc, v.pedido_numero::text, v.pedido_protocolo::text, v.paciente_nome::text,
    v.exame_nome::text, e.internal_code::text, v.codigo_apoio, v.cod_ped_apoio,
    array_remove(ARRAY[apoio_codigo_aliquota(v.pedido_id, v.apoio_id)] || coalesce((SELECT array_agg(rc.cod_bar_apoio) FROM apoio_recipiente rc WHERE rc.id = v.recipiente_id), '{}'::text[]), NULL),
    v.remessa_id, v.cod_lote_lab::text, v.modo, v.prazo_previsto, v.situacao_prazo, v.dias_em_atraso::int, coalesce(v.critico,false), v.responsavel_id,
    (SELECT pr.full_name::text FROM profiles pr WHERE pr.id = v.responsavel_id),
    EXISTS (SELECT 1 FROM apoio_documento d WHERE d.pedido_exame_id = v.id),
    EXISTS (SELECT 1 FROM apoio_pendencia_tecnica pt WHERE pt.pedido_exame_id = v.id AND pt.resolvida_em IS NULL),
    EXISTS (SELECT 1 FROM apoio_resultado_versao rv WHERE rv.pedido_exame_id = v.id AND coalesce(rv.retificacao,'') NOT IN ('','N','0')),
    EXISTS (SELECT 1 FROM apoio_resultado_versao rv WHERE rv.pedido_exame_id = v.id AND rv.situacao = 'divergente'),
    coalesce(v.info_complementar->>'status_desconhecido','') = 'true',
    ap.descricao, ap.id, v.created_at, v.updated_at
  FROM apoio_pedido_exame_v v
  JOIN attendance_orders ao ON ao.id = v.pedido_id
  JOIN apoio_laboratorio al ON al.id = v.apoio_id
  LEFT JOIN exams e ON e.id = v.exame_id
  LEFT JOIN LATERAL (SELECT a.id, a.descricao FROM apoio_acao_pendente a WHERE a.pedido_exame_id = v.id AND a.concluida_em IS NULL ORDER BY a.created_at LIMIT 1) ap ON true
  WHERE v.company_id = cid
    AND (v.status <> 'cancelado' OR ap.id IS NOT NULL)
    AND (v.status <> 'liberado_local' OR v.updated_at >= coalesce(_desde_liberado, current_date - 7));
END $$;