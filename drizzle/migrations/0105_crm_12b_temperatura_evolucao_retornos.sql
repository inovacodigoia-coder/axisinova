CREATE TABLE public.crm_config (
 company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
 temperatura_modo text NOT NULL DEFAULT 'manual' CHECK (temperatura_modo IN ('manual','automatico')),
 travar_manual_dias integer NOT NULL DEFAULT 7 CHECK (travar_manual_dias BETWEEN 0 AND 365),
 frio_apos_dias integer NOT NULL DEFAULT 5 CHECK (frio_apos_dias BETWEEN 1 AND 365),
 palavras_quentes text[] NOT NULL DEFAULT ARRAY['valor','preço','preco','quanto custa','orçamento','orcamento','agendar','marcar','horário','horario','disponibilidade','vaga'],
 evolucao_automatica boolean NOT NULL DEFAULT false,
 alerta_lead_quente boolean NOT NULL DEFAULT true,
 alterado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crm_config TO authenticated;
GRANT ALL ON public.crm_config TO service_role;
ALTER TABLE public.crm_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_config_leitura ON public.crm_config FOR SELECT TO authenticated USING (public.crm_pode_ver(company_id));
INSERT INTO public.crm_config(company_id) SELECT id FROM public.companies WHERE crm_habilitado;
ALTER TABLE public.crm_etapas ADD COLUMN automacao text CHECK (automacao IN ('primeira_resposta','agendamento_criado','atendimento_finalizado'));
CREATE UNIQUE INDEX crm_etapa_automacao_unica ON public.crm_etapas(company_id,automacao) WHERE automacao IS NOT NULL AND ativa;
UPDATE public.crm_etapas SET automacao=CASE nome WHEN 'Em conversa' THEN 'primeira_resposta' WHEN 'Agendado' THEN 'agendamento_criado' WHEN 'Compareceu' THEN 'atendimento_finalizado' END WHERE nome IN ('Em conversa','Agendado','Compareceu') AND ativa;
ALTER TABLE public.crm_leads ADD COLUMN temperatura_travada_ate timestamptz, ADD COLUMN temperatura_regra text, ADD COLUMN convertido_em timestamptz, ADD COLUMN primeira_resposta_em timestamptz;
ALTER TABLE public.crm_lead_eventos ADD COLUMN etapa_id uuid, ADD COLUMN automacao text, ADD COLUMN regra text;
UPDATE public.crm_leads l SET convertido_em=coalesce((SELECT min(e.criado_em) FROM public.crm_lead_eventos e WHERE e.lead_id=l.id AND tipo='conversao'),l.criado_em) WHERE paciente_id IS NOT NULL;
UPDATE public.crm_lead_eventos ev SET etapa_id=e.id, automacao=e.automacao FROM public.crm_etapas e WHERE e.company_id=ev.company_id AND e.nome=ev.para AND ev.tipo IN ('criado','etapa') AND (SELECT count(*) FROM public.crm_etapas x WHERE x.company_id=ev.company_id AND x.nome=ev.para)=1;
CREATE TABLE public.crm_alertas_dia (
 company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
 tipo text NOT NULL CHECK(tipo IN ('quente','retorno')),
 dia date NOT NULL,
 usuario_id uuid NOT NULL,
 PRIMARY KEY(lead_id,tipo,dia,usuario_id)
);
GRANT ALL ON public.crm_alertas_dia TO service_role;
ALTER TABLE public.crm_alertas_dia ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.crm_config_padrao_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.crm_habilitado THEN INSERT INTO crm_config(company_id) VALUES(NEW.id) ON CONFLICT DO NOTHING; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_config_empresa AFTER INSERT OR UPDATE OF crm_habilitado ON public.companies FOR EACH ROW EXECUTE FUNCTION public.crm_config_padrao_trg();
CREATE OR REPLACE FUNCTION public.crm_etapa_padrao_trg() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.automacao:=coalesce(NEW.automacao,CASE NEW.nome WHEN 'Em conversa' THEN 'primeira_resposta' WHEN 'Agendado' THEN 'agendamento_criado' WHEN 'Compareceu' THEN 'atendimento_finalizado' END);
 RETURN NEW;
END $$;
CREATE TRIGGER crm_etapa_padrao BEFORE INSERT ON public.crm_etapas FOR EACH ROW EXECUTE FUNCTION public.crm_etapa_padrao_trg();
CREATE OR REPLACE FUNCTION public.crm_config_salvar(p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c uuid:=crm__gestor(); palavras text[];
BEGIN
 IF jsonb_typeof(p)<>'object' OR jsonb_typeof(p->'palavras_quentes')<>'array' THEN RAISE EXCEPTION 'Configuração inválida'; END IF;
 SELECT coalesce(array_agg(DISTINCT trim(w)),'{}'::text[]) INTO palavras FROM jsonb_array_elements_text(p->'palavras_quentes') w WHERE trim(w)<>'';
 IF cardinality(palavras)>100 OR EXISTS(SELECT 1 FROM unnest(palavras) w WHERE char_length(w)>80) THEN RAISE EXCEPTION 'Use até 100 expressões de até 80 caracteres'; END IF;
 UPDATE crm_config SET temperatura_modo=p->>'temperatura_modo',travar_manual_dias=(p->>'travar_manual_dias')::int,frio_apos_dias=(p->>'frio_apos_dias')::int,palavras_quentes=palavras,evolucao_automatica=(p->>'evolucao_automatica')::boolean,alerta_lead_quente=(p->>'alerta_lead_quente')::boolean,alterado_em=now() WHERE company_id=c;
 PERFORM crm__sinal(c);
END $$;
CREATE OR REPLACE FUNCTION public.crm_etapa_12b_salvar(p_id uuid,p_nome text,p_cor text,p_tipo text,p_inicial boolean,p_automacao text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c uuid:=crm__gestor(); v uuid;
BEGIN
 IF p_automacao IS NOT NULL AND p_automacao NOT IN ('primeira_resposta','agendamento_criado','atendimento_finalizado') THEN RAISE EXCEPTION 'Automação inválida'; END IF;
 IF p_tipo='perdido' AND p_automacao IS NOT NULL THEN RAISE EXCEPTION 'Etapas de perda não podem receber evolução automática'; END IF;
 v:=crm_etapa_salvar(p_id,p_nome,p_cor,p_tipo,p_inicial);
 UPDATE crm_etapas SET automacao=p_automacao WHERE id=v AND company_id=c;
 RETURN v;
END $$;
CREATE OR REPLACE FUNCTION public.crm_normalizar(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT regexp_replace(translate(lower(coalesce(t,'')),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]+',' ','g')
$$;
CREATE OR REPLACE FUNCTION public.crm_palavra_quente(t text,palavras text[]) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT w FROM unnest(palavras) w WHERE trim(public.crm_normalizar(w))<>'' AND strpos(' '||trim(public.crm_normalizar(t))||' ',' '||trim(public.crm_normalizar(w))||' ')>0 ORDER BY char_length(w) DESC,w LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.crm_usuario_tem(u uuid,c uuid,p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND company_id=c AND coalesce(is_active,true)) AND (is_company_manager(u) OR EXISTS(SELECT 1 FROM sector_users su JOIN company_sectors cs ON cs.id=su.sector_id AND coalesce(cs.is_active,true) JOIN access_profiles ap ON ap.id=ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active,true) WHERE su.user_id=u AND ap.company_id=c AND coalesce(ap.permissions->'crm','[]'::jsonb)?p))
$$;
CREATE OR REPLACE FUNCTION public.crm_notificar(l public.crm_leads,p_tipo text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u uuid; n int:=0; k int; titulo text; etapa text;
BEGIN
 SELECT nome INTO etapa FROM crm_etapas WHERE id=l.etapa_id;
 titulo:=CASE WHEN p_tipo='quente' THEN 'Lead quente: '||l.nome ELSE 'Retornar para '||l.nome||' ('||coalesce(etapa,'')||')' END;
 FOR u IN SELECT id FROM profiles WHERE company_id=l.company_id AND coalesce(is_active,true) AND (id=l.responsavel_id OR (p_tipo='retorno' AND l.responsavel_id IS NULL AND crm_usuario_tem(id,l.company_id,'crm.gerenciar'))) LOOP
  IF NOT (crm_usuario_tem(u,l.company_id,'crm.visualizar') OR crm_usuario_tem(u,l.company_id,'crm.operar') OR crm_usuario_tem(u,l.company_id,'crm.gerenciar')) THEN CONTINUE; END IF;
  INSERT INTO crm_alertas_dia VALUES(l.company_id,l.id,p_tipo,(now() AT TIME ZONE 'America/Fortaleza')::date,u) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS k=ROW_COUNT;
  IF k=1 THEN INSERT INTO user_notifications(company_id,user_id,category,priority,title,message,action_route) VALUES(l.company_id,u,'system',CASE WHEN p_tipo='quente' THEN 'high' ELSE 'medium' END,titulo,titulo,'/app/crm?lead='||l.id); n:=n+1; END IF;
 END LOOP;
 RETURN n;
END $$;
CREATE OR REPLACE FUNCTION public.crm_temperatura_aplicar(p_lead uuid,p_temp text,p_regra text,p_forcar boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads; c crm_config;
BEGIN
 SELECT * INTO l FROM crm_leads WHERE id=p_lead FOR UPDATE;
 SELECT * INTO c FROM crm_config WHERE company_id=l.company_id;
 IF l.id IS NULL OR NOT crm_ativo(l.company_id) OR c.temperatura_modo IS DISTINCT FROM 'automatico' OR l.fechado_em IS NOT NULL OR (NOT p_forcar AND l.temperatura_travada_ate>now()) OR l.temperatura=p_temp THEN RETURN; END IF;
 UPDATE crm_leads SET temperatura=p_temp,temperatura_origem='automatica',temperatura_regra=p_regra,atualizado_em=now() WHERE id=l.id;
 INSERT INTO crm_lead_eventos(company_id,lead_id,tipo,de,para,texto,origem,regra) VALUES(l.company_id,l.id,'temperatura',l.temperatura,p_temp,p_regra,'sistema',p_regra);
 IF p_temp='quente' AND c.alerta_lead_quente THEN SELECT * INTO l FROM crm_leads WHERE id=p_lead; PERFORM crm_notificar(l,'quente'); END IF;
 PERFORM crm__sinal(l.company_id);
END $$;
CREATE OR REPLACE FUNCTION public.crm_lead_12b_antes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c crm_config; e crm_etapas; temp text; regra text;
BEGIN
 SELECT * INTO c FROM crm_config WHERE company_id=NEW.company_id;
 IF TG_OP='INSERT' THEN IF NEW.paciente_id IS NOT NULL THEN NEW.convertido_em:=now(); END IF; RETURN NEW; END IF;
 IF NEW.paciente_id IS DISTINCT FROM OLD.paciente_id THEN NEW.convertido_em:=CASE WHEN NEW.paciente_id IS NOT NULL THEN now() ELSE NULL END; END IF;
 IF NEW.temperatura IS DISTINCT FROM OLD.temperatura AND NEW.temperatura_origem='manual' THEN NEW.temperatura_travada_ate:=now()+make_interval(days=>coalesce(c.travar_manual_dias,7)); NEW.temperatura_regra:=NULL; END IF;
 IF NEW.etapa_id IS DISTINCT FROM OLD.etapa_id AND OLD.fechado_em IS NULL AND c.temperatura_modo='automatico' AND crm_ativo(NEW.company_id) THEN
  SELECT * INTO e FROM crm_etapas WHERE id=NEW.etapa_id;
  temp:=CASE WHEN e.tipo='perdido' THEN 'frio' WHEN e.tipo='ganho' OR e.automacao='agendamento_criado' THEN 'quente' END;
  regra:=CASE WHEN e.tipo='perdido' THEN 'etapa perdido' WHEN e.tipo='ganho' THEN 'etapa ganho' ELSE 'etapa agendamento' END;
  IF temp IS NOT NULL AND (e.tipo='perdido' OR NOT coalesce(NEW.temperatura_travada_ate>now(),false)) AND NEW.temperatura IS DISTINCT FROM temp THEN
   INSERT INTO crm_lead_eventos(company_id,lead_id,tipo,de,para,texto,origem,regra) VALUES(NEW.company_id,NEW.id,'temperatura',NEW.temperatura,temp,regra,'sistema',regra);
   NEW.temperatura:=temp; NEW.temperatura_origem:='automatica'; NEW.temperatura_regra:=regra;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_lead_12b_antes BEFORE INSERT OR UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.crm_lead_12b_antes();
CREATE OR REPLACE FUNCTION public.crm_lead_12b_depois() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.temperatura='quente' AND OLD.temperatura IS DISTINCT FROM NEW.temperatura AND NEW.temperatura_origem='automatica' AND EXISTS(SELECT 1 FROM crm_config WHERE company_id=NEW.company_id AND alerta_lead_quente) THEN PERFORM crm_notificar(NEW,'quente'); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_lead_12b_depois AFTER UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.crm_lead_12b_depois();
CREATE OR REPLACE FUNCTION public.crm_evento_etapa_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE e crm_etapas;
BEGIN
 IF NEW.tipo IN ('criado','etapa') AND NEW.etapa_id IS NULL THEN SELECT s.* INTO e FROM crm_leads l JOIN crm_etapas s ON s.id=l.etapa_id WHERE l.id=NEW.lead_id; NEW.etapa_id:=e.id; NEW.automacao:=e.automacao; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER crm_evento_etapa BEFORE INSERT ON public.crm_lead_eventos FOR EACH ROW EXECUTE FUNCTION public.crm_evento_etapa_trg();
CREATE OR REPLACE FUNCTION public.crm_evoluir(p_lead uuid,p_evento text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads; de crm_etapas; destino crm_etapas;
BEGIN
 SELECT * INTO l FROM crm_leads WHERE id=p_lead FOR UPDATE;
 IF l.id IS NULL OR l.fechado_em IS NOT NULL OR NOT crm_ativo(l.company_id) OR NOT EXISTS(SELECT 1 FROM crm_config WHERE company_id=l.company_id AND evolucao_automatica) THEN RETURN; END IF;
 IF p_evento='primeira_resposta' THEN IF l.primeira_resposta_em IS NOT NULL THEN RETURN; END IF; UPDATE crm_leads SET primeira_resposta_em=now() WHERE id=l.id; END IF;
 SELECT * INTO de FROM crm_etapas WHERE id=l.etapa_id;
 SELECT * INTO destino FROM crm_etapas WHERE company_id=l.company_id AND ativa AND automacao=p_evento;
 IF destino.id IS NULL OR destino.ordem<=de.ordem OR destino.tipo='perdido' THEN RETURN; END IF;
 UPDATE crm_leads SET etapa_id=destino.id,etapa_atualizada_em=now(),atualizado_em=now(),fechado_em=CASE WHEN destino.tipo='ganho' THEN now() END WHERE id=l.id;
 INSERT INTO crm_lead_eventos(company_id,lead_id,tipo,de,para,texto,origem,etapa_id,automacao,regra) VALUES(l.company_id,l.id,'etapa',de.nome,destino.nome,CASE p_evento WHEN 'primeira_resposta' THEN 'atendente respondeu' WHEN 'agendamento_criado' THEN 'agendamento criado' ELSE 'atendimento finalizado' END,'sistema',destino.id,p_evento,p_evento);
 PERFORM crm__sinal(l.company_id);
END $$;
CREATE OR REPLACE FUNCTION public.crm_mensagem_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads; c crm_config; palavra text;
BEGIN
 IF TG_OP='UPDATE' AND (OLD.direcao,OLD.origem,OLD.status) IS NOT DISTINCT FROM (NEW.direcao,NEW.origem,NEW.status) THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.status IN ('enviada','entregue','lida','recebida') THEN RETURN NEW; END IF;
 SELECT lead.* INTO l FROM crm_leads lead JOIN whatsapp_conversas cv ON cv.contato_id=lead.contato_id AND cv.company_id=lead.company_id WHERE cv.id=NEW.conversa_id AND lead.company_id=NEW.company_id AND lead.fechado_em IS NULL;
 IF l.id IS NULL OR NOT crm_ativo(l.company_id) OR NEW.criado_em<l.criado_em THEN RETURN NEW; END IF;
 SELECT * INTO c FROM crm_config WHERE company_id=l.company_id;
 IF NEW.direcao='entrada' AND NEW.origem='paciente' AND c.temperatura_modo='automatico' AND NEW.criado_em>=c.alterado_em THEN
  palavra:=crm_palavra_quente(NEW.texto,c.palavras_quentes);
  IF palavra IS NOT NULL THEN PERFORM crm_temperatura_aplicar(l.id,'quente','palavra-chave: '||palavra);
  ELSIF l.temperatura='frio' THEN PERFORM crm_temperatura_aplicar(l.id,'morno','retomada'); END IF;
 ELSIF NEW.direcao='saida' AND NEW.origem='usuario' AND NEW.status IN ('enviada','entregue','lida') THEN PERFORM crm_evoluir(l.id,'primeira_resposta'); END IF;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'CRM message hook failed: %', SQLSTATE; RETURN NEW;
END $$;
CREATE TRIGGER crm_mensagem AFTER INSERT OR UPDATE OF status,origem ON public.whatsapp_mensagens FOR EACH ROW EXECUTE FUNCTION public.crm_mensagem_trg();
CREATE OR REPLACE FUNCTION public.crm_agendamento_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads; paciente patients; evento text; n int;
BEGIN
 IF NOT crm_ativo(NEW.company_id) OR NOT EXISTS(SELECT 1 FROM crm_config WHERE company_id=NEW.company_id AND evolucao_automatica) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN evento:='agendamento_criado'; ELSE IF NEW.sched_status IS DISTINCT FROM 'completed' OR OLD.sched_status IS NOT DISTINCT FROM 'completed' THEN RETURN NEW; END IF; evento:='atendimento_finalizado'; END IF;
 SELECT * INTO paciente FROM patients WHERE id=NEW.patient_id AND company_id=NEW.company_id;
 IF paciente.id IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  FOR l IN SELECT lead.* FROM crm_leads lead JOIN whatsapp_contatos ct ON ct.id=lead.contato_id WHERE lead.company_id=NEW.company_id AND lead.fechado_em IS NULL AND lead.paciente_id IS NULL AND ct.company_id=NEW.company_id AND ct.telefone IN (whatsapp_tel_canonico(paciente.phone),whatsapp_tel_canonico(paciente.phone2),whatsapp_tel_canonico(paciente.phone3)) FOR UPDATE OF lead LOOP
   SELECT count(*) INTO n FROM patients p JOIN whatsapp_contatos ct ON ct.id=l.contato_id WHERE p.company_id=NEW.company_id AND ct.telefone IN (whatsapp_tel_canonico(p.phone),whatsapp_tel_canonico(p.phone2),whatsapp_tel_canonico(p.phone3));
   IF n<>1 THEN CONTINUE; END IF;
   UPDATE crm_leads SET paciente_id=paciente.id,atualizado_em=now() WHERE id=l.id;
   INSERT INTO crm_lead_eventos(company_id,lead_id,tipo,origem,texto) VALUES(l.company_id,l.id,'conversao','sistema','Vínculo pelo agendamento');
  END LOOP;
 END IF;
 FOR l IN SELECT * FROM crm_leads WHERE company_id=NEW.company_id AND paciente_id=paciente.id AND fechado_em IS NULL LOOP PERFORM crm_evoluir(l.id,evento); END LOOP;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'CRM appointment hook failed: %', SQLSTATE; RETURN NEW;
END $$;
CREATE TRIGGER crm_agendamento AFTER INSERT OR UPDATE OF sched_status ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.crm_agendamento_trg();
CREATE OR REPLACE FUNCTION public.crm_voltar_automatico(p_lead uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads;
BEGIN
 l:=crm__lead_editavel(p_lead);
 UPDATE crm_leads SET temperatura_travada_ate=NULL,atualizado_em=now() WHERE id=l.id;
 PERFORM crm__evento(l.company_id,l.id,'edicao',NULL,NULL,'Trava manual removida'); PERFORM crm__sinal(l.company_id);
END $$;
CREATE OR REPLACE FUNCTION public.crm_retorno(p_lead uuid,p_dias integer DEFAULT NULL,p_data timestamptz DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads; d timestamptz;
BEGIN
 l:=crm__lead_editavel(p_lead);
 IF l.fechado_em IS NOT NULL THEN RAISE EXCEPTION 'Lead fechado'; END IF;
 IF p_dias IS NOT NULL AND p_dias NOT IN (1,3,7) THEN RAISE EXCEPTION 'Adiamento inválido'; END IF;
 IF p_dias IS NOT NULL AND p_data IS NOT NULL THEN RAISE EXCEPTION 'Escolha dias ou data'; END IF;
 d:=CASE WHEN p_dias IS NOT NULL THEN ((greatest(coalesce(l.proximo_contato_em,now()),now()) AT TIME ZONE 'America/Fortaleza')+make_interval(days=>p_dias)) AT TIME ZONE 'America/Fortaleza' ELSE p_data END;
 PERFORM crm_lead_editar(p_lead,jsonb_build_object('proximo_contato_em',d));
END $$;
CREATE OR REPLACE FUNCTION public.crm_silencio_rodar() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads; n int:=0;
BEGIN
 FOR l IN SELECT lead.* FROM crm_leads lead JOIN crm_config c ON c.company_id=lead.company_id WHERE lead.fechado_em IS NULL AND c.temperatura_modo='automatico' AND lead.temperatura<>'frio' AND NOT coalesce(lead.temperatura_travada_ate>now(),false) AND crm_ativo(lead.company_id) AND coalesce((SELECT max(m.criado_em) FROM whatsapp_mensagens m JOIN whatsapp_conversas cv ON cv.id=m.conversa_id WHERE cv.company_id=lead.company_id AND cv.contato_id=lead.contato_id AND m.direcao='entrada' AND m.origem='paciente'),lead.criado_em)<now()-make_interval(days=>c.frio_apos_dias) LOOP
  PERFORM crm_temperatura_aplicar(l.id,'frio','silêncio'); n:=n+1;
 END LOOP;
 RETURN n;
END $$;
CREATE OR REPLACE FUNCTION public.crm_retornos_rodar() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l crm_leads; n int:=0;
BEGIN
 FOR l IN SELECT * FROM crm_leads WHERE fechado_em IS NULL AND proximo_contato_em<(((now() AT TIME ZONE 'America/Fortaleza')::date+1)::timestamp AT TIME ZONE 'America/Fortaleza') AND crm_ativo(company_id) LOOP n:=n+crm_notificar(l,'retorno'); END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.crm_config_padrao_trg(),public.crm_etapa_padrao_trg(),public.crm_usuario_tem(uuid,uuid,text),public.crm_notificar(public.crm_leads,text),public.crm_temperatura_aplicar(uuid,text,text,boolean),public.crm_lead_12b_antes(),public.crm_lead_12b_depois(),public.crm_evento_etapa_trg(),public.crm_evoluir(uuid,text),public.crm_mensagem_trg(),public.crm_agendamento_trg(),public.crm_silencio_rodar(),public.crm_retornos_rodar() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_silencio_rodar(),public.crm_retornos_rodar() TO service_role;
REVOKE ALL ON FUNCTION public.crm_config_salvar(jsonb),public.crm_etapa_12b_salvar(uuid,text,text,text,boolean,text),public.crm_voltar_automatico(uuid),public.crm_retorno(uuid,integer,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_config_salvar(jsonb),public.crm_etapa_12b_salvar(uuid,text,text,text,boolean,text),public.crm_voltar_automatico(uuid),public.crm_retorno(uuid,integer,timestamptz) TO authenticated;
CREATE POLICY crm_sinais_criador_leitura ON public.crm_sinais FOR SELECT TO authenticated USING(company_id=public.get_user_company_id(auth.uid()) AND coalesce((public.crm_meu_acesso()->>'criar')::boolean,false));
SELECT cron.schedule('crm-silencio-diario','0 10 * * *','SELECT public.crm_silencio_rodar();');
SELECT cron.schedule('crm-retornos-diario','0 11 * * *','SELECT public.crm_retornos_rodar();');