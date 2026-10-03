ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS whatsapp_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_numeros_autorizados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_habilitado_por uuid,
  ADD COLUMN IF NOT EXISTS whatsapp_habilitado_em timestamptz;
ALTER TABLE public.companies ADD CONSTRAINT companies_whatsapp_numeros_chk CHECK (whatsapp_numeros_autorizados >= 0);

CREATE OR REPLACE FUNCTION public.whatsapp_tem_permissao(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'whatsapp','[]'::jsonb) ? _perm));
$$;

-- Auditoria
CREATE TABLE public.whatsapp_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  acao text NOT NULL,
  antes jsonb, depois jsonb,
  usuario_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_auditoria TO authenticated;
GRANT ALL ON public.whatsapp_auditoria TO service_role;
ALTER TABLE public.whatsapp_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_aud_super" ON public.whatsapp_auditoria FOR SELECT TO authenticated USING (private.is_super_admin());

-- Instâncias
CREATE TABLE public.whatsapp_instancias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apelido text,
  nome_instancia text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'nao_configurada' CHECK (status IN ('nao_configurada','disconnected','connecting','connected','hibernated')),
  numero_conectado text, nome_perfil text, foto_perfil_url text, ultimo_motivo_desconexao text,
  conectado_em timestamptz, status_atualizado_em timestamptz,
  ativo_no_rodizio boolean NOT NULL DEFAULT true,
  limite_diario integer CHECK (limite_diario IS NULL OR limite_diario >= 0),
  ultimo_envio_em timestamptz, proximo_envio_apos timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.whatsapp_instancias(company_id);
GRANT SELECT ON public.whatsapp_instancias TO authenticated;
GRANT ALL ON public.whatsapp_instancias TO service_role;
ALTER TABLE public.whatsapp_instancias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_inst_select" ON public.whatsapp_instancias FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) OR private.is_super_admin());

-- Segredos (sem acesso do frontend)
CREATE TABLE public.whatsapp_instancia_segredos (
  instancia_id uuid PRIMARY KEY REFERENCES public.whatsapp_instancias(id) ON DELETE CASCADE,
  token_instancia_cifrado bytea NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_instancia_segredos TO service_role;
ALTER TABLE public.whatsapp_instancia_segredos ENABLE ROW LEVEL SECURITY;

-- Solicitações
CREATE TABLE public.whatsapp_solicitacoes_numero (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  solicitado_por uuid,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada')),
  valor numeric(10,2) NOT NULL DEFAULT 100.00,
  observacao_empresa text, motivo_recusa text,
  decidido_por uuid, decidido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whatsapp_solic_uma_pendente ON public.whatsapp_solicitacoes_numero(company_id) WHERE status = 'pendente';
GRANT SELECT, INSERT ON public.whatsapp_solicitacoes_numero TO authenticated;
GRANT ALL ON public.whatsapp_solicitacoes_numero TO service_role;
ALTER TABLE public.whatsapp_solicitacoes_numero ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_sol_select" ON public.whatsapp_solicitacoes_numero FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) OR private.is_super_admin());
CREATE POLICY "wa_sol_insert" ON public.whatsapp_solicitacoes_numero FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp'));

CREATE OR REPLACE FUNCTION public.whatsapp_valor_numero()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT (value #>> '{}')::numeric FROM public.system_settings WHERE key = 'whatsapp_valor_numero'), 100.00)
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_solicitacao_forcar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status := 'pendente';
  NEW.valor := public.whatsapp_valor_numero();
  NEW.solicitado_por := auth.uid();
  NEW.motivo_recusa := NULL; NEW.decidido_por := NULL; NEW.decidido_em := NULL;
  NEW.criado_em := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wa_sol_forcar BEFORE INSERT ON public.whatsapp_solicitacoes_numero
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_solicitacao_forcar();

-- Modelos e config
CREATE TABLE public.whatsapp_modelos_mensagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'confirmacao_agendamento',
  posicao smallint NOT NULL CHECK (posicao BETWEEN 1 AND 3),
  texto text NOT NULL CHECK (char_length(texto) <= 600),
  ativo boolean NOT NULL DEFAULT true,
  UNIQUE (company_id, tipo, posicao)
);
GRANT SELECT, UPDATE ON public.whatsapp_modelos_mensagem TO authenticated;
GRANT ALL ON public.whatsapp_modelos_mensagem TO service_role;
ALTER TABLE public.whatsapp_modelos_mensagem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_mod_select" ON public.whatsapp_modelos_mensagem FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) OR private.is_super_admin());
CREATE POLICY "wa_mod_update" ON public.whatsapp_modelos_mensagem FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TABLE public.whatsapp_config_empresa (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  proximo_modelo smallint NOT NULL DEFAULT 1 CHECK (proximo_modelo BETWEEN 1 AND 3)
);
GRANT SELECT ON public.whatsapp_config_empresa TO authenticated;
GRANT ALL ON public.whatsapp_config_empresa TO service_role;
ALTER TABLE public.whatsapp_config_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_cfg_select" ON public.whatsapp_config_empresa FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) OR private.is_super_admin());

CREATE OR REPLACE FUNCTION public.whatsapp_criar_modelos_padrao(_company uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.whatsapp_modelos_mensagem (company_id, posicao, texto) VALUES
   (_company, 1, 'Olá, {paciente}! Tudo bem? Passando para confirmar sua {tipo} com {medico} em {data_hora}. Responda SIM para confirmar ou NÃO caso precise remarcar.'),
   (_company, 2, 'Oi, {paciente}! Sua {tipo} com {medico} está agendada para {data_hora}. Pode confirmar sua presença respondendo SIM?'),
   (_company, 3, '{paciente}, tudo certo para {data_hora}? Temos {tipo} marcada com {medico}. Responda SIM para confirmar ou NÃO para remarcarmos.')
  ON CONFLICT (company_id, tipo, posicao) DO NOTHING;
  INSERT INTO public.whatsapp_config_empresa (company_id) VALUES (_company) ON CONFLICT DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_criar_modelos_padrao(uuid) FROM PUBLIC, anon, authenticated;

-- Fila
CREATE TABLE public.whatsapp_fila_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('teste','confirmacao_agendamento')),
  agendamento_id uuid,
  paciente_nome text,
  telefone_destino text NOT NULL CHECK (telefone_destino ~ '^55[0-9]{10,11}$'),
  modelo_posicao smallint,
  texto_final text NOT NULL,
  instancia_id uuid REFERENCES public.whatsapp_instancias(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','enviando','enviada','entregue','lida','falha','cancelada')),
  agendada_para timestamptz NOT NULL DEFAULT now(),
  enviada_em timestamptz, message_id_uazapi text, erro text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_fila_status_idx ON public.whatsapp_fila_envios(status, agendada_para);
CREATE UNIQUE INDEX whatsapp_fila_sem_duplicar ON public.whatsapp_fila_envios(agendamento_id, tipo)
  WHERE status <> 'cancelada' AND status <> 'falha';
GRANT ALL ON public.whatsapp_fila_envios TO service_role;
ALTER TABLE public.whatsapp_fila_envios ENABLE ROW LEVEL SECURITY;

CREATE VIEW public.whatsapp_fila_envios_v AS
SELECT f.id, f.company_id, f.tipo, f.agendamento_id, f.paciente_nome,
  left(f.telefone_destino, 5) || '****' || right(f.telefone_destino, 3) AS telefone_mascarado,
  f.modelo_posicao, left(f.texto_final, 80) AS texto_resumo, f.instancia_id, f.status,
  f.agendada_para, f.enviada_em, f.erro, f.criado_por, f.criado_em, f.atualizado_em
FROM public.whatsapp_fila_envios f
WHERE f.company_id = public.get_user_company_id(auth.uid())
  AND public.whatsapp_tem_permissao('whatsapp.fila');
GRANT SELECT ON public.whatsapp_fila_envios_v TO authenticated;

-- Ações do Super Admin
CREATE OR REPLACE FUNCTION public.whatsapp_liberar(_company uuid, _habilitado boolean, _numeros integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.companies; n integer;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  SELECT * INTO c FROM public.companies WHERE id = _company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  n := coalesce(_numeros, c.whatsapp_numeros_autorizados);
  IF n < 0 THEN RAISE EXCEPTION 'Números autorizados deve ser 0 ou mais'; END IF;
  IF _habilitado AND NOT c.whatsapp_habilitado AND c.whatsapp_habilitado_em IS NULL AND n = 0 THEN n := 1; END IF;
  UPDATE public.companies SET
    whatsapp_habilitado = _habilitado,
    whatsapp_numeros_autorizados = n,
    whatsapp_habilitado_por = CASE WHEN _habilitado AND NOT c.whatsapp_habilitado THEN auth.uid() ELSE whatsapp_habilitado_por END,
    whatsapp_habilitado_em = CASE WHEN _habilitado AND NOT c.whatsapp_habilitado THEN now() ELSE whatsapp_habilitado_em END
  WHERE id = _company;
  IF _habilitado THEN PERFORM public.whatsapp_criar_modelos_padrao(_company); END IF;
  INSERT INTO public.whatsapp_auditoria (company_id, acao, antes, depois, usuario_id) VALUES (_company, 'liberacao',
    jsonb_build_object('habilitado', c.whatsapp_habilitado, 'numeros_autorizados', c.whatsapp_numeros_autorizados),
    jsonb_build_object('habilitado', _habilitado, 'numeros_autorizados', n), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_decidir_solicitacao(_id uuid, _aprovar boolean, _motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.whatsapp_solicitacoes_numero; antes_n integer;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  SELECT * INTO s FROM public.whatsapp_solicitacoes_numero WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR s.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação não está pendente'; END IF;
  IF NOT _aprovar AND coalesce(trim(_motivo), '') = '' THEN RAISE EXCEPTION 'Informe o motivo da recusa'; END IF;
  UPDATE public.whatsapp_solicitacoes_numero SET status = CASE WHEN _aprovar THEN 'aprovada' ELSE 'recusada' END,
    motivo_recusa = CASE WHEN _aprovar THEN NULL ELSE trim(_motivo) END, decidido_por = auth.uid(), decidido_em = now()
  WHERE id = _id;
  SELECT whatsapp_numeros_autorizados INTO antes_n FROM public.companies WHERE id = s.company_id FOR UPDATE;
  IF _aprovar THEN
    UPDATE public.companies SET whatsapp_numeros_autorizados = whatsapp_numeros_autorizados + 1 WHERE id = s.company_id;
  END IF;
  INSERT INTO public.whatsapp_auditoria (company_id, acao, antes, depois, usuario_id) VALUES (s.company_id,
    CASE WHEN _aprovar THEN 'solicitacao_aprovada' ELSE 'solicitacao_recusada' END,
    jsonb_build_object('solicitacao_id', s.id, 'status', 'pendente', 'numeros_autorizados', antes_n),
    jsonb_build_object('solicitacao_id', s.id, 'status', CASE WHEN _aprovar THEN 'aprovada' ELSE 'recusada' END,
      'numeros_autorizados', antes_n + CASE WHEN _aprovar THEN 1 ELSE 0 END, 'valor', s.valor, 'motivo', _motivo), auth.uid());
  INSERT INTO public.user_notifications (user_id, company_id, title, message, category, priority)
  SELECT p.id, s.company_id,
    CASE WHEN _aprovar THEN 'Novo número de WhatsApp aprovado' ELSE 'Solicitação de número de WhatsApp recusada' END,
    CASE WHEN _aprovar THEN 'Sua solicitação foi aprovada. Você já pode configurar mais um número.'
         ELSE 'Motivo: ' || trim(_motivo) END,
    'system', CASE WHEN _aprovar THEN 'medium' ELSE 'high' END
  FROM public.profiles p WHERE p.company_id = s.company_id AND public.is_company_manager(p.id);
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_definir_valor(_valor numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE antes numeric;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  IF _valor IS NULL OR _valor < 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  antes := public.whatsapp_valor_numero();
  INSERT INTO public.system_settings (key, value, updated_at) VALUES ('whatsapp_valor_numero', to_jsonb(round(_valor, 2)), now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  INSERT INTO public.whatsapp_auditoria (acao, antes, depois, usuario_id)
  VALUES ('valor_numero', jsonb_build_object('valor', antes), jsonb_build_object('valor', round(_valor, 2)), auth.uid());
END $$;

REVOKE EXECUTE ON FUNCTION public.whatsapp_liberar(uuid, boolean, integer), public.whatsapp_decidir_solicitacao(uuid, boolean, text), public.whatsapp_definir_valor(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_liberar(uuid, boolean, integer), public.whatsapp_decidir_solicitacao(uuid, boolean, text), public.whatsapp_definir_valor(numeric), public.whatsapp_valor_numero() TO authenticated;