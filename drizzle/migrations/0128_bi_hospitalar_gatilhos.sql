
-- BI de Gestão Hospitalar — Etapa 1: episódio estendido, gatilhos de eventos e view de segmentos

-- 1. Episódio do atendimento estendido ao totem e à recepção
ALTER TABLE public.queue_tickets ADD COLUMN IF NOT EXISTS hospital_episode_id uuid;
ALTER TABLE public.attendance_orders ADD COLUMN IF NOT EXISTS hospital_episode_id uuid;

-- Guarda: episódio não pode ser trocado depois de definido
CREATE OR REPLACE FUNCTION public.bi_episodio_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.hospital_episode_id IS NOT NULL AND NEW.hospital_episode_id IS DISTINCT FROM OLD.hospital_episode_id THEN
    RAISE EXCEPTION 'O episódio do atendimento não pode ser alterado';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bi_episodio_guard_ticket BEFORE UPDATE OF hospital_episode_id ON public.queue_tickets FOR EACH ROW EXECUTE FUNCTION public.bi_episodio_guard();
CREATE TRIGGER bi_episodio_guard_pedido BEFORE UPDATE OF hospital_episode_id ON public.attendance_orders FOR EACH ROW EXECUTE FUNCTION public.bi_episodio_guard();

-- 2. Totem / Recepção (queue_tickets)
CREATE OR REPLACE FUNCTION public.bi_trg_queue_tickets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NULL, NULL, 'chegada', 'recepcao', 'Recepção', 'Totem', NULL, 'queue_tickets', NEW.id,
      jsonb_build_object('senha', NEW.ticket_number, 'paciente', NEW.patient_name));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'called' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NULL, NULL, 'chamada_recepcao', 'recepcao', 'Recepção', NULL, NULL, 'queue_tickets', NEW.id, jsonb_build_object('senha', NEW.ticket_number));
    ELSIF NEW.status = 'in_attendance' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NULL, NULL, 'inicio_recepcao', 'recepcao', 'Recepção', NULL, NULL, 'queue_tickets', NEW.id, jsonb_build_object('senha', NEW.ticket_number));
    ELSIF NEW.status = 'finalized' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NULL, NULL, 'fim_recepcao', 'recepcao', 'Recepção', NULL, NULL, 'queue_tickets', NEW.id, jsonb_build_object('senha', NEW.ticket_number));
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'queue_tickets', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_queue_tickets_ins AFTER INSERT ON public.queue_tickets FOR EACH ROW EXECUTE FUNCTION public.bi_trg_queue_tickets();
CREATE TRIGGER bi_queue_tickets_upd AFTER UPDATE OF status ON public.queue_tickets FOR EACH ROW EXECUTE FUNCTION public.bi_trg_queue_tickets();

-- 3. Pedido da recepção (attendance_orders): chegada (se for a 1ª do paciente no dia) + solicitação de exames + coleta concluída
CREATE OR REPLACE FUNCTION public.bi_trg_attendance_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM public.bi_jornada_eventos e
                   WHERE e.company_id = NEW.company_id AND e.tipo_evento = 'chegada'
                     AND (e.attendance_order_id = NEW.id
                          OR (NEW.patient_id IS NOT NULL AND e.patient_id = NEW.patient_id
                              AND (e.ocorrido_em AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date))) THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.id, 'chegada', 'recepcao', 'Recepção', 'Cadastro direto', NULL, 'attendance_orders', NEW.id,
        jsonb_build_object('protocolo', NEW.protocol));
    END IF;
    PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.id, 'exame_solicitacao', 'exames', 'Laboratório', NULL, NULL, 'attendance_orders', NEW.id,
      jsonb_build_object('protocolo', NEW.protocol, 'guias', jsonb_array_length(coalesce(NEW.lab_guides,'[]'::jsonb))));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'collection_done' THEN
    PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.id, 'exame_coleta', 'exames', 'Laboratório', NULL, NULL, 'attendance_orders', NEW.id,
      jsonb_build_object('protocolo', NEW.protocol));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'attendance_orders', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_attendance_orders_ins AFTER INSERT ON public.attendance_orders FOR EACH ROW EXECUTE FUNCTION public.bi_trg_attendance_orders();
CREATE TRIGGER bi_attendance_orders_upd AFTER UPDATE OF status ON public.attendance_orders FOR EACH ROW EXECUTE FUNCTION public.bi_trg_attendance_orders();

-- 4. Triagem / Fila do Médico (triage_entries): propaga episódio ao ticket/pedido e registra a jornada
CREATE OR REPLACE FUNCTION public.bi_trg_triage_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ticket_id IS NOT NULL THEN
      UPDATE public.queue_tickets SET hospital_episode_id = NEW.hospital_episode_id WHERE id = NEW.ticket_id AND hospital_episode_id IS NULL;
    END IF;
    IF NEW.order_id IS NOT NULL THEN
      UPDATE public.attendance_orders SET hospital_episode_id = NEW.hospital_episode_id WHERE id = NEW.order_id AND hospital_episode_id IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.bi_jornada_eventos e WHERE e.company_id = NEW.company_id AND e.tipo_evento = 'chegada' AND e.hospital_episode_id = NEW.hospital_episode_id) THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.order_id, 'chegada', 'triagem', 'Triagem', 'Entrada direta', NULL, 'triage_entries', NEW.id,
        jsonb_build_object('protocolo', NEW.protocol));
    END IF;
    PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.order_id, 'triagem_inicio', 'triagem', 'Triagem', NULL, NULL, 'triage_entries', NEW.id,
      jsonb_build_object('protocolo', NEW.protocol));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'classified' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.order_id, 'triagem_classificacao', 'triagem', 'Triagem', NULL, NEW.classified_by, 'triage_entries', NEW.id,
        jsonb_build_object('cor', NEW.color, 'tempo_alvo_min', NEW.target_minutes));
    ELSIF NEW.status = 'in_doctor' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.order_id, 'triagem_envio_medico', 'triagem', 'Triagem', NULL, NULL, 'triage_entries', NEW.id, '{}'::jsonb);
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.order_id, 'medico_entrada_fila', 'medico', 'Consultório', NULL, NULL, 'triage_entries', NEW.id, '{}'::jsonb);
    ELSIF NEW.status = 'in_attendance' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.order_id, 'consulta_inicio', 'medico', 'Consultório', NULL, NEW.doctor_started_by, 'triage_entries', NEW.id, '{}'::jsonb);
    ELSIF NEW.status = 'done' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NEW.order_id, 'consulta_fim', 'medico', 'Consultório', NULL, NULL, 'triage_entries', NEW.id, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'triage_entries', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_triage_entries_ins AFTER INSERT ON public.triage_entries FOR EACH ROW EXECUTE FUNCTION public.bi_trg_triage_entries();
CREATE TRIGGER bi_triage_entries_upd AFTER UPDATE OF status ON public.triage_entries FOR EACH ROW EXECUTE FUNCTION public.bi_trg_triage_entries();

-- 5. Postos de Coleta / Leitos (bed_occupancies)
CREATE OR REPLACE FUNCTION public.bi_trg_bed_occupancies()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE leito record;
BEGIN
  SELECT b.label AS leito, cp.name AS posto INTO leito FROM public.beds b JOIN public.collection_posts cp ON cp.id = b.post_id WHERE b.id = NEW.bed_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'leito_alocacao', 'posto_coleta', coalesce(leito.posto,'Posto de Coleta'), leito.leito, NULL, 'bed_occupancies', NEW.id, '{}'::jsonb);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'released' THEN
    PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'leito_liberacao', 'posto_coleta', coalesce(leito.posto,'Posto de Coleta'), leito.leito, NEW.released_by, 'bed_occupancies', NEW.id,
      jsonb_build_object('motivo', NEW.release_reason));
    IF NEW.release_reason = 'alta' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'saida_alta', 'saida', coalesce(leito.posto,'Posto de Coleta'), leito.leito, NEW.released_by, 'bed_occupancies', NEW.id, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'bed_occupancies', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_bed_occupancies_ins AFTER INSERT ON public.bed_occupancies FOR EACH ROW EXECUTE FUNCTION public.bi_trg_bed_occupancies();
CREATE TRIGGER bi_bed_occupancies_upd AFTER UPDATE OF status ON public.bed_occupancies FOR EACH ROW EXECUTE FUNCTION public.bi_trg_bed_occupancies();

-- 6. Encaminhamentos temporários (bed_referrals): saída e retorno ao leito
CREATE OR REPLACE FUNCTION public.bi_trg_bed_referrals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE oc record;
BEGIN
  SELECT o.company_id, o.hospital_episode_id, o.patient_id INTO oc FROM public.bed_occupancies o WHERE o.id = NEW.occupancy_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.bi_evento(oc.company_id, oc.hospital_episode_id, oc.patient_id, NULL, 'saida_setor', 'posto_coleta', NEW.destination, NULL, NULL, 'bed_referrals', NEW.id, '{}'::jsonb);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'returned' THEN
    PERFORM public.bi_evento(oc.company_id, oc.hospital_episode_id, oc.patient_id, NULL, 'retorno_leito', 'posto_coleta', NEW.destination, NULL, NULL, 'bed_referrals', NEW.id, '{}'::jsonb);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (coalesce(oc.company_id, NEW.company_id), 'bed_referrals', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_bed_referrals_ins AFTER INSERT ON public.bed_referrals FOR EACH ROW EXECUTE FUNCTION public.bi_trg_bed_referrals();
CREATE TRIGGER bi_bed_referrals_upd AFTER UPDATE OF status ON public.bed_referrals FOR EACH ROW EXECUTE FUNCTION public.bi_trg_bed_referrals();

-- 7. Medicação: prescrição, dispensação e administração (consumo com valor congelado)
CREATE OR REPLACE FUNCTION public.bi_trg_prescriptions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE oc record;
BEGIN
  SELECT o.hospital_episode_id, o.patient_id INTO oc FROM public.bed_occupancies o WHERE o.id = NEW.occupancy_id;
  PERFORM public.bi_evento(NEW.company_id, oc.hospital_episode_id, oc.patient_id, NULL, 'medicacao_prescricao', 'medicacao', 'Posto de Coleta', NULL, NEW.prescribed_by, 'prescriptions', NEW.id, '{}'::jsonb);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'prescriptions', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_prescriptions_ins AFTER INSERT ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.bi_trg_prescriptions();

CREATE OR REPLACE FUNCTION public.bi_trg_pharmacy_dispensations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ctx record;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'dispensed' THEN
    SELECT o.hospital_episode_id, o.patient_id INTO ctx FROM public.prescriptions p JOIN public.bed_occupancies o ON o.id = p.occupancy_id WHERE p.id = NEW.prescription_id;
    PERFORM public.bi_evento(NEW.company_id, ctx.hospital_episode_id, ctx.patient_id, NULL, 'medicacao_dispensacao', 'medicacao', 'Farmácia', NULL, NEW.dispensed_by, 'pharmacy_dispensations', NEW.id, '{}'::jsonb);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'pharmacy_dispensations', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_pharmacy_dispensations_upd AFTER UPDATE OF status ON public.pharmacy_dispensations FOR EACH ROW EXECUTE FUNCTION public.bi_trg_pharmacy_dispensations();

CREATE OR REPLACE FUNCTION public.bi_trg_medication_doses()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ctx record;
BEGIN
  IF NEW.administered_at IS NOT NULL AND OLD.administered_at IS NULL THEN
    SELECT o.hospital_episode_id, o.patient_id, pi.medication, pi.dose INTO ctx
      FROM public.prescription_items pi JOIN public.bed_occupancies o ON o.id = NEW.occupancy_id
      WHERE pi.id = NEW.prescription_item_id;
    PERFORM public.bi_evento(NEW.company_id, ctx.hospital_episode_id, ctx.patient_id, NULL, 'medicacao_administracao', 'medicacao', 'Posto de Coleta', NULL, NEW.administered_by, 'medication_doses', NEW.id,
      jsonb_build_object('medicamento', ctx.medication, 'dose', ctx.dose, 'dose_numero', NEW.dose_number));
    -- Consumo com valor congelado: não há custo de medicação cadastrado hoje → valor nulo + marca
    INSERT INTO public.bi_consumo_itens(company_id, hospital_episode_id, patient_id, tipo, item_nome, quantidade, dose, administrado_em, valor_unitario, sem_valor_cadastrado, origem_tabela, origem_id)
    VALUES (NEW.company_id, ctx.hospital_episode_id, ctx.patient_id, 'medicacao', coalesce(ctx.medication,'Medicamento'), 1, ctx.dose, NEW.administered_at, NULL, true, 'medication_doses', NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'medication_doses', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_medication_doses_upd AFTER UPDATE OF administered_at ON public.medication_doses FOR EACH ROW EXECUTE FUNCTION public.bi_trg_medication_doses();

-- 8. Exames: liberação de resultado com valor congelado do convênio (código interno do catálogo)
CREATE OR REPLACE FUNCTION public.bi_trg_lab_exam_results()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE pedido record; preco numeric; ep uuid;
BEGIN
  IF NEW.status = 'released' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'released') THEN
    SELECT o.convenio_id, o.hospital_episode_id INTO pedido FROM public.attendance_orders o WHERE o.id = NEW.order_id;
    ep := pedido.hospital_episode_id;
    PERFORM public.bi_evento(NEW.company_id, ep, NEW.patient_id, NEW.order_id, 'exame_liberacao', 'exames', 'Laboratório', NULL, NEW.released_by, 'lab_exam_results', NEW.id,
      jsonb_build_object('exame_codigo', NEW.exam_code, 'exame', NEW.exam_name));
    IF pedido.convenio_id IS NOT NULL AND NEW.exam_catalog_id IS NOT NULL THEN
      SELECT (elem->>'price')::numeric INTO preco
        FROM public.convenios c, LATERAL jsonb_array_elements(coalesce(c.exam_prices,'[]'::jsonb)) elem
        WHERE c.id = pedido.convenio_id AND elem->>'examId' = NEW.exam_catalog_id::text
        LIMIT 1;
    END IF;
    INSERT INTO public.bi_consumo_itens(company_id, hospital_episode_id, patient_id, attendance_order_id, tipo, item_codigo, item_nome, quantidade, valor_unitario, sem_valor_cadastrado, origem_tabela, origem_id)
    VALUES (NEW.company_id, ep, NEW.patient_id, NEW.order_id, 'exame', NEW.exam_code, coalesce(NEW.exam_name,'Exame'), 1, preco, preco IS NULL, 'lab_exam_results', NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'lab_exam_results', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_lab_exam_results_ins AFTER INSERT ON public.lab_exam_results FOR EACH ROW EXECUTE FUNCTION public.bi_trg_lab_exam_results();
CREATE TRIGGER bi_lab_exam_results_upd AFTER UPDATE OF status ON public.lab_exam_results FOR EACH ROW EXECUTE FUNCTION public.bi_trg_lab_exam_results();

-- 9. Internação (admission_requests)
CREATE OR REPLACE FUNCTION public.bi_trg_admission_requests()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'internacao_solicitacao', 'internacao', 'Internação', NULL, NULL, 'admission_requests', NEW.id, '{}'::jsonb);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'internacao_aprovacao', 'internacao', 'Internação', NULL, NULL, 'admission_requests', NEW.id, '{}'::jsonb);
    ELSIF NEW.status = 'refused' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'internacao_recusa', 'internacao', 'Internação', NULL, NULL, 'admission_requests', NEW.id, '{}'::jsonb);
    ELSIF NEW.status = 'admitted' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'internacao_chegada', 'internacao', 'Internação', NULL, NEW.admitted_by, 'admission_requests', NEW.id, '{}'::jsonb);
    ELSIF NEW.status = 'transferred' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'internacao_transferencia', 'internacao', 'Internação', NULL, NULL, 'admission_requests', NEW.id, '{}'::jsonb);
    ELSIF NEW.status = 'discharged' THEN
      PERFORM public.bi_evento(NEW.company_id, NEW.hospital_episode_id, NEW.patient_id, NULL, 'saida_alta', 'saida', 'Internação', NULL, NEW.ended_by, 'admission_requests', NEW.id, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro) VALUES (NEW.company_id, 'admission_requests', NEW.id, TG_OP, SQLERRM);
  RETURN NEW;
END $$;
CREATE TRIGGER bi_admission_requests_ins AFTER INSERT ON public.admission_requests FOR EACH ROW EXECUTE FUNCTION public.bi_trg_admission_requests();
CREATE TRIGGER bi_admission_requests_upd AFTER UPDATE OF status ON public.admission_requests FOR EACH ROW EXECUTE FUNCTION public.bi_trg_admission_requests();

-- 10. View de segmentos de tempo por setor (base das Etapas 2 e 3); RLS da tabela-base se aplica (security_invoker)
CREATE OR REPLACE VIEW public.bi_jornada_segmentos
WITH (security_invoker = true) AS
SELECT company_id, hospital_episode_id, patient_id, attendance_order_id,
  setor, fase,
  ocorrido_em AS inicio,
  LEAD(ocorrido_em) OVER (PARTITION BY company_id, hospital_episode_id ORDER BY ocorrido_em) AS fim,
  CASE WHEN LEAD(ocorrido_em) OVER (PARTITION BY company_id, hospital_episode_id ORDER BY ocorrido_em) IS NULL THEN true ELSE false END AS em_andamento,
  round(EXTRACT(EPOCH FROM (coalesce(LEAD(ocorrido_em) OVER (PARTITION BY company_id, hospital_episode_id ORDER BY ocorrido_em), now()) - ocorrido_em)) / 60.0, 1) AS duracao_minutos
FROM public.bi_jornada_eventos
WHERE setor IS NOT NULL;
GRANT SELECT ON public.bi_jornada_segmentos TO authenticated;

-- 11. Revokes das funções de gatilho (regra do projeto)
REVOKE EXECUTE ON FUNCTION public.bi_episodio_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_queue_tickets() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_attendance_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_triage_entries() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_bed_occupancies() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_bed_referrals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_prescriptions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_pharmacy_dispensations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_medication_doses() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_lab_exam_results() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bi_trg_admission_requests() FROM PUBLIC, anon, authenticated;
