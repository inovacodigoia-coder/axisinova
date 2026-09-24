ALTER TABLE public.apoio_preco ADD COLUMN IF NOT EXISTS prazo_dias integer;
UPDATE public.apoio_preco SET prazo_dias = prazo_dias_uteis WHERE prazo_dias IS NULL AND prazo_dias_uteis IS NOT NULL;
COMMENT ON COLUMN public.apoio_preco.prazo_dias_uteis IS 'DEPRECATED: replaced by prazo_dias (contagem vem de apoio_laboratorio.prazo_contagem)';
COMMENT ON COLUMN public.apoio_catalogo_exame.prazo_dias IS 'DEPRECATED: prazo do apoio vem somente de apoio_preco.prazo_dias';

-- Compatibilidade: quem ainda gravar a coluna antiga alimenta a nova
CREATE OR REPLACE FUNCTION public.apoio_preco_prazo_compat() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.prazo_dias IS NULL AND NEW.prazo_dias_uteis IS NOT NULL THEN NEW.prazo_dias := NEW.prazo_dias_uteis; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS apoio_preco_prazo_compat ON public.apoio_preco;
CREATE TRIGGER apoio_preco_prazo_compat BEFORE INSERT OR UPDATE ON public.apoio_preco FOR EACH ROW EXECUTE FUNCTION public.apoio_preco_prazo_compat();

ALTER TABLE public.apoio_pedido_exame ADD COLUMN IF NOT EXISTS sem_prazo_apoio boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apoio_prazo_vigente(_apoio_id uuid, _codigo text, _data date DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.prazo_dias FROM apoio_preco p
   WHERE p.apoio_id = _apoio_id AND p.codigo = _codigo AND p.prazo_dias IS NOT NULL
     AND p.vigencia_inicio <= _data AND (p.vigencia_fim IS NULL OR p.vigencia_fim >= _data)
   ORDER BY p.vigencia_inicio DESC LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.apoio_prazo_vigente(uuid, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.apoio_pedido_exame_prazo()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE dias int; transp int; cont text; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT al.dias_transporte, al.prazo_contagem INTO transp, cont FROM public.apoio_laboratorio al WHERE al.id = NEW.apoio_id;
  NEW.prazo_contagem := coalesce(cont, 'uteis');
  IF NEW.prazo_previsto IS NULL THEN
    dias := public.apoio_prazo_vigente(NEW.apoio_id, NEW.codigo_apoio, hoje);
    NEW.sem_prazo_apoio := dias IS NULL;
    IF dias IS NULL THEN SELECT e.result_deadline_days INTO dias FROM public.exams e WHERE e.id = NEW.exame_id; END IF;
    IF dias IS NOT NULL THEN
      NEW.prazo_previsto := public.calcular_prazo(NEW.company_id, hoje, dias + coalesce(transp, 0), NEW.prazo_contagem);
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE VIEW public.apoio_pedido_exame_v WITH (security_invoker = true) AS
 SELECT pe.id, pe.company_id, pe.pedido_id, pe.exame_id, pe.amostra_id, pe.apoio_id, pe.codigo_apoio, pe.sequencial, pe.remessa_id, pe.recipiente_id,
    pe.cod_ped_apoio, pe.status, pe.status_apoio_cod, pe.status_apoio_desc, pe.status_apoio_em, pe.modo, pe.prazo_previsto,
    (apoio_custo_previsto(pe.id))::numeric(12,2) AS custo_previsto, pe.preco_ficticio, pe.info_complementar, pe.erro, pe.critico, pe.responsavel_id,
    pe.created_at, pe.updated_at, ao.protocol AS pedido_protocolo, ao.order_number AS pedido_numero, ao.patient_id,
    COALESCE(p.name, ao.patient_name) AS paciente_nome, e.name AS exame_nome, al.nome AS apoio_nome, rm.cod_lote_lab, rm.status AS remessa_status,
    CASE
      WHEN pe.prazo_previsto IS NULL OR pe.status = ANY (ARRAY['liberado_local'::apoio_status, 'cancelado'::apoio_status]) THEN NULL::text
      WHEN pe.prazo_previsto < CURRENT_DATE THEN 'atrasado'
      WHEN pe.prazo_previsto = CURRENT_DATE THEN 'vence_hoje'
      WHEN contar_dias_prazo(pe.company_id, CURRENT_DATE, pe.prazo_previsto, pe.prazo_contagem) <= 1 THEN 'vence_amanha'
      ELSE 'no_prazo'
    END AS situacao_prazo,
    CASE
      WHEN pe.prazo_previsto IS NOT NULL AND pe.prazo_previsto < CURRENT_DATE AND pe.status <> ALL (ARRAY['liberado_local'::apoio_status, 'cancelado'::apoio_status])
        THEN contar_dias_prazo(pe.company_id, pe.prazo_previsto, CURRENT_DATE, pe.prazo_contagem)
      ELSE 0
    END AS dias_em_atraso,
    pe.prazo_contagem,
    pe.sem_prazo_apoio
   FROM apoio_pedido_exame pe
     JOIN attendance_orders ao ON ao.id = pe.pedido_id
     LEFT JOIN patients p ON p.id = ao.patient_id
     LEFT JOIN exams e ON e.id = pe.exame_id
     JOIN apoio_laboratorio al ON al.id = pe.apoio_id
     LEFT JOIN apoio_remessa rm ON rm.id = pe.remessa_id;