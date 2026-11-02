
-- BI Hospitalar: ao ligar senha/pedido ao episódio na triagem, preencher o episódio nos eventos já gravados

-- Imutabilidade passa a permitir APENAS o preenchimento do episódio quando ele ainda é nulo
CREATE OR REPLACE FUNCTION public.bi_jornada_eventos_imutavel()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.hospital_episode_id IS NULL AND NEW.hospital_episode_id IS NOT NULL
     AND NEW.id = OLD.id AND NEW.company_id = OLD.company_id
     AND NEW.tipo_evento = OLD.tipo_evento
     AND NEW.origem_tabela IS NOT DISTINCT FROM OLD.origem_tabela
     AND NEW.origem_id IS NOT DISTINCT FROM OLD.origem_id
     AND NEW.ocorrido_em = OLD.ocorrido_em
     AND NEW.patient_id IS NOT DISTINCT FROM OLD.patient_id
     AND NEW.attendance_order_id IS NOT DISTINCT FROM OLD.attendance_order_id THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Eventos da jornada são imutáveis; registre um evento de ajuste com justificativa';
END $$;

-- Ao entrar na triagem, além de propagar o episódio à senha/pedido, corrige os eventos já gravados sem episódio
CREATE OR REPLACE FUNCTION public.bi_trg_triage_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ticket_id IS NOT NULL THEN
      UPDATE public.queue_tickets SET hospital_episode_id = NEW.hospital_episode_id WHERE id = NEW.ticket_id AND hospital_episode_id IS NULL;
      UPDATE public.bi_jornada_eventos SET hospital_episode_id = NEW.hospital_episode_id
       WHERE origem_tabela = 'queue_tickets' AND origem_id = NEW.ticket_id AND hospital_episode_id IS NULL;
    END IF;
    IF NEW.order_id IS NOT NULL THEN
      UPDATE public.attendance_orders SET hospital_episode_id = NEW.hospital_episode_id WHERE id = NEW.order_id AND hospital_episode_id IS NULL;
      UPDATE public.bi_jornada_eventos SET hospital_episode_id = NEW.hospital_episode_id
       WHERE origem_tabela = 'attendance_orders' AND origem_id = NEW.order_id AND hospital_episode_id IS NULL;
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
REVOKE EXECUTE ON FUNCTION public.bi_trg_triage_entries() FROM PUBLIC, anon, authenticated;
