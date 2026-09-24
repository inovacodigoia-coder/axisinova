CREATE OR REPLACE FUNCTION public.apoio_tem_permissao(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'apoio','[]'::jsonb) ? _perm));
$$;

CREATE OR REPLACE FUNCTION pg_temp.apoio_reset_write(_t text, _perm_expr text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE base text := format('company_id = public.get_user_company_id(auth.uid()) AND public.apoio_modulo_liberado(company_id) AND (%s)', _perm_expr);
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _t||'_insert', _t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _t||'_update', _t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', _t||'_delete', _t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', _t||'_insert', _t, base);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', _t||'_update', _t, base, base);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', _t||'_delete', _t, base);
END $$;

SELECT pg_temp.apoio_reset_write('apoio_laboratorio', $x$public.apoio_tem_permissao('apoio.laboratorio.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_certificacao', $x$public.apoio_tem_permissao('apoio.laboratorio.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_status_map', $x$public.apoio_tem_permissao('apoio.laboratorio.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_catalogo_exame', $x$public.apoio_tem_permissao('apoio.catalogo.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_preco', $x$public.apoio_tem_permissao('apoio.catalogo.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_preco_importacao', $x$public.apoio_tem_permissao('apoio.catalogo.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_depara_exame', $x$public.apoio_tem_permissao('apoio.depara.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_depara_analito', $x$public.apoio_tem_permissao('apoio.depara.gerenciar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_remessa', $x$public.apoio_tem_permissao('apoio.remessa.operar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_recipiente', $x$public.apoio_tem_permissao('apoio.remessa.operar')$x$);
SELECT pg_temp.apoio_reset_write('apoio_resultado_versao', $x$public.apoio_tem_permissao('apoio.manual.operar') OR public.apoio_tem_permissao('apoio.resultado.conferir')$x$);
SELECT pg_temp.apoio_reset_write('apoio_documento', $x$public.apoio_tem_permissao('apoio.manual.operar') OR public.apoio_tem_permissao('apoio.resultado.conferir')$x$);
SELECT pg_temp.apoio_reset_write('apoio_pendencia_tecnica', $x$public.apoio_tem_permissao('apoio.manual.operar') OR public.apoio_tem_permissao('apoio.resultado.conferir')$x$);

DROP POLICY IF EXISTS apoio_pedido_exame_insert ON public.apoio_pedido_exame;
DROP POLICY IF EXISTS apoio_pedido_exame_update ON public.apoio_pedido_exame;
DROP POLICY IF EXISTS apoio_pedido_exame_delete ON public.apoio_pedido_exame;
CREATE POLICY apoio_pedido_exame_update ON public.apoio_pedido_exame FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_modulo_liberado(company_id)
         AND (public.apoio_tem_permissao('apoio.remessa.operar') OR public.apoio_tem_permissao('apoio.manual.operar')))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
REVOKE INSERT, DELETE ON public.apoio_pedido_exame FROM authenticated, anon;

REVOKE SELECT ON public.apoio_pedido_exame FROM authenticated, anon;
GRANT SELECT (id, company_id, pedido_id, exame_id, amostra_id, apoio_id, codigo_apoio, sequencial, remessa_id, recipiente_id,
  cod_ped_apoio, status, status_apoio_cod, status_apoio_desc, status_apoio_em, modo, prazo_previsto, preco_ficticio,
  info_complementar, erro, critico, responsavel_id, created_at, updated_at) ON public.apoio_pedido_exame TO authenticated;

DROP POLICY IF EXISTS apoio_preco_select ON public.apoio_preco;
CREATE POLICY apoio_preco_select ON public.apoio_preco FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
         AND (public.apoio_tem_permissao('apoio.financeiro.ver') OR public.apoio_tem_permissao('apoio.catalogo.gerenciar')));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['apoio_chamada_log','apoio_cursor','apoio_erro'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_delete', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM authenticated, anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS apoio_visao_kanban_write ON public.apoio_visao_kanban;
CREATE POLICY apoio_visao_kanban_insert ON public.apoio_visao_kanban FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid())
    AND ((dono_id = auth.uid() AND NOT coalesce(compartilhada,false)) OR public.is_company_manager(auth.uid())));
CREATE POLICY apoio_visao_kanban_update ON public.apoio_visao_kanban FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
    AND (dono_id = auth.uid() OR (coalesce(compartilhada,false) AND public.is_company_manager(auth.uid()))))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid())
    AND ((dono_id = auth.uid() AND NOT coalesce(compartilhada,false)) OR public.is_company_manager(auth.uid())));
CREATE POLICY apoio_visao_kanban_delete ON public.apoio_visao_kanban FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
    AND (dono_id = auth.uid() OR (coalesce(compartilhada,false) AND public.is_company_manager(auth.uid()))));

CREATE TABLE public.feriado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  data date NOT NULL,
  descricao text NOT NULL,
  abrangencia text NOT NULL DEFAULT 'nacional' CHECK (abrangencia IN ('nacional','estadual','municipal')),
  uf text,
  municipio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX feriado_unq ON public.feriado (coalesce(company_id,'00000000-0000-0000-0000-000000000000'::uuid), data, abrangencia, coalesce(uf,''), coalesce(municipio,''));
CREATE INDEX feriado_data_idx ON public.feriado (data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feriado TO authenticated;
GRANT ALL ON public.feriado TO service_role;
ALTER TABLE public.feriado ENABLE ROW LEVEL SECURITY;
CREATE POLICY feriado_select ON public.feriado FOR SELECT TO authenticated
  USING (company_id IS NULL OR company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY feriado_insert ON public.feriado FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND abrangencia IN ('estadual','municipal'));
CREATE POLICY feriado_update ON public.feriado FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND abrangencia IN ('estadual','municipal'));
CREATE POLICY feriado_delete ON public.feriado FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE TRIGGER upd_feriado BEFORE UPDATE ON public.feriado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.data_pascoa(_ano int) RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int; mes int; dia int;
BEGIN
  a := _ano % 19; b := _ano / 100; c := _ano % 100; d := b / 4; e := b % 4;
  f := (b + 8) / 25; g := (b - f + 1) / 3; h := (19*a + b - d - g + 15) % 30;
  i := c / 4; k := c % 4; l := (32 + 2*e + 2*i - h - k) % 7; m := (a + 11*h + 22*l) / 451;
  mes := (h + l - 7*m + 114) / 31; dia := ((h + l - 7*m + 114) % 31) + 1;
  RETURN make_date(_ano, mes, dia);
END $$;

CREATE OR REPLACE FUNCTION public.carregar_feriados_nacionais(_ano int) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p date := public.data_pascoa(_ano); n int;
BEGIN
  IF _ano < 2000 OR _ano > 2100 THEN RAISE EXCEPTION 'Ano inválido'; END IF;
  INSERT INTO public.feriado (company_id, data, descricao, abrangencia)
  SELECT NULL, d, t, 'nacional' FROM (VALUES
    (make_date(_ano,1,1),'Confraternização Universal'),
    (p - 48,'Carnaval (segunda-feira)'),
    (p - 47,'Carnaval (terça-feira)'),
    (p - 2,'Sexta-feira Santa'),
    (make_date(_ano,4,21),'Tiradentes'),
    (make_date(_ano,5,1),'Dia do Trabalho'),
    (p + 60,'Corpus Christi'),
    (make_date(_ano,9,7),'Independência do Brasil'),
    (make_date(_ano,10,12),'Nossa Senhora Aparecida'),
    (make_date(_ano,11,2),'Finados'),
    (make_date(_ano,11,15),'Proclamação da República'),
    (make_date(_ano,11,20),'Dia Nacional de Zumbi e da Consciência Negra'),
    (make_date(_ano,12,25),'Natal')
  ) v(d,t)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.carregar_feriados_nacionais(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.carregar_feriados_nacionais(int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.eh_dia_util(_company_id uuid, _d date) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT extract(isodow FROM _d) < 6 AND NOT EXISTS (
    SELECT 1 FROM public.feriado f WHERE f.data = _d AND (f.company_id IS NULL OR f.company_id = _company_id));
$$;

CREATE OR REPLACE FUNCTION public.somar_dias_uteis(_company_id uuid, _data_inicial date, _dias int) RETURNS date
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c uuid := coalesce(_company_id, public.get_user_company_id(auth.uid())); d date := _data_inicial; n int := 0;
BEGIN
  IF _data_inicial IS NULL THEN RETURN NULL; END IF;
  IF coalesce(_dias,0) <= 0 THEN RETURN _data_inicial; END IF;
  IF _dias > 3650 THEN RAISE EXCEPTION 'Prazo muito longo'; END IF;
  WHILE n < _dias LOOP
    d := d + 1;
    IF public.eh_dia_util(c, d) THEN n := n + 1; END IF;
  END LOOP;
  RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.somar_dias_uteis(uuid,date,int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.somar_dias_uteis(uuid,date,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apoio_dias_uteis(_company_id uuid, _de date, _ate date) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN _ate <= _de THEN 0 ELSE
    (SELECT count(*)::int FROM generate_series(_de + 1, _ate, interval '1 day') g WHERE public.eh_dia_util(_company_id, g::date)) END;
$$;

CREATE OR REPLACE FUNCTION public.apoio_pedido_exame_prazo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE dias int;
BEGIN
  IF NEW.prazo_previsto IS NULL THEN
    SELECT e.result_deadline_days INTO dias FROM public.exams e WHERE e.id = NEW.exame_id;
    IF dias IS NOT NULL THEN
      NEW.prazo_previsto := public.somar_dias_uteis(NEW.company_id, (now() AT TIME ZONE 'America/Sao_Paulo')::date, dias);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_pedido_exame_prazo BEFORE INSERT ON public.apoio_pedido_exame
  FOR EACH ROW EXECUTE FUNCTION public.apoio_pedido_exame_prazo();

CREATE OR REPLACE FUNCTION public.apoio_custo_previsto(_pedido_exame_id uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT pe.custo_previsto FROM public.apoio_pedido_exame pe
  WHERE pe.id = _pedido_exame_id
    AND pe.company_id = public.get_user_company_id(auth.uid())
    AND (public.apoio_tem_permissao('apoio.financeiro.ver') OR public.apoio_tem_permissao('apoio.catalogo.gerenciar'));
$$;

CREATE OR REPLACE VIEW public.apoio_pedido_exame_v WITH (security_invoker = true) AS
 SELECT pe.id, pe.company_id, pe.pedido_id, pe.exame_id, pe.amostra_id, pe.apoio_id, pe.codigo_apoio, pe.sequencial,
    pe.remessa_id, pe.recipiente_id, pe.cod_ped_apoio, pe.status, pe.status_apoio_cod, pe.status_apoio_desc, pe.status_apoio_em,
    pe.modo, pe.prazo_previsto, public.apoio_custo_previsto(pe.id)::numeric(12,2) AS custo_previsto, pe.preco_ficticio, pe.info_complementar,
    pe.erro, pe.critico, pe.responsavel_id, pe.created_at, pe.updated_at,
    ao.protocol AS pedido_protocolo, ao.order_number AS pedido_numero, ao.patient_id,
    COALESCE(p.name, ao.patient_name) AS paciente_nome, e.name AS exame_nome, al.nome AS apoio_nome,
    rm.cod_lote_lab, rm.status AS remessa_status,
    CASE
      WHEN pe.prazo_previsto IS NULL OR pe.status = ANY (ARRAY['liberado_local'::apoio_status,'cancelado'::apoio_status]) THEN NULL::text
      WHEN pe.prazo_previsto < CURRENT_DATE THEN 'atrasado'
      WHEN pe.prazo_previsto = CURRENT_DATE THEN 'vence_hoje'
      WHEN public.apoio_dias_uteis(pe.company_id, CURRENT_DATE, pe.prazo_previsto) <= 1 THEN 'vence_amanha'
      ELSE 'no_prazo'
    END AS situacao_prazo,
    CASE
      WHEN pe.prazo_previsto IS NOT NULL AND pe.prazo_previsto < CURRENT_DATE
        AND pe.status <> ALL (ARRAY['liberado_local'::apoio_status,'cancelado'::apoio_status])
      THEN public.apoio_dias_uteis(pe.company_id, pe.prazo_previsto, CURRENT_DATE)
      ELSE 0
    END AS dias_em_atraso
   FROM apoio_pedido_exame pe
     JOIN attendance_orders ao ON ao.id = pe.pedido_id
     LEFT JOIN patients p ON p.id = ao.patient_id
     LEFT JOIN exams e ON e.id = pe.exame_id
     JOIN apoio_laboratorio al ON al.id = pe.apoio_id
     LEFT JOIN apoio_remessa rm ON rm.id = pe.remessa_id;

CREATE OR REPLACE FUNCTION public.apoio_mudar_status(p_pedido_exame_id uuid, p_status_novo apoio_status, p_origem text, p_motivo text DEFAULT NULL::text, p_dados jsonb DEFAULT NULL::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  r public.apoio_pedido_exame%ROWTYPE;
  de public.apoio_status;
  ok boolean := false;
  fluxo text[] := ARRAY['aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','liberado_apoio','importado','liberado_local'];
  pre_lib text[] := ARRAY['aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','erro_transmissao','pendencia_tecnica','nova_coleta'];
BEGIN
  SELECT * INTO r FROM public.apoio_pedido_exame WHERE id = p_pedido_exame_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame de apoio não encontrado'; END IF;
  IF auth.uid() IS NOT NULL AND r.company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para este exame';
  END IF;
  IF NOT public.apoio_modulo_liberado(r.company_id) THEN
    RAISE EXCEPTION 'O módulo Apoio / Terceirização não foi liberado para esta empresa';
  END IF;
  IF p_origem NOT IN ('sistema','integracao','manual') THEN
    RAISE EXCEPTION 'Origem inválida: %', p_origem;
  END IF;
  IF p_origem = 'manual' AND nullif(trim(coalesce(p_motivo,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo da alteração manual de status';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF p_origem = 'manual' THEN
      IF NOT public.apoio_tem_permissao('apoio.manual.operar') THEN
        RAISE EXCEPTION 'Você não tem a permissão "apoio.manual.operar" para alterar status manualmente';
      END IF;
    ELSIF p_origem = 'integracao' THEN
      RAISE EXCEPTION 'Origem "integracao" só pode ser usada pelas integrações do sistema';
    ELSIF p_status_novo IN ('em_remessa','transmitido','erro_transmissao','aguardando_remessa','recebido_apoio') THEN
      IF NOT public.apoio_tem_permissao('apoio.remessa.operar') THEN
        RAISE EXCEPTION 'Você não tem a permissão "apoio.remessa.operar"';
      END IF;
    ELSIF NOT (public.apoio_tem_permissao('apoio.resultado.conferir') OR public.apoio_tem_permissao('apoio.manual.operar')) THEN
      RAISE EXCEPTION 'Você não tem a permissão "apoio.resultado.conferir"';
    END IF;
  END IF;

  de := r.status;
  IF de = p_status_novo THEN RAISE EXCEPTION 'O exame já está neste status'; END IF;

  IF array_position(fluxo, de::text) IS NOT NULL
     AND array_position(fluxo, p_status_novo::text) = array_position(fluxo, de::text) + 1 THEN ok := true; END IF;
  IF p_status_novo IN ('pendencia_tecnica','nova_coleta','cancelado') AND de::text = ANY(pre_lib) THEN ok := true; END IF;
  IF de = 'pendencia_tecnica' AND p_status_novo IN ('em_analise','recebido_apoio','liberado_apoio') THEN ok := true; END IF;
  IF de = 'nova_coleta' AND p_status_novo = 'aguardando_remessa' THEN ok := true; END IF;
  IF de = 'em_remessa' AND p_status_novo IN ('erro_transmissao','aguardando_remessa') THEN ok := true; END IF;
  IF de = 'erro_transmissao' AND p_status_novo = 'em_remessa' THEN ok := true; END IF;
  IF de = 'importado' AND p_status_novo = 'importado_com_pendencia' THEN ok := true; END IF;
  IF de = 'importado_com_pendencia' AND p_status_novo = 'importado' THEN ok := true; END IF;
  IF de = 'liberado_apoio' AND p_status_novo = 'importado_com_pendencia' THEN ok := true; END IF;
  IF de = 'liberado_local' AND p_status_novo = 'importado' THEN ok := true; END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'Transição de status não permitida: de "%" para "%"', de, p_status_novo;
  END IF;

  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE public.apoio_pedido_exame SET status = p_status_novo WHERE id = r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);

  INSERT INTO public.apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id, dados)
  VALUES (r.company_id, r.id, de, p_status_novo, p_origem, p_motivo, auth.uid(), p_dados);
END $function$;

CREATE OR REPLACE FUNCTION public.apoio_exame_coletado(_pedido_exame_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((
    SELECT ao.status IN ('collection_done','in_analysis','validation','released','completed')
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides)='array' THEN ao.lab_guides ELSE '[]'::jsonb END) g,
               jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams')='array' THEN g->'exams' ELSE '[]'::jsonb END) ex
          WHERE (ex->>'id') = pe.exame_id::text
            AND (coalesce((ex->>'collected')::boolean,false) OR coalesce((ex->>'isColeta')::boolean,false)))
    FROM public.apoio_pedido_exame pe
    JOIN public.attendance_orders ao ON ao.id = pe.pedido_id
    WHERE pe.id = _pedido_exame_id
      AND (auth.uid() IS NULL OR pe.company_id = public.get_user_company_id(auth.uid()))
  ), false);
$$;
REVOKE ALL ON FUNCTION public.apoio_exame_coletado(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apoio_exame_coletado(uuid) TO authenticated, service_role;