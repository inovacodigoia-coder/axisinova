-- Existing companies keep false; only companies inserted after this change inherit true.
ALTER TABLE public.companies ADD COLUMN crm_evolucao_padrao boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies ALTER COLUMN crm_evolucao_padrao SET DEFAULT true;
ALTER TABLE public.crm_config ALTER COLUMN evolucao_automatica SET DEFAULT true;
CREATE OR REPLACE FUNCTION public.crm_config_padrao_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.crm_habilitado THEN
  INSERT INTO public.crm_config(company_id,evolucao_automatica) VALUES(NEW.id,NEW.crm_evolucao_padrao) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.crm_config_padrao_trg() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_config_padrao_trg() TO service_role;

-- Local deletion, token cascade and masked audit are one transaction, invoked only after remote success.
CREATE OR REPLACE FUNCTION public.whatsapp_remover_instancia_local(p_id uuid,p_usuario uuid,p_apelido text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.whatsapp_instancias; u public.profiles;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Apenas o servidor'; END IF;
 SELECT * INTO i FROM public.whatsapp_instancias WHERE id=p_id FOR UPDATE;
 IF i.id IS NULL THEN RAISE EXCEPTION 'Número não encontrado'; END IF;
 SELECT * INTO u FROM public.profiles WHERE id=p_usuario;
 IF u.id IS NULL OR (u.role IS DISTINCT FROM 'super_admin' AND u.company_id IS DISTINCT FROM i.company_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF p_apelido IS DISTINCT FROM i.apelido THEN RAISE EXCEPTION 'Apelido divergente'; END IF;
 INSERT INTO public.whatsapp_auditoria(company_id,acao,antes,depois,usuario_id,criado_em)
 VALUES(i.company_id,'remover_numero',jsonb_build_object('instancia_id',i.id,'apelido',i.apelido,'ultimos_4_digitos',right(regexp_replace(coalesce(i.numero_conectado,''),'[^0-9]','','g'),4)),NULL,p_usuario,now());
 DELETE FROM public.whatsapp_instancias WHERE id=i.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.whatsapp_remover_instancia_local(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_remover_instancia_local(uuid,uuid,text) TO service_role;

-- Preserve notification recipients, timing and unlinked copy; enrich only linked InovaChat notifications.
CREATE OR REPLACE FUNCTION public.inovachat_notificacao_nome_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; paciente_nome text; perfil_nome text;
BEGIN
 IF NEW.action_route IS NULL OR NEW.action_route !~ '^/app/inovachat\?c=[0-9a-fA-F-]{36}$' THEN RETURN NEW; END IF;
 IF auth.jwt() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' AND NEW.company_id IS DISTINCT FROM public.get_user_company_id(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 cid:=substring(NEW.action_route from 'c=([0-9a-fA-F-]{36})$')::uuid;
 SELECT nullif(trim(p.name),''),ct.nome_exibicao INTO paciente_nome,perfil_nome
 FROM public.whatsapp_conversas c
 JOIN public.whatsapp_contatos ct ON ct.id=c.contato_id AND ct.company_id=c.company_id
 JOIN public.patients p ON p.id=ct.paciente_id AND p.company_id=c.company_id
 WHERE c.id=cid AND c.company_id=NEW.company_id;
 IF paciente_nome IS NOT NULL THEN
  NEW.message:=NEW.title || '. ' || coalesce(NEW.message,'') || CASE WHEN nullif(trim(perfil_nome),'') IS NOT NULL THEN E'\nno WhatsApp: ' || perfil_nome ELSE '' END;
  NEW.title:=paciente_nome;
 END IF;
 RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.inovachat_notificacao_nome_trg() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.inovachat_notificacao_nome_trg() TO service_role;
CREATE TRIGGER inovachat_notificacao_nome BEFORE INSERT ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.inovachat_notificacao_nome_trg();