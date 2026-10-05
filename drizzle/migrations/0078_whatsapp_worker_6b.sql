CREATE TABLE IF NOT EXISTS public.whatsapp_config_global (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  envio_automatico_ativo boolean NOT NULL DEFAULT false,
  alterado_por uuid,
  alterado_em timestamptz
);
GRANT ALL ON public.whatsapp_config_global TO service_role;
ALTER TABLE public.whatsapp_config_global ENABLE ROW LEVEL SECURITY;
INSERT INTO public.whatsapp_config_global (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.whatsapp_config_empresa
  ADD COLUMN IF NOT EXISTS janela_inicio time NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS janela_fim time NOT NULL DEFAULT '20:00';

CREATE TABLE IF NOT EXISTS public.whatsapp_worker_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  duracao_ms integer,
  reservadas integer NOT NULL DEFAULT 0,
  enviadas integer NOT NULL DEFAULT 0,
  falhas integer NOT NULL DEFAULT 0,
  devolvidas integer NOT NULL DEFAULT 0,
  erro text
);
GRANT SELECT ON public.whatsapp_worker_execucoes TO authenticated;
GRANT ALL ON public.whatsapp_worker_execucoes TO service_role;
ALTER TABLE public.whatsapp_worker_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin le execucoes" ON public.whatsapp_worker_execucoes FOR SELECT TO authenticated USING (private.is_super_admin());

-- Super Admin: interruptor geral
CREATE OR REPLACE FUNCTION public.whatsapp_envio_global_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r record; v_tz text := 'America/Fortaleza'; v_hoje date := (now() AT TIME ZONE 'America/Fortaleza')::date;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO r FROM whatsapp_config_global WHERE id;
  RETURN jsonb_build_object(
    'ativo', coalesce(r.envio_automatico_ativo,false), 'alterado_em', r.alterado_em,
    'agendadas', (SELECT count(*) FROM whatsapp_fila_envios WHERE status='agendada'),
    'enviadas_hoje', (SELECT count(*) FROM whatsapp_fila_envios WHERE tipo='confirmacao_agendamento' AND status IN ('enviada','entregue','lida') AND (enviada_em AT TIME ZONE v_tz)::date = v_hoje),
    'falhas_hoje', (SELECT count(*) FROM whatsapp_fila_envios WHERE tipo='confirmacao_agendamento' AND status='falha' AND (atualizado_em AT TIME ZONE v_tz)::date = v_hoje),
    'ultima_execucao', (SELECT max(iniciado_em) FROM whatsapp_worker_execucoes));
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_envio_global_definir(p_ativo boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE whatsapp_config_global SET envio_automatico_ativo=p_ativo, alterado_por=auth.uid(), alterado_em=now() WHERE id;
  RETURN jsonb_build_object('ok',true,'ativo',p_ativo);
END $$;

-- Empresa: janela de envio
CREATE OR REPLACE FUNCTION public.whatsapp_janela_obter()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_c uuid := get_user_company_id(auth.uid()); r record;
BEGIN
  SELECT janela_inicio, janela_fim INTO r FROM whatsapp_config_empresa WHERE company_id=v_c;
  RETURN jsonb_build_object('inicio', to_char(coalesce(r.janela_inicio,'07:00'),'HH24:MI'), 'fim', to_char(coalesce(r.janela_fim,'20:00'),'HH24:MI'));
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_janela_salvar(p_inicio time, p_fim time)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_c uuid := get_user_company_id(auth.uid());
BEGIN
  IF v_c IS NULL OR NOT whatsapp_tem_permissao('configuracoes.whatsapp') THEN
    RETURN jsonb_build_object('ok',false,'mensagem','Sem permissão.'); END IF;
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim <= p_inicio THEN
    RETURN jsonb_build_object('ok',false,'mensagem','O fim da janela deve ser depois do início.'); END IF;
  INSERT INTO whatsapp_config_empresa (company_id, janela_inicio, janela_fim) VALUES (v_c, p_inicio, p_fim)
  ON CONFLICT (company_id) DO UPDATE SET janela_inicio=excluded.janela_inicio, janela_fim=excluded.janela_fim;
  PERFORM apoio_auditar(v_c, 'whatsapp_janela', v_c::text, 'alterar', jsonb_build_object('inicio',p_inicio,'fim',p_fim));
  RETURN jsonb_build_object('ok',true);
EXCEPTION WHEN undefined_function THEN
  RETURN jsonb_build_object('ok',true);
END $$;

-- Reserva atômica (service role apenas)
CREATE OR REPLACE FUNCTION public.whatsapp_reservar_envios()
RETURNS TABLE(fila_id uuid, instancia_id uuid, telefone_destino text, texto_final text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tz constant text := 'America/Fortaleza';
  v_agora_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
  v_total int := 0; emp record; inst record; msg record; ap record; v_ok boolean;
BEGIN
  -- d) limpeza de reservas presas
  UPDATE whatsapp_fila_envios f SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE f.status='enviando' AND f.atualizado_em < now() - interval '5 minutes';

  -- a) interruptor geral
  IF NOT coalesce((SELECT envio_automatico_ativo FROM whatsapp_config_global WHERE id), false) THEN RETURN; END IF;

  FOR emp IN
    SELECT c.id FROM companies c LEFT JOIN whatsapp_config_empresa ce ON ce.company_id=c.id
     WHERE c.whatsapp_habilitado
       AND v_agora_local::time >= coalesce(ce.janela_inicio,'07:00')
       AND v_agora_local::time <  coalesce(ce.janela_fim,'20:00')
  LOOP
    FOR inst IN
      SELECT i.id FROM whatsapp_instancias i
       WHERE i.company_id=emp.id AND i.status='connected' AND i.ativo_no_rodizio
         AND (i.proximo_envio_apos IS NULL OR i.proximo_envio_apos <= now())
         AND (i.limite_diario IS NULL OR (
               SELECT count(*) FROM whatsapp_fila_envios x
                WHERE x.instancia_id=i.id AND x.tipo='confirmacao_agendamento'
                  AND x.status IN ('enviando','enviada','entregue','lida')
                  AND (coalesce(x.enviada_em, x.atualizado_em) AT TIME ZONE v_tz)::date = v_agora_local::date
             ) < i.limite_diario)
       ORDER BY i.ultimo_envio_em ASC NULLS FIRST
       FOR UPDATE SKIP LOCKED
    LOOP
      EXIT WHEN v_total >= 50;
      LOOP
        SELECT f.id, f.agendamento_id, f.telefone_destino, f.texto_final INTO msg
          FROM whatsapp_fila_envios f
         WHERE f.company_id=emp.id AND f.status='agendada' AND f.agendada_para <= now()
           AND f.instancia_id IS NULL AND f.tipo='confirmacao_agendamento'
         ORDER BY f.agendada_para, f.criado_em
         LIMIT 1 FOR UPDATE SKIP LOCKED;
        EXIT WHEN NOT FOUND;
        v_ok := true;
        IF msg.agendamento_id IS NOT NULL THEN
          SELECT a.status::text AS st, a.sched_status, a.date, a.time INTO ap FROM appointments a WHERE a.id=msg.agendamento_id;
          IF FOUND AND (ap.st IN ('cancelled') OR coalesce(ap.sched_status,'') IN ('cancelled','absent','in_progress','completed','rescheduled')
                        OR (ap.date + coalesce(ap.time,'00:00')) <= v_agora_local) THEN
            v_ok := false;
          END IF;
        END IF;
        IF NOT v_ok THEN
          UPDATE whatsapp_fila_envios SET status='cancelada', erro='AGENDAMENTO_NAO_ATIVO', atualizado_em=now() WHERE id=msg.id;
          CONTINUE;
        END IF;
        UPDATE whatsapp_fila_envios SET status='enviando', instancia_id=inst.id, atualizado_em=now() WHERE id=msg.id;
        -- trava provisória: substituída pelo intervalo real depois do envio
        UPDATE whatsapp_instancias SET proximo_envio_apos = now() + interval '6 minutes' WHERE id=inst.id;
        v_total := v_total + 1;
        fila_id := msg.id; instancia_id := inst.id; telefone_destino := msg.telefone_destino; texto_final := msg.texto_final;
        RETURN NEXT;
        EXIT;
      END LOOP;
    END LOOP;
    EXIT WHEN v_total >= 50;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.whatsapp_reservar_envios() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_reservar_envios() TO service_role;
REVOKE ALL ON FUNCTION public.whatsapp_envio_global_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.whatsapp_envio_global_definir(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.whatsapp_janela_obter() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.whatsapp_janela_salvar(time, time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_envio_global_status(), public.whatsapp_envio_global_definir(boolean), public.whatsapp_janela_obter(), public.whatsapp_janela_salvar(time, time) TO authenticated;