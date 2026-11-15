-- Soroteca S06: folha de descarte para os três tipos (estante, lote, manual), reimprimível.
CREATE TABLE public.soroteca_descarte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  tipo text NOT NULL CHECK (tipo IN ('estante', 'lote', 'manual')),
  estante_id uuid REFERENCES public.soroteca_equipamento(id),
  estante_codigo text,
  estante_origem text,
  motivo text NOT NULL,
  observacao text,
  responsavel_nome text NOT NULL,
  usuario_id uuid,
  usuario_nome text,
  tubos int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX soroteca_descarte_empresa_idx ON public.soroteca_descarte (company_id, created_at DESC);
GRANT SELECT ON public.soroteca_descarte TO authenticated;
GRANT ALL ON public.soroteca_descarte TO service_role;
ALTER TABLE public.soroteca_descarte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê descartes da empresa" ON public.soroteca_descarte FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));
CREATE TRIGGER trg_soroteca_descarte_imutavel BEFORE UPDATE OR DELETE ON public.soroteca_descarte
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_movimento_imutavel();

-- Linhas da folha: retrato do tubo no momento do descarte (a reimpressão sai igual)
CREATE TABLE public.soroteca_descarte_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descarte_id uuid NOT NULL REFERENCES public.soroteca_descarte(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  amostra_id uuid NOT NULL REFERENCES public.soroteca_amostra(id),
  ordem int NOT NULL,
  posicao text,
  endereco text,
  codigo_amostra text NOT NULL,
  patient_name text,
  bancada_nome text,
  coletada_em timestamptz,
  validade timestamptz,
  pendente boolean NOT NULL DEFAULT false,
  no_prazo boolean NOT NULL DEFAULT false
);
CREATE INDEX soroteca_descarte_item_descarte_idx ON public.soroteca_descarte_item (descarte_id, ordem);
CREATE INDEX soroteca_descarte_item_amostra_idx ON public.soroteca_descarte_item (amostra_id);
GRANT SELECT ON public.soroteca_descarte_item TO authenticated;
GRANT ALL ON public.soroteca_descarte_item TO service_role;
ALTER TABLE public.soroteca_descarte_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê itens de descarte da empresa" ON public.soroteca_descarte_item FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));
CREATE TRIGGER trg_soroteca_descarte_item_imutavel BEFORE UPDATE OR DELETE ON public.soroteca_descarte_item
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_movimento_imutavel();

ALTER TABLE public.soroteca_estante_movimento ADD COLUMN descarte_id uuid REFERENCES public.soroteca_descarte(id);

-- Descarte de amostras (lote / manual) com folha. Substitui soroteca_descartar.
CREATE OR REPLACE FUNCTION public.soroteca_descartar_amostras(p_ids uuid[], p_motivo text, p_responsavel text, p_observacao text, p_tipo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_n int := 0; v_tot int; v_lib int; v_desc uuid; v_qtd int;
  v_resp text := nullif(left(trim(coalesce(p_responsavel, '')), 120), ''); v_mot text := nullif(left(trim(coalesce(p_motivo, '')), 120), '');
  v_obs text := nullif(left(trim(coalesce(p_observacao, '')), 500), ''); v_user text := public.soroteca__usuario_nome(); v_end text;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para descartar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_tipo, '') NOT IN ('lote', 'manual') THEN RAISE EXCEPTION 'Tipo de descarte inválido'; END IF;
  IF coalesce(cardinality(p_ids), 0) = 0 THEN RAISE EXCEPTION 'Nenhuma amostra selecionada'; END IF;
  IF cardinality(p_ids) > 5000 THEN RAISE EXCEPTION 'No máximo 5.000 amostras por descarte'; END IF;
  IF v_resp IS NULL THEN RAISE EXCEPTION 'Informe o responsável pelo descarte'; END IF;
  IF v_mot IS NULL THEN RAISE EXCEPTION 'Informe o motivo do descarte'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_ids) i WHERE NOT EXISTS (SELECT 1 FROM public.soroteca_amostra s WHERE s.id = i AND s.company_id = v_company)) THEN
    RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.soroteca_amostra WHERE id = ANY(p_ids) AND company_id = v_company AND status <> 'descartada' FOR UPDATE;
  SELECT count(*) INTO v_qtd FROM public.soroteca_amostra WHERE id = ANY(p_ids) AND company_id = v_company AND status <> 'descartada';
  IF v_qtd = 0 THEN RETURN jsonb_build_object('tubos', 0, 'descarte_id', NULL); END IF;
  INSERT INTO public.soroteca_descarte (company_id, tipo, motivo, observacao, responsavel_nome, usuario_id, usuario_nome, tubos)
  VALUES (v_company, p_tipo, v_mot, v_obs, v_resp, auth.uid(), v_user, v_qtd) RETURNING id INTO v_desc;

  FOR a IN SELECT s.*, e.nome AS eq_nome, sp.nome AS prat_nome, g.nome AS loc_nome, gp.nome AS loc_prat_nome
           FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
           LEFT JOIN public.soroteca_prateleira sp ON sp.id = s.prateleira_id
           LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
           LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
           WHERE s.id = ANY(p_ids) AND s.company_id = v_company AND s.status <> 'descartada' ORDER BY s.codigo_amostra LOOP
    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
    v_end := nullif(concat_ws(' > ', a.loc_nome, nullif(a.loc_prat_nome, ''), a.eq_nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna)), '');
    UPDATE public.soroteca_amostra SET status = 'descartada', descartada_em = now(), equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL,
      updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
    INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
      motivo, observacao, status_resultado, responsavel_nome, usuario_id, usuario_nome)
    VALUES (v_company, a.id, 'descarte', a.eq_nome, a.prat_nome, a.linha, a.coluna, v_end,
      v_mot, v_obs, public.soroteca__status(v_tot, v_lib), v_resp, auth.uid(), v_user);
    v_n := v_n + 1;
    INSERT INTO public.soroteca_descarte_item (descarte_id, company_id, amostra_id, ordem, posicao, endereco, codigo_amostra, patient_name, bancada_nome,
      coletada_em, validade, pendente, no_prazo)
    VALUES (v_desc, v_company, a.id, v_n, public.soroteca__posicao(a.linha, a.coluna), v_end, a.codigo_amostra, a.patient_name, a.bancada_nome,
      a.coletada_em, a.validade, coalesce(v_tot, 0) > coalesce(v_lib, 0), a.validade IS NULL OR a.validade >= now());
  END LOOP;
  RETURN jsonb_build_object('tubos', v_n, 'descarte_id', v_desc);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_descartar_amostras(uuid[], text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_descartar_amostras(uuid[], text, text, text, text) TO authenticated;

-- Versão antiga continua respondendo (conta como descarte em lote)
CREATE OR REPLACE FUNCTION public.soroteca_descartar(p_ids uuid[], p_motivo text, p_responsavel text, p_observacao text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN (public.soroteca_descartar_amostras(p_ids, p_motivo, p_responsavel, p_observacao, 'lote')->>'tubos')::int;
END $$;
COMMENT ON FUNCTION public.soroteca_descartar(uuid[], text, text, text) IS 'DEPRECATED: use soroteca_descartar_amostras (gera a folha de descarte)';
REVOKE EXECUTE ON FUNCTION public.soroteca_descartar(uuid[], text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_descartar(uuid[], text, text, text) TO authenticated;

-- Descarte da estante inteira, agora com folha
CREATE OR REPLACE FUNCTION public.soroteca_estante_descartar(p_id uuid, p_motivo text, p_responsavel text, p_observacao text,
  p_destino text, p_forcar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record; a record; v_tot int; v_lib int; v_n int := 0;
  v_tubos int; v_risco int; v_origem text; v_mot_tubo text; v_obs_tubo text; v_ids uuid[] := '{}'; v_desc uuid; v_end text;
  v_resp text := nullif(left(trim(coalesce(p_responsavel, '')), 120), ''); v_mot text := trim(coalesce(p_motivo, ''));
  v_obs text := nullif(left(trim(coalesce(p_observacao, '')), 500), ''); v_user text := public.soroteca__usuario_nome();
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para descartar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_destino, '') NOT IN ('reaproveitar', 'inativar') THEN
    RAISE EXCEPTION 'Escolha o que fazer com a estante: reaproveitar ou inativar';
  END IF;
  IF v_mot NOT IN ('Prazo de retenção vencido', 'Estante danificada', 'Outro') THEN RAISE EXCEPTION 'Motivo do descarte inválido'; END IF;
  IF v_mot = 'Outro' AND v_obs IS NULL THEN RAISE EXCEPTION 'Descreva o motivo do descarte'; END IF;
  IF v_resp IS NULL THEN RAISE EXCEPTION 'Informe o responsável pelo descarte'; END IF;

  SELECT s.*, g.nome AS g_nome, gp.nome AS gp_nome INTO e FROM public.soroteca_equipamento s
    LEFT JOIN public.soroteca_equipamento g ON g.id = s.local_equipamento_id LEFT JOIN public.soroteca_prateleira gp ON gp.id = s.local_prateleira_id
    WHERE s.id = p_id AND s.company_id = v_company FOR UPDATE OF s;
  IF e.id IS NULL OR e.tipo <> 'estante' THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF NOT e.ativo THEN RAISE EXCEPTION 'A estante % já está inativa', e.codigo; END IF;
  v_origem := nullif(concat_ws(' > ', e.g_nome, nullif(e.gp_nome, '')), '');

  PERFORM 1 FROM public.soroteca_amostra WHERE equipamento_id = e.id AND status = 'armazenada' FOR UPDATE;
  SELECT count(*), count(*) FILTER (WHERE x.validade IS NULL OR x.validade >= now() OR r.total > r.liberados)
    INTO v_tubos, v_risco
    FROM public.soroteca_amostra x CROSS JOIN LATERAL public.soroteca__resultados(x.company_id, x.order_id, x.exame_ids) r
    WHERE x.equipamento_id = e.id AND x.status = 'armazenada';
  IF v_tubos = 0 AND p_destino = 'reaproveitar' THEN
    RAISE EXCEPTION 'A estante % está vazia: não há tubos para descartar (só dá para inativar)', e.codigo;
  END IF;
  IF v_risco > 0 AND NOT coalesce(p_forcar, false) THEN
    RAISE EXCEPTION 'A estante % tem % tubo(s) com exame pendente ou dentro do prazo: marque "Descartar mesmo assim"', e.codigo, v_risco;
  END IF;
  IF v_risco > 0 AND v_obs IS NULL THEN
    RAISE EXCEPTION 'Explique por que descartar tubo(s) com exame pendente ou dentro do prazo';
  END IF;

  IF v_tubos > 0 THEN
    INSERT INTO public.soroteca_descarte (company_id, tipo, estante_id, estante_codigo, estante_origem, motivo, observacao, responsavel_nome, usuario_id, usuario_nome, tubos)
    VALUES (v_company, 'estante', e.id, e.codigo, v_origem, v_mot, v_obs, v_resp, auth.uid(), v_user, v_tubos) RETURNING id INTO v_desc;
  END IF;
  v_mot_tubo := CASE WHEN v_mot = 'Outro' THEN v_obs ELSE v_mot END;
  v_obs_tubo := concat_ws(' · ', 'Descarte da estante ' || e.codigo, CASE WHEN v_mot <> 'Outro' THEN v_obs END);
  FOR a IN SELECT x.*, sp.nome AS prat_nome FROM public.soroteca_amostra x LEFT JOIN public.soroteca_prateleira sp ON sp.id = x.prateleira_id
           WHERE x.equipamento_id = e.id AND x.status = 'armazenada' ORDER BY x.linha, x.coluna LOOP
    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
    v_end := concat_ws(' > ', e.g_nome, nullif(e.gp_nome, ''), e.nome, nullif(a.prat_nome, ''), public.soroteca__posicao(a.linha, a.coluna));
    UPDATE public.soroteca_amostra SET status = 'descartada', descartada_em = now(), equipamento_id = NULL, prateleira_id = NULL, linha = NULL, coluna = NULL,
      updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
    INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_prateleira_nome, de_linha, de_coluna, de_endereco,
      motivo, observacao, status_resultado, responsavel_nome, usuario_id, usuario_nome)
    VALUES (v_company, a.id, 'descarte', e.nome, a.prat_nome, a.linha, a.coluna, v_end,
      left(v_mot_tubo, 120), left(v_obs_tubo, 500), public.soroteca__status(v_tot, v_lib), v_resp, auth.uid(), v_user);
    v_ids := v_ids || a.id;
    v_n := v_n + 1;
    INSERT INTO public.soroteca_descarte_item (descarte_id, company_id, amostra_id, ordem, posicao, endereco, codigo_amostra, patient_name, bancada_nome,
      coletada_em, validade, pendente, no_prazo)
    VALUES (v_desc, v_company, a.id, v_n, public.soroteca__posicao(a.linha, a.coluna), v_end, a.codigo_amostra, a.patient_name, a.bancada_nome,
      a.coletada_em, a.validade, coalesce(v_tot, 0) > coalesce(v_lib, 0), a.validade IS NULL OR a.validade >= now());
  END LOOP;

  UPDATE public.soroteca_equipamento SET situacao = 'em_preenchimento', local_equipamento_id = NULL, local_prateleira_id = NULL, local_em = NULL,
    ativo = (p_destino = 'reaproveitar'), updated_at = now()
  WHERE id = e.id;
  INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, equipamento_nome, prateleira_nome, tubos,
    motivo, observacao, responsavel_nome, destino, descarte_id, usuario_id, usuario_nome)
  VALUES (v_company, e.id, CASE WHEN v_n > 0 THEN 'descartada' ELSE 'inativada' END, e.nome, e.g_nome, e.gp_nome, v_n,
    v_mot, v_obs, v_resp, p_destino, v_desc, auth.uid(), v_user);
  RETURN jsonb_build_object('tubos', v_n, 'codigo', e.codigo, 'origem', v_origem, 'destino', p_destino, 'ids', to_jsonb(v_ids), 'descarte_id', v_desc);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_descartar(uuid, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_descartar(uuid, text, text, text, text, boolean) TO authenticated;

-- Folha de descarte (impressão e reimpressão): por id do descarte ou pelo último descarte de uma amostra
CREATE OR REPLACE FUNCTION public.soroteca_descarte_folha(p_descarte_id uuid DEFAULT NULL, p_amostra_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); d record; v_id uuid := p_descarte_id;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF v_id IS NULL AND p_amostra_id IS NOT NULL THEN
    SELECT i.descarte_id INTO v_id FROM public.soroteca_descarte_item i JOIN public.soroteca_descarte x ON x.id = i.descarte_id
      WHERE i.amostra_id = p_amostra_id AND i.company_id = v_company ORDER BY x.created_at DESC LIMIT 1;
  END IF;
  SELECT * INTO d FROM public.soroteca_descarte WHERE id = v_id AND company_id = v_company;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Folha de descarte não encontrada para esta amostra' USING ERRCODE = 'P0002'; END IF;
  RETURN jsonb_build_object(
    'id', d.id, 'tipo', d.tipo, 'estante_codigo', d.estante_codigo, 'estante_origem', d.estante_origem, 'motivo', d.motivo,
    'observacao', d.observacao, 'responsavel_nome', d.responsavel_nome, 'usuario_nome', d.usuario_nome, 'tubos', d.tubos, 'created_at', d.created_at,
    'itens', (SELECT coalesce(jsonb_agg(jsonb_build_object('ordem', i.ordem, 'posicao', i.posicao, 'endereco', i.endereco, 'codigo_amostra', i.codigo_amostra,
        'patient_name', i.patient_name, 'bancada_nome', i.bancada_nome, 'coletada_em', i.coletada_em, 'validade', i.validade,
        'pendente', i.pendente, 'no_prazo', i.no_prazo) ORDER BY i.ordem), '[]'::jsonb)
      FROM public.soroteca_descarte_item i WHERE i.descarte_id = d.id));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_descarte_folha(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_descarte_folha(uuid, uuid) TO authenticated;

-- Histórico da estante (criada, guardada, aberta, descartada, inativada, reativada)
CREATE OR REPLACE FUNCTION public.soroteca_estante_historico(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company AND tipo = 'estante') THEN
    RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'tipo', m.tipo, 'quando', m.created_at, 'equipamento_nome', m.equipamento_nome,
      'prateleira_nome', m.prateleira_nome, 'tubos', m.tubos, 'motivo', m.motivo, 'observacao', m.observacao, 'responsavel_nome', m.responsavel_nome,
      'destino', m.destino, 'descarte_id', m.descarte_id, 'usuario_nome', m.usuario_nome) ORDER BY m.created_at DESC, m.id), '[]'::jsonb)
    FROM public.soroteca_estante_movimento m WHERE m.estante_id = p_id AND m.company_id = v_company);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_historico(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_historico(uuid) TO authenticated;