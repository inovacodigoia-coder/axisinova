
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS apoio_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apoio_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS apoio_released_by text;

CREATE OR REPLACE FUNCTION public.protect_apoio_entitlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF private.is_super_admin() THEN RETURN NEW; END IF;
  NEW.apoio_enabled := OLD.apoio_enabled;
  NEW.apoio_released_at := OLD.apoio_released_at;
  NEW.apoio_released_by := OLD.apoio_released_by;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_apoio_entitlement BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_apoio_entitlement();

CREATE OR REPLACE FUNCTION public.apoio_modulo_liberado(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT apoio_enabled FROM public.companies WHERE id = _company_id), false);
$$;

CREATE TYPE public.apoio_status AS ENUM (
  'aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','pendencia_tecnica',
  'nova_coleta','liberado_apoio','importado','importado_com_pendencia','liberado_local','cancelado','erro_transmissao');

CREATE TABLE public.apoio_laboratorio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL, cnpj text,
  conector text NOT NULL DEFAULT 'manual' CHECK (conector IN ('pardini','manual')),
  cod_lab text, senha_secret_id uuid, endpoint_url text,
  ambiente text NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('producao','homologacao')),
  modo_contingencia boolean NOT NULL DEFAULT false,
  opcoes jsonb NOT NULL DEFAULT '{"valorReferencia":2,"papelTimbrado":false,"grafico":true,"dadosConstantes":true}'::jsonb,
  dias_transporte int NOT NULL DEFAULT 1, guardar_pdf_sempre boolean NOT NULL DEFAULT true,
  licenca_sanitaria text, licenca_validade date, contato_nome text, contato_email text, contato_telefone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_certificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  tipo text NOT NULL, numero text, validade date, arquivo_path text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_catalogo_exame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  codigo text NOT NULL, mnmat text, mnexa text, descricao text,
  materiais jsonb, conservantes jsonb, info_comp jsonb, condicoes jsonb, origem_admissivel text,
  exige_pdf boolean NOT NULL DEFAULT false, ativo boolean NOT NULL DEFAULT true, sincronizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apoio_id, codigo));

CREATE TABLE public.apoio_preco_importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  arquivo_nome text, linhas_total int DEFAULT 0, linhas_ok int DEFAULT 0, linhas_erro int DEFAULT 0,
  erros jsonb, ficticia boolean NOT NULL DEFAULT false, importado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_preco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  codigo text NOT NULL, preco numeric(12,2) NOT NULL, prazo_dias_uteis int,
  vigencia_inicio date NOT NULL DEFAULT current_date, vigencia_fim date,
  ficticio boolean NOT NULL DEFAULT false,
  importacao_id uuid REFERENCES public.apoio_preco_importacao(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.apoio_preco (apoio_id, codigo, vigencia_inicio);

CREATE TABLE public.apoio_depara_exame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  exame_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  codigo_apoio text NOT NULL, prioridade int NOT NULL DEFAULT 1, ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, exame_id, apoio_id));

CREATE TABLE public.apoio_depara_analito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  depara_exame_id uuid NOT NULL REFERENCES public.apoio_depara_exame(id) ON DELETE CASCADE,
  codigo_formato text NOT NULL DEFAULT '', chave_analito text NOT NULL, nome_apoio text,
  parametro_id uuid REFERENCES public.lab_exam_parameters(id) ON DELETE SET NULL,
  ignorar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depara_exame_id, codigo_formato, chave_analito));

CREATE TABLE public.apoio_remessa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id),
  cod_lote_lab bigint, mensagem_id text UNIQUE, cod_lote_apoio text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','conferida','transmitindo','transmitida','parcial','erro','manual','cancelada')),
  temperatura text NOT NULL DEFAULT 'ambiente' CHECK (temperatura IN ('ambiente','refrigerada','congelada')),
  modo text NOT NULL DEFAULT 'automatico' CHECK (modo IN ('automatico','manual')),
  criado_por uuid, conferido_por uuid, conferido_em timestamptz, transmitido_em timestamptz,
  entregue_a text, entregue_em timestamptz, observacao text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, cod_lote_lab));

CREATE TABLE public.apoio_recipiente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  remessa_id uuid NOT NULL REFERENCES public.apoio_remessa(id) ON DELETE CASCADE,
  cod_ped_apoio text, cod_bar_apoio text, etiqueta_epl text, impressoes int NOT NULL DEFAULT 0,
  bipado boolean NOT NULL DEFAULT false, bipado_em timestamptz, cancelado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_pedido_exame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pedido_id uuid NOT NULL REFERENCES public.attendance_orders(id),
  exame_id uuid REFERENCES public.exams(id),
  amostra_id uuid,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id),
  codigo_apoio text, sequencial int NOT NULL DEFAULT 1,
  remessa_id uuid REFERENCES public.apoio_remessa(id) ON DELETE SET NULL,
  recipiente_id uuid REFERENCES public.apoio_recipiente(id) ON DELETE SET NULL,
  cod_ped_apoio text,
  status public.apoio_status NOT NULL DEFAULT 'aguardando_remessa',
  status_apoio_cod text, status_apoio_desc text, status_apoio_em timestamptz,
  modo text NOT NULL DEFAULT 'automatico' CHECK (modo IN ('automatico','manual')),
  prazo_previsto date, custo_previsto numeric(12,2), preco_ficticio boolean NOT NULL DEFAULT false,
  info_complementar jsonb, erro jsonb, critico boolean NOT NULL DEFAULT false, responsavel_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.apoio_pedido_exame (company_id, status);
CREATE INDEX ON public.apoio_pedido_exame (pedido_id);
CREATE INDEX ON public.apoio_pedido_exame (cod_ped_apoio);

CREATE TABLE public.apoio_pedido_exame_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pedido_exame_id uuid NOT NULL REFERENCES public.apoio_pedido_exame(id) ON DELETE CASCADE,
  status_de public.apoio_status, status_para public.apoio_status NOT NULL,
  origem text NOT NULL CHECK (origem IN ('sistema','integracao','manual')),
  motivo text, usuario_id uuid, dados jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_resultado_versao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pedido_exame_id uuid REFERENCES public.apoio_pedido_exame(id) ON DELETE SET NULL,
  cod_ped_apoio text, cod_exm_apoio text, codigo_formato text, retificacao text,
  origem text NOT NULL CHECK (origem IN ('integracao','manual')),
  conteudo jsonb, xml_original text, hash text,
  situacao text NOT NULL DEFAULT 'importado' CHECK (situacao IN ('importado','pendente_depara','pendente_formato','substituido','divergente')),
  digitado_por uuid, conferido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_exame_id, hash));

CREATE TABLE public.apoio_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pedido_exame_id uuid NOT NULL REFERENCES public.apoio_pedido_exame(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('laudo_pdf','grafico','anexo_manual')),
  storage_path text NOT NULL, origem text, enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_pendencia_tecnica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pedido_exame_id uuid REFERENCES public.apoio_pedido_exame(id) ON DELETE SET NULL,
  cod_ped_apoio text, codigo_apoio text, situacao text, pendencia text, detalhamento text, disposicao text,
  recebida_em timestamptz DEFAULT now(), resolvida_em timestamptz, resolvida_por uuid, resolucao text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_status_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  cod_apoio text NOT NULL, descricao_apoio text, status_nosso public.apoio_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apoio_id, cod_apoio));

CREATE TABLE public.apoio_erro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  codigo text NOT NULL, mensagem text,
  categoria text CHECK (categoria IN ('preenchimento','comercial','duplicidade','tecnico')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_cursor (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  rotina text NOT NULL CHECK (rotina IN ('resultado','rastreabilidade','pendencia','catalogo','modelos')),
  ate timestamptz, ultima_execucao timestamptz, ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (apoio_id, rotina));

CREATE TABLE public.apoio_chamada_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  operacao text NOT NULL, requisicao text, resposta text, http_status int, duracao_ms int, erro text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_visao_kanban (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL, filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  compartilhada boolean NOT NULL DEFAULT false, dono_id uuid, ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.apoio_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  tabela text NOT NULL, registro_id text, acao text NOT NULL,
  antes jsonb, depois jsonb, usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.apoio_auditoria (company_id, tabela, registro_id);

CREATE OR REPLACE FUNCTION public.apoio_mask_log()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.requisicao IS NOT NULL THEN
    NEW.requisicao := regexp_replace(NEW.requisicao,
      '(<[^>]*(senha|password|pwd)[^>]*>)[^<]*(</)', '\1****\3', 'gi');
    NEW.requisicao := regexp_replace(NEW.requisicao,
      '("(senha|password|pwd)"\s*:\s*")[^"]*(")', '\1****\3', 'gi');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_mask_log BEFORE INSERT OR UPDATE ON public.apoio_chamada_log
  FOR EACH ROW EXECUTE FUNCTION public.apoio_mask_log();

CREATE OR REPLACE FUNCTION public.apoio_remessa_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.cod_lote_lab IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('apoio_remessa:' || NEW.company_id::text));
    SELECT coalesce(max(cod_lote_lab), 0) + 1 INTO NEW.cod_lote_lab
      FROM public.apoio_remessa WHERE company_id = NEW.company_id;
  END IF;
  IF NEW.mensagem_id IS NULL THEN
    NEW.mensagem_id := replace(NEW.company_id::text,'-','') || '-' || NEW.cod_lote_lab::text;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_remessa_seq BEFORE INSERT ON public.apoio_remessa
  FOR EACH ROW EXECUTE FUNCTION public.apoio_remessa_seq();

CREATE OR REPLACE FUNCTION public.apoio_preco_vigencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.preco IS DISTINCT FROM OLD.preco OR NEW.codigo IS DISTINCT FROM OLD.codigo
       OR NEW.vigencia_inicio IS DISTINCT FROM OLD.vigencia_inicio THEN
      RAISE EXCEPTION 'Preço não pode ser alterado; importe uma nova tabela para criar nova vigência';
    END IF;
    RETURN NEW;
  END IF;
  UPDATE public.apoio_preco SET vigencia_fim = NEW.vigencia_inicio - 1
   WHERE apoio_id = NEW.apoio_id AND codigo = NEW.codigo AND vigencia_fim IS NULL
     AND vigencia_inicio < NEW.vigencia_inicio;
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_preco_vigencia BEFORE INSERT OR UPDATE ON public.apoio_preco
  FOR EACH ROW EXECUTE FUNCTION public.apoio_preco_vigencia();

CREATE OR REPLACE FUNCTION public.apoio_status_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND coalesce(current_setting('apoio.mudar_status', true), '') <> 'on' THEN
    RAISE EXCEPTION 'O status só pode ser alterado pela função apoio_mudar_status';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_status_guard BEFORE UPDATE ON public.apoio_pedido_exame
  FOR EACH ROW EXECUTE FUNCTION public.apoio_status_guard();

CREATE OR REPLACE FUNCTION public.apoio_mudar_status(
  p_pedido_exame_id uuid, p_status_novo public.apoio_status, p_origem text,
  p_motivo text DEFAULT NULL, p_dados jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r public.apoio_pedido_exame%ROWTYPE;
  de public.apoio_status;
  ok boolean := false;
  fluxo text[] := ARRAY['aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','liberado_apoio','importado','liberado_local'];
  pre_lib text[] := ARRAY['aguardando_remessa','em_remessa','transmitido','recebido_apoio','em_analise','erro_transmissao','pendencia_tecnica','nova_coleta'];
BEGIN
  SELECT * INTO r FROM public.apoio_pedido_exame WHERE id = p_pedido_exame_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exame de apoio não encontrado'; END IF;
  IF auth.uid() IS NOT NULL AND r.company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para este exame';
  END IF;
  IF NOT public.apoio_modulo_liberado(r.company_id) THEN
    RAISE EXCEPTION 'O módulo Apoio / Terceirização não foi liberado para esta empresa';
  END IF;
  IF p_origem NOT IN ('sistema','integracao','manual') THEN
    RAISE EXCEPTION 'Origem inválida: %', p_origem;
  END IF;
  IF p_origem = 'manual' AND nullif(trim(coalesce(p_motivo,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo da alteração manual de status';
  END IF;

  de := r.status;
  IF de = p_status_novo THEN RAISE EXCEPTION 'O exame já está neste status'; END IF;

  IF array_position(fluxo, de::text) IS NOT NULL
     AND array_position(fluxo, p_status_novo::text) = array_position(fluxo, de::text) + 1 THEN ok := true; END IF;
  IF p_status_novo IN ('pendencia_tecnica','nova_coleta','cancelado') AND de::text = ANY(pre_lib) THEN ok := true; END IF;
  IF de = 'pendencia_tecnica' AND p_status_novo IN ('em_analise','recebido_apoio','liberado_apoio') THEN ok := true; END IF;
  IF de = 'nova_coleta' AND p_status_novo = 'aguardando_remessa' THEN ok := true; END IF;
  IF de = 'em_remessa' AND p_status_novo IN ('erro_transmissao','aguardando_remessa') THEN ok := true; END IF;
  IF de = 'erro_transmissao' AND p_status_novo = 'em_remessa' THEN ok := true; END IF;
  IF de = 'importado' AND p_status_novo = 'importado_com_pendencia' THEN ok := true; END IF;
  IF de = 'importado_com_pendencia' AND p_status_novo = 'importado' THEN ok := true; END IF;
  IF de = 'liberado_apoio' AND p_status_novo = 'importado_com_pendencia' THEN ok := true; END IF;
  IF de = 'liberado_local' AND p_status_novo = 'importado' THEN ok := true; END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'Transição de status não permitida: de "%" para "%"', de, p_status_novo;
  END IF;

  PERFORM set_config('apoio.mudar_status', 'on', true);
  UPDATE public.apoio_pedido_exame SET status = p_status_novo WHERE id = r.id;
  PERFORM set_config('apoio.mudar_status', 'off', true);

  INSERT INTO public.apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, motivo, usuario_id, dados)
  VALUES (r.company_id, r.id, de, p_status_novo, p_origem, p_motivo, auth.uid(), p_dados);
END $$;

CREATE OR REPLACE FUNCTION public.apoio_pedido_exame_inicial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.apoio_pedido_exame_historico (company_id, pedido_exame_id, status_de, status_para, origem, usuario_id)
  VALUES (NEW.company_id, NEW.id, NULL, NEW.status, 'sistema', auth.uid());
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_pedido_exame_inicial AFTER INSERT ON public.apoio_pedido_exame
  FOR EACH ROW EXECUTE FUNCTION public.apoio_pedido_exame_inicial();

CREATE OR REPLACE FUNCTION public.apoio_seed_status_map()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.conector = 'pardini' THEN
    INSERT INTO public.apoio_status_map (company_id, apoio_id, cod_apoio, descricao_apoio, status_nosso) VALUES
      (NEW.company_id, NEW.id, '42', 'Paciente Cadastrado', 'transmitido'),
      (NEW.company_id, NEW.id, '85', 'Amostra no Setor Técnico', 'em_analise'),
      (NEW.company_id, NEW.id, '101', 'Amostra no Setor Técnico', 'em_analise'),
      (NEW.company_id, NEW.id, '140', 'Resultado Liberado', 'liberado_apoio')
    ON CONFLICT (apoio_id, cod_apoio) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apoio_seed_status_map AFTER INSERT OR UPDATE OF conector ON public.apoio_laboratorio
  FOR EACH ROW EXECUTE FUNCTION public.apoio_seed_status_map();

CREATE OR REPLACE FUNCTION public.apoio_seed_company(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.apoio_visao_kanban (company_id, nome, filtros, compartilhada, ordem)
  SELECT _company_id, v.nome, v.filtros, true, v.ordem
  FROM (VALUES ('Todos','{}'::jsonb,1),
               ('Atrasados','{"somente_atrasados":true}'::jsonb,2),
               ('Exceções','{"status":["pendencia_tecnica","nova_coleta","erro_transmissao","importado_com_pendencia"]}'::jsonb,3),
               ('Meus','{"somente_meus":true}'::jsonb,4)) v(nome, filtros, ordem)
  WHERE NOT EXISTS (SELECT 1 FROM public.apoio_visao_kanban k WHERE k.company_id = _company_id AND k.nome = v.nome AND k.dono_id IS NULL);

  UPDATE public.access_profiles
     SET permissions = coalesce(permissions,'{}'::jsonb) || jsonb_build_object('apoio', jsonb_build_array(
       'laboratorio.gerenciar','catalogo.gerenciar','depara.gerenciar','remessa.operar','manual.operar',
       'resultado.conferir','kanban.ver','relatorios.ver','financeiro.ver'))
   WHERE company_id = _company_id AND name ILIKE '%Administra%'
     AND NOT (coalesce(permissions,'{}'::jsonb) ? 'apoio');
END $$;

CREATE OR REPLACE FUNCTION public.apoio_seed_company_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.apoio_seed_company(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER on_company_created_seed_apoio AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.apoio_seed_company_trg();

CREATE OR REPLACE FUNCTION public.apoio_tem_permissao(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_company_manager(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.access_profiles ap
    WHERE ap.company_id = public.get_user_company_id(auth.uid())
      AND coalesce(ap.permissions->'apoio','[]'::jsonb) ? _perm);
$$;

CREATE OR REPLACE FUNCTION public.apoio_dias_uteis(_de date, _ate date)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN _ate <= _de THEN 0 ELSE
    (SELECT count(*)::int FROM generate_series(_de + 1, _ate, interval '1 day') d
      WHERE extract(isodow FROM d) < 6) END;
$$;

CREATE OR REPLACE FUNCTION public.apoio_auditar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE rec jsonb; old_j jsonb; new_j jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_j := to_jsonb(OLD) - 'xml_original'; END IF;
  IF TG_OP <> 'DELETE' THEN new_j := to_jsonb(NEW) - 'xml_original'; END IF;
  rec := coalesce(new_j, old_j);
  INSERT INTO public.apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES ((rec->>'company_id')::uuid, TG_TABLE_NAME, coalesce(rec->>'id', rec->>'apoio_id'),
          lower(TG_OP), old_j, new_j, auth.uid());
  RETURN coalesce(NEW, OLD);
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['apoio_laboratorio','apoio_certificacao','apoio_catalogo_exame','apoio_preco_importacao',
    'apoio_preco','apoio_depara_exame','apoio_depara_analito','apoio_remessa','apoio_recipiente','apoio_pedido_exame',
    'apoio_pedido_exame_historico','apoio_resultado_versao','apoio_documento','apoio_pendencia_tecnica','apoio_status_map',
    'apoio_erro','apoio_cursor','apoio_chamada_log','apoio_visao_kanban','apoio_auditoria']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', 'upd_'||t, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id)', t||'_company_idx', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF t NOT IN ('apoio_auditoria','apoio_pedido_exame_historico','apoio_chamada_log') THEN
      EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar()', 'aud_'||t, t);
    END IF;
    IF t IN ('apoio_auditoria','apoio_pedido_exame_historico') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()))', t||'_select', t);
    ELSIF t = 'apoio_visao_kanban' THEN
      EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND (compartilhada OR dono_id = auth.uid()))$p$, t||'_select', t);
      EXECUTE format($p$CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_modulo_liberado(company_id) AND (dono_id = auth.uid() OR public.is_company_manager(auth.uid()))) WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_modulo_liberado(company_id) AND (dono_id = auth.uid() OR public.is_company_manager(auth.uid())))$p$, t||'_write', t);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()))', t||'_select', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_modulo_liberado(company_id))', t||'_insert', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_modulo_liberado(company_id)) WITH CHECK (company_id = public.get_user_company_id(auth.uid()))', t||'_update', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_modulo_liberado(company_id))', t||'_delete', t);
    END IF;
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.apoio_auditoria, public.apoio_pedido_exame_historico FROM authenticated;

CREATE VIEW public.apoio_pedido_exame_v WITH (security_invoker = true) AS
SELECT pe.*,
  ao.protocol AS pedido_protocolo, ao.order_number AS pedido_numero,
  ao.patient_id, coalesce(p.name, ao.patient_name) AS paciente_nome,
  e.name AS exame_nome, al.nome AS apoio_nome,
  rm.cod_lote_lab, rm.status AS remessa_status,
  CASE
    WHEN pe.prazo_previsto IS NULL OR pe.status IN ('liberado_local','cancelado') THEN NULL
    WHEN pe.prazo_previsto < current_date THEN 'atrasado'
    WHEN pe.prazo_previsto = current_date THEN 'vence_hoje'
    WHEN public.apoio_dias_uteis(current_date, pe.prazo_previsto) <= 1 THEN 'vence_amanha'
    ELSE 'no_prazo' END AS situacao_prazo,
  CASE WHEN pe.prazo_previsto IS NOT NULL AND pe.prazo_previsto < current_date
            AND pe.status NOT IN ('liberado_local','cancelado')
       THEN public.apoio_dias_uteis(pe.prazo_previsto, current_date) ELSE 0 END AS dias_em_atraso
FROM public.apoio_pedido_exame pe
JOIN public.attendance_orders ao ON ao.id = pe.pedido_id
LEFT JOIN public.patients p ON p.id = ao.patient_id
LEFT JOIN public.exams e ON e.id = pe.exame_id
JOIN public.apoio_laboratorio al ON al.id = pe.apoio_id
LEFT JOIN public.apoio_remessa rm ON rm.id = pe.remessa_id;
GRANT SELECT ON public.apoio_pedido_exame_v TO authenticated, service_role;

CREATE POLICY "apoio_docs_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'apoio-documentos' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "apoio_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'apoio-documentos' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
              AND public.apoio_modulo_liberado(public.get_user_company_id(auth.uid())));
CREATE POLICY "apoio_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'apoio-documentos' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
         AND public.apoio_modulo_liberado(public.get_user_company_id(auth.uid())));

INSERT INTO public.apoio_visao_kanban (company_id, nome, filtros, compartilhada, ordem)
SELECT c.id, v.nome, v.filtros, true, v.ordem FROM public.companies c
CROSS JOIN (VALUES ('Todos','{}'::jsonb,1),('Atrasados','{"somente_atrasados":true}'::jsonb,2),
  ('Exceções','{"status":["pendencia_tecnica","nova_coleta","erro_transmissao","importado_com_pendencia"]}'::jsonb,3),
  ('Meus','{"somente_meus":true}'::jsonb,4)) v(nome, filtros, ordem);

REVOKE EXECUTE ON FUNCTION public.apoio_mudar_status(uuid, public.apoio_status, text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apoio_mudar_status(uuid, public.apoio_status, text, text, jsonb) TO authenticated, service_role;
