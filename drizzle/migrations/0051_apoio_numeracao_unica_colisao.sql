ALTER TABLE public.apoio_remessa
  ADD COLUMN IF NOT EXISTS envio_sem_resposta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS colisao text;
ALTER TABLE public.apoio_pedido_exame ADD COLUMN IF NOT EXISTS cod_ped_lab text;
ALTER TABLE public.apoio_cursor ADD COLUMN IF NOT EXISTS resolvido_em timestamptz;

CREATE TABLE IF NOT EXISTS public.apoio_lote_usado (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cod_lote_lab bigint NOT NULL,
  remessa_id uuid,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, cod_lote_lab)
);
GRANT SELECT ON public.apoio_lote_usado TO authenticated;
GRANT ALL ON public.apoio_lote_usado TO service_role;
ALTER TABLE public.apoio_lote_usado ENABLE ROW LEVEL SECURITY;
CREATE POLICY apoio_lote_usado_select ON public.apoio_lote_usado FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

INSERT INTO public.apoio_lote_usado (company_id, cod_lote_lab, remessa_id, motivo)
SELECT company_id, cod_lote_lab, id, 'legado' FROM public.apoio_remessa ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.apoio_proximo_lote(_company uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base bigint := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYMMDD')::bigint * 10000; n bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('apoio_remessa:' || _company::text));
  SELECT greatest(coalesce(max(cod_lote_lab), base), base) + 1 INTO n FROM (
    SELECT cod_lote_lab FROM public.apoio_lote_usado WHERE company_id = _company AND cod_lote_lab > base AND cod_lote_lab < base + 10000
    UNION ALL
    SELECT cod_lote_lab FROM public.apoio_remessa WHERE company_id = _company AND cod_lote_lab > base AND cod_lote_lab < base + 10000
  ) x;
  IF n >= base + 10000 THEN RAISE EXCEPTION 'Limite de 9999 remessas no dia atingido'; END IF;
  INSERT INTO public.apoio_lote_usado (company_id, cod_lote_lab, motivo) VALUES (_company, n, 'gerado');
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.apoio_proximo_lote(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apoio_remessa_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cod_lote_lab IS NULL THEN
    NEW.cod_lote_lab := public.apoio_proximo_lote(NEW.company_id);
  END IF;
  IF NEW.mensagem_id IS NULL THEN
    NEW.mensagem_id := replace(NEW.company_id::text,'-','') || '-' || NEW.cod_lote_lab::text;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.apoio_remessa_renumerar(_remessa uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.apoio_remessa_checar(); r public.apoio_remessa%ROWTYPE; n bigint;
BEGIN
  SELECT * INTO r FROM public.apoio_remessa WHERE id = _remessa AND company_id = c FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  IF r.colisao IS NULL OR r.status <> 'erro' THEN RAISE EXCEPTION 'Só remessa com número já usado no Pardini pode ganhar número novo'; END IF;
  UPDATE public.apoio_lote_usado SET motivo = 'colisao: ' || r.colisao, remessa_id = r.id
    WHERE company_id = c AND cod_lote_lab = r.cod_lote_lab;
  n := public.apoio_proximo_lote(c);
  UPDATE public.apoio_remessa SET cod_lote_lab = n,
    mensagem_id = replace(c::text,'-','') || '-' || n::text,
    status = 'aberta', colisao = NULL, envio_sem_resposta = false
  WHERE id = r.id;
  UPDATE public.apoio_pedido_exame SET erro = NULL WHERE remessa_id = r.id;
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_remessa_renumerar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.apoio_cursor_resolver(_apoio uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.apoio_tem_permissao('apoio.remessa.operar') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.apoio_cursor SET resolvido_em = now()
   WHERE apoio_id = _apoio AND company_id = public.get_user_company_id(auth.uid());
END $$;
GRANT EXECUTE ON FUNCTION public.apoio_cursor_resolver(uuid) TO authenticated;