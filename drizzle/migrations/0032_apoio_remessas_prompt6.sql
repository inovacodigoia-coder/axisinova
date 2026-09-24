
CREATE TABLE public.apoio_impressao_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unidade_id uuid NULL,
  impressora text NULL,
  tipo text NOT NULL CHECK (tipo IN ('etiqueta_epl','romaneio_pdf')),
  conteudo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','impresso','erro')),
  tentativas int NOT NULL DEFAULT 0,
  erro text NULL,
  referencia text NULL,
  criado_por uuid NULL DEFAULT auth.uid(),
  enviado_em timestamptz NULL,
  impresso_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apoio_impressao_fila_pend_idx ON public.apoio_impressao_fila (empresa_id, status, created_at);
GRANT SELECT, INSERT ON public.apoio_impressao_fila TO authenticated;
GRANT ALL ON public.apoio_impressao_fila TO service_role;
ALTER TABLE public.apoio_impressao_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY apoio_impressao_fila_select ON public.apoio_impressao_fila FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_company_id(auth.uid()));
CREATE POLICY apoio_impressao_fila_insert ON public.apoio_impressao_fila FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_company_id(auth.uid()) AND status = 'pendente'
    AND public.apoio_tem_permissao('apoio.remessa.operar'));
CREATE TRIGGER upd_apoio_impressao_fila BEFORE UPDATE ON public.apoio_impressao_fila
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apoio_impressao_reenfileirar(_empresa uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.apoio_impressao_fila SET status = 'pendente'
   WHERE status = 'enviado' AND enviado_em < now() - interval '2 minutes'
     AND (_empresa IS NULL OR empresa_id = _empresa);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.apoio_impressao_reenfileirar(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_impressao_reenfileirar(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.apoio_impressao_pegar(_empresa uuid, _limite int DEFAULT 20)
RETURNS SETOF public.apoio_impressao_fila LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.apoio_impressao_reenfileirar(_empresa);
  RETURN QUERY
  UPDATE public.apoio_impressao_fila f SET status = 'enviado', enviado_em = now(), tentativas = f.tentativas + 1
   WHERE f.id IN (SELECT q.id FROM public.apoio_impressao_fila q
                   WHERE q.empresa_id = _empresa AND q.status = 'pendente'
                   ORDER BY q.created_at LIMIT least(coalesce(_limite,20),20) FOR UPDATE SKIP LOCKED)
  RETURNING f.*;
END $$;
REVOKE ALL ON FUNCTION public.apoio_impressao_pegar(uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_impressao_pegar(uuid,int) TO service_role;

CREATE OR REPLACE FUNCTION public.apoio_exame_coletado(_pedido_exame_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((
    SELECT CASE
      WHEN m.marca IS NOT NULL THEN m.marca
      ELSE ao.status IN ('collection_done','in_analysis','validation','released','completed')
    END
    FROM public.apoio_pedido_exame pe
    JOIN public.attendance_orders ao ON ao.id = pe.pedido_id
    LEFT JOIN LATERAL (
      SELECT bool_or(coalesce((ex->>'collected')::boolean, (ex->>'isColeta')::boolean)) AS marca
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides)='array' THEN ao.lab_guides ELSE '[]'::jsonb END) g,
           jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams')='array' THEN g->'exams' ELSE '[]'::jsonb END) ex
      WHERE coalesce(ex->>'examId', ex->>'id') = pe.exame_id::text
        AND (ex ? 'collected' OR ex ? 'isColeta')
    ) m ON true
    WHERE pe.id = _pedido_exame_id
      AND (auth.uid() IS NULL OR pe.company_id = public.get_user_company_id(auth.uid()))
  ), false);
$$;

ALTER TABLE public.apoio_remessa ADD COLUMN IF NOT EXISTS bipados jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.apoio_remessa ADD COLUMN IF NOT EXISTS conferencia_forcada text NULL;
ALTER TABLE public.apoio_remessa ADD COLUMN IF NOT EXISTS entregue_registrado_por uuid NULL;
ALTER TABLE public.apoio_laboratorio ADD COLUMN IF NOT EXISTS conferir_apos_etiqueta boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apoio_codigo_aliquota(_pedido uuid, _apoio uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT upper(coalesce(ao.order_number, left(ao.id::text,8))) || '-AP' || (
    SELECT count(DISTINCT pe.apoio_id) FROM public.apoio_pedido_exame pe
     WHERE pe.pedido_id = _pedido AND pe.apoio_id::text <= _apoio::text)
  FROM public.attendance_orders ao WHERE ao.id = _pedido;
$$;

CREATE OR REPLACE FUNCTION public.apoio_item_material(_pedido uuid, _exame uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT coalesce(ex->>'material', ex->>'selectedMaterial', ex->>'materialName')
    FROM public.attendance_orders ao,
      jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides)='array' THEN ao.lab_guides ELSE '[]'::jsonb END) g,
      jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams')='array' THEN g->'exams' ELSE '[]'::jsonb END) ex
    WHERE ao.id = _pedido AND coalesce(ex->>'examId', ex->>'id') = _exame::text LIMIT 1), '');
$$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_checar(_perm boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF c IS NULL THEN RAISE EXCEPTION 'Usuário sem empresa'; END IF;
  IF NOT public.apoio_modulo_liberado(c) THEN RAISE EXCEPTION 'O módulo Apoio / Terceirização não foi liberado para esta empresa'; END IF;
  IF _perm AND NOT public.apoio_tem_permissao('apoio.remessa.operar') THEN
    RAISE EXCEPTION 'Você não tem a permissão "apoio.remessa.operar"';
  END IF;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_disponiveis(_apoio uuid DEFAULT NULL)
RETURNS TABLE(id uuid, pedido_id uuid, order_number text, paciente text, exame_id uuid, exame_nome text, material text,
              apoio_id uuid, apoio_nome text, codigo_apoio text, tubo text, criado_em timestamptz, prazo_previsto date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pe.id, pe.pedido_id, ao.order_number, coalesce(p.name, ao.patient_name, '') AS paciente,
         pe.exame_id, e.name, public.apoio_item_material(pe.pedido_id, pe.exame_id), pe.apoio_id, al.nome, pe.codigo_apoio,
         public.apoio_codigo_aliquota(pe.pedido_id, pe.apoio_id), pe.created_at, pe.prazo_previsto
  FROM public.apoio_pedido_exame pe
  JOIN public.attendance_orders ao ON ao.id = pe.pedido_id
  JOIN public.apoio_laboratorio al ON al.id = pe.apoio_id
  LEFT JOIN public.exams e ON e.id = pe.exame_id
  LEFT JOIN public.patients p ON p.id = ao.patient_id
  WHERE pe.company_id = public.get_user_company_id(auth.uid())
    AND pe.status = 'aguardando_remessa' AND pe.remessa_id IS NULL
    AND (_apoio IS NULL OR pe.apoio_id = _apoio)
    AND ao.status IN ('collection_done','in_analysis','validation','released','completed')
    AND public.apoio_exame_coletado(pe.id)
  ORDER BY 4, 3, 6;
$$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_adicionar(_remessa uuid, _ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); r public.apoio_remessa%ROWTYPE; pe record; n int := 0;
BEGIN
  SELECT * INTO r FROM public.apoio_remessa WHERE id = _remessa AND company_id = c FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  IF r.status NOT IN ('aberta','conferida') THEN RAISE EXCEPTION 'Só é possível adicionar exames em remessa aberta'; END IF;
  FOR pe IN SELECT d.id FROM public.apoio_remessa_disponiveis(r.apoio_id) d WHERE d.id = ANY(_ids) LOOP
    PERFORM public.apoio_mudar_status(pe.id, 'em_remessa', 'sistema', NULL,
      jsonb_build_object('remessa_id', r.id, 'cod_lote_lab', r.cod_lote_lab));
    UPDATE public.apoio_pedido_exame SET remessa_id = r.id WHERE id = pe.id;
    n := n + 1;
  END LOOP;
  IF n < coalesce(array_length(_ids,1),0) THEN
    RAISE EXCEPTION 'Alguns exames não estão disponíveis (sem coleta registrada, de outro apoio ou já em remessa)';
  END IF;
  IF r.status = 'conferida' THEN
    UPDATE public.apoio_remessa SET status = 'aberta', conferido_em = NULL, conferido_por = NULL, conferencia_forcada = NULL WHERE id = r.id;
  END IF;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_criar(_apoio uuid, _temperatura text, _ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); al public.apoio_laboratorio%ROWTYPE; r public.apoio_remessa%ROWTYPE;
BEGIN
  SELECT * INTO al FROM public.apoio_laboratorio WHERE id = _apoio AND company_id = c AND ativo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratório de apoio não encontrado ou inativo'; END IF;
  IF coalesce(array_length(_ids,1),0) = 0 THEN RAISE EXCEPTION 'Selecione ao menos um exame'; END IF;
  INSERT INTO public.apoio_remessa (company_id, apoio_id, temperatura, modo, criado_por, status)
  VALUES (c, _apoio, _temperatura, CASE WHEN al.modo_contingencia THEN 'manual' ELSE 'automatico' END, auth.uid(), 'aberta')
  RETURNING * INTO r;
  PERFORM public.apoio_remessa_adicionar(r.id, _ids);
  RETURN jsonb_build_object('id', r.id, 'cod_lote_lab', r.cod_lote_lab);
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_remover(_pedido_exame uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); pe public.apoio_pedido_exame%ROWTYPE; r public.apoio_remessa%ROWTYPE;
BEGIN
  SELECT * INTO pe FROM public.apoio_pedido_exame WHERE id = _pedido_exame AND company_id = c;
  IF NOT FOUND OR pe.remessa_id IS NULL THEN RAISE EXCEPTION 'Exame não está em remessa'; END IF;
  SELECT * INTO r FROM public.apoio_remessa WHERE id = pe.remessa_id FOR UPDATE;
  IF r.status NOT IN ('aberta','conferida') THEN RAISE EXCEPTION 'Só é possível remover exames de remessa aberta'; END IF;
  PERFORM public.apoio_mudar_status(pe.id, 'aguardando_remessa', 'sistema', NULL,
    jsonb_build_object('removido_da_remessa', r.cod_lote_lab));
  UPDATE public.apoio_pedido_exame SET remessa_id = NULL WHERE id = pe.id;
  UPDATE public.apoio_remessa x SET status = 'aberta', conferido_em = NULL, conferido_por = NULL, conferencia_forcada = NULL,
    bipados = (SELECT coalesce(jsonb_agg(b), '[]'::jsonb) FROM jsonb_array_elements_text(x.bipados) b
               WHERE b IN (SELECT public.apoio_codigo_aliquota(y.pedido_id, y.apoio_id) FROM public.apoio_pedido_exame y WHERE y.remessa_id = r.id))
  WHERE x.id = r.id;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_tubos(_remessa uuid)
RETURNS TABLE(codigo text, pedido_id uuid, order_number text, paciente text, exames text, bipado boolean, pos_transmissao boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.apoio_remessa%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.apoio_remessa WHERE id = _remessa AND company_id = public.get_user_company_id(auth.uid());
  IF NOT FOUND THEN RETURN; END IF;
  IF r.status IN ('transmitida','parcial','manual') AND EXISTS (SELECT 1 FROM public.apoio_recipiente rc0 WHERE rc0.remessa_id = r.id AND NOT rc0.cancelado) THEN
    RETURN QUERY SELECT rc.cod_bar_apoio, NULL::uuid, rc.cod_ped_apoio, ''::text,
      (SELECT string_agg(coalesce(e.name, pe.codigo_apoio), ', ') FROM public.apoio_pedido_exame pe LEFT JOIN public.exams e ON e.id = pe.exame_id WHERE pe.recipiente_id = rc.id),
      rc.bipado, true
    FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado ORDER BY rc.cod_bar_apoio;
  ELSE
    RETURN QUERY SELECT t.codigo, t.pedido_id, max(t.order_number), max(t.paciente), string_agg(t.exame, ', '),
      r.bipados ? t.codigo, false
    FROM (SELECT public.apoio_codigo_aliquota(pe.pedido_id, pe.apoio_id) AS codigo, pe.pedido_id, ao.order_number,
                 coalesce(p.name, ao.patient_name, '') AS paciente, coalesce(e.name, pe.codigo_apoio) AS exame
          FROM public.apoio_pedido_exame pe JOIN public.attendance_orders ao ON ao.id = pe.pedido_id
          LEFT JOIN public.patients p ON p.id = ao.patient_id LEFT JOIN public.exams e ON e.id = pe.exame_id
          WHERE pe.remessa_id = r.id) t
    GROUP BY t.codigo, t.pedido_id ORDER BY 3;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_bipar(_remessa uuid, _codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); r public.apoio_remessa%ROWTYPE; cod text := upper(trim(coalesce(_codigo,'')));
  pos boolean; existe boolean; ja boolean; faltam int; total int;
BEGIN
  SELECT * INTO r FROM public.apoio_remessa WHERE id = _remessa AND company_id = c FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  IF r.status IN ('cancelada','transmitindo') THEN RAISE EXCEPTION 'Remessa não pode ser conferida neste status'; END IF;
  SELECT bool_or(t.pos_transmissao), bool_or(upper(t.codigo) = cod), bool_or(upper(t.codigo) = cod AND t.bipado)
    INTO pos, existe, ja FROM public.apoio_remessa_tubos(r.id) t;
  IF NOT coalesce(existe,false) THEN
    RETURN jsonb_build_object('resultado','nao_pertence','codigo',cod);
  END IF;
  IF NOT coalesce(ja,false) THEN
    IF pos THEN
      UPDATE public.apoio_recipiente SET bipado = true, bipado_em = now() WHERE remessa_id = r.id AND upper(cod_bar_apoio) = cod;
    ELSE
      UPDATE public.apoio_remessa SET bipados = bipados || to_jsonb(cod) WHERE id = r.id;
    END IF;
  END IF;
  SELECT count(*), count(*) FILTER (WHERE NOT t.bipado) INTO total, faltam FROM public.apoio_remessa_tubos(r.id) t;
  IF faltam = 0 AND r.status = 'aberta' THEN
    UPDATE public.apoio_remessa SET status = 'conferida', conferido_em = now(), conferido_por = auth.uid() WHERE id = r.id;
  END IF;
  RETURN jsonb_build_object('resultado', CASE WHEN ja THEN 'repetido' ELSE 'ok' END, 'codigo', cod, 'faltam', faltam, 'total', total);
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_forcar_conferencia(_remessa uuid, _justificativa text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar();
BEGIN
  IF NOT public.is_company_manager(auth.uid()) THEN RAISE EXCEPTION 'Só um administrador pode forçar a conferência'; END IF;
  IF length(trim(coalesce(_justificativa,''))) < 5 THEN RAISE EXCEPTION 'Informe a justificativa'; END IF;
  UPDATE public.apoio_remessa SET status = 'conferida', conferido_em = now(), conferido_por = auth.uid(), conferencia_forcada = trim(_justificativa)
   WHERE id = _remessa AND company_id = c AND status = 'aberta';
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não está aberta'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_cancelar(_remessa uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); r public.apoio_remessa%ROWTYPE; pe record; n int := 0;
BEGIN
  SELECT * INTO r FROM public.apoio_remessa WHERE id = _remessa AND company_id = c FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  IF r.status NOT IN ('aberta','conferida','erro') THEN RAISE EXCEPTION 'Remessa já transmitida não pode ser cancelada'; END IF;
  FOR pe IN SELECT x.id FROM public.apoio_pedido_exame x WHERE x.remessa_id = r.id AND x.status = 'em_remessa' LOOP
    PERFORM public.apoio_mudar_status(pe.id, 'aguardando_remessa', 'sistema', NULL, jsonb_build_object('remessa_cancelada', r.cod_lote_lab));
    UPDATE public.apoio_pedido_exame SET remessa_id = NULL WHERE id = pe.id;
    n := n + 1;
  END LOOP;
  UPDATE public.apoio_remessa SET status = 'cancelada' WHERE id = r.id;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_entrega(_remessa uuid, _entregue_a text, _entregue_em timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar();
BEGIN
  IF length(trim(coalesce(_entregue_a,''))) = 0 THEN RAISE EXCEPTION 'Informe quem levou a remessa'; END IF;
  UPDATE public.apoio_remessa SET entregue_a = trim(_entregue_a), entregue_em = coalesce(_entregue_em, now()), entregue_registrado_por = auth.uid()
   WHERE id = _remessa AND company_id = c AND status <> 'cancelada';
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_lista()
RETURNS TABLE(id uuid, cod_lote_lab bigint, apoio_id uuid, apoio_nome text, created_at timestamptz, criado_por_nome text,
  temperatura text, exames bigint, tubos bigint, status text, modo text, entregue_a text, entregue_em timestamptz,
  conferido_em timestamptz, transmitido_em timestamptz, conferencia_forcada text, conferir_apos_etiqueta boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.cod_lote_lab, r.apoio_id, al.nome, r.created_at, pr.full_name, r.temperatura,
    (SELECT count(*) FROM public.apoio_pedido_exame pe WHERE pe.remessa_id = r.id),
    CASE WHEN EXISTS (SELECT 1 FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado)
      THEN (SELECT count(*) FROM public.apoio_recipiente rc WHERE rc.remessa_id = r.id AND NOT rc.cancelado)
      ELSE (SELECT count(DISTINCT pe.pedido_id) FROM public.apoio_pedido_exame pe WHERE pe.remessa_id = r.id) END,
    r.status, r.modo, r.entregue_a, r.entregue_em, r.conferido_em, r.transmitido_em, r.conferencia_forcada, al.conferir_apos_etiqueta
  FROM public.apoio_remessa r JOIN public.apoio_laboratorio al ON al.id = r.apoio_id
  LEFT JOIN public.profiles pr ON pr.id = r.criado_por
  WHERE r.company_id = public.get_user_company_id(auth.uid())
  ORDER BY r.cod_lote_lab DESC;
$$;

REVOKE ALL ON FUNCTION public.apoio_remessa_checar(boolean), public.apoio_item_material(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apoio_remessa_disponiveis(uuid), public.apoio_remessa_adicionar(uuid,uuid[]),
  public.apoio_remessa_criar(uuid,text,uuid[]), public.apoio_remessa_remover(uuid), public.apoio_remessa_tubos(uuid),
  public.apoio_remessa_bipar(uuid,text), public.apoio_remessa_forcar_conferencia(uuid,text), public.apoio_remessa_cancelar(uuid),
  public.apoio_remessa_entrega(uuid,text,timestamptz), public.apoio_remessa_lista(), public.apoio_codigo_aliquota(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apoio_remessa_disponiveis(uuid), public.apoio_remessa_adicionar(uuid,uuid[]),
  public.apoio_remessa_criar(uuid,text,uuid[]), public.apoio_remessa_remover(uuid), public.apoio_remessa_tubos(uuid),
  public.apoio_remessa_bipar(uuid,text), public.apoio_remessa_forcar_conferencia(uuid,text), public.apoio_remessa_cancelar(uuid),
  public.apoio_remessa_entrega(uuid,text,timestamptz), public.apoio_remessa_lista(), public.apoio_codigo_aliquota(uuid,uuid),
  public.apoio_remessa_checar(boolean), public.apoio_item_material(uuid,uuid) TO authenticated, service_role;
