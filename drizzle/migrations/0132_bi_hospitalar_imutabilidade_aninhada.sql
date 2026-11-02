
-- BI Hospitalar: imutabilidade com verificação de tabela aninhada (evita avaliar campos inexistentes em bi_consumo_itens)
CREATE OR REPLACE FUNCTION public.bi_jornada_eventos_imutavel()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'bi_jornada_eventos' THEN
    IF OLD.hospital_episode_id IS NULL AND NEW.hospital_episode_id IS NOT NULL
       AND NEW.id = OLD.id AND NEW.company_id = OLD.company_id
       AND NEW.tipo_evento = OLD.tipo_evento
       AND NEW.origem_tabela IS NOT DISTINCT FROM OLD.origem_tabela
       AND NEW.origem_id IS NOT DISTINCT FROM OLD.origem_id
       AND NEW.ocorrido_em = OLD.ocorrido_em
       AND NEW.patient_id IS NOT DISTINCT FROM OLD.patient_id
       AND NEW.attendance_order_id IS NOT DISTINCT FROM OLD.attendance_order_id THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Eventos da jornada são imutáveis; registre um evento de ajuste com justificativa';
END $$;
