
ALTER TABLE public.apoio_cursor DROP CONSTRAINT IF EXISTS apoio_cursor_rotina_check;
ALTER TABLE public.apoio_cursor ADD CONSTRAINT apoio_cursor_rotina_check CHECK (rotina IN ('resultado','rastreabilidade','pendencia','catalogo','modelos','recebimento','pdf','transmissao','cancelamento','conexao'));
ALTER TABLE public.apoio_cursor ADD COLUMN IF NOT EXISTS ultimo_sucesso timestamptz;
ALTER TABLE public.apoio_cursor ADD COLUMN IF NOT EXISTS ultimo_erro_em timestamptz;

CREATE TABLE IF NOT EXISTS public.apoio_pdf_contador (
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  dia date NOT NULL DEFAULT current_date,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chamadas integer NOT NULL DEFAULT 0,
  PRIMARY KEY (apoio_id, dia)
);
GRANT SELECT ON public.apoio_pdf_contador TO authenticated;
GRANT ALL ON public.apoio_pdf_contador TO service_role;
ALTER TABLE public.apoio_pdf_contador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver contador pdf" ON public.apoio_pdf_contador FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.apoio_pdf_contar(_apoio uuid, _company uuid) RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO apoio_pdf_contador(apoio_id, dia, company_id, chamadas) VALUES (_apoio, current_date, _company, 1)
  ON CONFLICT (apoio_id, dia) DO UPDATE SET chamadas = apoio_pdf_contador.chamadas + 1 RETURNING chamadas;
$$;
REVOKE ALL ON FUNCTION public.apoio_pdf_contar(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_pdf_contar(uuid, uuid) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS apoio_pendencia_unica ON public.apoio_pendencia_tecnica
  (pedido_exame_id, md5(coalesce(pendencia,'') || '|' || coalesce(detalhamento,'')));

-- Token das rotinas agendadas (tabela fechada; só service_role lê)
CREATE TABLE IF NOT EXISTS public.apoio_cron_config (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'));
GRANT ALL ON public.apoio_cron_config TO service_role;
ALTER TABLE public.apoio_cron_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.apoio_cron_config(id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.apoio_resultado_retificado_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE r apoio_pedido_exame%ROWTYPE; ref text; res record;
BEGIN
  IF coalesce(NEW.retificacao,'') IN ('','N','0') OR NEW.origem <> 'integracao' THEN RETURN NEW; END IF;
  SELECT * INTO r FROM apoio_pedido_exame WHERE id = NEW.pedido_exame_id;
  IF r.status <> 'liberado_local' THEN RETURN NEW; END IF;
  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE apoio_pedido_exame SET status = 'importado' WHERE id = r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);
  INSERT INTO apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo)
  VALUES (r.company_id, r.id, 'liberado_local', 'importado', 'integracao', 'Resultado retificado pelo apoio');
  ref := r.pedido_id::text || ':' || r.exame_id::text;
  SELECT id, released_by, exam_name, protocol INTO res FROM lab_exam_results WHERE company_id = r.company_id AND exam_ref = ref;
  UPDATE lab_exam_results SET status = 'digitized', retificado_em = now() WHERE company_id = r.company_id AND exam_ref = ref;
  IF res.released_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notificacao_evento_config c WHERE c.company_id = r.company_id AND c.evento = 'Resultado de apoio retificado' AND NOT c.canal_sistema) THEN
    INSERT INTO user_notifications (company_id, user_id, category, priority, title, message, action_route)
    VALUES (r.company_id, res.released_by, 'apoio', 'high', 'Resultado retificado pelo apoio',
      format('O exame %s do protocolo %s foi retificado pelo apoio e voltou para Validação.', coalesce(res.exam_name,''), coalesce(res.protocol,'')),
      '/app/lab/analise?pedido=' || coalesce(res.protocol,''));
    INSERT INTO notificacao_historico(company_id, evento, destinatario, canal, conteudo)
    VALUES (r.company_id, 'Resultado de apoio retificado', coalesce((SELECT full_name FROM profiles WHERE id = res.released_by), '1 usuário'), 'Sininho',
      format('%s (protocolo %s) retificado pelo apoio', coalesce(res.exam_name,''), coalesce(res.protocol,'')));
  END IF;
  RETURN NEW;
END $function$;
