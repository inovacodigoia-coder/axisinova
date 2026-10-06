CREATE TABLE public.whatsapp_fila_eventos (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL,
  fila_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.whatsapp_fila_eventos IS 'Sinal sem dados pessoais para atualizar a tela da fila em tempo real.';
CREATE INDEX whatsapp_fila_eventos_criado_idx ON public.whatsapp_fila_eventos(criado_em);
GRANT SELECT ON public.whatsapp_fila_eventos TO authenticated;
GRANT ALL ON public.whatsapp_fila_eventos TO service_role;
ALTER TABLE public.whatsapp_fila_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fila eventos da empresa" ON public.whatsapp_fila_eventos FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('whatsapp.fila'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_fila_eventos;

CREATE OR REPLACE FUNCTION public.whatsapp_fila_evento_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.whatsapp_fila_eventos(company_id, fila_id) VALUES (NEW.company_id, NEW.id);
  DELETE FROM public.whatsapp_fila_eventos WHERE criado_em < now() - interval '1 hour';
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_fila_evento_trg() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER whatsapp_fila_evento AFTER INSERT OR UPDATE ON public.whatsapp_fila_envios
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_fila_evento_trg();

CREATE OR REPLACE FUNCTION public.whatsapp_fila_texto(p_id uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  IF NOT public.whatsapp_tem_permissao('whatsapp.fila') THEN RAISE EXCEPTION 'SEM_PERMISSAO'; END IF;
  SELECT texto_final INTO t FROM public.whatsapp_fila_envios
   WHERE id = p_id AND company_id = public.get_user_company_id(auth.uid());
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_fila_cancelar(p_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.whatsapp_tem_permissao('whatsapp.fila') THEN RETURN 'SEM_PERMISSAO'; END IF;
  UPDATE public.whatsapp_fila_envios SET status = 'cancelada', atualizado_em = now()
   WHERE id = p_id AND company_id = public.get_user_company_id(auth.uid()) AND status = 'agendada';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN CASE WHEN n = 1 THEN 'OK' ELSE 'NAO_CANCELAVEL' END;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_fila_reenviar(p_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.whatsapp_tem_permissao('whatsapp.fila') THEN RETURN 'SEM_PERMISSAO'; END IF;
  BEGIN
    UPDATE public.whatsapp_fila_envios
       SET status = 'agendada', agendada_para = now(), instancia_id = NULL, erro = NULL,
           message_id_uazapi = NULL, enviada_em = NULL, atualizado_em = now()
     WHERE id = p_id AND company_id = public.get_user_company_id(auth.uid()) AND status = 'falha';
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION WHEN unique_violation THEN RETURN 'JA_EXISTE_ATIVA';
  END;
  RETURN CASE WHEN n = 1 THEN 'OK' ELSE 'NAO_REENVIAVEL' END;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_fila_numeros() RETURNS TABLE(instancia_id uuid, apelido text, enviadas_hoje int, limite_diario int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.apelido,
    (SELECT count(*)::int FROM public.whatsapp_fila_envios f WHERE f.instancia_id = i.id
       AND f.tipo = 'confirmacao_agendamento' AND f.status IN ('enviando','enviada','entregue','lida')
       AND (coalesce(f.enviada_em, f.atualizado_em) AT TIME ZONE 'America/Fortaleza')::date = (now() AT TIME ZONE 'America/Fortaleza')::date),
    i.limite_diario::int
  FROM public.whatsapp_instancias i
  WHERE i.company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('whatsapp.fila')
  ORDER BY i.criado_em
$$;

REVOKE EXECUTE ON FUNCTION public.whatsapp_fila_texto(uuid), public.whatsapp_fila_cancelar(uuid), public.whatsapp_fila_reenviar(uuid), public.whatsapp_fila_numeros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_fila_texto(uuid), public.whatsapp_fila_cancelar(uuid), public.whatsapp_fila_reenviar(uuid), public.whatsapp_fila_numeros() TO authenticated;