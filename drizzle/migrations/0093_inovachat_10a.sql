ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS inovachat_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inovachat_habilitado_por uuid,
  ADD COLUMN IF NOT EXISTS inovachat_habilitado_em timestamptz,
  ADD COLUMN IF NOT EXISTS inovachat_retencao_meses smallint NOT NULL DEFAULT 6;

CREATE TABLE public.whatsapp_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  nome_exibicao text,
  paciente_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  vinculo_status text NOT NULL DEFAULT 'novo' CHECK (vinculo_status IN ('vinculado','varios','novo','desvinculado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, telefone)
);
CREATE INDEX whatsapp_contatos_canon ON public.whatsapp_contatos(company_id, public.whatsapp_tel_canonico(telefone));

CREATE TABLE public.whatsapp_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instancia_id uuid NOT NULL REFERENCES public.whatsapp_instancias(id) ON DELETE CASCADE,
  contato_id uuid NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'na_fila' CHECK (status IN ('na_fila','em_atendimento','finalizada')),
  responsavel_id uuid,
  ultima_mensagem_em timestamptz,
  ultima_mensagem_resumo text CHECK (char_length(ultima_mensagem_resumo) <= 60),
  nao_lidas integer NOT NULL DEFAULT 0,
  criada_em timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz
);
CREATE UNIQUE INDEX whatsapp_conversas_uma_aberta ON public.whatsapp_conversas(contato_id, instancia_id) WHERE status <> 'finalizada';
CREATE INDEX whatsapp_conversas_lista ON public.whatsapp_conversas(company_id, status, ultima_mensagem_em DESC);

CREATE TABLE public.whatsapp_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  direcao text NOT NULL CHECK (direcao IN ('entrada','saida')),
  origem text NOT NULL CHECK (origem IN ('paciente','usuario','sistema')),
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','audio','imagem','documento','video','figurinha','outro')),
  texto text,
  message_id_uazapi text NOT NULL,
  citada_message_id text,
  enviada_por_usuario_id uuid,
  enviada_por_nome text,
  status text CHECK (status IN ('enviada','entregue','lida','falha')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, message_id_uazapi)
);
CREATE INDEX whatsapp_mensagens_conv ON public.whatsapp_mensagens(conversa_id, criado_em);

CREATE TABLE public.whatsapp_conversa_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  acessado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_conversa_acessos_idx ON public.whatsapp_conversa_acessos(conversa_id, usuario_id, acessado_em DESC);

-- só aviso de mudança (sem texto nem telefone) para o canal ao vivo
CREATE TABLE public.inovachat_sinais (
  conversa_id uuid PRIMARY KEY REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inovachat_ignoradas (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL,
  instancia_id uuid,
  motivo text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inovachat_ignoradas_idx ON public.inovachat_ignoradas(company_id, criado_em);

GRANT SELECT ON public.whatsapp_contatos, public.whatsapp_conversas, public.whatsapp_mensagens, public.whatsapp_conversa_acessos, public.inovachat_sinais TO authenticated;
GRANT ALL ON public.whatsapp_contatos, public.whatsapp_conversas, public.whatsapp_mensagens, public.whatsapp_conversa_acessos, public.inovachat_sinais, public.inovachat_ignoradas TO service_role;
GRANT USAGE ON SEQUENCE public.inovachat_ignoradas_id_seq TO service_role;

ALTER TABLE public.whatsapp_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversa_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inovachat_sinais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inovachat_ignoradas ENABLE ROW LEVEL SECURITY;

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.inovachat_ativo(_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT inovachat_habilitado AND whatsapp_habilitado FROM companies WHERE id = _company), false)
$$;

CREATE OR REPLACE FUNCTION public.inovachat_tem_permissao(_perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'inovachat','[]'::jsonb) ? _perm))
$$;

-- quem vê a conversa: empresa liberada + visualizar; admin/gerenciar veem todas; demais só as suas e as da fila
CREATE OR REPLACE FUNCTION public.inovachat_pode_ver(_company uuid, _status text, _resp uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _company = public.get_user_company_id(auth.uid())
    AND public.inovachat_ativo(_company)
    AND public.inovachat_tem_permissao('inovachat.visualizar')
    AND (public.is_company_manager(auth.uid()) OR public.inovachat_tem_permissao('inovachat.gerenciar')
         OR _status = 'na_fila' OR _resp = auth.uid())
$$;

CREATE POLICY "inovachat contatos leitura" ON public.whatsapp_contatos FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.inovachat_ativo(company_id) AND public.inovachat_tem_permissao('inovachat.visualizar'));
CREATE POLICY "inovachat conversas leitura" ON public.whatsapp_conversas FOR SELECT TO authenticated
  USING (public.inovachat_pode_ver(company_id, status, responsavel_id));
CREATE POLICY "inovachat mensagens leitura" ON public.whatsapp_mensagens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.whatsapp_conversas c WHERE c.id = conversa_id AND public.inovachat_pode_ver(c.company_id, c.status, c.responsavel_id)));
CREATE POLICY "inovachat acessos leitura" ON public.whatsapp_conversa_acessos FOR SELECT TO authenticated
  USING (private.is_super_admin() OR (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid())));
CREATE POLICY "inovachat sinais leitura" ON public.inovachat_sinais FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.inovachat_ativo(company_id) AND public.inovachat_tem_permissao('inovachat.visualizar'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.inovachat_sinais;

-- ---------- gravação (service role) ----------
CREATE OR REPLACE FUNCTION public.inovachat_registrar(
  p_instancia uuid, p_message_id text, p_telefone text, p_nome text, p_direcao text, p_origem text,
  p_tipo text, p_texto text, p_citada text, p_enviada_por_nome text, p_status text, p_criado_em timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_comp uuid; v_tel text; v_ct record; v_n int; v_pac uuid; v_conv record; v_mid uuid;
  v_quando timestamptz := coalesce(p_criado_em, now()); v_resumo text;
BEGIN
  SELECT company_id INTO v_comp FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_comp IS NULL THEN RETURN 'sem_instancia'; END IF;
  IF NOT inovachat_ativo(v_comp) THEN RETURN 'desligado'; END IF;
  IF coalesce(p_message_id,'') = '' THEN RETURN 'sem_id'; END IF;
  IF EXISTS (SELECT 1 FROM whatsapp_mensagens WHERE company_id = v_comp AND message_id_uazapi = p_message_id) THEN RETURN 'duplicada'; END IF;

  v_tel := regexp_replace(coalesce(p_telefone,''), '\D', '', 'g');
  IF length(v_tel) IN (10, 11) THEN v_tel := '55' || v_tel; END IF;
  IF length(v_tel) < 12 OR length(v_tel) > 13 THEN RETURN 'telefone_invalido'; END IF;

  SELECT * INTO v_ct FROM whatsapp_contatos WHERE company_id = v_comp
    AND whatsapp_tel_canonico(telefone) = whatsapp_tel_canonico(v_tel) ORDER BY criado_em LIMIT 1;
  IF v_ct.id IS NULL THEN
    SELECT count(DISTINCT id), min(id::text)::uuid INTO v_n, v_pac FROM patients
     WHERE company_id = v_comp AND whatsapp_tel_canonico(v_tel) IN (
       whatsapp_tel_canonico(CASE WHEN length(regexp_replace(coalesce(phone,''),'\D','','g')) IN (10,11) THEN '55' ELSE '' END || phone),
       whatsapp_tel_canonico(CASE WHEN length(regexp_replace(coalesce(phone2,''),'\D','','g')) IN (10,11) THEN '55' ELSE '' END || phone2),
       whatsapp_tel_canonico(CASE WHEN length(regexp_replace(coalesce(phone3,''),'\D','','g')) IN (10,11) THEN '55' ELSE '' END || phone3));
    INSERT INTO whatsapp_contatos(company_id, telefone, nome_exibicao, paciente_id, vinculo_status)
    VALUES (v_comp, v_tel, nullif(left(p_nome,120),''), CASE WHEN v_n = 1 THEN v_pac END,
      CASE WHEN v_n = 1 THEN 'vinculado' WHEN v_n > 1 THEN 'varios' ELSE 'novo' END)
    ON CONFLICT (company_id, telefone) DO UPDATE SET atualizado_em = now()
    RETURNING * INTO v_ct;
  ELSIF p_direcao = 'entrada' AND coalesce(p_nome,'') <> '' AND p_nome IS DISTINCT FROM v_ct.nome_exibicao THEN
    UPDATE whatsapp_contatos SET nome_exibicao = left(p_nome,120), atualizado_em = now() WHERE id = v_ct.id;
  END IF;

  SELECT * INTO v_conv FROM whatsapp_conversas WHERE contato_id = v_ct.id AND instancia_id = p_instancia AND status <> 'finalizada' FOR UPDATE;
  IF v_conv.id IS NULL THEN
    SELECT * INTO v_conv FROM whatsapp_conversas WHERE contato_id = v_ct.id AND instancia_id = p_instancia
      ORDER BY criada_em DESC LIMIT 1 FOR UPDATE;
    IF v_conv.id IS NOT NULL AND p_origem <> 'sistema' THEN
      UPDATE whatsapp_conversas SET status = 'na_fila', finalizada_em = NULL, responsavel_id = NULL WHERE id = v_conv.id;
    ELSIF v_conv.id IS NULL THEN
      -- conversa iniciada só por mensagem do sistema não entra na fila
      INSERT INTO whatsapp_conversas(company_id, instancia_id, contato_id, status, finalizada_em)
      VALUES (v_comp, p_instancia, v_ct.id, CASE WHEN p_origem = 'sistema' THEN 'finalizada' ELSE 'na_fila' END,
              CASE WHEN p_origem = 'sistema' THEN now() END)
      RETURNING * INTO v_conv;
    END IF;
  END IF;

  INSERT INTO whatsapp_mensagens(company_id, conversa_id, direcao, origem, tipo, texto, message_id_uazapi, citada_message_id,
    enviada_por_nome, status, criado_em)
  VALUES (v_comp, v_conv.id, p_direcao, p_origem, coalesce(p_tipo,'texto'), p_texto, p_message_id, nullif(p_citada,''),
    CASE WHEN p_direcao = 'saida' THEN p_enviada_por_nome END, CASE WHEN p_direcao = 'saida' THEN coalesce(p_status,'enviada') END, v_quando)
  ON CONFLICT (company_id, message_id_uazapi) DO NOTHING RETURNING id INTO v_mid;
  IF v_mid IS NULL THEN RETURN 'duplicada'; END IF;

  v_resumo := left(coalesce(nullif(regexp_replace(p_texto, '\s+', ' ', 'g'),''), CASE p_tipo WHEN 'audio' THEN 'Áudio' WHEN 'imagem' THEN 'Imagem'
    WHEN 'documento' THEN 'Documento' WHEN 'video' THEN 'Vídeo' WHEN 'figurinha' THEN 'Figurinha' ELSE 'Mensagem' END), 60);
  UPDATE whatsapp_conversas SET
    nao_lidas = nao_lidas + CASE WHEN p_direcao = 'entrada' THEN 1 ELSE 0 END,
    ultima_mensagem_resumo = CASE WHEN ultima_mensagem_em IS NULL OR v_quando >= ultima_mensagem_em THEN v_resumo ELSE ultima_mensagem_resumo END,
    ultima_mensagem_em = greatest(coalesce(ultima_mensagem_em, v_quando), v_quando)
  WHERE id = v_conv.id;
  INSERT INTO inovachat_sinais(conversa_id, company_id, em) VALUES (v_conv.id, v_comp, now())
    ON CONFLICT (conversa_id) DO UPDATE SET em = now();
  RETURN 'gravada';
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_status(p_instancia uuid, p_ids text[], p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid; r record;
BEGIN
  SELECT company_id INTO v_comp FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_comp IS NULL OR p_status NOT IN ('enviada','entregue','lida','falha') THEN RETURN; END IF;
  FOR r IN UPDATE whatsapp_mensagens SET status = p_status
     WHERE company_id = v_comp AND message_id_uazapi = ANY(p_ids) AND direcao = 'saida'
       AND CASE p_status WHEN 'falha' THEN status = 'enviada'
                         WHEN 'lida' THEN coalesce(status,'enviada') IN ('enviada','entregue')
                         WHEN 'entregue' THEN coalesce(status,'enviada') = 'enviada'
                         ELSE false END
     RETURNING conversa_id LOOP
    INSERT INTO inovachat_sinais(conversa_id, company_id, em) VALUES (r.conversa_id, v_comp, now())
      ON CONFLICT (conversa_id) DO UPDATE SET em = now();
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_ignorar(p_instancia uuid, p_motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid;
BEGIN
  SELECT company_id INTO v_comp FROM whatsapp_instancias WHERE id = p_instancia;
  IF v_comp IS NULL OR NOT inovachat_ativo(v_comp) THEN RETURN; END IF;
  DELETE FROM inovachat_ignoradas WHERE criado_em < now() - interval '7 days';
  INSERT INTO inovachat_ignoradas(company_id, instancia_id, motivo) VALUES (v_comp, p_instancia, left(p_motivo, 40));
END $$;

-- mensagens do sistema (fila) entram na conversa do paciente; testes não entram
CREATE OR REPLACE FUNCTION public.inovachat_fila_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.tipo NOT IN ('confirmacao_agendamento','resposta_automatica') OR NEW.message_id_uazapi IS NULL OR NEW.instancia_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('enviada','entregue','lida','falha') THEN RETURN NEW; END IF;
  BEGIN
    IF public.inovachat_registrar(NEW.instancia_id, NEW.message_id_uazapi, NEW.telefone_destino, NULL, 'saida', 'sistema', 'texto',
         NEW.texto_final, NULL, coalesce(nullif(NEW.responsavel_nome,''), 'Sistema'),
         CASE WHEN NEW.status = 'falha' THEN 'falha' ELSE NEW.status END, coalesce(NEW.enviada_em, now())) = 'duplicada' THEN
      PERFORM public.inovachat_status(NEW.instancia_id, ARRAY[NEW.message_id_uazapi], NEW.status);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; -- nunca bloqueia a fila
  END;
  RETURN NEW;
END $$;
CREATE TRIGGER inovachat_fila AFTER INSERT OR UPDATE OF status, message_id_uazapi ON public.whatsapp_fila_envios
  FOR EACH ROW EXECUTE FUNCTION public.inovachat_fila_trg();

-- ---------- ações do usuário ----------
CREATE OR REPLACE FUNCTION public.inovachat_abrir(p_conversa uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM whatsapp_conversas WHERE id = p_conversa;
  IF c.id IS NULL OR NOT inovachat_pode_ver(c.company_id, c.status, c.responsavel_id) THEN RAISE EXCEPTION 'Conversa não encontrada'; END IF;
  IF c.nao_lidas > 0 THEN UPDATE whatsapp_conversas SET nao_lidas = 0 WHERE id = c.id; END IF;
  IF NOT EXISTS (SELECT 1 FROM whatsapp_conversa_acessos WHERE conversa_id = c.id AND usuario_id = auth.uid() AND acessado_em > now() - interval '1 hour') THEN
    INSERT INTO whatsapp_conversa_acessos(company_id, conversa_id, usuario_id) VALUES (c.company_id, c.id, auth.uid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_vincular(p_contato uuid, p_paciente uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ct record;
BEGIN
  SELECT * INTO ct FROM whatsapp_contatos WHERE id = p_contato;
  IF ct.id IS NULL OR ct.company_id <> get_user_company_id(auth.uid()) OR NOT inovachat_ativo(ct.company_id) THEN RAISE EXCEPTION 'Contato não encontrado'; END IF;
  IF NOT inovachat_tem_permissao('inovachat.gerenciar') THEN RAISE EXCEPTION 'Sem permissão para vincular contatos'; END IF;
  IF p_paciente IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patients WHERE id = p_paciente AND company_id = ct.company_id) THEN
    RAISE EXCEPTION 'Paciente não encontrado'; END IF;
  UPDATE whatsapp_contatos SET paciente_id = p_paciente,
    vinculo_status = CASE WHEN p_paciente IS NULL THEN 'desvinculado' ELSE 'vinculado' END, atualizado_em = now() WHERE id = ct.id;
  INSERT INTO whatsapp_auditoria(company_id, acao, antes, depois, usuario_id) VALUES (ct.company_id, 'inovachat_vinculo',
    jsonb_build_object('contato', ct.id, 'paciente', ct.paciente_id), jsonb_build_object('contato', ct.id, 'paciente', p_paciente), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_liberar(_company uuid, _habilitado boolean, _retencao smallint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record; r smallint;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  SELECT * INTO c FROM companies WHERE id = _company FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  IF _habilitado AND NOT c.whatsapp_habilitado THEN RAISE EXCEPTION 'Libere o WhatsApp da empresa antes do InovaChat'; END IF;
  r := coalesce(_retencao, c.inovachat_retencao_meses);
  IF r NOT IN (6, 12, 24, 36, 60) THEN RAISE EXCEPTION 'Retenção inválida'; END IF;
  UPDATE companies SET inovachat_habilitado = _habilitado, inovachat_retencao_meses = r,
    inovachat_habilitado_por = CASE WHEN _habilitado <> c.inovachat_habilitado THEN auth.uid() ELSE inovachat_habilitado_por END,
    inovachat_habilitado_em = CASE WHEN _habilitado <> c.inovachat_habilitado THEN now() ELSE inovachat_habilitado_em END
  WHERE id = _company;
  INSERT INTO whatsapp_auditoria(company_id, acao, antes, depois, usuario_id) VALUES (_company, 'inovachat_liberacao',
    jsonb_build_object('habilitado', c.inovachat_habilitado, 'retencao_meses', c.inovachat_retencao_meses),
    jsonb_build_object('habilitado', _habilitado, 'retencao_meses', r), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.inovachat_resumo_24h(_company uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  RETURN jsonb_build_object(
    'gravadas_entrada', (SELECT count(*) FROM whatsapp_mensagens WHERE company_id = _company AND direcao = 'entrada' AND criado_em > now() - interval '24 hours'),
    'gravadas_saida', (SELECT count(*) FROM whatsapp_mensagens WHERE company_id = _company AND direcao = 'saida' AND criado_em > now() - interval '24 hours'),
    'ignoradas', coalesce((SELECT jsonb_object_agg(motivo, n) FROM (SELECT motivo, count(*) n FROM inovachat_ignoradas
       WHERE company_id = _company AND criado_em > now() - interval '24 hours' GROUP BY motivo) s), '{}'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.inovachat_registrar(uuid,text,text,text,text,text,text,text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_status(uuid,text[],text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_ignorar(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inovachat_fila_trg() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inovachat_registrar(uuid,text,text,text,text,text,text,text,text,text,text,timestamptz), public.inovachat_status(uuid,text[],text), public.inovachat_ignorar(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.inovachat_abrir(uuid), public.inovachat_vincular(uuid,uuid), public.inovachat_liberar(uuid,boolean,smallint), public.inovachat_resumo_24h(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inovachat_abrir(uuid), public.inovachat_vincular(uuid,uuid), public.inovachat_liberar(uuid,boolean,smallint), public.inovachat_resumo_24h(uuid) TO authenticated;