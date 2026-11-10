-- Chat Interno: grupo do Portal Externo (parceiro, local e médico), nomes para todos os usuários e leitura ao abrir

-- 1) Novo tipo de conversa 'portal', ligada ao acesso externo, e autor externo nas mensagens
ALTER TABLE public.chat_interno_conversa DROP CONSTRAINT IF EXISTS chat_interno_conversa_tipo_check;
ALTER TABLE public.chat_interno_conversa ADD CONSTRAINT chat_interno_conversa_tipo_check
  CHECK (tipo IN ('direta','grupo','setor','portal'));
ALTER TABLE public.chat_interno_conversa ADD COLUMN IF NOT EXISTS external_access_id uuid
  REFERENCES public.external_accesses(id) ON DELETE SET NULL;
ALTER TABLE public.chat_interno_conversa ADD COLUMN IF NOT EXISTS externo_leitura_em timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS chat_interno_conversa_portal_uk
  ON public.chat_interno_conversa (external_access_id) WHERE tipo = 'portal' AND external_access_id IS NOT NULL;
ALTER TABLE public.chat_interno_mensagem ADD COLUMN IF NOT EXISTS autor_externo text;
COMMENT ON COLUMN public.chat_interno_conversa.external_access_id IS 'Acesso do Portal Externo dono do grupo (tipo portal)';
COMMENT ON COLUMN public.chat_interno_conversa.externo_leitura_em IS 'Última leitura feita pelo contato do Portal Externo';
COMMENT ON COLUMN public.chat_interno_mensagem.autor_externo IS 'Nome exibido do contato do Portal Externo (autor_id nulo)';

-- 2) Todos os usuários ativos da empresa participam do grupo do portal
CREATE OR REPLACE FUNCTION public.chat_interno__portal_membros(p_conversa uuid, p_company uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id)
  SELECT p_conversa, p_company, p.id FROM public.profiles p
  WHERE p.company_id = p_company AND coalesce(p.is_active, true)
  ON CONFLICT DO NOTHING
$$;

-- 3) Garante (cria se faltar) o grupo do acesso: nome = Nome exibido no portal
CREATE OR REPLACE FUNCTION public.chat_interno__portal_garantir(p_access uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_a record; v_id uuid; v_nome text;
BEGIN
  SELECT id, company_id, name, type INTO v_a FROM public.external_accesses WHERE id = p_access;
  IF v_a.id IS NULL OR v_a.type NOT IN ('parceiro','local','medico') THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM public.chat_interno_conversa WHERE tipo = 'portal' AND external_access_id = p_access;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  v_nome := left(coalesce(nullif(btrim(v_a.name), ''), 'Portal externo'), 80);
  INSERT INTO public.chat_interno_conversa (company_id, tipo, nome, external_access_id)
  VALUES (v_a.company_id, 'portal', v_nome, p_access)
  ON CONFLICT DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.chat_interno_conversa WHERE tipo = 'portal' AND external_access_id = p_access;
    RETURN v_id;
  END IF;
  PERFORM public.chat_interno__portal_membros(v_id, v_a.company_id);
  PERFORM public.chat_interno__sistema(v_id, v_a.company_id, 'Grupo do portal ' || v_nome || ' criado');
  RETURN v_id;
END $$;

-- 4) Ao criar o acesso, cria o grupo; ao renomear, o grupo acompanha. Falha aqui nunca bloqueia o cadastro.
CREATE OR REPLACE FUNCTION public.chat_interno_portal_acesso_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      PERFORM public.chat_interno__portal_garantir(NEW.id);
    ELSIF NEW.name IS DISTINCT FROM OLD.name THEN
      UPDATE public.chat_interno_conversa
      SET nome = left(coalesce(nullif(btrim(NEW.name), ''), 'Portal externo'), 80)
      WHERE tipo = 'portal' AND external_access_id = NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'chat_interno_portal_acesso_trg: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chat_interno_portal_acesso ON public.external_accesses;
CREATE TRIGGER chat_interno_portal_acesso AFTER INSERT OR UPDATE OF name ON public.external_accesses
  FOR EACH ROW EXECUTE FUNCTION public.chat_interno_portal_acesso_trg();

-- 5) Usuário novo (ou reativado/mudado de empresa) entra nos grupos de portal da empresa
CREATE OR REPLACE FUNCTION public.chat_interno_portal_membro_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND coalesce(NEW.is_active, true) THEN
    BEGIN
      INSERT INTO public.chat_interno_participante (conversa_id, company_id, usuario_id)
      SELECT c.id, c.company_id, NEW.id FROM public.chat_interno_conversa c
      WHERE c.tipo = 'portal' AND c.company_id = NEW.company_id
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'chat_interno_portal_membro_trg: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS chat_interno_portal_membro ON public.profiles;
CREATE TRIGGER chat_interno_portal_membro AFTER INSERT OR UPDATE OF company_id, is_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.chat_interno_portal_membro_trg();

-- 6) Validação do contato do portal (mesmas regras do portal_fetch; senha errada fica registrada e conta no bloqueio)
CREATE OR REPLACE FUNCTION public.portal__chat_validar(p_code text, p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_a public.external_accesses%ROWTYPE; v_fails int;
BEGIN
  SELECT * INTO v_a FROM public.external_accesses WHERE access_code = p_code LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_a.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'inactive'); END IF;
  SELECT count(*) INTO v_fails FROM public.external_access_logs
  WHERE access_code = p_code AND success = false AND created_at > now() - interval '5 minutes';
  IF v_fails >= 10 THEN RETURN jsonb_build_object('ok', false, 'error', 'locked'); END IF;
  IF p_password IS DISTINCT FROM v_a.access_password THEN
    INSERT INTO public.external_access_logs (company_id, access_id, access_code, access_type, action, success)
    VALUES (v_a.company_id, v_a.id, v_a.access_code, v_a.type, 'chat', false);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;
  IF v_a.type NOT IN ('parceiro','local','medico') THEN RETURN jsonb_build_object('ok', false, 'error', 'not_available'); END IF;
  IF NOT public.chat_interno_ativo(v_a.company_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'chat_off'); END IF;
  RETURN jsonb_build_object('ok', true, 'access_id', v_a.id, 'company_id', v_a.company_id, 'name', v_a.name);
END $$;

-- 7) Portal: abrir a conversa (mensagens, quantidade não lida; opcionalmente marca como lida)
CREATE OR REPLACE FUNCTION public.portal_chat_abrir(p_code text, p_password text, p_marcar_lida boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v jsonb; v_id uuid; v_leitura timestamptz; v_nao int; v_msgs jsonb; v_nome text;
BEGIN
  v := public.portal__chat_validar(p_code, p_password);
  IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
  v_id := public.chat_interno__portal_garantir((v->>'access_id')::uuid);
  IF v_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_available'); END IF;
  IF coalesce(p_marcar_lida, false) THEN
    UPDATE public.chat_interno_conversa SET externo_leitura_em = now() WHERE id = v_id;
  END IF;
  SELECT externo_leitura_em, nome INTO v_leitura, v_nome FROM public.chat_interno_conversa WHERE id = v_id;
  SELECT count(*)::int INTO v_nao FROM public.chat_interno_mensagem m
  WHERE m.conversa_id = v_id AND m.autor_id IS NOT NULL AND m.tipo <> 'sistema' AND NOT m.apagada AND m.criado_em > v_leitura;
  SELECT coalesce(jsonb_agg(x.j ORDER BY x.criado_em), '[]'::jsonb) INTO v_msgs FROM (
    SELECT m.criado_em, jsonb_build_object(
      'id', m.id,
      'externo', m.autor_id IS NULL,
      'autor_nome', CASE WHEN m.autor_id IS NULL THEN coalesce(m.autor_externo, v_nome)
                         ELSE coalesce((SELECT nullif(btrim(p.full_name), '') FROM public.profiles p WHERE p.id = m.autor_id), 'Equipe') END,
      'conteudo', CASE WHEN m.apagada THEN NULL ELSE m.conteudo END,
      'anexo_nome', CASE WHEN m.apagada THEN NULL ELSE m.anexo_nome END,
      'apagada', m.apagada,
      'criado_em', m.criado_em) AS j
    FROM public.chat_interno_mensagem m
    WHERE m.conversa_id = v_id AND m.tipo <> 'sistema'
    ORDER BY m.criado_em DESC LIMIT 200
  ) x;
  RETURN jsonb_build_object('ok', true, 'nome', v_nome, 'nao_lidas', v_nao, 'mensagens', v_msgs);
END $$;

-- 8) Portal: enviar mensagem de texto (até 4000 caracteres), autor = Nome exibido no portal
CREATE OR REPLACE FUNCTION public.portal_chat_enviar(p_code text, p_password text, p_conteudo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v jsonb; v_id uuid; v_txt text := btrim(coalesce(p_conteudo, '')); v_msg uuid;
BEGIN
  v := public.portal__chat_validar(p_code, p_password);
  IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
  IF length(v_txt) < 1 THEN RETURN jsonb_build_object('ok', false, 'error', 'empty'); END IF;
  IF length(v_txt) > 4000 THEN RETURN jsonb_build_object('ok', false, 'error', 'too_long'); END IF;
  v_id := public.chat_interno__portal_garantir((v->>'access_id')::uuid);
  IF v_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_available'); END IF;
  INSERT INTO public.chat_interno_mensagem (conversa_id, company_id, autor_id, autor_externo, tipo, conteudo)
  VALUES (v_id, (v->>'company_id')::uuid, NULL, left(coalesce(nullif(btrim(v->>'name'), ''), 'Portal externo'), 120), 'texto', v_txt)
  RETURNING id INTO v_msg;
  UPDATE public.chat_interno_conversa SET ultima_mensagem_em = now(), externo_leitura_em = now() WHERE id = v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_msg);
END $$;

-- 9) Lista de conversas do usuário em uma chamada (nome da direta e não lidas resolvidos no servidor)
CREATE OR REPLACE FUNCTION public.chat_interno_minhas_conversas()
RETURNS TABLE(id uuid, tipo text, nome text, criado_por uuid, ultima_mensagem_em timestamptz, nao_lidas integer, silenciada boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id, c.tipo,
    CASE WHEN c.tipo = 'direta' THEN coalesce((
      SELECT nullif(btrim(pr.full_name), '') FROM public.chat_interno_participante o
      JOIN public.profiles pr ON pr.id = o.usuario_id
      WHERE o.conversa_id = c.id AND o.usuario_id <> auth.uid() LIMIT 1), 'Conversa')
    ELSE coalesce(c.nome, 'Grupo') END AS nome,
    c.criado_por, c.ultima_mensagem_em,
    (SELECT count(*) FROM public.chat_interno_mensagem m
     WHERE m.conversa_id = c.id AND NOT m.apagada AND m.tipo <> 'sistema'
       AND m.criado_em > p.ultima_leitura_em AND m.autor_id IS DISTINCT FROM auth.uid())::int AS nao_lidas,
    p.silenciada
  FROM public.chat_interno_participante p
  JOIN public.chat_interno_conversa c ON c.id = p.conversa_id
  WHERE auth.uid() IS NOT NULL AND p.usuario_id = auth.uid()
    AND p.company_id = public.get_user_company_id(auth.uid())
    AND c.company_id = p.company_id
    AND public.chat_interno_ativo(p.company_id)
  ORDER BY c.ultima_mensagem_em DESC NULLS LAST
$$;

-- 10) Nomes dos colegas (mesma empresa) para mostrar quem enviou cada mensagem, para qualquer usuário
CREATE OR REPLACE FUNCTION public.chat_interno_nomes(p_ids uuid[])
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.id, coalesce(nullif(btrim(p.full_name), ''), 'Colega') AS nome
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = ANY(coalesce(p_ids, '{}'::uuid[]))
    AND p.company_id = public.get_user_company_id(auth.uid())
$$;

-- 11) Badge do menu: mesma contagem da lista (mensagens de sistema não contam)
CREATE OR REPLACE FUNCTION public.chat_interno_nao_lidas()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum((SELECT count(*) FROM public.chat_interno_mensagem m
    WHERE m.conversa_id = p.conversa_id AND m.criado_em > p.ultima_leitura_em
      AND m.autor_id IS DISTINCT FROM auth.uid() AND NOT m.apagada AND m.tipo <> 'sistema')), 0)::int
  FROM public.chat_interno_participante p
  WHERE p.usuario_id = auth.uid() AND p.company_id = public.get_user_company_id(auth.uid())
$$;

-- 12) Permissões das funções
REVOKE ALL ON FUNCTION public.chat_interno__portal_membros(uuid,uuid), public.chat_interno__portal_garantir(uuid),
  public.chat_interno_portal_acesso_trg(), public.chat_interno_portal_membro_trg(),
  public.portal__chat_validar(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_interno__portal_membros(uuid,uuid), public.chat_interno__portal_garantir(uuid),
  public.portal__chat_validar(text,text) TO service_role;
REVOKE ALL ON FUNCTION public.portal_chat_abrir(text,text,boolean), public.portal_chat_enviar(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_chat_abrir(text,text,boolean), public.portal_chat_enviar(text,text,text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.chat_interno_minhas_conversas(), public.chat_interno_nomes(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_interno_minhas_conversas(), public.chat_interno_nomes(uuid[]) TO authenticated, service_role;
