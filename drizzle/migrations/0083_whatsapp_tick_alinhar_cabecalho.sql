CREATE OR REPLACE FUNCTION public.whatsapp_worker_tick(p_url text, p_apikey text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE v_cod text; v_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
BEGIN
  UPDATE whatsapp_fila_envios SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE status='enviando' AND atualizado_em < now() - interval '5 minutes';
  DELETE FROM whatsapp_worker_codigos WHERE expira_em < now() OR usado_em IS NOT NULL;

  IF NOT coalesce((select ativo from whatsapp_config_global where id=1), false) THEN
    RETURN 'desligado';
  END IF;
  IF NOT EXISTS (select 1 from whatsapp_fila_envios where status='agendada' and agendada_para <= now()) THEN
    RETURN 'sem_mensagens';
  END IF;
  IF NOT EXISTS (
    select 1 from whatsapp_config_empresa c
    join whatsapp_instancias i on i.company_id = c.company_id and i.status = 'conectado'
    where (c.janela_inicio is null or c.janela_fim is null
           or (v_local::time >= c.janela_inicio and v_local::time < c.janela_fim))
  ) THEN
    RETURN 'fora_da_janela';
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
REVOKE ALL ON FUNCTION public.whatsapp_worker_tick(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_worker_consumir_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_worker_consumir_token(text) TO service_role;