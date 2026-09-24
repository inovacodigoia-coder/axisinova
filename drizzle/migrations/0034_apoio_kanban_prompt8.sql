CREATE TABLE public.apoio_acao_pendente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pedido_exame_id uuid NOT NULL REFERENCES public.apoio_pedido_exame(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('cancelar_no_portal','informar_no_portal','outro')),
  descricao text NOT NULL,
  criada_por uuid,
  concluida_por uuid,
  concluida_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apoio_acao_pendente_pe_idx ON public.apoio_acao_pendente (pedido_exame_id);
CREATE INDEX apoio_acao_pendente_aberta_idx ON public.apoio_acao_pendente (company_id) WHERE concluida_em IS NULL;
GRANT SELECT ON public.apoio_acao_pendente TO authenticated;
GRANT ALL ON public.apoio_acao_pendente TO service_role;
ALTER TABLE public.apoio_acao_pendente ENABLE ROW LEVEL SECURITY;
CREATE POLICY apoio_acao_pendente_select ON public.apoio_acao_pendente FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE TRIGGER upd_apoio_acao_pendente BEFORE UPDATE ON public.apoio_acao_pendente FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: tarefas de cancelamento já marcadas no prompt 5
INSERT INTO public.apoio_acao_pendente (company_id, pedido_exame_id, tipo, descricao, criada_por, created_at)
SELECT pe.company_id, pe.id, 'cancelar_no_portal', pe.info_complementar->>'tarefa_cancelamento',
       nullif(pe.info_complementar->>'cancelamento_solicitado_por','')::uuid, coalesce((pe.info_complementar->>'cancelamento_solicitado_em')::timestamptz, now())
FROM public.apoio_pedido_exame pe
WHERE coalesce(pe.info_complementar->>'tarefa_cancelamento','') <> '';

ALTER TABLE public.apoio_visao_kanban ADD COLUMN IF NOT EXISTS padrao boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apoio_acao_concluir(_id uuid, _observacao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_acao_pendente%ROWTYPE;
BEGIN
  SELECT * INTO r FROM apoio_acao_pendente WHERE id = _id AND company_id = get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ação não encontrada'; END IF;
  IF NOT apoio_tem_permissao('apoio.manual.operar') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.manual.operar"'; END IF;
  IF r.concluida_em IS NOT NULL THEN RAISE EXCEPTION 'Esta ação já foi concluída'; END IF;
  IF length(trim(coalesce(_observacao,''))) < 3 THEN RAISE EXCEPTION 'Informe a observação (ex.: cancelado no portal às 10h por Fulano)'; END IF;
  UPDATE apoio_acao_pendente SET concluida_em = now(), concluida_por = auth.uid(), observacao = trim(_observacao) WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_cancelar_pedido_exame(_pedido uuid, _exam uuid, _motivo text DEFAULT NULL::text, _cancelar_no_apoio boolean DEFAULT NULL::boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE cid uuid := get_user_company_id(auth.uid()); r apoio_pedido_exame%ROWTYPE; ao attendance_orders%ROWTYPE; nome text; exnome text; tarefa text; acao uuid;
BEGIN
  SELECT * INTO ao FROM attendance_orders WHERE id = _pedido AND company_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  SELECT * INTO r FROM apoio_pedido_exame WHERE pedido_id = _pedido AND exame_id = _exam AND status <> 'cancelado' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('resultado', 'sem_apoio'); END IF;
  SELECT a.nome INTO nome FROM apoio_laboratorio a WHERE a.id = r.apoio_id;
  IF r.status IN ('aguardando_remessa','em_remessa') THEN
    PERFORM set_config('apoio.mudar_status', 'on', true);
    UPDATE apoio_pedido_exame SET status = 'cancelado', remessa_id = NULL WHERE id = r.id;
    PERFORM set_config('apoio.mudar_status', 'off', true);
    INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id)
    VALUES (r.company_id, r.id, r.status, 'cancelado', 'manual', coalesce(nullif(_motivo,''), 'Exame cancelado no pedido'), auth.uid());
    RETURN jsonb_build_object('resultado', 'cancelado', 'apoio_nome', nome);
  END IF;
  IF r.status IN ('liberado_apoio','importado','importado_com_pendencia','liberado_local') THEN
    RETURN jsonb_build_object('resultado', 'finalizado', 'apoio_nome', nome, 'status', r.status);
  END IF;
  IF _cancelar_no_apoio IS NULL THEN
    RETURN jsonb_build_object('resultado', 'confirmar', 'apoio_nome', nome, 'status', r.status, 'modo', r.modo);
  END IF;
  IF NOT _cancelar_no_apoio THEN RETURN jsonb_build_object('resultado', 'mantido', 'apoio_nome', nome); END IF;

  UPDATE apoio_pedido_exame SET info_complementar = coalesce(info_complementar,'{}'::jsonb) || jsonb_build_object(
    'cancelar_no_apoio', true, 'cancelamento_solicitado_em', now(), 'cancelamento_solicitado_por', auth.uid(), 'cancelamento_motivo', _motivo)
  WHERE id = r.id;

  IF r.modo = 'manual' THEN
    SELECT name INTO exnome FROM exams WHERE id = _exam;
    tarefa := format('Cancelar no portal do %s — pedido %s, exame %s%s', nome, coalesce(ao.order_number, ao.protocol, ''), coalesce(exnome,''), coalesce(': ' || nullif(_motivo,''), ''));
    INSERT INTO apoio_acao_pendente (company_id, pedido_exame_id, tipo, descricao, criada_por)
    VALUES (r.company_id, r.id, 'cancelar_no_portal', tarefa, auth.uid()) RETURNING id INTO acao;
    UPDATE apoio_pedido_exame SET info_complementar = info_complementar || jsonb_build_object('tarefa_cancelamento', tarefa, 'acao_pendente_id', acao) WHERE id = r.id;
    RETURN jsonb_build_object('resultado', 'marcado', 'apoio_nome', nome, 'tarefa_criada', true);
  END IF;
  RETURN jsonb_build_object('resultado', 'marcado', 'apoio_nome', nome, 'tarefa_criada', false);
END $function$;

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
  SELECT v.id, v.pedido_id, v.exame_id, v.apoio_id, v.apoio_nome, coalesce(al.modo_contingencia,false), ao.establishment_id,
    v.status, v.status_apoio_cod, v.status_apoio_desc, v.pedido_numero, v.pedido_protocolo, v.paciente_nome,
    v.exame_nome, e.code, v.codigo_apoio, v.cod_ped_apoio,
    array_remove(ARRAY[apoio_codigo_aliquota(v.pedido_id, v.apoio_id)] || coalesce((SELECT array_agg(rc.cod_bar_apoio) FROM apoio_recipiente rc WHERE rc.id = v.recipiente_id OR rc.remessa_id = v.remessa_id AND rc.cod_bar_apoio IS NOT NULL AND v.recipiente_id IS NULL AND false), '{}'), NULL),
    v.remessa_id, v.cod_lote_lab, v.modo, v.prazo_previsto, v.situacao_prazo, v.dias_em_atraso, coalesce(v.critico,false), v.responsavel_id,
    (SELECT pr.full_name FROM profiles pr WHERE pr.id = v.responsavel_id),
    EXISTS (SELECT 1 FROM apoio_documento d WHERE d.pedido_exame_id = v.id),
    EXISTS (SELECT 1 FROM apoio_pendencia_tecnica pt WHERE pt.pedido_exame_id = v.id AND pt.resolvida_em IS NULL),
    EXISTS (SELECT 1 FROM apoio_resultado_versao rv WHERE rv.pedido_exame_id = v.id AND coalesce(rv.retificacao,'') NOT IN ('','N','0')),
    EXISTS (SELECT 1 FROM apoio_resultado_versao rv WHERE rv.pedido_exame_id = v.id AND rv.situacao = 'divergente'),
    (v.status_apoio_cod IS NOT NULL AND coalesce(v.info_complementar->>'status_desconhecido','') = 'true'),
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

CREATE OR REPLACE FUNCTION public.apoio_kanban_atribuir(_pe uuid, _usuario uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cid uuid := get_user_company_id(auth.uid());
BEGIN
  IF NOT (apoio_tem_permissao('apoio.manual.operar') OR apoio_tem_permissao('apoio.remessa.operar') OR apoio_tem_permissao('apoio.resultado.conferir')) THEN
    RAISE EXCEPTION 'Sem permissão para atribuir responsável';
  END IF;
  IF _usuario IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = _usuario AND company_id = cid) THEN RAISE EXCEPTION 'Usuário inválido'; END IF;
  UPDATE apoio_pedido_exame SET responsavel_id = _usuario WHERE id = _pe AND company_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame não encontrado'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_kanban_comentar(_pe uuid, _texto text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cid uuid := get_user_company_id(auth.uid());
BEGIN
  IF NOT (apoio_tem_permissao('apoio.kanban.ver') OR apoio_tem_permissao('apoio.manual.operar')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF length(trim(coalesce(_texto,''))) = 0 THEN RAISE EXCEPTION 'Escreva o comentário'; END IF;
  UPDATE apoio_pedido_exame SET info_complementar = coalesce(info_complementar,'{}'::jsonb) || jsonb_build_object('comentarios',
    coalesce(info_complementar->'comentarios','[]'::jsonb) || jsonb_build_array(jsonb_build_object('texto', trim(_texto), 'por', auth.uid(),
      'por_nome', (SELECT full_name FROM profiles WHERE id = auth.uid()), 'em', now())))
  WHERE id = _pe AND company_id = cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame não encontrado'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_recoleta(_pe uuid, _motivo text, _nova_data date, _avisar boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  RETURN novo;
END $$;

REVOKE EXECUTE ON FUNCTION public.apoio_acao_concluir(uuid, text), public.apoio_kanban_lista(date), public.apoio_kanban_atribuir(uuid, uuid), public.apoio_kanban_comentar(uuid, text), public.apoio_recoleta(uuid, text, date, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apoio_acao_concluir(uuid, text), public.apoio_kanban_lista(date), public.apoio_kanban_atribuir(uuid, uuid), public.apoio_kanban_comentar(uuid, text), public.apoio_recoleta(uuid, text, date, boolean) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.apoio_pedido_exame;