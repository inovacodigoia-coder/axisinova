-- Permissão do grupo Triagem Lab (permissions.triagem = lista de códigos)
CREATE OR REPLACE FUNCTION public.triagem_tem_permissao(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'triagem','[]'::jsonb) ? _perm));
$$;

-- 1. Papéis das origens (unidade = origem)
ALTER TABLE public.origins
  ADD COLUMN IF NOT EXISTS papel_coleta boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS papel_laboratorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS papel_coleta_externa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS papel_hospital boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS laboratorio_destino_id uuid REFERENCES public.origins(id) ON DELETE RESTRICT;

UPDATE public.origins SET papel_coleta = true, papel_laboratorio = true WHERE internal_code = '00';
UPDATE public.origins o SET papel_coleta = true, papel_laboratorio = false,
  laboratorio_destino_id = (SELECT m.id FROM public.origins m WHERE m.company_id = o.company_id AND m.internal_code = '00' LIMIT 1)
WHERE coalesce(o.internal_code,'') <> '00';

CREATE OR REPLACE FUNCTION public.origins_papeis_guarda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
     NEW.papel_coleta IS DISTINCT FROM OLD.papel_coleta OR NEW.papel_laboratorio IS DISTINCT FROM OLD.papel_laboratorio OR
     NEW.papel_coleta_externa IS DISTINCT FROM OLD.papel_coleta_externa OR NEW.papel_hospital IS DISTINCT FROM OLD.papel_hospital OR
     NEW.laboratorio_destino_id IS DISTINCT FROM OLD.laboratorio_destino_id)
     AND NOT public.triagem_tem_permissao('triagem.config') THEN
    RAISE EXCEPTION 'Você não tem a permissão "Configurar unidades, rotas e critérios"';
  END IF;
  IF NEW.laboratorio_destino_id IS NOT NULL THEN
    IF NEW.laboratorio_destino_id = NEW.id THEN RAISE EXCEPTION 'A origem não pode ser o próprio laboratório de destino'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.origins d WHERE d.id = NEW.laboratorio_destino_id AND d.company_id = NEW.company_id AND d.papel_laboratorio) THEN
      RAISE EXCEPTION 'O laboratório de destino precisa ser uma origem com o papel "Laboratório que analisa"';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_origins_papeis ON public.origins;
CREATE TRIGGER trg_origins_papeis BEFORE UPDATE ON public.origins FOR EACH ROW EXECUTE FUNCTION public.origins_papeis_guarda();
DROP TRIGGER IF EXISTS trg_origins_auditoria ON public.origins;
CREATE TRIGGER trg_origins_auditoria AFTER INSERT OR UPDATE OR DELETE ON public.origins FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();

-- 2. Condições de transporte
CREATE TABLE public.triagem_condicao_transporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  temp_min numeric,
  temp_max numeric,
  cor text NOT NULL DEFAULT '#0EA5E9',
  icone text NOT NULL DEFAULT 'thermometer',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome),
  CHECK (temp_min IS NOT NULL OR temp_max IS NOT NULL),
  CHECK (temp_min IS NULL OR temp_max IS NULL OR temp_min <= temp_max)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triagem_condicao_transporte TO authenticated;
GRANT ALL ON public.triagem_condicao_transporte TO service_role;
ALTER TABLE public.triagem_condicao_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY tct_select ON public.triagem_condicao_transporte FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY tct_write ON public.triagem_condicao_transporte FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.triagem_tem_permissao('triagem.config'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.triagem_tem_permissao('triagem.config'));

-- 3. Rotas de malote
CREATE TABLE public.triagem_rota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  origem_ids uuid[] NOT NULL DEFAULT '{}',
  destino_id uuid NOT NULL REFERENCES public.origins(id) ON DELETE RESTRICT,
  horarios text[] NOT NULL DEFAULT '{}',
  dias_semana integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  transito_max_min integer NOT NULL DEFAULT 60 CHECK (transito_max_min > 0),
  transportador text,
  condicao_ids uuid[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triagem_rota TO authenticated;
GRANT ALL ON public.triagem_rota TO service_role;
ALTER TABLE public.triagem_rota ENABLE ROW LEVEL SECURITY;
CREATE POLICY tr_select ON public.triagem_rota FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY tr_write ON public.triagem_rota FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.triagem_tem_permissao('triagem.config'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.triagem_tem_permissao('triagem.config'));

CREATE OR REPLACE FUNCTION public.triagem_rota_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE h text;
BEGIN
  IF coalesce(array_length(NEW.origem_ids,1),0) = 0 THEN RAISE EXCEPTION 'Informe ao menos uma unidade de origem'; END IF;
  IF NEW.destino_id = ANY(NEW.origem_ids) THEN RAISE EXCEPTION 'O destino não pode estar entre as origens'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.origins d WHERE d.id = NEW.destino_id AND d.company_id = NEW.company_id AND d.papel_laboratorio) THEN
    RAISE EXCEPTION 'O destino precisa ser uma unidade com o papel "Laboratório que analisa"'; END IF;
  IF (SELECT count(*) FROM public.origins o WHERE o.id = ANY(NEW.origem_ids) AND o.company_id = NEW.company_id) <> array_length(NEW.origem_ids,1) THEN
    RAISE EXCEPTION 'Origem inválida na rota'; END IF;
  IF coalesce(array_length(NEW.horarios,1),0) = 0 THEN RAISE EXCEPTION 'Informe ao menos um horário de saída'; END IF;
  FOREACH h IN ARRAY NEW.horarios LOOP
    IF h !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Horário inválido: % (use HH:MM)', h; END IF;
  END LOOP;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_triagem_rota_valida BEFORE INSERT OR UPDATE ON public.triagem_rota FOR EACH ROW EXECUTE FUNCTION public.triagem_rota_valida();

-- condição em uso (rota ou material) não pode ser excluída
CREATE OR REPLACE FUNCTION public.triagem_condicao_delete_guarda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.triagem_rota r WHERE OLD.id = ANY(r.condicao_ids))
     OR EXISTS (SELECT 1 FROM public.lab_material m WHERE m.condicao_transporte_id = OLD.id) THEN
    RAISE EXCEPTION 'EM_USO: condição usada em rota ou material; inative em vez de excluir';
  END IF;
  RETURN OLD;
END $$;

-- 4. Estabilidade por material e sobrescrita no exame
ALTER TABLE public.lab_material
  ADD COLUMN IF NOT EXISTS condicao_transporte_id uuid REFERENCES public.triagem_condicao_transporte(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS estab_ambiente_h numeric CHECK (estab_ambiente_h IS NULL OR estab_ambiente_h > 0),
  ADD COLUMN IF NOT EXISTS estab_refrigerado_h numeric CHECK (estab_refrigerado_h IS NULL OR estab_refrigerado_h > 0),
  ADD COLUMN IF NOT EXISTS estab_congelado_h numeric CHECK (estab_congelado_h IS NULL OR estab_congelado_h > 0);
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS estab_ambiente_h numeric CHECK (estab_ambiente_h IS NULL OR estab_ambiente_h > 0),
  ADD COLUMN IF NOT EXISTS estab_refrigerado_h numeric CHECK (estab_refrigerado_h IS NULL OR estab_refrigerado_h > 0),
  ADD COLUMN IF NOT EXISTS estab_congelado_h numeric CHECK (estab_congelado_h IS NULL OR estab_congelado_h > 0);

CREATE TRIGGER trg_tct_delete BEFORE DELETE ON public.triagem_condicao_transporte FOR EACH ROW EXECUTE FUNCTION public.triagem_condicao_delete_guarda();

-- 5. Motivos de Coleta (CANCELAR/ADIAR/REJEITAR/RESSALVA)
CREATE TABLE public.lab_motivo_coleta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('cancelar','adiar','rejeitar','ressalva')),
  descricao text NOT NULL,
  categoria text CHECK (categoria IS NULL OR categoria IN ('hemolise','coagulo','volume','identificacao','tubo_errado','vazamento','temperatura','estabilidade','lipemia','ictericia','outros')),
  gera_recoleta boolean NOT NULL DEFAULT false,
  texto_ressalva text,
  exige_justificativa boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, tipo, descricao)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_motivo_coleta TO authenticated;
GRANT ALL ON public.lab_motivo_coleta TO service_role;
ALTER TABLE public.lab_motivo_coleta ENABLE ROW LEVEL SECURITY;
CREATE POLICY lmc_select ON public.lab_motivo_coleta FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY lmc_write ON public.lab_motivo_coleta FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.triagem_tem_permissao('triagem.config'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.triagem_tem_permissao('triagem.config'));

CREATE OR REPLACE FUNCTION public.lab_motivo_coleta_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF length(trim(NEW.descricao)) < 3 THEN RAISE EXCEPTION 'Descrição muito curta'; END IF;
  IF NEW.tipo IN ('rejeitar','ressalva') AND NEW.categoria IS NULL THEN RAISE EXCEPTION 'Informe a categoria do motivo'; END IF;
  IF NEW.tipo = 'ressalva' AND coalesce(trim(NEW.texto_ressalva),'') = '' THEN RAISE EXCEPTION 'Motivo de RESSALVA precisa do texto da ressalva no laudo'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_lmc_valida BEFORE INSERT OR UPDATE ON public.lab_motivo_coleta FOR EACH ROW EXECUTE FUNCTION public.lab_motivo_coleta_valida();

-- Auditoria (mesma trilha dos Logs de Auditoria)
CREATE TRIGGER trg_tct_aud AFTER INSERT OR UPDATE OR DELETE ON public.triagem_condicao_transporte FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();
CREATE TRIGGER trg_tr_aud AFTER INSERT OR UPDATE OR DELETE ON public.triagem_rota FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();
CREATE TRIGGER trg_lmc_aud AFTER INSERT OR UPDATE OR DELETE ON public.lab_motivo_coleta FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();

-- Sementes (idempotente)
CREATE OR REPLACE FUNCTION public.triagem__semear(_company uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.triagem_condicao_transporte (company_id, nome, temp_min, temp_max, cor, icone, ordem) VALUES
    (_company, 'Ambiente', 15, 25, '#F59E0B', 'sun', 1),
    (_company, 'Refrigerado', 2, 8, '#0EA5E9', 'snowflake', 2),
    (_company, 'Congelado', NULL, -20, '#6366F1', 'snowflake', 3)
  ON CONFLICT (company_id, nome) DO NOTHING;
  INSERT INTO public.lab_motivo_coleta (company_id, tipo, descricao, categoria, gera_recoleta, texto_ressalva, exige_justificativa, ordem) VALUES
    (_company,'cancelar','Jejum inadequado',NULL,false,NULL,false,1),
    (_company,'adiar','Insumo indisponível',NULL,false,NULL,false,2),
    (_company,'rejeitar','Amostra hemolisada','hemolise',true,NULL,false,10),
    (_company,'rejeitar','Amostra coagulada','coagulo',true,NULL,false,11),
    (_company,'rejeitar','Volume insuficiente','volume',true,NULL,false,12),
    (_company,'rejeitar','Sem identificação / identificação ilegível','identificacao',true,NULL,false,13),
    (_company,'rejeitar','Identificação divergente do pedido','identificacao',true,NULL,false,14),
    (_company,'rejeitar','Tubo ou material inadequado','tubo_errado',true,NULL,false,15),
    (_company,'rejeitar','Vazamento / tubo quebrado','vazamento',true,NULL,false,16),
    (_company,'rejeitar','Temperatura de transporte fora da faixa','temperatura',true,NULL,false,17),
    (_company,'rejeitar','Estabilidade vencida','estabilidade',true,NULL,false,18),
    (_company,'ressalva','Hemólise leve','hemolise',false,'Amostra levemente hemolisada; o resultado pode estar alterado.',true,20),
    (_company,'ressalva','Lipemia','lipemia',false,'Amostra lipêmica; o resultado pode estar alterado.',true,21),
    (_company,'ressalva','Icterícia','ictericia',false,'Amostra ictérica; o resultado pode estar alterado.',true,22),
    (_company,'ressalva','Temperatura fora da faixa em amostra insubstituível','temperatura',false,'Amostra transportada fora da temperatura recomendada; analisada por ser insubstituível. Interpretar com cautela.',true,23),
    (_company,'ressalva','Estabilidade vencida em amostra insubstituível','estabilidade',false,'Amostra analisada após o prazo de estabilidade por ser insubstituível. Interpretar com cautela.',true,24)
  ON CONFLICT (company_id, tipo, descricao) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.triagem__semear(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.triagem_semear_padroes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.triagem_tem_permissao('triagem.config') THEN RAISE EXCEPTION 'Você não tem a permissão "Configurar unidades, rotas e critérios"'; END IF;
  PERFORM public.triagem__semear(public.get_user_company_id(auth.uid()));
END $$;
GRANT EXECUTE ON FUNCTION public.triagem_semear_padroes() TO authenticated;

-- Correção de horário de coleta já confirmado: justificativa + auditoria
CREATE OR REPLACE FUNCTION public.lab_coleta_corrigir_horario(_pedido uuid, _exame_ids text[], _novo timestamptz, _justificativa text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; guides jsonb; antes jsonb := '[]'::jsonb; n int := 0; nome text;
BEGIN
  IF length(trim(coalesce(_justificativa,''))) < 5 THEN RAISE EXCEPTION 'Justificativa obrigatória (mínimo 5 caracteres)'; END IF;
  IF _novo > now() + interval '5 minutes' THEN RAISE EXCEPTION 'O horário da coleta não pode estar no futuro'; END IF;
  SELECT * INTO o FROM public.attendance_orders WHERE id = _pedido AND company_id = public.get_user_company_id(auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.apoio_pedido_exame pe WHERE pe.pedido_id = _pedido AND pe.exame_id::text = ANY(_exame_ids)
             AND pe.status NOT IN ('aguardando_remessa','em_remessa','cancelado')) THEN
    RAISE EXCEPTION 'Há exame já transmitido ao apoio com esse horário; a correção não é permitida';
  END IF;
  SELECT full_name INTO nome FROM public.profiles WHERE id = auth.uid();
  SELECT coalesce(jsonb_agg(jsonb_build_object('exame', coalesce(ex->>'examId', ex->>'id'), 'nome', ex->>'name', 'collectedAt', ex->>'collectedAt'))
         FILTER (WHERE coalesce(ex->>'examId', ex->>'id') = ANY(_exame_ids)), '[]'::jsonb)
    INTO antes
    FROM jsonb_array_elements(coalesce(o.lab_guides,'[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams','[]'::jsonb)) ex;
  SELECT jsonb_agg(
           jsonb_set(g, '{exams}', coalesce((SELECT jsonb_agg(CASE WHEN coalesce(ex->>'examId', ex->>'id') = ANY(_exame_ids)
                   THEN ex || jsonb_build_object('collectedAt', to_jsonb(_novo)) ELSE ex END)
             FROM jsonb_array_elements(coalesce(g->'exams','[]'::jsonb)) ex), '[]'::jsonb)))
    INTO guides FROM jsonb_array_elements(coalesce(o.lab_guides,'[]'::jsonb)) g;
  n := jsonb_array_length(antes);
  IF n = 0 THEN RAISE EXCEPTION 'Nenhum exame encontrado para corrigir'; END IF;
  UPDATE public.attendance_orders SET lab_guides = guides WHERE id = _pedido;
  INSERT INTO public.apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (o.company_id, 'coleta_horario', _pedido::text, 'correcao',
          jsonb_build_object('exames', antes),
          jsonb_build_object('collectedAt', _novo, 'justificativa', _justificativa, 'usuario', nome), auth.uid());
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.lab_coleta_corrigir_horario(uuid, text[], timestamptz, text) TO authenticated;

-- Registro da confirmação/correção antes de confirmar (quando o horário da Recepção foi alterado)
CREATE OR REPLACE FUNCTION public.lab_coleta_registrar(_pedido uuid, _detalhes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  SELECT company_id INTO cid FROM public.attendance_orders WHERE id = _pedido AND company_id = public.get_user_company_id(auth.uid());
  IF cid IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  INSERT INTO public.apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (cid, 'coleta_horario', _pedido::text, 'confirmacao', _detalhes->'antes', _detalhes->'depois', auth.uid());
END $$;
GRANT EXECUTE ON FUNCTION public.lab_coleta_registrar(uuid, jsonb) TO authenticated;