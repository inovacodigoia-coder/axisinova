ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS crm_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crm_habilitado_por uuid,
  ADD COLUMN IF NOT EXISTS crm_habilitado_em timestamptz;

CREATE TABLE public.crm_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 1 AND 40),
  cor text NOT NULL DEFAULT '#00D4FF' CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem int NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'aberta' CHECK (tipo IN ('aberta','ganho','perdido')),
  inicial boolean NOT NULL DEFAULT false,
  ativa boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX crm_etapas_uma_inicial ON public.crm_etapas(company_id) WHERE inicial AND ativa;
CREATE INDEX crm_etapas_comp ON public.crm_etapas(company_id, ordem);

CREATE TABLE public.crm_motivos_perda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 1 AND 60),
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE public.crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 1 AND 30),
  cor text NOT NULL DEFAULT '#7B2FF7' CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ativa boolean NOT NULL DEFAULT true
);

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contato_id uuid NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
  paciente_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 1 AND 120),
  interesse text CHECK (char_length(interesse) <= 120),
  origem text NOT NULL DEFAULT 'whatsapp' CHECK (origem IN ('whatsapp','indicacao','instagram','site','telefone','outro')),
  etapa_id uuid NOT NULL REFERENCES public.crm_etapas(id),
  temperatura text NOT NULL DEFAULT 'morno' CHECK (temperatura IN ('frio','morno','quente')),
  temperatura_origem text NOT NULL DEFAULT 'manual' CHECK (temperatura_origem IN ('manual','automatica')),
  responsavel_id uuid,
  valor_estimado numeric(12,2) CHECK (valor_estimado IS NULL OR valor_estimado >= 0),
  proximo_contato_em timestamptz,
  motivo_perda_id uuid REFERENCES public.crm_motivos_perda(id),
  motivo_perda_texto text CHECK (char_length(motivo_perda_texto) <= 300),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  etapa_atualizada_em timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz
);
CREATE UNIQUE INDEX crm_leads_um_aberto ON public.crm_leads(contato_id) WHERE fechado_em IS NULL;
CREATE INDEX crm_leads_comp ON public.crm_leads(company_id, etapa_id);

CREATE TABLE public.crm_lead_tags (
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

CREATE TABLE public.crm_lead_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('criado','etapa','temperatura','tag','responsavel','nota','conversao','proximo_contato','edicao')),
  de text, para text,
  texto text CHECK (char_length(texto) <= 1000),
  usuario_id uuid,
  origem text NOT NULL DEFAULT 'usuario' CHECK (origem IN ('usuario','sistema')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_lead_eventos_lead ON public.crm_lead_eventos(lead_id, criado_em DESC);

CREATE TABLE public.crm_sinais (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_etapas, public.crm_motivos_perda, public.crm_tags, public.crm_leads, public.crm_lead_tags, public.crm_lead_eventos, public.crm_sinais TO authenticated;
GRANT ALL ON public.crm_etapas, public.crm_motivos_perda, public.crm_tags, public.crm_leads, public.crm_lead_tags, public.crm_lead_eventos, public.crm_sinais TO service_role;
ALTER TABLE public.crm_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_motivos_perda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sinais ENABLE ROW LEVEL SECURITY;

-- ---------- permissões ----------
CREATE OR REPLACE FUNCTION public.crm_ativo(_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT crm_habilitado FROM companies WHERE id = _company), false) AND public.inovachat_ativo(_company)
$$;

CREATE OR REPLACE FUNCTION public.crm_tem_permissao(_perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'crm','[]'::jsonb) ? _perm))
$$;

CREATE OR REPLACE FUNCTION public.crm_meu_acesso() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := get_user_company_id(auth.uid()); a boolean; g boolean; o boolean; r boolean; v boolean;
BEGIN
  a := auth.uid() IS NOT NULL AND crm_ativo(c);
  g := a AND crm_tem_permissao('crm.gerenciar');
  o := a AND (g OR crm_tem_permissao('crm.operar'));
  r := a AND inovachat_tem_permissao('inovachat.visualizar') AND inovachat_tem_permissao('inovachat.responder');
  v := a AND (o OR crm_tem_permissao('crm.visualizar'));
  RETURN jsonb_build_object('ver', v, 'operar', o, 'gerenciar', g, 'criar', o OR r, 'usuario_id', auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.crm_pode_ver(_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _company = public.get_user_company_id(auth.uid()) AND coalesce((public.crm_meu_acesso()->>'ver')::boolean, false)
$$;

CREATE POLICY "crm etapas leitura" ON public.crm_etapas FOR SELECT TO authenticated USING (public.crm_pode_ver(company_id) OR (company_id = public.get_user_company_id(auth.uid()) AND coalesce((public.crm_meu_acesso()->>'criar')::boolean,false)));
CREATE POLICY "crm motivos leitura" ON public.crm_motivos_perda FOR SELECT TO authenticated USING (public.crm_pode_ver(company_id));
CREATE POLICY "crm tags leitura" ON public.crm_tags FOR SELECT TO authenticated USING (public.crm_pode_ver(company_id) OR (company_id = public.get_user_company_id(auth.uid()) AND coalesce((public.crm_meu_acesso()->>'criar')::boolean,false)));
CREATE POLICY "crm leads leitura" ON public.crm_leads FOR SELECT TO authenticated USING (public.crm_pode_ver(company_id) OR (company_id = public.get_user_company_id(auth.uid()) AND coalesce((public.crm_meu_acesso()->>'criar')::boolean,false)));
CREATE POLICY "crm lead tags leitura" ON public.crm_lead_tags FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = lead_id AND public.crm_pode_ver(l.company_id)));
CREATE POLICY "crm eventos leitura" ON public.crm_lead_eventos FOR SELECT TO authenticated USING (public.crm_pode_ver(company_id));
CREATE POLICY "crm sinais leitura" ON public.crm_sinais FOR SELECT TO authenticated USING (public.crm_pode_ver(company_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_sinais;

-- ---------- helpers internos ----------
CREATE OR REPLACE FUNCTION public.crm__sinal(_company uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO crm_sinais(company_id, em) VALUES (_company, now()) ON CONFLICT (company_id) DO UPDATE SET em = now()
$$;

CREATE OR REPLACE FUNCTION public.crm__evento(_company uuid, _lead uuid, _tipo text, _de text, _para text, _texto text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO crm_lead_eventos(company_id, lead_id, tipo, de, para, texto, usuario_id, origem)
  VALUES (_company, _lead, _tipo, _de, _para, _texto, auth.uid(), CASE WHEN auth.uid() IS NULL THEN 'sistema' ELSE 'usuario' END)
$$;

CREATE OR REPLACE FUNCTION public.crm__validar_funil(_company uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM crm_etapas WHERE company_id=_company AND ativa AND inicial) <> 1 THEN RAISE EXCEPTION 'O funil precisa de exatamente uma etapa inicial'; END IF;
  IF (SELECT tipo FROM crm_etapas WHERE company_id=_company AND ativa AND inicial) <> 'aberta' THEN RAISE EXCEPTION 'A etapa inicial precisa ser do tipo aberta'; END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_etapas WHERE company_id=_company AND ativa AND tipo='ganho') THEN RAISE EXCEPTION 'O funil precisa de ao menos uma etapa de ganho'; END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_etapas WHERE company_id=_company AND ativa AND tipo='perdido') THEN RAISE EXCEPTION 'O funil precisa de ao menos uma etapa de perda'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.crm_padrao(_company uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM crm_etapas WHERE company_id=_company) THEN
    INSERT INTO crm_etapas(company_id, nome, cor, ordem, tipo, inicial) VALUES
      (_company,'Novo','#00D4FF',1,'aberta',true),(_company,'Em conversa','#3B82F6',2,'aberta',false),
      (_company,'Agendado','#7B2FF7',3,'aberta',false),(_company,'Compareceu','#22C55E',4,'ganho',false),
      (_company,'Perdido','#64748B',5,'perdido',false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_tags WHERE company_id=_company) THEN
    INSERT INTO crm_tags(company_id, nome, cor) VALUES (_company,'Particular','#7B2FF7'),(_company,'Convênio','#00D4FF'),
      (_company,'Retorno','#F59E0B'),(_company,'Indicação','#22C55E'),(_company,'Exame','#EC4899');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_motivos_perda WHERE company_id=_company) THEN
    INSERT INTO crm_motivos_perda(company_id, nome) VALUES (_company,'Preço'),(_company,'Sem retorno'),
      (_company,'Escolheu outro serviço'),(_company,'Sem interesse'),(_company,'Outro');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.crm__ligado_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.crm_habilitado AND NOT coalesce(OLD.crm_habilitado,false) THEN PERFORM crm_padrao(NEW.id); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER crm_ligado AFTER UPDATE OF crm_habilitado ON public.companies FOR EACH ROW EXECUTE FUNCTION public.crm__ligado_trg();

CREATE OR REPLACE FUNCTION public.crm_liberar(_company uuid, _habilitado boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c record;
BEGIN
  IF NOT private.is_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin'; END IF;
  SELECT * INTO c FROM companies WHERE id=_company FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
  IF _habilitado AND NOT (c.inovachat_habilitado AND c.whatsapp_habilitado) THEN RAISE EXCEPTION 'Ligue o InovaChat da empresa antes do CRM'; END IF;
  UPDATE companies SET crm_habilitado=_habilitado,
    crm_habilitado_por = CASE WHEN _habilitado <> c.crm_habilitado THEN auth.uid() ELSE crm_habilitado_por END,
    crm_habilitado_em = CASE WHEN _habilitado <> c.crm_habilitado THEN now() ELSE crm_habilitado_em END
  WHERE id=_company;
  INSERT INTO whatsapp_auditoria(company_id, acao, antes, depois, usuario_id) VALUES (_company,'crm_liberacao',
    jsonb_build_object('habilitado', c.crm_habilitado), jsonb_build_object('habilitado', _habilitado), auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.crm__pode_editar(l public.crm_leads) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.company_id = get_user_company_id(auth.uid()) AND crm_ativo(l.company_id) AND (
    crm_tem_permissao('crm.gerenciar') OR (l.responsavel_id = auth.uid() AND coalesce((crm_meu_acesso()->>'criar')::boolean,false)))
$$;

CREATE OR REPLACE FUNCTION public.crm__lead_editavel(_lead uuid) RETURNS public.crm_leads
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l crm_leads;
BEGIN
  SELECT * INTO l FROM crm_leads WHERE id=_lead FOR UPDATE;
  IF l.id IS NULL OR l.company_id IS DISTINCT FROM get_user_company_id(auth.uid()) THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  IF NOT crm__pode_editar(l) THEN RAISE EXCEPTION 'Apenas o responsável ou o gestor do CRM pode alterar este lead'; END IF;
  RETURN l;
END $$;

CREATE OR REPLACE FUNCTION public.crm__resp_valido(_company uuid, _user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NULL OR EXISTS (SELECT 1 FROM profiles WHERE id=_user AND company_id=_company AND coalesce(is_active,true))
$$;

CREATE OR REPLACE FUNCTION public.crm__tags_definir(l public.crm_leads, _tags uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  IF _tags IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_tags) x WHERE NOT EXISTS (SELECT 1 FROM crm_tags WHERE id=x AND company_id=l.company_id)) THEN RAISE EXCEPTION 'Tag inválida'; END IF;
  FOR t IN SELECT lt.tag_id, tg.nome FROM crm_lead_tags lt JOIN crm_tags tg ON tg.id=lt.tag_id WHERE lt.lead_id=l.id AND NOT lt.tag_id = ANY(_tags) LOOP
    DELETE FROM crm_lead_tags WHERE lead_id=l.id AND tag_id=t.tag_id;
    PERFORM crm__evento(l.company_id, l.id, 'tag', t.nome, NULL);
  END LOOP;
  FOR t IN SELECT tg.id, tg.nome FROM crm_tags tg WHERE tg.id = ANY(_tags) AND NOT EXISTS (SELECT 1 FROM crm_lead_tags WHERE lead_id=l.id AND tag_id=tg.id) LOOP
    INSERT INTO crm_lead_tags(lead_id, tag_id) VALUES (l.id, t.id);
    PERFORM crm__evento(l.company_id, l.id, 'tag', NULL, t.nome);
  END LOOP;
END $$;

-- ---------- leads ----------
CREATE OR REPLACE FUNCTION public.crm_lead_criar(p jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_comp uuid := get_user_company_id(auth.uid()); a jsonb := crm_meu_acesso();
  v_ct whatsapp_contatos; v_tel text; v_et crm_etapas; v_id uuid; v_pac uuid; v_n int; v_resp uuid; l crm_leads;
BEGIN
  IF NOT coalesce((a->>'criar')::boolean,false) THEN RAISE EXCEPTION 'Sem permissão para criar lead'; END IF;
  IF p ? 'contato_id' AND nullif(p->>'contato_id','') IS NOT NULL THEN
    SELECT * INTO v_ct FROM whatsapp_contatos WHERE id=(p->>'contato_id')::uuid AND company_id=v_comp;
    IF v_ct.id IS NULL THEN RAISE EXCEPTION 'Contato não encontrado'; END IF;
    -- quem cria pelo InovaChat sem permissão do CRM precisa enxergar a conversa (regra da 10B)
    IF NOT coalesce((a->>'operar')::boolean,false) AND NOT EXISTS (SELECT 1 FROM whatsapp_conversas cv WHERE cv.contato_id=v_ct.id
       AND inovachat_pode_ver(cv.company_id, cv.status, cv.responsavel_id, cv.setor_id::text)) THEN
      RAISE EXCEPTION 'Sem acesso à conversa deste contato'; END IF;
  ELSE
    v_tel := regexp_replace(coalesce(p->>'telefone',''), '\D', '', 'g');
    IF length(v_tel) <> 11 THEN RAISE EXCEPTION 'Digite DDD + celular (11 dígitos)'; END IF;
    v_tel := '55' || v_tel;
    SELECT * INTO v_ct FROM whatsapp_contatos WHERE company_id=v_comp AND whatsapp_tel_canonico(telefone)=whatsapp_tel_canonico(v_tel) ORDER BY criado_em LIMIT 1;
    IF v_ct.id IS NULL THEN
      SELECT count(*), min(id::text)::uuid INTO v_n, v_pac FROM patients
        WHERE company_id=v_comp AND right(regexp_replace(coalesce(phone,''),'\D','','g'),11) = right(v_tel,11);
      INSERT INTO whatsapp_contatos(company_id, telefone, nome_exibicao, paciente_id, vinculo_status)
        VALUES (v_comp, v_tel, left(nullif(trim(p->>'nome'),''),120), CASE WHEN v_n=1 THEN v_pac END,
                CASE WHEN v_n=1 THEN 'vinculado' WHEN v_n>1 THEN 'varios' ELSE 'novo' END)
        RETURNING * INTO v_ct;
    END IF;
  END IF;
  IF nullif(p->>'etapa_id','') IS NOT NULL THEN
    SELECT * INTO v_et FROM crm_etapas WHERE id=(p->>'etapa_id')::uuid AND company_id=v_comp AND ativa AND tipo='aberta';
  ELSE
    SELECT * INTO v_et FROM crm_etapas WHERE company_id=v_comp AND ativa AND inicial;
  END IF;
  IF v_et.id IS NULL THEN RAISE EXCEPTION 'Etapa inválida'; END IF;
  v_resp := coalesce(nullif(p->>'responsavel_id','')::uuid, auth.uid());
  IF NOT crm__resp_valido(v_comp, v_resp) THEN RAISE EXCEPTION 'Responsável inválido'; END IF;
  IF NOT coalesce((a->>'gerenciar')::boolean,false) AND v_resp <> auth.uid() AND NOT coalesce((a->>'operar')::boolean,false) THEN
    RAISE EXCEPTION 'Sem permissão para atribuir outro responsável'; END IF;
  IF EXISTS (SELECT 1 FROM crm_leads WHERE contato_id=v_ct.id AND fechado_em IS NULL) THEN RAISE EXCEPTION 'Este contato já tem um lead aberto'; END IF;
  INSERT INTO crm_leads(company_id, contato_id, paciente_id, nome, interesse, origem, etapa_id, temperatura, responsavel_id,
    valor_estimado, proximo_contato_em, criado_por)
  VALUES (v_comp, v_ct.id, v_ct.paciente_id, left(trim(coalesce(nullif(p->>'nome',''), v_ct.nome_exibicao, 'Sem nome')),120),
    nullif(left(trim(coalesce(p->>'interesse','')),120),''), coalesce(nullif(p->>'origem',''),'whatsapp'), v_et.id,
    coalesce(nullif(p->>'temperatura',''),'morno'), v_resp, nullif(p->>'valor_estimado','')::numeric,
    nullif(p->>'proximo_contato_em','')::timestamptz, auth.uid())
  RETURNING * INTO l;
  PERFORM crm__evento(v_comp, l.id, 'criado', NULL, v_et.nome);
  IF jsonb_typeof(p->'tags') = 'array' THEN
    PERFORM crm__tags_definir(l, ARRAY(SELECT jsonb_array_elements_text(p->'tags'))::uuid[]);
    DELETE FROM crm_lead_eventos WHERE lead_id=l.id AND tipo='tag';
  END IF;
  PERFORM crm__sinal(v_comp);
  RETURN l.id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Este contato já tem um lead aberto';
END $$;

CREATE OR REPLACE FUNCTION public.crm_lead_mover(p_lead uuid, p_etapa uuid, p_motivo uuid DEFAULT NULL, p_motivo_texto text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads; de crm_etapas; para crm_etapas;
BEGIN
  l := crm__lead_editavel(p_lead);
  SELECT * INTO para FROM crm_etapas WHERE id=p_etapa AND company_id=l.company_id AND ativa;
  IF para.id IS NULL THEN RAISE EXCEPTION 'Etapa inválida'; END IF;
  IF para.id = l.etapa_id THEN RETURN; END IF;
  SELECT * INTO de FROM crm_etapas WHERE id=l.etapa_id;
  IF para.tipo='perdido' THEN
    IF p_motivo IS NULL OR NOT EXISTS (SELECT 1 FROM crm_motivos_perda WHERE id=p_motivo AND company_id=l.company_id AND ativo) THEN
      RAISE EXCEPTION 'Informe o motivo da perda'; END IF;
    IF (SELECT nome FROM crm_motivos_perda WHERE id=p_motivo)='Outro' AND nullif(trim(coalesce(p_motivo_texto,'')),'') IS NULL THEN
      RAISE EXCEPTION 'Descreva o motivo da perda'; END IF;
  END IF;
  IF para.tipo='aberta' AND l.fechado_em IS NOT NULL AND EXISTS (SELECT 1 FROM crm_leads WHERE contato_id=l.contato_id AND fechado_em IS NULL AND id<>l.id) THEN
    RAISE EXCEPTION 'Este contato já tem outro lead aberto'; END IF;
  UPDATE crm_leads SET etapa_id=para.id, etapa_atualizada_em=now(), atualizado_em=now(),
    fechado_em = CASE WHEN para.tipo IN ('ganho','perdido') THEN coalesce(fechado_em, now()) ELSE NULL END,
    motivo_perda_id = CASE WHEN para.tipo='perdido' THEN p_motivo ELSE NULL END,
    motivo_perda_texto = CASE WHEN para.tipo='perdido' THEN left(nullif(trim(coalesce(p_motivo_texto,'')),''),300) ELSE NULL END
  WHERE id=l.id;
  PERFORM crm__evento(l.company_id, l.id, 'etapa', de.nome, para.nome,
    CASE WHEN para.tipo='perdido' THEN (SELECT nome FROM crm_motivos_perda WHERE id=p_motivo) || coalesce(' — ' || nullif(trim(p_motivo_texto),''),'') END);
  PERFORM crm__sinal(l.company_id);
END $$;

CREATE OR REPLACE FUNCTION public.crm_lead_reabrir(p_lead uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads; v uuid;
BEGIN
  l := crm__lead_editavel(p_lead);
  IF l.fechado_em IS NULL THEN RETURN; END IF;
  SELECT id INTO v FROM crm_etapas WHERE company_id=l.company_id AND ativa AND inicial;
  PERFORM crm_lead_mover(p_lead, v);
END $$;

CREATE OR REPLACE FUNCTION public.crm_lead_editar(p_lead uuid, p jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads; n crm_leads; v uuid;
BEGIN
  l := crm__lead_editavel(p_lead); n := l;
  IF p ? 'nome' THEN n.nome := left(trim(p->>'nome'),120); IF coalesce(n.nome,'')='' THEN RAISE EXCEPTION 'Informe o nome'; END IF; END IF;
  IF p ? 'interesse' THEN n.interesse := nullif(left(trim(coalesce(p->>'interesse','')),120),''); END IF;
  IF p ? 'origem' THEN n.origem := p->>'origem'; END IF;
  IF p ? 'valor_estimado' THEN n.valor_estimado := nullif(p->>'valor_estimado','')::numeric; END IF;
  IF p ? 'temperatura' THEN n.temperatura := p->>'temperatura'; END IF;
  IF p ? 'proximo_contato_em' THEN n.proximo_contato_em := nullif(p->>'proximo_contato_em','')::timestamptz; END IF;
  IF p ? 'responsavel_id' THEN
    v := nullif(p->>'responsavel_id','')::uuid;
    IF v IS DISTINCT FROM l.responsavel_id AND NOT crm_tem_permissao('crm.gerenciar') AND NOT crm_tem_permissao('crm.operar') THEN
      RAISE EXCEPTION 'Sem permissão para trocar o responsável'; END IF;
    IF NOT crm__resp_valido(l.company_id, v) THEN RAISE EXCEPTION 'Responsável inválido'; END IF;
    n.responsavel_id := v;
  END IF;
  UPDATE crm_leads SET nome=n.nome, interesse=n.interesse, origem=n.origem, valor_estimado=n.valor_estimado, temperatura=n.temperatura,
    temperatura_origem = CASE WHEN n.temperatura IS DISTINCT FROM l.temperatura THEN 'manual' ELSE temperatura_origem END,
    proximo_contato_em=n.proximo_contato_em, responsavel_id=n.responsavel_id, atualizado_em=now() WHERE id=l.id;
  IF n.temperatura IS DISTINCT FROM l.temperatura THEN PERFORM crm__evento(l.company_id, l.id, 'temperatura', l.temperatura, n.temperatura); END IF;
  IF n.responsavel_id IS DISTINCT FROM l.responsavel_id THEN PERFORM crm__evento(l.company_id, l.id, 'responsavel',
    inovachat_nome_usuario(l.responsavel_id), inovachat_nome_usuario(n.responsavel_id)); END IF;
  IF n.proximo_contato_em IS DISTINCT FROM l.proximo_contato_em THEN PERFORM crm__evento(l.company_id, l.id, 'proximo_contato',
    to_char(l.proximo_contato_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'), to_char(n.proximo_contato_em AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')); END IF;
  IF n.nome IS DISTINCT FROM l.nome THEN PERFORM crm__evento(l.company_id, l.id, 'edicao', 'Nome: ' || l.nome, n.nome); END IF;
  IF n.interesse IS DISTINCT FROM l.interesse THEN PERFORM crm__evento(l.company_id, l.id, 'edicao', 'Interesse: ' || coalesce(l.interesse,'—'), coalesce(n.interesse,'—')); END IF;
  IF n.origem IS DISTINCT FROM l.origem THEN PERFORM crm__evento(l.company_id, l.id, 'edicao', 'Origem: ' || l.origem, n.origem); END IF;
  IF n.valor_estimado IS DISTINCT FROM l.valor_estimado THEN PERFORM crm__evento(l.company_id, l.id, 'edicao', 'Valor: ' || coalesce(l.valor_estimado::text,'—'), coalesce(n.valor_estimado::text,'—')); END IF;
  IF jsonb_typeof(p->'tags') = 'array' THEN PERFORM crm__tags_definir(l, ARRAY(SELECT jsonb_array_elements_text(p->'tags'))::uuid[]); END IF;
  PERFORM crm__sinal(l.company_id);
END $$;

CREATE OR REPLACE FUNCTION public.crm_lead_nota(p_lead uuid, p_texto text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads;
BEGIN
  l := crm__lead_editavel(p_lead);
  IF nullif(trim(coalesce(p_texto,'')),'') IS NULL OR char_length(p_texto) > 1000 THEN RAISE EXCEPTION 'A nota deve ter de 1 a 1000 caracteres'; END IF;
  PERFORM crm__evento(l.company_id, l.id, 'nota', NULL, NULL, trim(p_texto));
  UPDATE crm_leads SET atualizado_em=now() WHERE id=l.id;
  PERFORM crm__sinal(l.company_id);
END $$;

CREATE OR REPLACE FUNCTION public.crm_lead_vincular_paciente(p_lead uuid, p_paciente uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads; v_nome text;
BEGIN
  l := crm__lead_editavel(p_lead);
  SELECT name INTO v_nome FROM patients WHERE id=p_paciente AND company_id=l.company_id;
  IF v_nome IS NULL THEN RAISE EXCEPTION 'Paciente não encontrado'; END IF;
  UPDATE crm_leads SET paciente_id=p_paciente, atualizado_em=now() WHERE id=l.id;
  UPDATE whatsapp_contatos SET paciente_id=p_paciente, vinculo_status='vinculado', atualizado_em=now() WHERE id=l.contato_id AND paciente_id IS NULL;
  PERFORM crm__evento(l.company_id, l.id, 'conversao', NULL, v_nome);
  PERFORM crm__sinal(l.company_id);
END $$;

CREATE OR REPLACE FUNCTION public.crm_lead_excluir(p_lead uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads;
BEGIN
  SELECT * INTO l FROM crm_leads WHERE id=p_lead;
  IF l.id IS NULL OR l.company_id IS DISTINCT FROM get_user_company_id(auth.uid()) THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  IF NOT (crm_ativo(l.company_id) AND crm_tem_permissao('crm.gerenciar')) THEN RAISE EXCEPTION 'Apenas o gestor do CRM pode excluir leads'; END IF;
  DELETE FROM crm_leads WHERE id=l.id;
  INSERT INTO whatsapp_auditoria(company_id, acao, depois, usuario_id) VALUES (l.company_id, 'crm_lead_exclusao', jsonb_build_object('lead', l.id), auth.uid());
  PERFORM crm__sinal(l.company_id);
END $$;

-- quadro: dados para o kanban (telefone só aqui, nunca no canal ao vivo)
CREATE OR REPLACE FUNCTION public.crm_quadro() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := get_user_company_id(auth.uid());
BEGIN
  IF NOT crm_pode_ver(v_comp) THEN RAISE EXCEPTION 'Sem acesso ao CRM'; END IF;
  RETURN jsonb_build_object(
    'leads', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', l.id, 'contato_id', l.contato_id, 'paciente_id', l.paciente_id, 'nome', l.nome, 'interesse', l.interesse, 'origem', l.origem,
      'etapa_id', l.etapa_id, 'temperatura', l.temperatura, 'responsavel_id', l.responsavel_id,
      'responsavel_nome', CASE WHEN l.responsavel_id IS NOT NULL THEN inovachat_nome_usuario(l.responsavel_id) END,
      'valor_estimado', l.valor_estimado, 'proximo_contato_em', l.proximo_contato_em, 'motivo_perda_id', l.motivo_perda_id,
      'motivo_perda_texto', l.motivo_perda_texto, 'criado_em', l.criado_em, 'etapa_atualizada_em', l.etapa_atualizada_em, 'fechado_em', l.fechado_em,
      'telefone', ct.telefone,
      'tags', coalesce((SELECT jsonb_agg(lt.tag_id) FROM crm_lead_tags lt WHERE lt.lead_id=l.id),'[]'::jsonb),
      'nao_lida', EXISTS (SELECT 1 FROM whatsapp_conversas cv WHERE cv.contato_id=l.contato_id AND cv.nao_lidas>0
                   AND inovachat_pode_ver(cv.company_id, cv.status, cv.responsavel_id, cv.setor_id::text)),
      'pode_editar', crm__pode_editar(l)) ORDER BY l.etapa_atualizada_em DESC)
      FROM crm_leads l JOIN whatsapp_contatos ct ON ct.id=l.contato_id WHERE l.company_id=v_comp), '[]'::jsonb),
    'resumo', jsonb_build_object(
      'abertos', (SELECT count(*) FROM crm_leads WHERE company_id=v_comp AND fechado_em IS NULL),
      'criados_30d', (SELECT count(*) FROM crm_leads WHERE company_id=v_comp AND criado_em > now() - interval '30 days'),
      'convertidos_30d', (SELECT count(DISTINCT lead_id) FROM crm_lead_eventos WHERE company_id=v_comp AND tipo='conversao' AND criado_em > now() - interval '30 days')),
    'usuarios', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'nome', coalesce(nullif(trim(p.full_name),''),'Usuário')) ORDER BY p.full_name)
      FROM profiles p WHERE p.company_id=v_comp AND coalesce(p.is_active,true)), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.crm_lead_historico(p_lead uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads;
BEGIN
  SELECT * INTO l FROM crm_leads WHERE id=p_lead;
  IF l.id IS NULL OR NOT crm_pode_ver(l.company_id) THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'de', e.de, 'para', e.para, 'texto', e.texto, 'origem', e.origem,
    'usuario', CASE WHEN e.usuario_id IS NOT NULL THEN inovachat_nome_usuario(e.usuario_id) END, 'criado_em', e.criado_em) ORDER BY e.criado_em DESC)
    FROM crm_lead_eventos e WHERE e.lead_id=l.id), '[]'::jsonb);
END $$;

-- conversa do lead: respeita a visibilidade do InovaChat e registra o acesso
CREATE OR REPLACE FUNCTION public.crm_lead_conversa(p_lead uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l crm_leads; c record;
BEGIN
  SELECT * INTO l FROM crm_leads WHERE id=p_lead;
  IF l.id IS NULL OR NOT crm_pode_ver(l.company_id) THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  SELECT * INTO c FROM whatsapp_conversas WHERE contato_id=l.contato_id ORDER BY ultima_mensagem_em DESC NULLS LAST, criada_em DESC LIMIT 1;
  IF c.id IS NULL THEN RETURN jsonb_build_object('status','sem_conversa'); END IF;
  IF NOT (inovachat_tem_permissao('inovachat.visualizar') AND coalesce(inovachat_pode_ver(c.company_id, c.status, c.responsavel_id, c.setor_id::text),false)) THEN
    RETURN jsonb_build_object('status','sem_acesso'); END IF;
  IF NOT EXISTS (SELECT 1 FROM whatsapp_conversa_acessos WHERE conversa_id=c.id AND usuario_id=auth.uid() AND acessado_em > now() - interval '1 hour') THEN
    INSERT INTO whatsapp_conversa_acessos(company_id, conversa_id, usuario_id) VALUES (c.company_id, c.id, auth.uid());
  END IF;
  RETURN jsonb_build_object('status','ok','conversa_id',c.id);
END $$;

CREATE OR REPLACE FUNCTION public.crm_buscar_paciente(p_q text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := get_user_company_id(auth.uid()); q text := trim(coalesce(p_q,'')); d text;
BEGIN
  IF NOT crm_pode_ver(v_comp) THEN RAISE EXCEPTION 'Sem acesso ao CRM'; END IF;
  IF char_length(q) < 3 THEN RETURN '[]'::jsonb; END IF;
  d := regexp_replace(q,'\D','','g');
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'nome', name, 'cpf_final', right(regexp_replace(coalesce(cpf,''),'\D','','g'),4)))
    FROM (SELECT id, name, cpf FROM patients WHERE company_id=v_comp AND (name ILIKE '%'||q||'%' OR (length(d)>=6 AND regexp_replace(coalesce(cpf,''),'\D','','g') LIKE d||'%'))
          ORDER BY name LIMIT 15) s), '[]'::jsonb);
END $$;

-- ---------- configuração do funil ----------
CREATE OR REPLACE FUNCTION public.crm__gestor() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := get_user_company_id(auth.uid());
BEGIN
  IF NOT (crm_ativo(v) AND crm_tem_permissao('crm.gerenciar')) THEN RAISE EXCEPTION 'Apenas o gestor do CRM'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.crm_etapa_salvar(p_id uuid, p_nome text, p_cor text, p_tipo text, p_inicial boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := crm__gestor(); v uuid := p_id; e crm_etapas;
BEGIN
  IF p_tipo NOT IN ('aberta','ganho','perdido') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF v IS NOT NULL THEN
    SELECT * INTO e FROM crm_etapas WHERE id=v AND company_id=v_comp;
    IF e.id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
    IF e.tipo <> p_tipo AND EXISTS (SELECT 1 FROM crm_leads WHERE etapa_id=v) THEN RAISE EXCEPTION 'Mova os leads antes de mudar o tipo da etapa'; END IF;
  END IF;
  IF coalesce(p_inicial,false) THEN UPDATE crm_etapas SET inicial=false WHERE company_id=v_comp AND inicial AND id IS DISTINCT FROM v; END IF;
  IF v IS NULL THEN
    INSERT INTO crm_etapas(company_id, nome, cor, tipo, inicial, ordem) VALUES (v_comp, trim(p_nome), p_cor, p_tipo, coalesce(p_inicial,false),
      coalesce((SELECT max(ordem)+1 FROM crm_etapas WHERE company_id=v_comp),1)) RETURNING id INTO v;
  ELSE
    UPDATE crm_etapas SET nome=trim(p_nome), cor=p_cor, tipo=p_tipo, inicial=coalesce(p_inicial,false) WHERE id=v;
  END IF;
  PERFORM crm__validar_funil(v_comp);
  PERFORM crm__sinal(v_comp);
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.crm_etapas_ordenar(p_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := crm__gestor(); i int;
BEGIN
  FOR i IN 1..coalesce(array_length(p_ids,1),0) LOOP
    UPDATE crm_etapas SET ordem=i WHERE id=p_ids[i] AND company_id=v_comp;
  END LOOP;
  PERFORM crm__sinal(v_comp);
END $$;

CREATE OR REPLACE FUNCTION public.crm_etapa_desativar(p_id uuid, p_destino uuid DEFAULT NULL) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := crm__gestor(); e crm_etapas; d crm_etapas; n int := 0; r record;
BEGIN
  SELECT * INTO e FROM crm_etapas WHERE id=p_id AND company_id=v_comp AND ativa;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF EXISTS (SELECT 1 FROM crm_leads WHERE etapa_id=e.id) THEN
    SELECT * INTO d FROM crm_etapas WHERE id=p_destino AND company_id=v_comp AND ativa AND id<>e.id;
    IF d.id IS NULL THEN RAISE EXCEPTION 'Escolha para qual etapa mover os leads'; END IF;
    IF d.tipo <> e.tipo THEN RAISE EXCEPTION 'Os leads só podem ir para uma etapa do mesmo tipo'; END IF;
    FOR r IN SELECT id FROM crm_leads WHERE etapa_id=e.id LOOP
      UPDATE crm_leads SET etapa_id=d.id, etapa_atualizada_em=now(), atualizado_em=now() WHERE id=r.id;
      PERFORM crm__evento(v_comp, r.id, 'etapa', e.nome, d.nome, 'Etapa desativada');
      n := n + 1;
    END LOOP;
  END IF;
  UPDATE crm_etapas SET ativa=false, inicial=false WHERE id=e.id;
  IF e.inicial THEN RAISE EXCEPTION 'Defina outra etapa como inicial antes de desativar esta'; END IF;
  PERFORM crm__validar_funil(v_comp);
  PERFORM crm__sinal(v_comp);
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.crm_funil_restaurar() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := crm__gestor();
BEGIN
  IF EXISTS (SELECT 1 FROM crm_leads WHERE company_id=v_comp) THEN RAISE EXCEPTION 'Só é possível restaurar o funil sem leads'; END IF;
  DELETE FROM crm_etapas WHERE company_id=v_comp;
  PERFORM crm_padrao(v_comp);
  PERFORM crm__sinal(v_comp);
END $$;

CREATE OR REPLACE FUNCTION public.crm_tag_salvar(p_id uuid, p_nome text, p_cor text, p_ativa boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := crm__gestor(); v uuid := p_id;
BEGIN
  IF v IS NULL THEN INSERT INTO crm_tags(company_id, nome, cor, ativa) VALUES (v_comp, trim(p_nome), p_cor, coalesce(p_ativa,true)) RETURNING id INTO v;
  ELSE UPDATE crm_tags SET nome=trim(p_nome), cor=p_cor, ativa=coalesce(p_ativa,true) WHERE id=v AND company_id=v_comp;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tag não encontrada'; END IF; END IF;
  PERFORM crm__sinal(v_comp);
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.crm_motivo_salvar(p_id uuid, p_nome text, p_ativo boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid := crm__gestor(); v uuid := p_id;
BEGIN
  IF v IS NULL THEN INSERT INTO crm_motivos_perda(company_id, nome, ativo) VALUES (v_comp, trim(p_nome), coalesce(p_ativo,true)) RETURNING id INTO v;
  ELSE UPDATE crm_motivos_perda SET nome=trim(p_nome), ativo=coalesce(p_ativo,true) WHERE id=v AND company_id=v_comp;
    IF NOT FOUND THEN RAISE EXCEPTION 'Motivo não encontrado'; END IF; END IF;
  RETURN v;
END $$;

-- ---------- exclusão do titular (10C) inclui CRM ----------
CREATE OR REPLACE FUNCTION public.inovachat_excluir_contato_executar(p_contato uuid, p_usuario uuid, p_midias int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ct record; n_msg int; n_conv int; n_fila int; n_nps int; n_leads int; n_ev int; n_tags int;
BEGIN
  SELECT * INTO ct FROM whatsapp_contatos WHERE id = p_contato FOR UPDATE;
  IF ct.id IS NULL THEN RAISE EXCEPTION 'contato'; END IF;
  DELETE FROM whatsapp_nps_respostas n USING whatsapp_fila_envios f
    WHERE n.fila_id=f.id AND n.company_id=ct.company_id AND f.company_id=ct.company_id
      AND whatsapp_tel_canonico(f.telefone_destino)=whatsapp_tel_canonico(ct.telefone);
  GET DIAGNOSTICS n_nps = ROW_COUNT;
  SELECT count(*) INTO n_ev FROM crm_lead_eventos e JOIN crm_leads l ON l.id=e.lead_id WHERE l.contato_id=ct.id;
  SELECT count(*) INTO n_tags FROM crm_lead_tags t JOIN crm_leads l ON l.id=t.lead_id WHERE l.contato_id=ct.id;
  DELETE FROM crm_leads WHERE contato_id=ct.id; GET DIAGNOSTICS n_leads = ROW_COUNT;
  SELECT count(*) INTO n_msg FROM whatsapp_mensagens m JOIN whatsapp_conversas c ON c.id = m.conversa_id WHERE c.contato_id = ct.id;
  DELETE FROM whatsapp_conversas WHERE contato_id = ct.id; GET DIAGNOSTICS n_conv = ROW_COUNT;
  DELETE FROM whatsapp_fila_envios WHERE company_id = ct.company_id AND whatsapp_tel_canonico(telefone_destino) = whatsapp_tel_canonico(ct.telefone);
  GET DIAGNOSTICS n_fila = ROW_COUNT;
  DELETE FROM whatsapp_contatos WHERE id = ct.id;
  IF n_leads > 0 THEN PERFORM crm__sinal(ct.company_id); END IF;
  INSERT INTO whatsapp_auditoria(company_id, acao, depois, usuario_id) VALUES (ct.company_id, 'inovachat_exclusao_titular',
    jsonb_build_object('telefone_final', right(ct.telefone, 4), 'mensagens', n_msg, 'midias', p_midias, 'conversas', n_conv, 'fila', n_fila,
      'nps_apagadas', n_nps, 'crm_leads', n_leads, 'crm_eventos', n_ev, 'crm_tags', n_tags), p_usuario);
  RETURN jsonb_build_object('mensagens', n_msg, 'midias', p_midias, 'conversas', n_conv, 'fila', n_fila, 'nps_apagadas', n_nps,
    'crm_leads', n_leads, 'crm_eventos', n_ev, 'crm_tags', n_tags);
END $$;
REVOKE ALL ON FUNCTION public.inovachat_excluir_contato_executar(uuid,uuid,int) FROM PUBLIC, anon, authenticated;

-- ---------- grants ----------
REVOKE ALL ON FUNCTION public.crm__sinal(uuid), public.crm__evento(uuid,uuid,text,text,text,text), public.crm__validar_funil(uuid),
  public.crm_padrao(uuid), public.crm__ligado_trg(), public.crm__pode_editar(public.crm_leads), public.crm__lead_editavel(uuid),
  public.crm__resp_valido(uuid,uuid), public.crm__tags_definir(public.crm_leads,uuid[]), public.crm__gestor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_liberar(uuid,boolean), public.crm_meu_acesso(), public.crm_lead_criar(jsonb), public.crm_lead_mover(uuid,uuid,uuid,text),
  public.crm_lead_reabrir(uuid), public.crm_lead_editar(uuid,jsonb), public.crm_lead_nota(uuid,text), public.crm_lead_vincular_paciente(uuid,uuid),
  public.crm_lead_excluir(uuid), public.crm_quadro(), public.crm_lead_historico(uuid), public.crm_lead_conversa(uuid), public.crm_buscar_paciente(text),
  public.crm_etapa_salvar(uuid,text,text,text,boolean), public.crm_etapas_ordenar(uuid[]), public.crm_etapa_desativar(uuid,uuid),
  public.crm_funil_restaurar(), public.crm_tag_salvar(uuid,text,text,boolean), public.crm_motivo_salvar(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_liberar(uuid,boolean), public.crm_meu_acesso(), public.crm_lead_criar(jsonb), public.crm_lead_mover(uuid,uuid,uuid,text),
  public.crm_lead_reabrir(uuid), public.crm_lead_editar(uuid,jsonb), public.crm_lead_nota(uuid,text), public.crm_lead_vincular_paciente(uuid,uuid),
  public.crm_lead_excluir(uuid), public.crm_quadro(), public.crm_lead_historico(uuid), public.crm_lead_conversa(uuid), public.crm_buscar_paciente(text),
  public.crm_etapa_salvar(uuid,text,text,text,boolean), public.crm_etapas_ordenar(uuid[]), public.crm_etapa_desativar(uuid,uuid),
  public.crm_funil_restaurar(), public.crm_tag_salvar(uuid,text,text,boolean), public.crm_motivo_salvar(uuid,text,boolean) TO authenticated;
