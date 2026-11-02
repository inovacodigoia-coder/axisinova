ALTER TABLE public.triage_entries ADD COLUMN location_sector_key text;
UPDATE public.triage_entries SET location_sector_key=location_sector_id::text WHERE location_sector_id IS NOT NULL;
COMMENT ON COLUMN public.triage_entries.location_sector_id IS 'DEPRECATED: replaced by location_sector_key; sector identifiers are text.';
CREATE OR REPLACE FUNCTION public.hospital_identificacao_contexto(_context text,_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cid uuid:=get_user_company_id(auth.uid()); ep uuid; pname text; pid uuid; dob date; sex text; risk text; bedname text; sectorname text; t triage_entries; BEGIN
 IF NOT hospital_identificacao_permitida(_context) THEN RAISE EXCEPTION 'Sem permissão de impressão'; END IF;
 IF _context='triage' THEN SELECT * INTO t FROM triage_entries WHERE id=_id AND company_id=cid; ep:=t.hospital_episode_id;pname:=t.patient_name;pid:=t.patient_id;dob:=t.patient_birth_date;
 ELSIF _context='post' THEN SELECT hospital_episode_id,patient_name,patient_id INTO ep,pname,pid FROM bed_occupancies WHERE id=_id AND company_id=cid;
 ELSE SELECT hospital_episode_id,patient_name,patient_id INTO ep,pname,pid FROM admission_requests WHERE id=_id AND company_id=cid; END IF;
 IF ep IS NULL THEN RAISE EXCEPTION 'Atendimento indisponível'; END IF;
 SELECT * INTO t FROM triage_entries WHERE hospital_episode_id=ep AND company_id=cid ORDER BY created_at LIMIT 1; risk:=t.color;
 IF pid IS NOT NULL THEN SELECT name,birth_date,gender INTO pname,dob,sex FROM patients WHERE id=pid AND company_id=cid; END IF;
 SELECT b.name,u.name INTO bedname,sectorname FROM inpatient_beds b JOIN inpatient_units u ON u.id=b.unit_id AND u.company_id=b.company_id JOIN admission_requests r ON r.id=b.current_request_id AND r.company_id=b.company_id WHERE r.hospital_episode_id=ep AND b.company_id=cid AND b.status='occupied' LIMIT 1;
 IF bedname IS NULL THEN SELECT b.name,p.name INTO bedname,sectorname FROM bed_occupancies o JOIN beds b ON b.id=o.bed_id AND b.company_id=o.company_id JOIN collection_posts p ON p.id=b.post_id AND p.company_id=b.company_id WHERE o.hospital_episode_id=ep AND o.company_id=cid AND o.status='active' ORDER BY o.allocated_at DESC LIMIT 1; END IF;
 IF bedname IS NULL THEN SELECT name INTO sectorname FROM company_sectors WHERE id=coalesce(t.location_sector_key,t.location_sector_id::text) AND company_id=cid;bedname:=sectorname; END IF;
 RETURN jsonb_build_object('episodeId',ep,'patientId',pid,'patientName',coalesce(pname,t.patient_name),'birthDate',coalesce(dob,t.patient_birth_date),'gender',sex,'risk',risk,'bed',bedname,'sector',sectorname,'locationRequired',bedname IS NULL,'maxCompanions',(SELECT max_acompanhantes FROM companies WHERE id=cid),'canRegister',hospital_identificacao_permitida(_context,'create'),'companions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nome',a.nome,'createdAt',a.created_at) ORDER BY a.created_at) FROM hospital_acompanhantes a WHERE a.company_id=cid AND a.episode_id=ep),'[]'::jsonb),'labelConfig',coalesce((SELECT hospital_label_config FROM lab_settings WHERE company_id=cid LIMIT 1),'{}'::jsonb)); END $$;
REVOKE ALL ON FUNCTION public.hospital_identificacao_contexto(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hospital_identificacao_contexto(text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.hospital_identificacao_local_definir(_id uuid,_sector text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT hospital_identificacao_permitida('triage','create') THEN RAISE EXCEPTION 'Sem permissão para alterar local'; END IF;
 IF NOT EXISTS(SELECT 1 FROM company_sectors WHERE id=_sector AND company_id=get_user_company_id(auth.uid()) AND is_active) THEN RAISE EXCEPTION 'Local inválido'; END IF;
 UPDATE triage_entries SET location_sector_key=_sector WHERE id=_id AND company_id=get_user_company_id(auth.uid());IF NOT FOUND THEN RAISE EXCEPTION 'Atendimento indisponível'; END IF; END $$;
REVOKE ALL ON FUNCTION public.hospital_identificacao_local_definir(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hospital_identificacao_local_definir(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.hospital_identificacao_local(_id uuid,_sector uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.hospital_identificacao_local_definir(_id,_sector::text); END $$;
REVOKE ALL ON FUNCTION public.hospital_identificacao_local(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hospital_identificacao_local(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.hospital_episode_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.hospital_episode_id IS DISTINCT FROM OLD.hospital_episode_id THEN RAISE EXCEPTION 'Identificador do atendimento é imutável'; END IF;
 IF TG_TABLE_NAME='triage_entries' THEN
 IF NEW.location_sector_key IS DISTINCT FROM OLD.location_sector_key OR NEW.location_sector_id IS DISTINCT FROM OLD.location_sector_id THEN
 IF NOT hospital_identificacao_permitida('triage','create') OR NOT EXISTS(SELECT 1 FROM company_sectors WHERE id=coalesce(NEW.location_sector_key,NEW.location_sector_id::text) AND company_id=NEW.company_id AND is_active) THEN RAISE EXCEPTION 'Sem permissão ou local inválido'; END IF;
 END IF; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.hospital_episode_guard() FROM PUBLIC,anon,authenticated;