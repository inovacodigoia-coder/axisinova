ALTER TABLE public.apoio_depara_analito ADD COLUMN IF NOT EXISTS casas_decimais integer;
ALTER TABLE public.apoio_resultado_versao
  ADD COLUMN IF NOT EXISTS executor_informado text,
  ADD COLUMN IF NOT EXISTS ciente_por uuid,
  ADD COLUMN IF NOT EXISTS ciente_em timestamptz,
  ADD COLUMN IF NOT EXISTS resolucao jsonb;
ALTER TABLE public.apoio_resultado_versao DROP CONSTRAINT apoio_resultado_versao_situacao_check;
ALTER TABLE public.apoio_resultado_versao ADD CONSTRAINT apoio_resultado_versao_situacao_check
  CHECK (situacao = ANY (ARRAY['importado','pendente_depara','pendente_formato','substituido','divergente','confirmado','descartado']));
ALTER TABLE public.lab_exam_results ADD COLUMN IF NOT EXISTS retificado_em timestamptz;

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'results',
  priority text NOT NULL DEFAULT 'high',
  title text NOT NULL,
  message text NOT NULL,
  action_route text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_notifications_user_idx ON public.user_notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_notifications_select ON public.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_notifications_update ON public.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Estado dos exames de apoio para a tela Análise
CREATE OR REPLACE FUNCTION public.apoio_analise_estado(_pedidos uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); out jsonb := '[]'::jsonb; r record; v apoio_resultado_versao%ROWTYPE; ant apoio_resultado_versao%ROWTYPE;
  outra apoio_resultado_versao%ROWTYPE; dp apoio_depara_exame%ROWTYPE; analitos jsonb; faltam jsonb; lib timestamptz;
BEGIN
  IF cid IS NULL OR NOT apoio_modulo_liberado(cid) THEN RETURN out; END IF;
  FOR r IN SELECT pe.*, al.nome AS apoio_nome, coalesce(al.modo_contingencia,false) AS manual
           FROM apoio_pedido_exame pe JOIN apoio_laboratorio al ON al.id = pe.apoio_id
           WHERE pe.company_id = cid AND pe.pedido_id = ANY(_pedidos) AND pe.status <> 'cancelado' AND pe.status <> 'nova_coleta'
  LOOP
    v := NULL; ant := NULL; outra := NULL; dp := NULL;
    SELECT * INTO v FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND situacao NOT IN ('substituido','descartado') ORDER BY created_at DESC LIMIT 1;
    IF v.id IS NOT NULL THEN
      SELECT * INTO ant FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND id <> v.id AND created_at <= v.created_at ORDER BY created_at DESC LIMIT 1;
      IF v.situacao = 'divergente' OR EXISTS (SELECT 1 FROM apoio_resultado_versao x WHERE x.pedido_exame_id = r.id AND x.situacao = 'divergente') THEN
        SELECT * INTO v FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND situacao = 'divergente' ORDER BY created_at DESC LIMIT 1;
        SELECT * INTO outra FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND id <> v.id AND origem <> v.origem AND situacao NOT IN ('substituido','descartado') ORDER BY created_at DESC LIMIT 1;
      END IF;
    END IF;
    SELECT * INTO dp FROM apoio_depara_exame WHERE company_id = cid AND exame_id = r.exame_id AND apoio_id = r.apoio_id ORDER BY ativo DESC, updated_at DESC LIMIT 1;
    SELECT coalesce(jsonb_agg(jsonb_build_object('chave', a.chave_analito, 'nome_apoio', a.nome_apoio, 'parametro_id', a.parametro_id, 'ignorar', a.ignorar, 'casas_decimais', a.casas_decimais)), '[]')
      INTO analitos FROM apoio_depara_analito a WHERE a.depara_exame_id = dp.id;
    SELECT coalesce(jsonb_agg(x->>'chave'), '[]') INTO faltam
      FROM jsonb_array_elements(CASE WHEN v.origem = 'integracao' THEN coalesce(v.conteudo->'analitos','[]'::jsonb) ELSE '[]'::jsonb END) x
      WHERE NOT EXISTS (SELECT 1 FROM apoio_depara_analito a WHERE a.depara_exame_id = dp.id AND a.chave_analito = x->>'chave' AND (a.ignorar OR a.parametro_id IS NOT NULL));
    SELECT max(created_at) INTO lib FROM apoio_pedido_exame_historico WHERE pedido_exame_id = r.id AND status_para = 'liberado_apoio';
    out := out || jsonb_build_array(jsonb_build_object(
      'id', r.id, 'pedido_id', r.pedido_id, 'exame_id', r.exame_id, 'status', r.status, 'apoio_id', r.apoio_id, 'apoio_nome', r.apoio_nome,
      'manual', r.manual, 'modo', r.modo, 'prazo', r.prazo_previsto, 'exige_pdf', coalesce(dp.exige_pdf,false), 'depara_id', dp.id,
      'modelo_mudou', coalesce(dp.modelo_mudou,false), 'liberado_apoio_em', coalesce(lib, r.status_apoio_em),
      'versao', CASE WHEN v.id IS NULL THEN NULL ELSE jsonb_build_object('id', v.id, 'origem', v.origem, 'situacao', v.situacao, 'conteudo', v.conteudo,
          'retificacao', v.retificacao, 'digitado_por', v.digitado_por, 'conferido_por', v.conferido_por, 'ciente_em', v.ciente_em,
          'executor_informado', v.executor_informado, 'created_at', v.created_at) END,
      'anterior', CASE WHEN ant.id IS NULL THEN NULL ELSE jsonb_build_object('id', ant.id, 'origem', ant.origem, 'conteudo', ant.conteudo, 'created_at', ant.created_at) END,
      'outra', CASE WHEN outra.id IS NULL THEN NULL ELSE jsonb_build_object('id', outra.id, 'origem', outra.origem, 'conteudo', outra.conteudo, 'digitado_por', outra.digitado_por) END,
      'analitos', analitos, 'faltam', faltam,
      'docs', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'tipo', d.tipo, 'path', d.storage_path, 'origem', d.origem) ORDER BY d.created_at), '[]') FROM apoio_documento d WHERE d.pedido_exame_id = r.id)
    ));
  END LOOP;
  RETURN out;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_analise__pe(_pe uuid)
RETURNS apoio_pedido_exame LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE;
BEGIN
  SELECT * INTO r FROM apoio_pedido_exame WHERE id = _pe AND company_id = get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame de apoio não encontrado'; END IF;
  IF NOT apoio_modulo_liberado(r.company_id) THEN RAISE EXCEPTION 'O módulo Apoio / Terceirização não foi liberado para esta empresa'; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_analise__status(_r apoio_pedido_exame, _para apoio_status, _origem text, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _r.status = _para THEN RETURN; END IF;
  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE apoio_pedido_exame SET status = _para WHERE id = _r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);
  INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id)
  VALUES (_r.company_id, _r.id, _r.status, _para, _origem, _motivo, auth.uid());
END $$;

-- Concluir exame de apoio (vai para Validação)
CREATE OR REPLACE FUNCTION public.apoio_analise_concluir(_pe uuid, _valores jsonb DEFAULT NULL, _nota text DEFAULT NULL, _executor text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
      jsonb_build_object('valores', coalesce(_valores,'{}'::jsonb), 'nota', _nota), md5(r.id::text || clock_timestamp()::text || coalesce(_valores::text,'')), 'importado', auth.uid(), nullif(trim(coalesce(_executor,'')),''));
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
END $$;

-- Liberar (Validação -> Liberado), com dupla conferência do manual
CREATE OR REPLACE FUNCTION public.apoio_analise_liberar(_pe uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE; v apoio_resultado_versao%ROWTYPE;
BEGIN
  r := apoio_analise__pe(_pe);
  IF r.status = 'liberado_local' THEN RETURN jsonb_build_object('ok', true); END IF;
  IF EXISTS (SELECT 1 FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND situacao = 'divergente') THEN
    RAISE EXCEPTION 'Resultado divergente: escolha uma versão antes de liberar';
  END IF;
  IF r.status = 'importado_com_pendencia' THEN RAISE EXCEPTION 'O exame foi importado com pendência. Resolva a pendência antes de liberar'; END IF;
  IF r.status <> 'importado' THEN RAISE EXCEPTION 'Conclua o exame antes de liberar'; END IF;
  SELECT * INTO v FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND situacao NOT IN ('substituido','descartado') ORDER BY created_at DESC LIMIT 1;
  IF v.origem = 'manual' THEN
    IF v.digitado_por = auth.uid() THEN RAISE EXCEPTION 'Resultado de apoio digitado manualmente precisa ser validado por outra pessoa'; END IF;
    UPDATE apoio_resultado_versao SET conferido_por = auth.uid() WHERE id = v.id;
  END IF;
  IF coalesce(v.retificacao,'') NOT IN ('','N','0') AND v.ciente_em IS NULL THEN RAISE EXCEPTION 'Confirme a retificação do apoio antes de liberar'; END IF;
  PERFORM apoio_analise__status(r, 'liberado_local', 'sistema', 'Liberado na Análise');
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.apoio_analise_resolver_divergencia(_pe uuid, _usar text, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE; integ uuid; man uuid;
BEGIN
  r := apoio_analise__pe(_pe);
  IF NOT apoio_tem_permissao('apoio.resultado.conferir') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.resultado.conferir"'; END IF;
  IF length(trim(coalesce(_motivo,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo da escolha'; END IF;
  IF _usar NOT IN ('integracao','manual') THEN RAISE EXCEPTION 'Opção inválida'; END IF;
  SELECT id INTO integ FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND origem = 'integracao' AND situacao NOT IN ('substituido','descartado') ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO man FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND origem = 'manual' AND situacao NOT IN ('substituido','descartado') ORDER BY created_at DESC LIMIT 1;
  IF integ IS NULL OR man IS NULL THEN RAISE EXCEPTION 'Não há duas versões para comparar'; END IF;
  IF _usar = 'integracao' THEN
    UPDATE apoio_resultado_versao SET situacao = 'substituido', resolucao = jsonb_build_object('motivo', trim(_motivo), 'por', auth.uid(), 'em', now(), 'escolha', _usar) WHERE id = man;
    UPDATE apoio_resultado_versao SET situacao = 'importado', resolucao = jsonb_build_object('motivo', trim(_motivo), 'por', auth.uid(), 'em', now(), 'escolha', _usar) WHERE id = integ;
  ELSE
    UPDATE apoio_resultado_versao SET situacao = 'descartado', resolucao = jsonb_build_object('motivo', trim(_motivo), 'por', auth.uid(), 'em', now(), 'escolha', _usar) WHERE id = integ;
    UPDATE apoio_resultado_versao SET situacao = 'confirmado', created_at = now(), resolucao = jsonb_build_object('motivo', trim(_motivo), 'por', auth.uid(), 'em', now(), 'escolha', _usar) WHERE id = man;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_analise_ciente_retificacao(_pe uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE;
BEGIN
  r := apoio_analise__pe(_pe);
  IF NOT apoio_tem_permissao('apoio.resultado.conferir') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.resultado.conferir"'; END IF;
  UPDATE apoio_resultado_versao SET ciente_por = auth.uid(), ciente_em = now()
   WHERE id = (SELECT id FROM apoio_resultado_versao WHERE pedido_exame_id = r.id AND situacao NOT IN ('substituido','descartado') ORDER BY created_at DESC LIMIT 1);
END $$;

-- Retificação que chega depois de liberado: volta para Validação e avisa quem liberou
CREATE OR REPLACE FUNCTION public.apoio_resultado_retificado_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE; ref text; res record; ao record;
BEGIN
  IF coalesce(NEW.retificacao,'') IN ('','N','0') OR NEW.origem <> 'integracao' THEN RETURN NEW; END IF;
  SELECT * INTO r FROM apoio_pedido_exame WHERE id = NEW.pedido_exame_id;
  IF r.status <> 'liberado_local' THEN RETURN NEW; END IF;
  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE apoio_pedido_exame SET status = 'importado' WHERE id = r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);
  INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo)
  VALUES (r.company_id, r.id, 'liberado_local', 'importado', 'integracao', 'Resultado retificado pelo apoio');
  ref := r.pedido_id::text || ':' || r.exame_id::text;
  SELECT id, released_by, exam_name, protocol INTO res FROM lab_exam_results WHERE company_id = r.company_id AND exam_ref = ref;
  UPDATE lab_exam_results SET status = 'digitized', retificado_em = now() WHERE company_id = r.company_id AND exam_ref = ref;
  IF res.released_by IS NOT NULL THEN
    INSERT INTO user_notifications (company_id, user_id, title, message, action_route)
    VALUES (r.company_id, res.released_by, 'Resultado retificado pelo apoio',
      format('O exame %s do protocolo %s foi retificado pelo apoio e voltou para Validação.', coalesce(res.exam_name,''), coalesce(res.protocol,'')),
      '/app/lab/analise?pedido=' || coalesce(res.protocol,''));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_resultado_retificado AFTER INSERT ON public.apoio_resultado_versao FOR EACH ROW EXECUTE FUNCTION public.apoio_resultado_retificado_trg();

-- Registro de PDF anexado manualmente
CREATE OR REPLACE FUNCTION public.apoio_analise_anexar_pdf(_pe uuid, _path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r apoio_pedido_exame%ROWTYPE; id_ uuid;
BEGIN
  r := apoio_analise__pe(_pe);
  IF NOT (apoio_tem_permissao('apoio.manual.operar') OR apoio_tem_permissao('apoio.resultado.conferir')) THEN RAISE EXCEPTION 'Sem permissão para anexar o PDF'; END IF;
  IF split_part(_path, '/', 1) <> r.company_id::text THEN RAISE EXCEPTION 'Caminho inválido'; END IF;
  INSERT INTO apoio_documento (company_id, pedido_exame_id, tipo, storage_path, origem, enviado_por)
  VALUES (r.company_id, r.id, 'anexo_manual', _path, 'manual', auth.uid()) RETURNING id INTO id_;
  RETURN id_;
END $$;

-- Resumo para a tela Laudos
CREATE OR REPLACE FUNCTION public.apoio_laudos_resumo()
RETURNS TABLE (pedido_id uuid, exame_id uuid, apoio_nome text, status apoio_status, prazo date, liberado boolean, exige_pdf boolean, pdf_path text, executor text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT pe.pedido_id, pe.exame_id, al.nome, pe.status, pe.prazo_previsto, pe.status = 'liberado_local',
    coalesce((SELECT d.exige_pdf FROM apoio_depara_exame d WHERE d.company_id = pe.company_id AND d.exame_id = pe.exame_id AND d.apoio_id = pe.apoio_id ORDER BY d.ativo DESC LIMIT 1), false),
    (SELECT doc.storage_path FROM apoio_documento doc WHERE doc.pedido_exame_id = pe.id AND doc.tipo IN ('laudo_pdf','anexo_manual') ORDER BY doc.created_at DESC LIMIT 1),
    (SELECT v.executor_informado FROM apoio_resultado_versao v WHERE v.pedido_exame_id = pe.id AND v.situacao NOT IN ('substituido','descartado') ORDER BY v.created_at DESC LIMIT 1)
  FROM apoio_pedido_exame pe JOIN apoio_laboratorio al ON al.id = pe.apoio_id
  WHERE pe.company_id = get_user_company_id(auth.uid()) AND apoio_modulo_liberado(pe.company_id) AND pe.status NOT IN ('cancelado','nova_coleta');
$$;

REVOKE EXECUTE ON FUNCTION public.apoio_analise__pe(uuid), public.apoio_analise__status(apoio_pedido_exame, apoio_status, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apoio_analise_estado(uuid[]), public.apoio_analise_concluir(uuid, jsonb, text, text), public.apoio_analise_liberar(uuid),
  public.apoio_analise_resolver_divergencia(uuid, text, text), public.apoio_analise_ciente_retificacao(uuid), public.apoio_analise_anexar_pdf(uuid, text), public.apoio_laudos_resumo() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apoio_analise_estado(uuid[]), public.apoio_analise_concluir(uuid, jsonb, text, text), public.apoio_analise_liberar(uuid),
  public.apoio_analise_resolver_divergencia(uuid, text, text), public.apoio_analise_ciente_retificacao(uuid), public.apoio_analise_anexar_pdf(uuid, text), public.apoio_laudos_resumo() TO authenticated;