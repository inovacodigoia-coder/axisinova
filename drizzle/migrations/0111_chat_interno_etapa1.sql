-- Chat Interno entre Equipe — Etapa 1 (módulo independente do InovaChat; só usuários da mesma empresa)

-- Módulo ligado por padrão para todas as empresas; Super Admin pode desligar por empresa
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS chat_interno_habilitado boolean NOT NULL DEFAULT true;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS chat_interno_retencao_meses integer NOT NULL DEFAULT 24;
COMMENT ON COLUMN public.companies.chat_interno_habilitado IS 'Chat Interno ligado (padrão: ligado; Super Admin desliga por empresa)';
COMMENT ON COLUMN public.companies.chat_interno_retencao_meses IS 'Retenção das mensagens do Chat Interno em meses (padrão 24)';

CREATE TABLE public.chat_interno_conversa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('direta','grupo','setor')),
  nome text,
  setor_id text,
  par_chave text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  ultima_mensagem_em timestamptz
);
CREATE UNIQUE INDEX chat_interno_conversa_direta_uk ON public.chat_interno_conversa (company_id, par_chave) WHERE tipo = 'direta';
CREATE UNIQUE INDEX chat_interno_conversa_setor_uk ON public.chat_interno_conversa (company_id, setor_id) WHERE tipo = 'setor';
CREATE INDEX chat_interno_conversa_company_idx ON public.chat_interno_conversa (company_id);

CREATE TABLE public.chat_interno_participante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.chat_interno_conversa(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  ultima_leitura_em timestamptz NOT NULL DEFAULT now(),
  silenciada boolean NOT NULL DEFAULT false,
  entrou_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversa_id, usuario_id)
);
CREATE INDEX chat_interno_participante_usuario_idx ON public.chat_interno_participante (usuario_id);

CREATE TABLE public.chat_interno_mensagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.chat_interno_conversa(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  autor_id uuid,
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','anexo','sistema')),
  conteudo text,
  anexo_path text,
  anexo_nome text,
  anexo_tipo text,
  anexo_tamanho bigint,
  resposta_id uuid REFERENCES public.chat_interno_mensagem(id),
  apagada boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_interno_mensagem_conversa_idx ON public.chat_interno_mensagem (conversa_id, criado_em);

GRANT SELECT ON public.chat_interno_conversa TO authenticated;
GRANT SELECT ON public.chat_interno_participante TO authenticated;
GRANT SELECT ON public.chat_interno_mensagem TO authenticated;
GRANT ALL ON public.chat_interno_conversa TO service_role;
GRANT ALL ON public.chat_interno_participante TO service_role;
GRANT ALL ON public.chat_interno_mensagem TO service_role;

ALTER TABLE public.chat_interno_conversa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interno_participante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interno_mensagem ENABLE ROW LEVEL SECURITY;

-- Módulo ligado?
CREATE OR REPLACE FUNCTION public.chat_interno_ativo(p_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT chat_interno_habilitado FROM public.companies WHERE id = p_company), false)
$$;

-- Participação (SECURITY DEFINER: usada nas políticas sem recursão de RLS)
CREATE OR REPLACE FUNCTION public.chat_interno_participa(p_conversa uuid, p_usuario uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_interno_participante p
    JOIN public.chat_interno_conversa c ON c.id = p.conversa_id
    WHERE p.conversa_id = p_conversa AND p.usuario_id = p_usuario
      AND p.company_id = public.get_user_company_id(p_usuario))
$$;

-- Leitura: só participante da conversa E da mesma empresa. Escrita: só via funções.
CREATE POLICY chat_interno_conversa_select ON public.chat_interno_conversa FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.chat_interno_participa(id, auth.uid()));
CREATE POLICY chat_interno_participante_select ON public.chat_interno_participante FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.chat_interno_participa(conversa_id, auth.uid()));
CREATE POLICY chat_interno_mensagem_select ON public.chat_interno_mensagem FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.chat_interno_participa(conversa_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.chat_interno_meu_acesso()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'ver', public.chat_interno_ativo(public.get_user_company_id(auth.uid())),
    'admin', private.is_super_admin() OR public.is_company_manager(auth.uid()),
    'usuario_id', auth.uid())
$$;

-- Mensagem de sistema (uso interno das funções abaixo)
CREATE OR REPLACE FUNCTION public.chat_interno__sistema(p_conversa uuid, p_company uuid, p_texto text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.chat_interno_mensagem (conversa_id, company_id, autor_id, tipo, conteudo)
  VALUES (p_conversa, p_company, NULL, 'sistema', left(p_texto, 4000));
  UPDATE public.chat_interno_conversa SET ultima_mensagem_em = now() WHERE id = p_conversa;
END $$;

-- Conversa direta: uma única por par de usuários (get-or-create)
CREATE OR REPLACE FUNCTION public.chat_interno_conversa_direta(p_outro uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
  v_par text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT public.chat_interno_ativo(v_company) THEN RAISE EXCEPTION 'Chat Interno desligado para esta empresa'; END IF;
  IF p_outro IS NULL OR p_outro = auth.uid() THEN RAISE EXCEPTION 'Escolha outro colega'; END IF;
  IF public.get_user_company_id(p_outro) IS DISTINCT FROM v_company THEN RAISE EXCEPTION 'Colega de outra empresa'; END IF;
  v_par := least(auth.uid()::text, p_outro::text) || ':' || greatest(auth.uid()::text, p_outro::text);
  SELECT id INTO v_id FROM public.chat_interno_conversa WHERE company_id = v_company AND tipo = 'direta' AND par_chave = v_par;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.chat_interno_conversa (company_id, tipo, par_chave, criado_por)
  VALUES (v_company, 'direta', v_par, auth.uid())
  ON CONFLICT DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.chat_interno_conversa WHERE company_id = v_company AND tipo = 'direta' AND par_chave = v_par;
    RETURN v_id;
  END IF;
  INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id) VALUES
    (v_id, v_company, auth.uid()), (v_id, v_company, p_outro)
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END $$;

-- Criar grupo (qualquer usuário; nome + participantes da mesma empresa)
CREATE OR REPLACE FUNCTION public.chat_interno_criar_grupo(p_nome text, p_participantes uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
  v_id uuid; v_nome text := btrim(coalesce(p_nome, '')); v_quem text;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT public.chat_interno_ativo(v_company) THEN RAISE EXCEPTION 'Chat Interno desligado para esta empresa'; END IF;
  IF length(v_nome) < 1 OR length(v_nome) > 80 THEN RAISE EXCEPTION 'Nome do grupo deve ter de 1 a 80 caracteres'; END IF;
  INSERT INTO public.chat_interno_conversa (company_id, tipo, nome, criado_por)
  VALUES (v_company, 'grupo', v_nome, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id)
  SELECT v_id, v_company, u FROM (SELECT auth.uid() AS u UNION SELECT unnest(coalesce(p_participantes, '{}'::uuid[]))) s
  WHERE public.get_user_company_id(s.u) = v_company
  ON CONFLICT DO NOTHING;
  SELECT coalesce(full_name, 'Alguém') INTO v_quem FROM public.profiles WHERE id = auth.uid();
  PERFORM public.chat_interno__sistema(v_id, v_company, coalesce(v_quem, 'Alguém') || ' criou o grupo');
  RETURN v_id;
END $$;

-- Enviar mensagem (texto até 4000 ou anexo até 10 MB de tipo permitido; resposta opcional)
CREATE OR REPLACE FUNCTION public.chat_interno_enviar(p_conversa uuid, p_conteudo text DEFAULT NULL,
  p_resposta uuid DEFAULT NULL, p_anexo jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid());
  v_conv record; v_id uuid; v_tipo text := 'texto'; v_conteudo text;
  v_path text; v_nome text; v_mime text; v_tam bigint;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT public.chat_interno_ativo(v_company) THEN RAISE EXCEPTION 'Chat Interno desligado para esta empresa'; END IF;
  SELECT * INTO v_conv FROM public.chat_interno_conversa WHERE id = p_conversa;
  IF v_conv.id IS NULL OR v_conv.company_id IS DISTINCT FROM v_company THEN RAISE EXCEPTION 'Conversa não encontrada'; END IF;
  IF NOT public.chat_interno_participa(p_conversa, auth.uid()) THEN RAISE EXCEPTION 'Você não participa desta conversa'; END IF;
  IF p_resposta IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.chat_interno_mensagem WHERE id = p_resposta AND conversa_id = p_conversa) THEN
    RAISE EXCEPTION 'Mensagem de resposta inválida'; END IF;
  IF p_anexo IS NOT NULL THEN
    v_tipo := 'anexo';
    v_path := p_anexo->>'path';
    v_nome := left(coalesce(p_anexo->>'nome', 'arquivo'), 200);
    v_mime := coalesce(p_anexo->>'tipo', '');
    v_tam := coalesce((p_anexo->>'tamanho')::bigint, 0);
    IF v_path IS NULL OR v_path NOT LIKE v_company::text || '/' || p_conversa::text || '/%' THEN RAISE EXCEPTION 'Anexo inválido'; END IF;
    IF v_tam <= 0 OR v_tam > 10485760 THEN RAISE EXCEPTION 'Anexo deve ter até 10 MB'; END IF;
    IF v_mime !~* '^(image/(png|jpe?g|webp|gif)|application/pdf|application/msword|application/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|text/plain)$' THEN
      RAISE EXCEPTION 'Tipo de arquivo não permitido'; END IF;
    v_conteudo := left(coalesce(p_conteudo, ''), 4000);
  ELSE
    v_conteudo := btrim(coalesce(p_conteudo, ''));
    IF length(v_conteudo) < 1 THEN RAISE EXCEPTION 'Mensagem vazia'; END IF;
    IF length(v_conteudo) > 4000 THEN RAISE EXCEPTION 'Mensagem passa de 4000 caracteres'; END IF;
  END IF;
  INSERT INTO public.chat_interno_mensagem (conversa_id, company_id, autor_id, tipo, conteudo, anexo_path, anexo_nome, anexo_tipo, anexo_tamanho, resposta_id)
  VALUES (p_conversa, v_company, auth.uid(), v_tipo, nullif(v_conteudo, ''), v_path, v_nome, nullif(v_mime, ''), nullif(v_tam, 0), p_resposta)
  RETURNING id INTO v_id;
  UPDATE public.chat_interno_conversa SET ultima_mensagem_em = now() WHERE id = p_conversa;
  UPDATE public.chat_interno_participante SET ultima_leitura_em = now() WHERE conversa_id = p_conversa AND usuario_id = auth.uid();
  RETURN v_id;
END $$;

-- Excluir a própria mensagem (exclusão lógica: fica "mensagem apagada", sem remover a linha)
CREATE OR REPLACE FUNCTION public.chat_interno_apagar_mensagem(p_mensagem uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_path text;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.chat_interno_mensagem
  SET apagada = true, conteudo = NULL, anexo_nome = NULL, anexo_tipo = NULL, anexo_tamanho = NULL
  WHERE id = p_mensagem AND autor_id = auth.uid() AND company_id = v_company AND NOT apagada
  RETURNING anexo_path INTO v_path;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mensagem não encontrada ou já apagada'; END IF;
  UPDATE public.chat_interno_mensagem SET anexo_path = NULL WHERE id = p_mensagem;
END $$;

-- Marcar conversa como lida
CREATE OR REPLACE FUNCTION public.chat_interno_marcar_lida(p_conversa uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT public.chat_interno_participa(p_conversa, auth.uid()) THEN RAISE EXCEPTION 'Você não participa desta conversa'; END IF;
  UPDATE public.chat_interno_participante SET ultima_leitura_em = now()
  WHERE conversa_id = p_conversa AND usuario_id = auth.uid();
END $$;

-- Silenciar / reativar avisos de uma conversa
CREATE OR REPLACE FUNCTION public.chat_interno_silenciar(p_conversa uuid, p_silenciar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT public.chat_interno_participa(p_conversa, auth.uid()) THEN RAISE EXCEPTION 'Você não participa desta conversa'; END IF;
  UPDATE public.chat_interno_participante SET silenciada = coalesce(p_silenciar, false)
  WHERE conversa_id = p_conversa AND usuario_id = auth.uid();
END $$;

-- Gerenciar participantes do grupo: só o criador ou admin da empresa
CREATE OR REPLACE FUNCTION public.chat_interno_grupo_adicionar(p_conversa uuid, p_usuario uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_conv record; v_quem text; v_alvo text;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO v_conv FROM public.chat_interno_conversa WHERE id = p_conversa AND company_id = v_company AND tipo = 'grupo';
  IF v_conv.id IS NULL THEN RAISE EXCEPTION 'Grupo não encontrado'; END IF;
  IF NOT (v_conv.criado_por = auth.uid() OR public.is_company_manager(auth.uid()) OR private.is_super_admin()) THEN
    RAISE EXCEPTION 'Só o criador do grupo ou um administrador pode gerenciar participantes'; END IF;
  IF public.get_user_company_id(p_usuario) IS DISTINCT FROM v_company THEN RAISE EXCEPTION 'Colega de outra empresa'; END IF;
  INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id)
  VALUES (p_conversa, v_company, p_usuario) ON CONFLICT DO NOTHING;
  SELECT coalesce(full_name, 'Alguém') INTO v_quem FROM public.profiles WHERE id = auth.uid();
  SELECT coalesce(full_name, 'Novo participante') INTO v_alvo FROM public.profiles WHERE id = p_usuario;
  PERFORM public.chat_interno__sistema(p_conversa, v_company, v_quem || ' adicionou ' || v_alvo || ' ao grupo');
END $$;

CREATE OR REPLACE FUNCTION public.chat_interno_grupo_remover(p_conversa uuid, p_usuario uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_conv record; v_quem text; v_alvo text;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO v_conv FROM public.chat_interno_conversa WHERE id = p_conversa AND company_id = v_company AND tipo = 'grupo';
  IF v_conv.id IS NULL THEN RAISE EXCEPTION 'Grupo não encontrado'; END IF;
  IF NOT (v_conv.criado_por = auth.uid() OR public.is_company_manager(auth.uid()) OR private.is_super_admin()) THEN
    RAISE EXCEPTION 'Só o criador do grupo ou um administrador pode gerenciar participantes'; END IF;
  DELETE FROM public.chat_interno_participante WHERE conversa_id = p_conversa AND usuario_id = p_usuario;
  SELECT coalesce(full_name, 'Alguém') INTO v_quem FROM public.profiles WHERE id = auth.uid();
  SELECT coalesce(full_name, 'Participante') INTO v_alvo FROM public.profiles WHERE id = p_usuario;
  PERFORM public.chat_interno__sistema(p_conversa, v_company, v_quem || ' removeu ' || v_alvo || ' do grupo');
END $$;

-- Sair do grupo (apenas grupos; direta e canal de setor não permitem saída manual)
CREATE OR REPLACE FUNCTION public.chat_interno_sair(p_conversa uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_conv record; v_quem text;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO v_conv FROM public.chat_interno_conversa WHERE id = p_conversa AND company_id = v_company;
  IF v_conv.id IS NULL OR v_conv.tipo <> 'grupo' THEN RAISE EXCEPTION 'Só é possível sair de grupos'; END IF;
  IF NOT public.chat_interno_participa(p_conversa, auth.uid()) THEN RAISE EXCEPTION 'Você não participa desta conversa'; END IF;
  DELETE FROM public.chat_interno_participante WHERE conversa_id = p_conversa AND usuario_id = auth.uid();
  SELECT coalesce(full_name, 'Alguém') INTO v_quem FROM public.profiles WHERE id = auth.uid();
  PERFORM public.chat_interno__sistema(p_conversa, v_company, v_quem || ' saiu do grupo');
END $$;

-- Total de não lidas do usuário (badge do menu)
CREATE OR REPLACE FUNCTION public.chat_interno_nao_lidas()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum((SELECT count(*) FROM public.chat_interno_mensagem m
    WHERE m.conversa_id = p.conversa_id AND m.criado_em > p.ultima_leitura_em
      AND m.autor_id IS DISTINCT FROM auth.uid() AND NOT m.apagada)), 0)::int
  FROM public.chat_interno_participante p
  WHERE p.usuario_id = auth.uid() AND p.company_id = public.get_user_company_id(auth.uid())
$$;

-- Super Admin: ligar/desligar o módulo por empresa e ajustar a retenção
CREATE OR REPLACE FUNCTION public.chat_interno_liberar(p_company uuid, p_habilitado boolean, p_retencao integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  UPDATE public.companies
  SET chat_interno_habilitado = coalesce(p_habilitado, chat_interno_habilitado),
      chat_interno_retencao_meses = coalesce(greatest(1, p_retencao), chat_interno_retencao_meses)
  WHERE id = p_company;
END $$;

-- Canal por setor: criado automaticamente e sincronizado com os usuários do setor
CREATE OR REPLACE FUNCTION public.chat_interno_setor_sync_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_conv uuid;
BEGIN
  IF TG_TABLE_NAME = 'company_sectors' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.chat_interno_conversa (company_id, tipo, nome, setor_id)
      VALUES (NEW.company_id, 'setor', NEW.name, NEW.id) ON CONFLICT DO NOTHING;
      INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id)
      SELECT c.id, NEW.company_id, su.user_id FROM public.chat_interno_conversa c
      JOIN public.sector_users su ON su.sector_id = NEW.id AND su.company_id = NEW.company_id
      WHERE c.tipo = 'setor' AND c.setor_id = NEW.id AND c.company_id = NEW.company_id
      ON CONFLICT DO NOTHING;
    ELSIF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name THEN
      UPDATE public.chat_interno_conversa SET nome = NEW.name
      WHERE tipo = 'setor' AND setor_id = NEW.id AND company_id = NEW.company_id;
    END IF;
    RETURN NEW;
  END IF;
  -- sector_users
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO v_conv FROM public.chat_interno_conversa
    WHERE tipo = 'setor' AND setor_id = NEW.sector_id AND company_id = NEW.company_id;
    IF v_conv IS NULL THEN
      INSERT INTO public.chat_interno_conversa (company_id, tipo, nome, setor_id)
      SELECT NEW.company_id, 'setor', s.name, NEW.sector_id FROM public.company_sectors s
      WHERE s.id = NEW.sector_id AND s.company_id = NEW.company_id
      ON CONFLICT DO NOTHING RETURNING id INTO v_conv;
      IF v_conv IS NULL THEN
        SELECT id INTO v_conv FROM public.chat_interno_conversa
        WHERE tipo = 'setor' AND setor_id = NEW.sector_id AND company_id = NEW.company_id;
      END IF;
    END IF;
    IF v_conv IS NOT NULL THEN
      INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id)
      VALUES (v_conv, NEW.company_id, NEW.user_id) ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.chat_interno_participante p USING public.chat_interno_conversa c
    WHERE c.id = p.conversa_id AND c.tipo = 'setor' AND c.setor_id = OLD.sector_id
      AND c.company_id = OLD.company_id AND p.usuario_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER chat_interno_setor_canal AFTER INSERT OR UPDATE OF name ON public.company_sectors
  FOR EACH ROW EXECUTE FUNCTION public.chat_interno_setor_sync_trg();
CREATE TRIGGER chat_interno_setor_membro AFTER INSERT OR DELETE ON public.sector_users
  FOR EACH ROW EXECUTE FUNCTION public.chat_interno_setor_sync_trg();

-- Canais para setores que já existem (uma vez; canais vazios também são criados)
INSERT INTO public.chat_interno_conversa (company_id, tipo, nome, setor_id)
SELECT s.company_id, 'setor', s.name, s.id FROM public.company_sectors s
ON CONFLICT DO NOTHING;
INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id)
SELECT c.id, c.company_id, su.user_id FROM public.chat_interno_conversa c
JOIN public.sector_users su ON su.sector_id = c.setor_id AND su.company_id = c.company_id
WHERE c.tipo = 'setor'
ON CONFLICT DO NOTHING;

-- Retenção: registra as tabelas do chat no job existente (modo vem da chave global; hoje Simulação)
CREATE OR REPLACE FUNCTION public.chat_interno_retencao_corte(p_company uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT now() - make_interval(months => greatest(1, coalesce((SELECT chat_interno_retencao_meses FROM public.companies WHERE id = p_company), 24)))
$$;

CREATE OR REPLACE FUNCTION public.chat_interno_retencao_anexos(p_company uuid, p_limite int)
RETURNS TABLE(id uuid, path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.anexo_path FROM public.chat_interno_mensagem m
  WHERE m.company_id = p_company AND m.anexo_path IS NOT NULL AND m.criado_em < public.chat_interno_retencao_corte(p_company)
  ORDER BY m.criado_em, m.id LIMIT greatest(1, p_limite)
$$;

CREATE OR REPLACE FUNCTION public.chat_interno_retencao_apagar_anexos(p_company uuid, p_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
  DELETE FROM public.chat_interno_mensagem WHERE company_id = p_company AND id = ANY(p_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

ALTER TABLE public.whatsapp_retencao_execucoes ADD COLUMN IF NOT EXISTS chat_mensagens integer NOT NULL DEFAULT 0;
ALTER TABLE public.whatsapp_retencao_execucoes ADD COLUMN IF NOT EXISTS chat_anexos integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_contar(p_company uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE corte timestamptz := inovachat_retencao_corte(p_company);
  corte_ac timestamptz := least(corte, now() - interval '12 months');
  corte_chat timestamptz := chat_interno_retencao_corte(p_company); r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'mensagens', (SELECT count(*) FROM whatsapp_mensagens WHERE company_id = p_company AND criado_em < corte),
    'midias', (SELECT count(*) FROM whatsapp_mensagens WHERE company_id = p_company AND criado_em < corte AND midia_path IS NOT NULL),
    'conversas', (SELECT count(*) FROM whatsapp_conversas c WHERE c.company_id = p_company AND c.status = 'finalizada'
        AND NOT EXISTS (SELECT 1 FROM whatsapp_mensagens m WHERE m.conversa_id = c.id AND m.criado_em >= corte)),
    'contatos', (SELECT count(*) FROM whatsapp_contatos ct WHERE ct.company_id = p_company AND ct.paciente_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM whatsapp_conversas c WHERE c.contato_id = ct.id AND (c.status <> 'finalizada'
          OR EXISTS (SELECT 1 FROM whatsapp_mensagens m WHERE m.conversa_id = c.id AND m.criado_em >= corte)))),
    'fila', (SELECT count(*) FROM whatsapp_fila_envios WHERE company_id = p_company AND criado_em < corte),
    'acessos', (SELECT count(*) FROM whatsapp_conversa_acessos WHERE company_id = p_company AND acessado_em < corte_ac),
    'nps_anonimizadas', (SELECT count(*) FROM whatsapp_nps_respostas WHERE company_id = p_company AND respondida_em < corte
      AND (comentario IS NOT NULL OR paciente_id IS NOT NULL OR paciente_nome IS NOT NULL OR agendamento_id IS NOT NULL)),
    'chat_mensagens', (SELECT count(*) FROM chat_interno_mensagem WHERE company_id = p_company AND criado_em < corte_chat),
    'chat_anexos', (SELECT count(*) FROM chat_interno_mensagem WHERE company_id = p_company AND criado_em < corte_chat AND anexo_path IS NOT NULL)) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_retencao_limpar(p_company uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE corte timestamptz := inovachat_retencao_corte(p_company);
  corte_ac timestamptz := least(corte, now() - interval '12 months');
  corte_chat timestamptz := chat_interno_retencao_corte(p_company);
  n_msg int; n_conv int; n_ct int; n_fila int; n_ac int; n_nps int; n_chat int;
BEGIN
  UPDATE whatsapp_nps_respostas SET comentario = NULL, paciente_id = NULL, paciente_nome = NULL, agendamento_id = NULL
  WHERE id IN (SELECT id FROM whatsapp_nps_respostas WHERE company_id = p_company AND respondida_em < corte
    AND (comentario IS NOT NULL OR paciente_id IS NOT NULL OR paciente_nome IS NOT NULL OR agendamento_id IS NOT NULL)
    ORDER BY respondida_em, id LIMIT 500 FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS n_nps = ROW_COUNT;
  DELETE FROM whatsapp_mensagens WHERE id IN (SELECT id FROM whatsapp_mensagens WHERE company_id = p_company AND criado_em < corte AND midia_path IS NULL LIMIT 500);
  GET DIAGNOSTICS n_msg = ROW_COUNT;
  DELETE FROM whatsapp_conversas WHERE id IN (SELECT c.id FROM whatsapp_conversas c WHERE c.company_id = p_company AND c.status = 'finalizada'
    AND NOT EXISTS (SELECT 1 FROM whatsapp_mensagens m WHERE m.conversa_id = c.id) LIMIT 500);
  GET DIAGNOSTICS n_conv = ROW_COUNT;
  DELETE FROM whatsapp_contatos WHERE id IN (SELECT ct.id FROM whatsapp_contatos ct WHERE ct.company_id = p_company AND ct.paciente_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM whatsapp_conversas c WHERE c.contato_id = ct.id) LIMIT 500);
  GET DIAGNOSTICS n_ct = ROW_COUNT;
  DELETE FROM whatsapp_fila_envios WHERE id IN (SELECT id FROM whatsapp_fila_envios WHERE company_id = p_company AND criado_em < corte
    AND status NOT IN ('enviando') AND NOT EXISTS (SELECT 1 FROM whatsapp_nps_respostas n WHERE n.company_id=p_company AND n.fila_id=whatsapp_fila_envios.id
      AND n.respondida_em < corte AND (n.comentario IS NOT NULL OR n.paciente_id IS NOT NULL OR n.paciente_nome IS NOT NULL OR n.agendamento_id IS NOT NULL)) LIMIT 500);
  GET DIAGNOSTICS n_fila = ROW_COUNT;
  DELETE FROM whatsapp_conversa_acessos WHERE id IN (SELECT id FROM whatsapp_conversa_acessos WHERE company_id = p_company AND acessado_em < corte_ac LIMIT 500);
  GET DIAGNOSTICS n_ac = ROW_COUNT;
  DELETE FROM chat_interno_mensagem WHERE id IN (SELECT id FROM chat_interno_mensagem WHERE company_id = p_company AND criado_em < corte_chat AND anexo_path IS NULL LIMIT 500);
  GET DIAGNOSTICS n_chat = ROW_COUNT;
  RETURN jsonb_build_object('mensagens', n_msg, 'conversas', n_conv, 'contatos', n_ct, 'fila', n_fila, 'acessos', n_ac, 'nps_anonimizadas', n_nps, 'chat_mensagens', n_chat);
END $$;

-- Anexos: bucket privado chat-interno-anexos, caminho company_id/conversa_id/arquivo, só participantes
CREATE POLICY chat_interno_anexo_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-interno-anexos'
    AND array_length(storage.foldername(name), 1) >= 2
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    AND public.chat_interno_participa(((storage.foldername(name))[2])::uuid, auth.uid()));
CREATE POLICY chat_interno_anexo_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-interno-anexos'
    AND array_length(storage.foldername(name), 1) >= 2
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    AND public.chat_interno_participa(((storage.foldername(name))[2])::uuid, auth.uid()));

-- Tempo real das mensagens (RLS limita o que cada assinante recebe)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_interno_mensagem;

-- Segurança das funções (padrão do bloco: nascem sem EXECUTE para PUBLIC/anon)
REVOKE ALL ON FUNCTION public.chat_interno_ativo(uuid), public.chat_interno_participa(uuid,uuid),
  public.chat_interno_meu_acesso(), public.chat_interno_conversa_direta(uuid), public.chat_interno_criar_grupo(text,uuid[]),
  public.chat_interno_enviar(uuid,text,uuid,jsonb), public.chat_interno_apagar_mensagem(uuid),
  public.chat_interno_marcar_lida(uuid), public.chat_interno_silenciar(uuid,boolean),
  public.chat_interno_grupo_adicionar(uuid,uuid), public.chat_interno_grupo_remover(uuid,uuid),
  public.chat_interno_sair(uuid), public.chat_interno_nao_lidas(), public.chat_interno_liberar(uuid,boolean,integer)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_interno_ativo(uuid), public.chat_interno_participa(uuid,uuid),
  public.chat_interno_meu_acesso(), public.chat_interno_conversa_direta(uuid), public.chat_interno_criar_grupo(text,uuid[]),
  public.chat_interno_enviar(uuid,text,uuid,jsonb), public.chat_interno_apagar_mensagem(uuid),
  public.chat_interno_marcar_lida(uuid), public.chat_interno_silenciar(uuid,boolean),
  public.chat_interno_grupo_adicionar(uuid,uuid), public.chat_interno_grupo_remover(uuid,uuid),
  public.chat_interno_sair(uuid), public.chat_interno_nao_lidas(), public.chat_interno_liberar(uuid,boolean,integer)
TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.chat_interno__sistema(uuid,uuid,text), public.chat_interno_setor_sync_trg(),
  public.chat_interno_retencao_corte(uuid), public.chat_interno_retencao_anexos(uuid,int),
  public.chat_interno_retencao_apagar_anexos(uuid,uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_interno__sistema(uuid,uuid,text), public.chat_interno_setor_sync_trg(),
  public.chat_interno_retencao_corte(uuid), public.chat_interno_retencao_anexos(uuid,int),
  public.chat_interno_retencao_apagar_anexos(uuid,uuid[]) TO service_role;