ALTER TABLE public.apoio_acao_pendente DROP CONSTRAINT apoio_acao_pendente_tipo_check;
ALTER TABLE public.apoio_acao_pendente ADD CONSTRAINT apoio_acao_pendente_tipo_check CHECK (tipo = ANY (ARRAY['cancelar_no_portal','informar_no_portal','revisar_depara','resultado_incompleto','avisar_paciente','outro']));
ALTER TABLE public.apoio_acao_pendente ADD COLUMN IF NOT EXISTS dados jsonb, ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS proxima_tentativa timestamptz;

-- Ponto único: quando existir envio real, enviar aqui e fechar a ação na entrega.
CREATE OR REPLACE FUNCTION public.notificar_paciente_recoleta(_pe uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE; p record; novo uuid;
BEGIN
  SELECT * INTO r FROM apoio_pedido_exame WHERE id = _pe;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT pa.name, pa.phone, pa.phone2, pa.email INTO p
    FROM attendance_orders ao LEFT JOIN patients pa ON pa.id::text = ao.patient_id::text WHERE ao.id = r.pedido_id;
  INSERT INTO apoio_acao_pendente (company_id, pedido_exame_id, tipo, descricao, criada_por, dados)
  VALUES (r.company_id, r.id, 'avisar_paciente', 'Avisar paciente sobre recoleta: ' || coalesce(nullif(trim(_motivo),''),'—'), auth.uid(),
    jsonb_strip_nulls(jsonb_build_object('nome', p.name, 'telefone', nullif(p.phone,''), 'celular', nullif(p.phone2,''), 'email', nullif(p.email,''), 'motivo', trim(_motivo), 'contatos', '[]'::jsonb)))
  RETURNING id INTO novo;
  RETURN novo;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_acao_registrar_contato(_id uuid, _resultado text, _observacao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_acao_pendente%ROWTYPE; item jsonb; rot text;
BEGIN
  IF NOT (apoio_tem_permissao('apoio.manual.operar') OR apoio_tem_permissao('apoio.remessa.operar')) THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.manual.operar"'; END IF;
  SELECT * INTO r FROM apoio_acao_pendente WHERE id = _id AND company_id = get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND OR r.tipo <> 'avisar_paciente' THEN RAISE EXCEPTION 'Ação não encontrada'; END IF;
  IF r.concluida_em IS NOT NULL THEN RAISE EXCEPTION 'Esta ação já foi concluída'; END IF;
  IF _resultado NOT IN ('avisado','nao_atendeu','numero_errado') THEN RAISE EXCEPTION 'Escolha o resultado da ligação'; END IF;
  rot := CASE _resultado WHEN 'avisado' THEN 'Avisado' WHEN 'nao_atendeu' THEN 'Não atendeu' ELSE 'Número errado' END;
  item := jsonb_build_object('em', now(), 'por', auth.uid(), 'resultado', _resultado, 'observacao', nullif(trim(coalesce(_observacao,'')),''));
  UPDATE apoio_acao_pendente SET tentativas = tentativas + 1,
    dados = jsonb_set(coalesce(dados,'{}'::jsonb), '{contatos}', coalesce(dados->'contatos','[]'::jsonb) || item),
    concluida_em = CASE WHEN _resultado = 'avisado' THEN now() END,
    concluida_por = CASE WHEN _resultado = 'avisado' THEN auth.uid() END,
    observacao = CASE WHEN _resultado = 'avisado' THEN trim(rot || '. ' || coalesce(_observacao,'')) ELSE observacao END,
    proxima_tentativa = NULL, updated_at = now()
  WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_acao_adiar(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (apoio_tem_permissao('apoio.manual.operar') OR apoio_tem_permissao('apoio.remessa.operar')) THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.manual.operar"'; END IF;
  UPDATE apoio_acao_pendente SET proxima_tentativa = (((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1) + time '08:00') AT TIME ZONE 'America/Sao_Paulo', updated_at = now()
   WHERE id = _id AND company_id = get_user_company_id(auth.uid()) AND concluida_em IS NULL AND tipo = 'avisar_paciente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ação não encontrada'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_recoleta(_pe uuid, _motivo text, _nova_data date, _avisar boolean DEFAULT true)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE cid uuid := get_user_company_id(auth.uid()); r apoio_pedido_exame%ROWTYPE; novo uuid; aviso jsonb;
BEGIN
  IF NOT (apoio_tem_permissao('apoio.manual.operar') OR apoio_tem_permissao('apoio.remessa.operar')) THEN RAISE EXCEPTION 'Sem permissão para abrir recoleta'; END IF;
  IF length(trim(coalesce(_motivo,''))) = 0 THEN RAISE EXCEPTION 'Informe o motivo da recoleta'; END IF;
  SELECT * INTO r FROM apoio_pedido_exame WHERE id = _pe AND company_id = cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame não encontrado'; END IF;
  IF r.status <> 'nova_coleta' THEN
    PERFORM apoio_mudar_status(_pe, 'nova_coleta', 'manual', 'Recoleta: ' || trim(_motivo));
  END IF;
  aviso := CASE WHEN _avisar THEN jsonb_build_object('evento', 'Recoleta necessária (exame de apoio)', 'solicitado_em', now(), 'por', auth.uid()) ELSE NULL END;
  INSERT INTO apoio_pedido_exame (company_id, pedido_id, exame_id, amostra_id, apoio_id, codigo_apoio, status, modo, custo_previsto, preco_ficticio, prazo_contagem, info_complementar)
  VALUES (r.company_id, r.pedido_id, r.exame_id, NULL, r.apoio_id, r.codigo_apoio, 'aguardando_remessa', r.modo, r.custo_previsto, r.preco_ficticio, r.prazo_contagem,
    (coalesce(r.info_complementar,'{}'::jsonb) - 'comentarios' - 'tarefa_cancelamento' - 'acao_pendente_id' - 'cancelar_no_apoio')
      || jsonb_strip_nulls(jsonb_build_object('recoleta_de', r.id, 'recoleta_motivo', trim(_motivo), 'recoleta_data', _nova_data, 'aviso_paciente', aviso)))
  RETURNING id INTO novo;
  UPDATE apoio_pedido_exame SET info_complementar = coalesce(info_complementar,'{}'::jsonb) || jsonb_build_object('recoleta_para', novo) WHERE id = r.id;
  UPDATE apoio_pendencia_tecnica SET resolvida_em = now(), resolvida_por = auth.uid(), resolucao = coalesce(resolucao, 'Recoleta aberta')
   WHERE pedido_exame_id = r.id AND resolvida_em IS NULL;
  PERFORM notificar_paciente_recoleta(novo, _motivo);
  RETURN novo;
END $function$;

CREATE OR REPLACE FUNCTION public.apoio_manual_mudar_status(_pe uuid, _status apoio_status, _motivo text, _pendencia text DEFAULT NULL::text, _detalhamento text DEFAULT NULL::text, _disposicao text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r public.apoio_pedido_exame%ROWTYPE;
BEGIN
  IF length(trim(coalesce(_motivo,''))) = 0 THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  SELECT * INTO r FROM public.apoio_pedido_exame WHERE id = _pe AND company_id = public.get_user_company_id(auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame de apoio não encontrado'; END IF;
  IF _status IN ('pendencia_tecnica','nova_coleta') AND length(trim(coalesce(_pendencia,''))) = 0 THEN
    RAISE EXCEPTION 'Informe a pendência';
  END IF;
  PERFORM public.apoio_mudar_status(_pe, _status, 'manual', trim(_motivo),
    CASE WHEN _pendencia IS NOT NULL THEN jsonb_build_object('pendencia',_pendencia,'detalhamento',_detalhamento,'disposicao',_disposicao) END);
  IF _status IN ('pendencia_tecnica','nova_coleta') THEN
    INSERT INTO public.apoio_pendencia_tecnica (company_id, pedido_exame_id, cod_ped_apoio, codigo_apoio, situacao, pendencia, detalhamento, disposicao)
    VALUES (r.company_id, r.id, r.cod_ped_apoio, r.codigo_apoio, _status::text || ' (manual)', trim(_pendencia), _detalhamento, _disposicao);
  END IF;
  IF _status = 'nova_coleta' THEN
    PERFORM public.apoio_recoleta(_pe, trim(_pendencia), current_date, true);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.apoio_kanban_lista(_desde_liberado date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, pedido_id uuid, exame_id uuid, apoio_id uuid, apoio_nome text, apoio_manual boolean, unidade_id uuid, status apoio_status, status_apoio_cod text, status_apoio_desc text, pedido_numero text, pedido_protocolo text, paciente_nome text, exame_nome text, exame_codigo text, codigo_apoio text, cod_ped_apoio text, cod_barras text[], remessa_id uuid, cod_lote_lab text, modo text, prazo_previsto date, situacao_prazo text, dias_em_atraso integer, critico boolean, responsavel_id uuid, responsavel_nome text, tem_pdf boolean, tem_pendencia boolean, retificado boolean, divergente boolean, status_desconhecido boolean, acao_pendente text, acao_pendente_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    CASE WHEN ap.tipo = 'avisar_paciente' THEN ap.descricao
      || coalesce(' · ☎ ' || coalesce(ap.dados->>'celular', ap.dados->>'telefone'), '')
      || CASE WHEN ap.tentativas > 0 THEN ' · ' || ap.tentativas || ' tentativa(s)' ELSE '' END
      ELSE ap.descricao END,
    ap.id, v.created_at, v.updated_at
  FROM apoio_pedido_exame_v v
  JOIN attendance_orders ao ON ao.id = v.pedido_id
  JOIN apoio_laboratorio al ON al.id = v.apoio_id
  LEFT JOIN exams e ON e.id = v.exame_id
  LEFT JOIN LATERAL (SELECT a.id, a.descricao, a.tipo, a.dados, a.tentativas FROM apoio_acao_pendente a WHERE a.pedido_exame_id = v.id AND a.concluida_em IS NULL ORDER BY a.created_at LIMIT 1) ap ON true
  WHERE v.company_id = cid
    AND (v.status <> 'cancelado' OR ap.id IS NOT NULL)
    AND (v.status <> 'liberado_local' OR v.updated_at >= coalesce(_desde_liberado, current_date - 7));
END $function$;

REVOKE ALL ON FUNCTION public.notificar_paciente_recoleta(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_acao_registrar_contato(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_acao_adiar(uuid) TO authenticated;

COMMENT ON TABLE public.support_boards IS 'DEPRECATED: quadros genéricos substituídos pelo Kanban Apoio';
COMMENT ON TABLE public.support_board_stages IS 'DEPRECATED: quadros genéricos substituídos pelo Kanban Apoio';
COMMENT ON TABLE public.support_board_members IS 'DEPRECATED: quadros genéricos substituídos pelo Kanban Apoio';
COMMENT ON TABLE public.support_cards IS 'DEPRECATED: quadros genéricos substituídos pelo Kanban Apoio';
COMMENT ON TABLE public.support_card_fields IS 'DEPRECATED: quadros genéricos substituídos pelo Kanban Apoio';
COMMENT ON TABLE public.support_card_audit IS 'DEPRECATED: quadros genéricos substituídos pelo Kanban Apoio';