CREATE TABLE IF NOT EXISTS public.whatsapp_worker_codigos (
  hash text PRIMARY KEY,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT now() + interval '2 minutes',
  usado_em timestamptz
);
REVOKE ALL ON public.whatsapp_worker_codigos FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.whatsapp_worker_codigos TO service_role;
ALTER TABLE public.whatsapp_worker_codigos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_worker_tokens FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.whatsapp_worker_tokens IS 'DEPRECATED: substituída por whatsapp_worker_codigos (código guardado como hash)';
COMMENT ON FUNCTION public.whatsapp_worker_disparar(text, text) IS 'DEPRECATED: substituída por whatsapp_worker_tick';

-- Executado pelo pg_cron a cada minuto.
-- 1) Sempre: limpa reservas "enviando" presas (>5 min) e códigos vencidos/usados.
-- 2) Só chama o worker se houver trabalho: interruptor ligado, mensagem vencida e
--    empresa dentro da janela com número conectado fora do intervalo de espera.
CREATE OR REPLACE FUNCTION public.whatsapp_worker_tick(p_url text, p_apikey text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_cod text; v_local timestamp := now() AT TIME ZONE 'America/Fortaleza';
BEGIN
  UPDATE whatsapp_fila_envios SET status='falha', erro='RESULTADO_INCERTO', atualizado_em=now()
   WHERE status='enviando' AND atualizado_em < now() - interval '5 minutes';
  DELETE FROM whatsapp_worker_codigos WHERE expira_em < now() OR usado_em IS NOT NULL;
  DELETE FROM whatsapp_worker_tokens;

  IF NOT coalesce((SELECT envio_automatico_ativo FROM whatsapp_config_global WHERE id), false) THEN RETURN 'desligado'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM whatsapp_fila_envios f
      JOIN companies c ON c.id=f.company_id AND c.whatsapp_habilitado
      LEFT JOIN whatsapp_config_empresa ce ON ce.company_id=c.id
     WHERE f.status='agendada' AND f.tipo='confirmacao_agendamento' AND f.instancia_id IS NULL AND f.agendada_para <= now()
       AND v_local::time >= coalesce(ce.janela_inicio,'07:00') AND v_local::time < coalesce(ce.janela_fim,'20:00')
       AND EXISTS (SELECT 1 FROM whatsapp_instancias i WHERE i.company_id=c.id AND i.status='connected' AND i.ativo_no_rodizio
                    AND (i.proximo_envio_apos IS NULL OR i.proximo_envio_apos <= now()))
  ) THEN RETURN 'sem_trabalho'; END IF;

  v_cod := encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO whatsapp_worker_codigos(hash) VALUES (encode(extensions.digest(v_cod,'sha256'),'hex'));
  PERFORM net.http_post(url := p_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey',p_apikey,'x-worker-secret',v_cod),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
  RETURN 'chamado';
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_worker_tick(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_worker_disparar(text, text) FROM PUBLIC, anon, authenticated;

-- Valida e consome o código: compara pelo hash, só uma vez, só dentro de 2 min.
CREATE OR REPLACE FUNCTION public.whatsapp_worker_consumir_token(p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE n int;
BEGIN
  UPDATE whatsapp_worker_codigos SET usado_em = now()
   WHERE hash = encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
     AND usado_em IS NULL AND expira_em > now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_worker_consumir_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_worker_consumir_token(text) TO service_role;