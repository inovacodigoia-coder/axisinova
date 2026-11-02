CREATE OR REPLACE FUNCTION public.hospital_config_permitida() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND (is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users su JOIN company_sectors cs ON cs.id=su.sector_id AND cs.company_id=get_user_company_id(auth.uid()) AND cs.is_active JOIN access_profiles ap ON ap.id=ANY(cs.allowed_profile_ids::text[]) AND ap.company_id=cs.company_id AND ap.is_active WHERE su.user_id=auth.uid() AND (coalesce(ap.permissions->'settings','[]'::jsonb) ? 'edit' OR coalesce(ap.permissions->'lab_registers','[]'::jsonb) ? 'edit'))); $$;
REVOKE ALL ON FUNCTION public.hospital_config_permitida() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hospital_config_permitida() TO authenticated;
CREATE OR REPLACE FUNCTION public.hospital_etiquetas_configurar(_config jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE k text; c jsonb; cid uuid:=get_user_company_id(auth.uid()); BEGIN
 IF NOT hospital_config_permitida() THEN RAISE EXCEPTION 'Sem permissão de Configurações do Laboratório'; END IF;
 IF jsonb_typeof(_config) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Configuração inválida'; END IF;
 FOR k,c IN SELECT * FROM jsonb_each(_config) LOOP
 IF k NOT IN ('etiqueta_paciente','etiqueta_acompanhante') OR jsonb_typeof(c)<>'object' THEN RAISE EXCEPTION 'Tipo de etiqueta inválido'; END IF;
 IF NOT c ?& ARRAY['widthMm','heightMm','marginMm','nomeSizePt','textoSizePt','nomeBold','textoBold','barcode'] THEN RAISE EXCEPTION 'Configuração incompleta'; END IF;
 IF (c->>'widthMm')::numeric NOT BETWEEN 20 AND 200 OR (c->>'heightMm')::numeric NOT BETWEEN 15 AND 200 OR (c->>'marginMm')::numeric NOT BETWEEN 0 AND 10 OR (c->>'nomeSizePt')::numeric NOT BETWEEN 5 AND 24 OR (c->>'textoSizePt')::numeric NOT BETWEEN 5 AND 24 OR (c->>'marginMm')::numeric*2 >= least((c->>'widthMm')::numeric,(c->>'heightMm')::numeric) OR jsonb_typeof(c->'nomeBold')<>'boolean' OR jsonb_typeof(c->'textoBold')<>'boolean' OR jsonb_typeof(c->'barcode')<>'boolean' THEN RAISE EXCEPTION 'Tamanho, margem ou fonte inválidos'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(c) e WHERE e.value='null'::jsonb) THEN RAISE EXCEPTION 'Valores nulos não permitidos'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM lab_settings WHERE company_id=cid) THEN UPDATE lab_settings SET hospital_label_config=_config WHERE company_id=cid; ELSE INSERT INTO lab_settings(company_id,hospital_label_config) VALUES(cid,_config); END IF; END $$;
REVOKE ALL ON FUNCTION public.hospital_etiquetas_configurar(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hospital_etiquetas_configurar(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.hospital_episode_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.hospital_episode_id IS DISTINCT FROM OLD.hospital_episode_id THEN RAISE EXCEPTION 'Identificador do atendimento é imutável'; END IF;
 IF TG_TABLE_NAME='triage_entries' THEN IF NEW.location_sector_id IS DISTINCT FROM OLD.location_sector_id AND (NOT hospital_identificacao_permitida('triage','create') OR NOT EXISTS(SELECT 1 FROM company_sectors WHERE id=NEW.location_sector_id AND company_id=NEW.company_id AND is_active)) THEN RAISE EXCEPTION 'Sem permissão ou local inválido'; END IF; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.hospital_episode_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER hospital_episode_triage_guard BEFORE UPDATE ON public.triage_entries FOR EACH ROW EXECUTE FUNCTION public.hospital_episode_guard();
CREATE TRIGGER hospital_episode_post_guard BEFORE UPDATE ON public.bed_occupancies FOR EACH ROW EXECUTE FUNCTION public.hospital_episode_guard();
CREATE TRIGGER hospital_episode_admission_guard BEFORE UPDATE ON public.admission_requests FOR EACH ROW EXECUTE FUNCTION public.hospital_episode_guard();
CREATE OR REPLACE FUNCTION public.hospital_labels_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF (TG_OP='INSERT' AND NEW.hospital_label_config<>'{}'::jsonb) OR (TG_OP='UPDATE' AND NEW.hospital_label_config IS DISTINCT FROM OLD.hospital_label_config) THEN IF NOT hospital_config_permitida() AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Sem permissão de Configurações do Laboratório'; END IF; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.hospital_labels_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER hospital_labels_guard BEFORE INSERT OR UPDATE ON public.lab_settings FOR EACH ROW EXECUTE FUNCTION public.hospital_labels_guard();