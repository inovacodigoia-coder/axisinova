ALTER TABLE public.lab_settings ADD COLUMN IF NOT EXISTS prazo_contagem_padrao text NOT NULL DEFAULT 'corridos',
  ADD COLUMN IF NOT EXISTS sabado_dia_util boolean NOT NULL DEFAULT false;
ALTER TABLE public.lab_settings ADD CONSTRAINT lab_settings_prazo_contagem_chk CHECK (prazo_contagem_padrao IN ('corridos','uteis'));

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS prazo_contagem text NOT NULL DEFAULT 'corridos';
ALTER TABLE public.exams ADD CONSTRAINT exams_prazo_contagem_chk CHECK (prazo_contagem IN ('corridos','uteis'));

ALTER TABLE public.apoio_laboratorio ADD COLUMN IF NOT EXISTS prazo_contagem text NOT NULL DEFAULT 'uteis';
ALTER TABLE public.apoio_laboratorio ADD CONSTRAINT apoio_laboratorio_prazo_contagem_chk CHECK (prazo_contagem IN ('corridos','uteis'));

ALTER TABLE public.apoio_catalogo_exame ADD COLUMN IF NOT EXISTS prazo_dias integer;

ALTER TABLE public.apoio_pedido_exame ADD COLUMN IF NOT EXISTS prazo_contagem text NOT NULL DEFAULT 'uteis';
ALTER TABLE public.apoio_pedido_exame ADD CONSTRAINT apoio_pedido_exame_prazo_contagem_chk CHECK (prazo_contagem IN ('corridos','uteis'));

CREATE OR REPLACE FUNCTION public.eh_dia_util(_company_id uuid, _d date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT extract(isodow FROM _d) <> 7
    AND (extract(isodow FROM _d) <> 6 OR coalesce((SELECT ls.sabado_dia_util FROM public.lab_settings ls WHERE ls.company_id = _company_id LIMIT 1), false))
    AND NOT EXISTS (SELECT 1 FROM public.feriado f WHERE f.data = _d AND (f.company_id IS NULL OR f.company_id = _company_id));
$$;

CREATE OR REPLACE FUNCTION public.calcular_prazo(_company_id uuid, _data_inicial date, _dias integer, _contagem text)
RETURNS date LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c uuid := coalesce(_company_id, public.get_user_company_id(auth.uid())); d date := _data_inicial; n int := 0;
BEGIN
  IF _data_inicial IS NULL THEN RETURN NULL; END IF;
  IF coalesce(_dias,0) <= 0 THEN RETURN _data_inicial; END IF;
  IF _dias > 3650 THEN RAISE EXCEPTION 'Prazo muito longo'; END IF;
  IF coalesce(_contagem,'corridos') = 'corridos' THEN RETURN _data_inicial + _dias; END IF;
  IF _contagem <> 'uteis' THEN RAISE EXCEPTION 'Contagem inválida: %', _contagem; END IF;
  WHILE n < _dias LOOP
    d := d + 1;
    IF public.eh_dia_util(c, d) THEN n := n + 1; END IF;
  END LOOP;
  RETURN d;
END $$;
GRANT EXECUTE ON FUNCTION public.calcular_prazo(uuid, date, integer, text) TO authenticated, service_role;

-- Dias entre duas datas na contagem escolhida (usado na view)
CREATE OR REPLACE FUNCTION public.contar_dias_prazo(_company_id uuid, _de date, _ate date, _contagem text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN _ate <= _de THEN 0
    WHEN coalesce(_contagem,'corridos') = 'corridos' THEN (_ate - _de)
    ELSE (SELECT count(*)::int FROM generate_series(_de + 1, _ate, interval '1 day') g WHERE public.eh_dia_util(_company_id, g::date)) END;
$$;

-- Compatibilidade: antigas chamadas passam pela função única
CREATE OR REPLACE FUNCTION public.somar_dias_uteis(_company_id uuid, _data_inicial date, _dias integer)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.calcular_prazo(_company_id, _data_inicial, _dias, 'uteis');
$$;
COMMENT ON FUNCTION public.somar_dias_uteis(uuid, date, integer) IS 'DEPRECATED: use calcular_prazo(company_id, data, dias, contagem)';

CREATE OR REPLACE FUNCTION public.apoio_pedido_exame_prazo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE dias int; transp int; cont text;
BEGIN
  SELECT al.dias_transporte, al.prazo_contagem INTO transp, cont FROM public.apoio_laboratorio al WHERE al.id = NEW.apoio_id;
  NEW.prazo_contagem := coalesce(cont, 'uteis');
  IF NEW.prazo_previsto IS NULL THEN
    SELECT ce.prazo_dias INTO dias FROM public.apoio_catalogo_exame ce
      WHERE ce.apoio_id = NEW.apoio_id AND ce.codigo = NEW.codigo_apoio AND ce.prazo_dias IS NOT NULL LIMIT 1;
    IF dias IS NULL THEN SELECT e.result_deadline_days INTO dias FROM public.exams e WHERE e.id = NEW.exame_id; END IF;
    IF dias IS NOT NULL THEN
      NEW.prazo_previsto := public.calcular_prazo(NEW.company_id, (now() AT TIME ZONE 'America/Sao_Paulo')::date, dias + coalesce(transp, 0), NEW.prazo_contagem);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE VIEW public.apoio_pedido_exame_v WITH (security_invoker = true) AS
 SELECT pe.id, pe.company_id, pe.pedido_id, pe.exame_id, pe.amostra_id, pe.apoio_id, pe.codigo_apoio, pe.sequencial,
    pe.remessa_id, pe.recipiente_id, pe.cod_ped_apoio, pe.status, pe.status_apoio_cod, pe.status_apoio_desc, pe.status_apoio_em,
    pe.modo, pe.prazo_previsto,
    (public.apoio_custo_previsto(pe.id))::numeric(12,2) AS custo_previsto,
    pe.preco_ficticio, pe.info_complementar, pe.erro, pe.critico, pe.responsavel_id, pe.created_at, pe.updated_at,
    ao.protocol AS pedido_protocolo, ao.order_number AS pedido_numero, ao.patient_id,
    COALESCE(p.name, ao.patient_name) AS paciente_nome, e.name AS exame_nome, al.nome AS apoio_nome,
    rm.cod_lote_lab, rm.status AS remessa_status,
    CASE
      WHEN pe.prazo_previsto IS NULL OR pe.status = ANY (ARRAY['liberado_local'::apoio_status, 'cancelado'::apoio_status]) THEN NULL::text
      WHEN pe.prazo_previsto < CURRENT_DATE THEN 'atrasado'
      WHEN pe.prazo_previsto = CURRENT_DATE THEN 'vence_hoje'
      WHEN public.contar_dias_prazo(pe.company_id, CURRENT_DATE, pe.prazo_previsto, pe.prazo_contagem) <= 1 THEN 'vence_amanha'
      ELSE 'no_prazo'
    END AS situacao_prazo,
    CASE
      WHEN pe.prazo_previsto IS NOT NULL AND pe.prazo_previsto < CURRENT_DATE AND pe.status <> ALL (ARRAY['liberado_local'::apoio_status, 'cancelado'::apoio_status])
        THEN public.contar_dias_prazo(pe.company_id, pe.prazo_previsto, CURRENT_DATE, pe.prazo_contagem)
      ELSE 0
    END AS dias_em_atraso,
    pe.prazo_contagem
   FROM public.apoio_pedido_exame pe
     JOIN public.attendance_orders ao ON ao.id = pe.pedido_id
     LEFT JOIN public.patients p ON p.id = ao.patient_id
     LEFT JOIN public.exams e ON e.id = pe.exame_id
     JOIN public.apoio_laboratorio al ON al.id = pe.apoio_id
     LEFT JOIN public.apoio_remessa rm ON rm.id = pe.remessa_id;