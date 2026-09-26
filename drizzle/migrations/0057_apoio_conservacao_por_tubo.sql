-- 12C: conservação por tubo, separação em sacos, entrega com temperatura
ALTER TABLE public.apoio_depara_exame ADD COLUMN IF NOT EXISTS conservacao text NOT NULL DEFAULT 'nao_informado'
  CHECK (conservacao IN ('ambiente','refrigerado','congelado','nao_informado'));

ALTER TABLE public.apoio_recipiente
  ADD COLUMN IF NOT EXISTS conservacao text CHECK (conservacao IN ('ambiente','refrigerado','congelado','verificar')),
  ADD COLUMN IF NOT EXISTS conservacao_origem text CHECK (conservacao_origem IN ('etiqueta','cadastro','manual')),
  ADD COLUMN IF NOT EXISTS conservacao_texto text,
  ADD COLUMN IF NOT EXISTS separado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS separado_em timestamptz;

ALTER TABLE public.apoio_laboratorio
  ADD COLUMN IF NOT EXISTS horarios_motoboy text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conservacao_textos jsonb NOT NULL DEFAULT '{"(REFRIG.)":"refrigerado"}'::jsonb,
  ADD COLUMN IF NOT EXISTS alerta_guarda_min integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS faixas_temperatura jsonb NOT NULL DEFAULT '{"ambiente":{"min":15,"max":25},"refrigerado":{"min":2,"max":8},"congelado":{"max":-10}}'::jsonb;

ALTER TABLE public.apoio_remessa
  ADD COLUMN IF NOT EXISTS saida_prevista timestamptz,
  ADD COLUMN IF NOT EXISTS separada_em timestamptz,
  ADD COLUMN IF NOT EXISTS entrega_sacos jsonb,
  ADD COLUMN IF NOT EXISTS entrega_forcada text;
COMMENT ON COLUMN public.apoio_remessa.temperatura IS 'DEPRECATED (12C): temperatura agora é por tubo (apoio_recipiente.conservacao)';

-- Lê a conservação do texto da etiqueta EPL do apoio
CREATE OR REPLACE FUNCTION public.apoio_conservacao_epl(_epl text, _mapa jsonb, OUT conservacao text, OUT texto text)
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE m text[];
BEGIN
  m := regexp_match(coalesce(_epl,''), '(?:^|\n)A\d+,\d+,[^\n]*?"(\([^"\n]*\))"', 'n');
  texto := m[1];
  conservacao := CASE WHEN texto IS NOT NULL AND _mapa ? texto THEN _mapa->>texto ELSE 'verificar' END;
  IF conservacao NOT IN ('ambiente','refrigerado','congelado') THEN conservacao := 'verificar'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_recipiente_conservacao_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mapa jsonb; c record;
BEGIN
  IF NEW.etiqueta_epl IS NULL OR NEW.conservacao_origem = 'manual' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.etiqueta_epl IS NOT DISTINCT FROM OLD.etiqueta_epl AND NEW.conservacao IS NOT NULL THEN RETURN NEW; END IF;
  SELECT al.conservacao_textos INTO mapa FROM apoio_remessa r JOIN apoio_laboratorio al ON al.id = r.apoio_id WHERE r.id = NEW.remessa_id;
  SELECT * INTO c FROM public.apoio_conservacao_epl(NEW.etiqueta_epl, coalesce(mapa, '{"(REFRIG.)":"refrigerado"}'::jsonb));
  NEW.conservacao := c.conservacao; NEW.conservacao_texto := c.texto;
  NEW.conservacao_origem := CASE WHEN c.conservacao = 'verificar' THEN NULL ELSE 'etiqueta' END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS apoio_recipiente_conservacao ON public.apoio_recipiente;
CREATE TRIGGER apoio_recipiente_conservacao BEFORE INSERT OR UPDATE OF etiqueta_epl ON public.apoio_recipiente
  FOR EACH ROW EXECUTE FUNCTION public.apoio_recipiente_conservacao_trg();

-- Reprocessa a etiqueta gravada (não chama o apoio)
CREATE OR REPLACE FUNCTION public.apoio_conservacao_reprocessar(_remessa uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); rc record; x record; mapa jsonb; n int := 0;
BEGIN
  SELECT al.conservacao_textos INTO mapa FROM apoio_remessa r JOIN apoio_laboratorio al ON al.id = r.apoio_id WHERE r.id = _remessa AND r.company_id = c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  FOR rc IN SELECT * FROM apoio_recipiente WHERE remessa_id = _remessa AND coalesce(conservacao_origem,'') <> 'manual' AND etiqueta_epl IS NOT NULL LOOP
    SELECT * INTO x FROM public.apoio_conservacao_epl(rc.etiqueta_epl, mapa);
    UPDATE apoio_recipiente SET conservacao = x.conservacao, conservacao_texto = x.texto,
      conservacao_origem = CASE WHEN x.conservacao = 'verificar' THEN NULL ELSE 'etiqueta' END WHERE id = rc.id;
    INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
    VALUES (c, 'apoio_recipiente', rc.id, 'CONSERVACAO_REPROCESSADA', jsonb_build_object('conservacao', rc.conservacao),
      jsonb_build_object('conservacao', x.conservacao, 'texto', x.texto), auth.uid());
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Escolha manual (tubo em "Verificar" ou correção)
CREATE OR REPLACE FUNCTION public.apoio_conservacao_definir(_recipiente uuid, _conservacao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); rc apoio_recipiente%ROWTYPE;
BEGIN
  IF _conservacao NOT IN ('ambiente','refrigerado','congelado') THEN RAISE EXCEPTION 'Conservação inválida'; END IF;
  SELECT * INTO rc FROM apoio_recipiente WHERE id = _recipiente AND company_id = c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tubo não encontrado'; END IF;
  UPDATE apoio_recipiente SET conservacao = _conservacao, conservacao_origem = 'manual' WHERE id = rc.id;
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (c, 'apoio_recipiente', rc.id, 'CONSERVACAO_MANUAL', jsonb_build_object('conservacao', rc.conservacao, 'origem', rc.conservacao_origem, 'texto', rc.conservacao_texto),
    jsonb_build_object('conservacao', _conservacao, 'origem', 'manual'), auth.uid());
END $$;

-- Separação: bipar tubo no saco
CREATE OR REPLACE FUNCTION public.apoio_separar_bipar(_remessa uuid, _codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); rc apoio_recipiente%ROWTYPE; outra bigint; faltam int;
BEGIN
  PERFORM 1 FROM apoio_remessa WHERE id = _remessa AND company_id = c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  SELECT * INTO rc FROM apoio_recipiente WHERE remessa_id = _remessa AND cod_bar_apoio = trim(_codigo) AND NOT cancelado;
  IF NOT FOUND THEN
    SELECT r.cod_lote_lab INTO outra FROM apoio_recipiente x JOIN apoio_remessa r ON r.id = x.remessa_id WHERE x.company_id = c AND x.cod_bar_apoio = trim(_codigo) LIMIT 1;
    RETURN jsonb_build_object('ok', false, 'msg', CASE WHEN outra IS NOT NULL THEN 'Este tubo é da remessa ' || outra ELSE 'Tubo desconhecido' END);
  END IF;
  IF coalesce(rc.conservacao,'verificar') = 'verificar' THEN
    RETURN jsonb_build_object('ok', false, 'verificar', true, 'recipiente_id', rc.id, 'texto', rc.conservacao_texto, 'msg', 'Escolha a conservação deste tubo antes');
  END IF;
  IF NOT rc.separado THEN
    UPDATE apoio_recipiente SET separado = true, separado_em = now() WHERE id = rc.id;
    INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
    VALUES (c, 'apoio_recipiente', rc.id, 'SEPARADO_SACO', NULL, jsonb_build_object('conservacao', rc.conservacao), auth.uid());
  END IF;
  SELECT count(*) INTO faltam FROM apoio_recipiente WHERE remessa_id = _remessa AND NOT cancelado AND NOT separado;
  IF faltam = 0 THEN UPDATE apoio_remessa SET separada_em = coalesce(separada_em, now()) WHERE id = _remessa; END IF;
  RETURN jsonb_build_object('ok', true, 'conservacao', rc.conservacao, 'ja', rc.separado, 'faltam', faltam);
END $$;

-- Alerta de guarda: refrigerados/congelados transmitidos e não separados
CREATE OR REPLACE FUNCTION public.apoio_alerta_guarda()
RETURNS TABLE(conservacao text, tubos bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rc.conservacao, count(*) FROM apoio_recipiente rc
  JOIN apoio_remessa r ON r.id = rc.remessa_id JOIN apoio_laboratorio al ON al.id = r.apoio_id
  WHERE r.company_id = public.get_user_company_id(auth.uid()) AND rc.conservacao IN ('refrigerado','congelado')
    AND NOT rc.cancelado AND NOT rc.separado AND r.entregue_em IS NULL
    AND coalesce(r.transmitido_em, rc.created_at) < now() - make_interval(mins => al.alerta_guarda_min)
  GROUP BY rc.conservacao
$$;

-- Criar remessa: sem temperatura, com saída prevista
DROP FUNCTION IF EXISTS public.apoio_remessa_criar(uuid, text, uuid[]);
CREATE FUNCTION public.apoio_remessa_criar(_apoio uuid, _ids uuid[], _temperatura text DEFAULT NULL, _saida_prevista timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); al public.apoio_laboratorio%ROWTYPE; r public.apoio_remessa%ROWTYPE;
BEGIN
  SELECT * INTO al FROM public.apoio_laboratorio WHERE id = _apoio AND company_id = c AND ativo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratório de apoio não encontrado ou inativo'; END IF;
  IF coalesce(array_length(_ids,1),0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um exame'; END IF;
  INSERT INTO public.apoio_remessa (company_id, apoio_id, temperatura, saida_prevista, modo, criado_por, status)
  VALUES (c, _apoio, coalesce(_temperatura, 'ambiente'), _saida_prevista, CASE WHEN al.modo_contingencia THEN 'manual' ELSE 'automatico' END, auth.uid(), 'aberta')
  RETURNING * INTO r;
  PERFORM public.apoio_remessa_adicionar(r.id, _ids);
  RETURN jsonb_build_object('id', r.id, 'cod_lote_lab', r.cod_lote_lab);
END $$;

-- Entrega: bloqueio por separação, temperatura por saco, forçar com justificativa
DROP FUNCTION IF EXISTS public.apoio_remessa_entrega(uuid, text, timestamptz);
CREATE FUNCTION public.apoio_remessa_entrega(_remessa uuid, _entregue_a text, _entregue_em timestamptz, _sacos jsonb DEFAULT NULL, _forcar text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); r apoio_remessa%ROWTYPE; faixas jsonb; pend int; s jsonb; saida jsonb := '[]'::jsonb; t numeric; f jsonb; fora boolean; nc int := 0;
BEGIN
  IF length(trim(coalesce(_entregue_a,''))) = 0 THEN RAISE EXCEPTION 'Informe quem levou a remessa'; END IF;
  SELECT * INTO r FROM apoio_remessa WHERE id = _remessa AND company_id = c AND status <> 'cancelada';
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  SELECT faixas_temperatura INTO faixas FROM apoio_laboratorio WHERE id = r.apoio_id;
  SELECT count(*) INTO pend FROM apoio_recipiente WHERE remessa_id = r.id AND NOT cancelado AND (NOT separado OR coalesce(conservacao,'verificar') = 'verificar');
  IF pend > 0 AND length(trim(coalesce(_forcar,''))) < 5 THEN
    RAISE EXCEPTION 'Há % tubo(s) em "Verificar" ou não separado(s). Separe por temperatura ou force com justificativa.', pend;
  END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(coalesce(_sacos, '[]'::jsonb)) LOOP
    t := nullif(s->>'temperatura','')::numeric; f := faixas -> (s->>'conservacao');
    fora := t IS NOT NULL AND f IS NOT NULL AND ((f ? 'min' AND t < (f->>'min')::numeric) OR (f ? 'max' AND t > (f->>'max')::numeric));
    IF fora THEN nc := nc + 1; END IF;
    saida := saida || jsonb_build_array(s || jsonb_build_object('fora_da_faixa', fora, 'faixa', f));
  END LOOP;
  UPDATE apoio_remessa SET entregue_a = trim(_entregue_a), entregue_em = coalesce(_entregue_em, now()), entregue_registrado_por = auth.uid(),
    entrega_sacos = saida, entrega_forcada = CASE WHEN pend > 0 THEN trim(_forcar) ELSE NULL END WHERE id = r.id;
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (c, 'apoio_remessa', r.id, CASE WHEN nc > 0 THEN 'ENTREGA_NAO_CONFORMIDADE_TEMPERATURA' WHEN pend > 0 THEN 'ENTREGA_FORCADA' ELSE 'ENTREGA' END,
    jsonb_build_object('pendentes', pend), jsonb_build_object('sacos', saida, 'forcar', _forcar, 'nao_conformidades', nc), auth.uid());
  RETURN jsonb_build_object('ok', true, 'nao_conformidades', nc);
END $$;

-- Lista com sacos, saída prevista e separação
DROP FUNCTION IF EXISTS public.apoio_remessa_lista();
CREATE FUNCTION public.apoio_remessa_lista()
RETURNS TABLE(id uuid, cod_lote_lab bigint, apoio_id uuid, apoio_nome text, created_at timestamptz, criado_por_nome text, temperatura text, exames bigint, tubos bigint, status text, modo text, entregue_a text, entregue_em timestamptz, conferido_em timestamptz, transmitido_em timestamptz, conferencia_forcada text, conferir_apos_etiqueta boolean, saida_prevista timestamptz, separada_em timestamptz, sacos jsonb, previsto boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.cod_lote_lab, r.apoio_id, al.nome, r.created_at, pr.full_name, r.temperatura,
    (SELECT count(*) FROM public.apoio_pedido_exame pe WHERE pe.remessa_id = r.id),
    CASE WHEN EXISTS (SELECT 1 FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado)
      THEN (SELECT count(*) FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado)
      ELSE (SELECT count(DISTINCT pe.pedido_id) FROM public.apoio_pedido_exame pe WHERE pe.remessa_id = r.id) END,
    r.status, r.modo, r.entregue_a, r.entregue_em, r.conferido_em, r.transmitido_em, r.conferencia_forcada, al.conferir_apos_etiqueta,
    r.saida_prevista, r.separada_em,
    CASE WHEN EXISTS (SELECT 1 FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado)
      THEN (SELECT jsonb_object_agg(k, n) FROM (SELECT coalesce(rc.conservacao,'verificar') k, count(*) n FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado GROUP BY 1) q)
      ELSE (SELECT jsonb_object_agg(k, n) FROM (SELECT k, count(DISTINCT pedido_id) n FROM (
              SELECT pe.pedido_id, coalesce(nullif(d.conservacao,'nao_informado'),'nao_informado') k
              FROM public.apoio_pedido_exame pe LEFT JOIN public.apoio_depara_exame d ON d.apoio_id = pe.apoio_id AND d.exame_id = pe.exame_id AND d.ativo
              WHERE pe.remessa_id = r.id AND pe.status <> 'cancelado') z GROUP BY k) q) END,
    NOT EXISTS (SELECT 1 FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado)
  FROM public.apoio_remessa r JOIN public.apoio_laboratorio al ON al.id = r.apoio_id
  LEFT JOIN public.profiles pr ON pr.id = r.criado_por
  WHERE r.company_id = public.get_user_company_id(auth.uid())
  ORDER BY r.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.apoio_remessa_lista() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_remessa_criar(uuid, uuid[], text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_remessa_entrega(uuid, text, timestamptz, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_separar_bipar(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_conservacao_definir(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_conservacao_reprocessar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_alerta_guarda() TO authenticated;