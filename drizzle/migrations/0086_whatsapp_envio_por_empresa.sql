ALTER TABLE public.whatsapp_config_empresa
  ADD COLUMN IF NOT EXISTS envio_automatico_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS envio_automatico_por uuid,
  ADD COLUMN IF NOT EXISTS envio_automatico_em timestamptz;

CREATE OR REPLACE FUNCTION public.whatsapp_envio_auto_obter()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT envio_automatico_ativo FROM whatsapp_config_empresa
    WHERE company_id = get_user_company_id(auth.uid())), false)
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_envio_auto_salvar(p_ativo boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_c uuid := get_user_company_id(auth.uid());
BEGIN
  IF v_c IS NULL OR NOT whatsapp_tem_permissao('configuracoes.whatsapp') THEN
    RETURN jsonb_build_object('ok',false,'mensagem','Sem permissão.'); END IF;
  IF p_ativo AND NOT coalesce((SELECT whatsapp_habilitado FROM companies WHERE id=v_c),false) THEN
    RETURN jsonb_build_object('ok',false,'mensagem','WhatsApp não liberado para a empresa.'); END IF;
  INSERT INTO whatsapp_config_empresa (company_id, envio_automatico_ativo, envio_automatico_por, envio_automatico_em)
  VALUES (v_c, p_ativo, auth.uid(), now())
  ON CONFLICT (company_id) DO UPDATE SET envio_automatico_ativo=excluded.envio_automatico_ativo,
    envio_automatico_por=excluded.envio_automatico_por, envio_automatico_em=excluded.envio_automatico_em;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_fila_reagendar(p_id uuid, p_quando timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  IF NOT public.whatsapp_tem_permissao('whatsapp.fila') THEN RETURN 'SEM_PERMISSAO'; END IF;
  IF p_quando IS NULL OR p_quando < now() - interval '1 minute' THEN RETURN 'NO_PASSADO'; END IF;
  UPDATE public.whatsapp_fila_envios SET agendada_para = p_quando, atualizado_em = now()
   WHERE id = p_id AND company_id = public.get_user_company_id(auth.uid()) AND status = 'agendada';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN CASE WHEN n = 1 THEN 'OK' ELSE 'NAO_EDITAVEL' END;
END $$;

REVOKE ALL ON FUNCTION public.whatsapp_envio_auto_obter() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.whatsapp_envio_auto_salvar(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.whatsapp_fila_reagendar(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_envio_auto_obter() TO authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_envio_auto_salvar(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_fila_reagendar(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.whatsapp_reservar_envios()
 RETURNS TABLE(fila_id uuid, instancia_id uuid, telefone_destino text, texto_final text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tz constant text := 'America/Fortaleza';
  v_agora_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
  v_total int := 0; emp record; inst record; msg record; ap record; v_ok boolean;
BEGIN
  UPDATE whatsapp_fila_envios f SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE f.status='enviando' AND f.atualizado_em < now() - interval '5 minutes';

  FOR emp IN
    SELECT c.id FROM companies c JOIN whatsapp_config_empresa ce ON ce.company_id=c.id
     WHERE c.whatsapp_habilitado AND ce.envio_automatico_ativo
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
        UPDATE whatsapp_instancias SET proximo_envio_apos = now() + interval '6 minutes' WHERE id=inst.id;
        v_total := v_total + 1;
        fila_id := msg.id; instancia_id := inst.id; telefone_destino := msg.telefone_destino; texto_final := msg.texto_final;
        RETURN NEXT;
        EXIT;
      END LOOP;
    END LOOP;
    EXIT WHEN v_total >= 50;
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.whatsapp_worker_tick(p_url text, p_apikey text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE v_cod text; v_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
BEGIN
  UPDATE whatsapp_fila_envios SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE status='enviando' AND atualizado_em < now() - interval '5 minutes';
  DELETE FROM whatsapp_worker_codigos WHERE expira_em < now() OR usado_em IS NOT NULL;

  IF NOT EXISTS (
    select 1 from whatsapp_config_empresa c
    join companies co on co.id = c.company_id and co.whatsapp_habilitado
    join whatsapp_instancias i on i.company_id = c.company_id and i.status = 'connected' and i.ativo_no_rodizio
         and (i.proximo_envio_apos is null or i.proximo_envio_apos <= now())
    where c.envio_automatico_ativo
      and v_local::time >= coalesce(c.janela_inicio,'07:00') and v_local::time < coalesce(c.janela_fim,'20:00')
      and exists (select 1 from whatsapp_fila_envios f where f.company_id = c.company_id
                  and f.status='agendada' and f.agendada_para <= now() and f.tipo='confirmacao_agendamento')
  ) THEN
    RETURN 'sem_trabalho';
  END IF;

  v_cod := encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO whatsapp_worker_codigos(hash, expira_em)
   VALUES (encode(extensions.digest(v_cod,'sha256'),'hex'), now() + interval '2 minutes');
  PERFORM net.http_post(url := p_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey',p_apikey,'x-worker-secret',v_cod),
    body := '{}'::jsonb, timeout_milliseconds := 10000);
  RETURN 'disparado';
END;
$function$;