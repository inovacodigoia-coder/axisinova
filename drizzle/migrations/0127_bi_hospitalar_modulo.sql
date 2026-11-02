
-- BI de Gestão Hospitalar — Etapa 1: habilitação, permissões e tabelas-base

-- 1. Flag da empresa (nasce desabilitada; empresas existentes também)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bi_hospitalar_habilitado boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bi_hospitalar_habilitado_por uuid;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bi_hospitalar_habilitado_em timestamptz;

-- 2. Permissão do módulo (empresa habilitada + perfil com a ação; gerente da empresa tem todas)
CREATE OR REPLACE FUNCTION public.bi_hospitalar_tem_permissao(_acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = public.get_user_company_id(auth.uid()) AND c.bi_hospitalar_habilitado)
    AND (
      public.is_company_manager(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.sector_users su
        JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
        JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
        WHERE su.user_id = auth.uid()
          AND ap.company_id = public.get_user_company_id(auth.uid())
          AND coalesce(ap.permissions->'bi_hospitalar','[]'::jsonb) ? _acao));
$$;
REVOKE EXECUTE ON FUNCTION public.bi_hospitalar_tem_permissao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bi_hospitalar_tem_permissao(text) TO authenticated;

-- 3. Acesso do usuário logado (para menu/tela)
CREATE OR REPLACE FUNCTION public.bi_meu_acesso()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'ver', public.bi_hospitalar_tem_permissao('view'),
    'exportar', public.bi_hospitalar_tem_permissao('export'),
    'configurar', public.bi_hospitalar_tem_permissao('config'));
$$;
REVOKE EXECUTE ON FUNCTION public.bi_meu_acesso() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bi_meu_acesso() TO authenticated;

-- 4. Liberação do módulo (somente Super Admin)
CREATE OR REPLACE FUNCTION public.bi_hospitalar_liberar(_company uuid, _habilitado boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  SELECT * INTO c FROM public.companies WHERE id = _company FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  UPDATE public.companies SET bi_hospitalar_habilitado = _habilitado,
    bi_hospitalar_habilitado_por = CASE WHEN _habilitado <> c.bi_hospitalar_habilitado THEN auth.uid() ELSE bi_hospitalar_habilitado_por END,
    bi_hospitalar_habilitado_em = CASE WHEN _habilitado <> c.bi_hospitalar_habilitado THEN now() ELSE bi_hospitalar_habilitado_em END
  WHERE id = _company;
  INSERT INTO public.bi_acesso_log(company_id, usuario_id, acao, detalhes) VALUES (_company, auth.uid(), 'liberacao_modulo',
    jsonb_build_object('antes', c.bi_hospitalar_habilitado, 'depois', _habilitado));
END $$;
REVOKE EXECUTE ON FUNCTION public.bi_hospitalar_liberar(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bi_hospitalar_liberar(uuid, boolean) TO authenticated;

-- 5. Eventos da jornada (imutáveis, isolados por empresa)
CREATE TABLE public.bi_jornada_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  hospital_episode_id uuid,
  patient_id uuid,
  attendance_order_id uuid,
  tipo_evento text NOT NULL,
  fase text,
  setor text,
  local text,
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid,
  origem_tabela text,
  origem_id uuid,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ajuste_de uuid,
  justificativa text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_jornada_eventos_episodio_idx ON public.bi_jornada_eventos (company_id, hospital_episode_id, ocorrido_em);
CREATE INDEX bi_jornada_eventos_pedido_idx ON public.bi_jornada_eventos (company_id, attendance_order_id);
GRANT SELECT ON public.bi_jornada_eventos TO authenticated;
GRANT ALL ON public.bi_jornada_eventos TO service_role;
ALTER TABLE public.bi_jornada_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY bi_jornada_eventos_sel ON public.bi_jornada_eventos FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.bi_hospitalar_tem_permissao('view'));

-- Imutabilidade: correção somente via novo evento de ajuste
CREATE OR REPLACE FUNCTION public.bi_jornada_eventos_imutavel()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Eventos da jornada são imutáveis; registre um evento de ajuste com justificativa';
END $$;
CREATE TRIGGER bi_jornada_eventos_imutavel_upd BEFORE UPDATE ON public.bi_jornada_eventos FOR EACH ROW EXECUTE FUNCTION public.bi_jornada_eventos_imutavel();
CREATE TRIGGER bi_jornada_eventos_imutavel_del BEFORE DELETE ON public.bi_jornada_eventos FOR EACH ROW EXECUTE FUNCTION public.bi_jornada_eventos_imutavel();

-- 6. Log de erros de gravação (falha de evento não bloqueia a operação clínica)
CREATE TABLE public.bi_jornada_erros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  origem_tabela text,
  origem_id uuid,
  tipo_evento text,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bi_jornada_erros TO authenticated;
GRANT ALL ON public.bi_jornada_erros TO service_role;
ALTER TABLE public.bi_jornada_erros ENABLE ROW LEVEL SECURITY;
CREATE POLICY bi_jornada_erros_sel ON public.bi_jornada_erros FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.bi_hospitalar_tem_permissao('config'));

-- 7. Gravação única de evento (usada pelos gatilhos; nunca bloqueia a operação de origem)
CREATE OR REPLACE FUNCTION public.bi_evento(_company uuid, _episodio uuid, _paciente uuid, _pedido uuid,
  _tipo text, _fase text, _setor text, _local text, _usuario uuid, _origem_tabela text, _origem_id uuid, _detalhes jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.bi_jornada_eventos(company_id, hospital_episode_id, patient_id, attendance_order_id,
    tipo_evento, fase, setor, local, usuario_id, origem_tabela, origem_id, detalhes)
  VALUES (_company, _episodio, _paciente, _pedido, _tipo, _fase, _setor, _local, _usuario, _origem_tabela, _origem_id, coalesce(_detalhes,'{}'::jsonb));
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.bi_jornada_erros(company_id, origem_tabela, origem_id, tipo_evento, erro)
    VALUES (_company, _origem_tabela, _origem_id, _tipo, SQLERRM);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
REVOKE EXECUTE ON FUNCTION public.bi_evento(uuid, uuid, uuid, uuid, text, text, text, text, uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bi_evento(uuid, uuid, uuid, uuid, text, text, text, text, uuid, text, uuid, jsonb) TO service_role;

-- 8. Itens consumidos com valor congelado
CREATE TABLE public.bi_consumo_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  hospital_episode_id uuid,
  patient_id uuid,
  attendance_order_id uuid,
  tipo text NOT NULL, -- 'medicacao' | 'exame'
  item_codigo text,  -- exame: SEMPRE código interno do Catálogo de Exames (nunca TUSS/ANS)
  item_nome text NOT NULL,
  quantidade numeric,
  dose text,
  administrado_em timestamptz,
  valor_unitario numeric,        -- congelado no momento do consumo
  sem_valor_cadastrado boolean NOT NULL DEFAULT false,
  origem_tabela text,
  origem_id uuid,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_consumo_itens_episodio_idx ON public.bi_consumo_itens (company_id, hospital_episode_id);
GRANT SELECT ON public.bi_consumo_itens TO authenticated;
GRANT ALL ON public.bi_consumo_itens TO service_role;
ALTER TABLE public.bi_consumo_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY bi_consumo_itens_sel ON public.bi_consumo_itens FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.bi_hospitalar_tem_permissao('view'));
CREATE TRIGGER bi_consumo_itens_imutavel_upd BEFORE UPDATE ON public.bi_consumo_itens FOR EACH ROW EXECUTE FUNCTION public.bi_jornada_eventos_imutavel();
CREATE TRIGGER bi_consumo_itens_imutavel_del BEFORE DELETE ON public.bi_consumo_itens FOR EACH ROW EXECUTE FUNCTION public.bi_jornada_eventos_imutavel();

-- 9. Auditoria de acesso (LGPD)
CREATE TABLE public.bi_acesso_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  usuario_id uuid,
  acao text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bi_acesso_log TO authenticated;
GRANT ALL ON public.bi_acesso_log TO service_role;
ALTER TABLE public.bi_acesso_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY bi_acesso_log_sel ON public.bi_acesso_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.bi_hospitalar_tem_permissao('config'));

CREATE OR REPLACE FUNCTION public.bi_registrar_acesso(_acao text, _detalhes jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.bi_hospitalar_tem_permissao('view') THEN RAISE EXCEPTION 'Sem acesso ao BI de Gestão Hospitalar'; END IF;
  INSERT INTO public.bi_acesso_log(company_id, usuario_id, acao, detalhes)
  VALUES (public.get_user_company_id(auth.uid()), auth.uid(), _acao, coalesce(_detalhes,'{}'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.bi_registrar_acesso(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bi_registrar_acesso(text, jsonb) TO authenticated;

-- 10. Evasão (ação manual, com permissão)
CREATE OR REPLACE FUNCTION public.bi_registrar_evasao(_episodio uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ep record;
BEGIN
  IF NOT public.bi_hospitalar_tem_permissao('view') THEN RAISE EXCEPTION 'Sem acesso ao BI de Gestão Hospitalar'; END IF;
  IF coalesce(trim(_motivo),'') = '' THEN RAISE EXCEPTION 'Informe o motivo da evasão'; END IF;
  SELECT t.company_id, t.patient_id, t.order_id INTO ep FROM public.triage_entries t WHERE t.hospital_episode_id = _episodio LIMIT 1;
  IF ep.company_id IS NULL THEN
    SELECT o.company_id, o.patient_id, o.id INTO ep FROM public.attendance_orders o WHERE o.hospital_episode_id = _episodio LIMIT 1;
  END IF;
  IF ep.company_id IS NULL OR ep.company_id <> public.get_user_company_id(auth.uid()) THEN RAISE EXCEPTION 'Atendimento não encontrado'; END IF;
  PERFORM public.bi_evento(ep.company_id, _episodio, ep.patient_id, ep.order_id, 'saida_evasao', 'saida', NULL, NULL, auth.uid(), 'manual', _episodio, jsonb_build_object('motivo', _motivo));
END $$;
REVOKE EXECUTE ON FUNCTION public.bi_registrar_evasao(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bi_registrar_evasao(uuid, text) TO authenticated;
