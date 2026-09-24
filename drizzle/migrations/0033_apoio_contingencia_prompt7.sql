
ALTER TABLE public.apoio_laboratorio ADD COLUMN IF NOT EXISTS modo_manual_desde timestamptz NULL;
ALTER TABLE public.apoio_laboratorio ADD COLUMN IF NOT EXISTS modo_manual_por uuid NULL;

CREATE OR REPLACE FUNCTION public.apoio_laboratorio_modo_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.modo_contingencia IS DISTINCT FROM OLD.modo_contingencia THEN
    IF NEW.modo_contingencia THEN NEW.modo_manual_desde := now(); NEW.modo_manual_por := auth.uid();
    ELSE NEW.modo_manual_desde := NULL; NEW.modo_manual_por := NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS apoio_laboratorio_modo ON public.apoio_laboratorio;
CREATE TRIGGER apoio_laboratorio_modo BEFORE UPDATE ON public.apoio_laboratorio
  FOR EACH ROW EXECUTE FUNCTION public.apoio_laboratorio_modo_trg();

-- Próximos status permitidos (mesma regra de apoio_mudar_status)
CREATE OR REPLACE FUNCTION public.apoio_proximos_status(_de public.apoio_status)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT array_remove(ARRAY[
    CASE _de::text WHEN 'aguardando_remessa' THEN 'em_remessa' WHEN 'em_remessa' THEN 'transmitido' WHEN 'transmitido' THEN 'recebido_apoio'
      WHEN 'recebido_apoio' THEN 'em_analise' WHEN 'em_analise' THEN 'liberado_apoio' WHEN 'liberado_apoio' THEN 'importado'
      WHEN 'importado' THEN 'liberado_local' END,
    CASE WHEN _de::text = ANY(ARRAY['aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','erro_transmissao','pendencia_tecnica','nova_coleta']) AND _de::text <> 'pendencia_tecnica' THEN 'pendencia_tecnica' END,
    CASE WHEN _de::text = ANY(ARRAY['aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','erro_transmissao','pendencia_tecnica']) THEN 'nova_coleta' END,
    CASE WHEN _de::text = ANY(ARRAY['aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','erro_transmissao','pendencia_tecnica','nova_coleta']) THEN 'cancelado' END,
    CASE WHEN _de::text = 'pendencia_tecnica' THEN 'em_analise' END,
    CASE WHEN _de::text = 'pendencia_tecnica' THEN 'recebido_apoio' END,
    CASE WHEN _de::text = 'pendencia_tecnica' THEN 'liberado_apoio' END,
    CASE WHEN _de::text = 'nova_coleta' THEN 'aguardando_remessa' END,
    CASE WHEN _de::text = 'em_remessa' THEN 'erro_transmissao' END,
    CASE WHEN _de::text = 'em_remessa' THEN 'aguardando_remessa' END,
    CASE WHEN _de::text = 'erro_transmissao' THEN 'em_remessa' END,
    CASE WHEN _de::text IN ('importado','liberado_apoio') THEN 'importado_com_pendencia' END,
    CASE WHEN _de::text IN ('importado_com_pendencia','liberado_local') THEN 'importado' END
  ], NULL);
$$;
GRANT EXECUTE ON FUNCTION public.apoio_proximos_status(public.apoio_status) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apoio_manual_mudar_status(_pe uuid, _status public.apoio_status, _motivo text,
  _pendencia text DEFAULT NULL, _detalhamento text DEFAULT NULL, _disposicao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;

-- Validação do nº do pedido no apoio
CREATE OR REPLACE FUNCTION public.apoio_valida_cod_ped(_apoio uuid, _cod text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN (al.conector ILIKE '%pardini%' OR al.nome ILIKE '%pardini%')
    THEN upper(coalesce(_cod,'')) ~ '^[A-Z0-9]{7}$'
    ELSE length(trim(coalesce(_cod,''))) BETWEEN 1 AND 40 END
  FROM public.apoio_laboratorio al WHERE al.id = _apoio;
$$;

-- Envio manual: _itens = [{pedido_id, cod_ped_apoio, cod_bar_apoio}]
CREATE OR REPLACE FUNCTION public.apoio_envio_manual(_remessa uuid, _itens jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.get_user_company_id(auth.uid()); r public.apoio_remessa%ROWTYPE; ped record; it jsonb;
  cod text; bar text; rc uuid; pe record; n int := 0;
BEGIN
  IF NOT public.apoio_tem_permissao('apoio.manual.operar') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.manual.operar"'; END IF;
  SELECT * INTO r FROM public.apoio_remessa WHERE id = _remessa AND company_id = c FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  IF r.status NOT IN ('aberta','conferida','erro') THEN RAISE EXCEPTION 'Remessa não está disponível para envio manual'; END IF;
  FOR ped IN SELECT DISTINCT x.pedido_id, ao.order_number FROM public.apoio_pedido_exame x JOIN public.attendance_orders ao ON ao.id = x.pedido_id
             WHERE x.remessa_id = r.id AND x.status IN ('em_remessa','erro_transmissao') LOOP
    SELECT e INTO it FROM jsonb_array_elements(coalesce(_itens,'[]'::jsonb)) e WHERE e->>'pedido_id' = ped.pedido_id::text LIMIT 1;
    cod := upper(trim(coalesce(it->>'cod_ped_apoio','')));
    bar := nullif(trim(coalesce(it->>'cod_bar_apoio','')), '');
    IF cod = '' THEN RAISE EXCEPTION 'Informe o nº do pedido no apoio do pedido %', ped.order_number; END IF;
    IF NOT public.apoio_valida_cod_ped(r.apoio_id, cod) THEN
      RAISE EXCEPTION 'Nº do pedido no apoio inválido no pedido % (%): use 7 letras/números', ped.order_number, cod;
    END IF;
    rc := NULL;
    IF bar IS NOT NULL THEN
      INSERT INTO public.apoio_recipiente (company_id, remessa_id, cod_ped_apoio, cod_bar_apoio) VALUES (c, r.id, cod, bar) RETURNING id INTO rc;
    END IF;
    FOR pe IN SELECT x.id, x.status FROM public.apoio_pedido_exame x WHERE x.remessa_id = r.id AND x.pedido_id = ped.pedido_id AND x.status IN ('em_remessa','erro_transmissao') LOOP
      IF pe.status = 'erro_transmissao' THEN
        PERFORM public.apoio_mudar_status(pe.id, 'em_remessa', 'manual', 'Envio manual pelo portal');
      END IF;
      UPDATE public.apoio_pedido_exame SET cod_ped_apoio = cod, recipiente_id = coalesce(rc, recipiente_id), modo = 'manual' WHERE id = pe.id;
      PERFORM public.apoio_mudar_status(pe.id, 'transmitido', 'manual', 'Envio manual pelo portal', jsonb_build_object('cod_ped_apoio', cod, 'cod_bar_apoio', bar));
      n := n + 1;
    END LOOP;
  END LOOP;
  IF n = 0 THEN RAISE EXCEPTION 'Nenhum exame para enviar nesta remessa'; END IF;
  UPDATE public.apoio_remessa SET status = 'manual', modo = 'manual', transmitido_em = now() WHERE id = r.id;
  RETURN n;
END $$;

-- Busca para status manual
CREATE OR REPLACE FUNCTION public.apoio_manual_buscar(_apoio uuid, _q text)
RETURNS TABLE(id uuid, pedido_id uuid, order_number text, paciente text, exame text, codigo_apoio text, cod_ped_apoio text,
  cod_bar_apoio text, remessa_id uuid, cod_lote_lab bigint, status text, proximos text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pe.id, pe.pedido_id, ao.order_number, coalesce(p.name, ao.patient_name, ''), coalesce(e.name, pe.codigo_apoio), pe.codigo_apoio,
    pe.cod_ped_apoio, rc.cod_bar_apoio, pe.remessa_id, r.cod_lote_lab, pe.status::text, public.apoio_proximos_status(pe.status)
  FROM public.apoio_pedido_exame pe
  JOIN public.attendance_orders ao ON ao.id = pe.pedido_id
  LEFT JOIN public.patients p ON p.id = ao.patient_id
  LEFT JOIN public.exams e ON e.id = pe.exame_id
  LEFT JOIN public.apoio_recipiente rc ON rc.id = pe.recipiente_id
  LEFT JOIN public.apoio_remessa r ON r.id = pe.remessa_id
  WHERE pe.company_id = public.get_user_company_id(auth.uid()) AND pe.apoio_id = _apoio
    AND (coalesce(trim(_q),'') = '' OR coalesce(p.name, ao.patient_name,'') ILIKE '%'||_q||'%' OR ao.order_number ILIKE '%'||_q||'%'
      OR pe.codigo_apoio ILIKE '%'||_q||'%' OR coalesce(pe.cod_ped_apoio,'') ILIKE '%'||_q||'%' OR coalesce(rc.cod_bar_apoio,'') ILIKE '%'||_q||'%'
      OR public.apoio_codigo_aliquota(pe.pedido_id, pe.apoio_id) ILIKE '%'||_q||'%')
  ORDER BY pe.updated_at DESC LIMIT 200;
$$;

-- Dupla conferência: quem digitou não confere (usado na liberação, prompt 9)
CREATE OR REPLACE FUNCTION public.apoio_resultado_conferir(_versao uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.apoio_resultado_versao%ROWTYPE;
BEGIN
  IF NOT public.apoio_tem_permissao('apoio.resultado.conferir') THEN RAISE EXCEPTION 'Você não tem a permissão "apoio.resultado.conferir"'; END IF;
  SELECT * INTO v FROM public.apoio_resultado_versao WHERE id = _versao AND company_id = public.get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resultado não encontrado'; END IF;
  IF v.situacao = 'divergente' THEN RAISE EXCEPTION 'Resultado divergente da integração: decida antes de liberar'; END IF;
  IF v.origem = 'manual' AND v.digitado_por = auth.uid() THEN
    RAISE EXCEPTION 'Quem digitou o resultado não pode fazer a dupla conferência';
  END IF;
  UPDATE public.apoio_resultado_versao SET conferido_por = auth.uid() WHERE id = v.id;
END $$;

REVOKE ALL ON FUNCTION public.apoio_manual_mudar_status(uuid,public.apoio_status,text,text,text,text), public.apoio_valida_cod_ped(uuid,text),
  public.apoio_envio_manual(uuid,jsonb), public.apoio_manual_buscar(uuid,text), public.apoio_resultado_conferir(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apoio_manual_mudar_status(uuid,public.apoio_status,text,text,text,text), public.apoio_valida_cod_ped(uuid,text),
  public.apoio_envio_manual(uuid,jsonb), public.apoio_manual_buscar(uuid,text), public.apoio_resultado_conferir(uuid) TO authenticated, service_role;
