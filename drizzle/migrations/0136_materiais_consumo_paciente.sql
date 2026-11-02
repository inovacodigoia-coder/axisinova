ALTER TABLE public.almox_itens ADD COLUMN custo_unitario numeric(14,4), ADD COLUMN permite_fracao boolean NOT NULL DEFAULT false;
ALTER TABLE public.bi_consumo_itens ADD COLUMN material_item_id uuid REFERENCES public.almox_itens(id), ADD COLUMN setor_id text REFERENCES public.company_sectors(id), ADD COLUMN estorno_de uuid REFERENCES public.bi_consumo_itens(id), ADD COLUMN idempotencia uuid, ADD COLUMN contexto_tipo text, ADD COLUMN contexto_id uuid;
CREATE UNIQUE INDEX bi_material_idempotencia ON public.bi_consumo_itens(company_id,idempotencia) WHERE idempotencia IS NOT NULL;
CREATE UNIQUE INDEX bi_material_estorno_unico ON public.bi_consumo_itens(estorno_de) WHERE estorno_de IS NOT NULL;
CREATE TABLE public.almox_custo_historico(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,item_id uuid NOT NULL REFERENCES public.almox_itens(id),valor_anterior numeric(14,4),valor_novo numeric(14,4),usuario_id uuid,ocorrido_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.almox_custo_historico TO authenticated;
GRANT ALL ON public.almox_custo_historico TO service_role;
ALTER TABLE public.almox_custo_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY almox_custo_ler ON public.almox_custo_historico FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND almox_permissao('view'));
CREATE TRIGGER almox_custo_imutavel BEFORE UPDATE OR DELETE ON public.almox_custo_historico FOR EACH ROW EXECUTE FUNCTION public.almox_movimento_imutavel();
CREATE OR REPLACE FUNCTION public.materiais_tem_permissao(_acao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND _acao IN ('registrar','estornar') AND public.almox_modulo_liberado() AND (is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users su JOIN company_sectors s ON s.id=su.sector_id AND s.company_id=get_user_company_id(auth.uid()) AND coalesce(s.is_active,true) JOIN access_profiles p ON p.id=ANY(s.allowed_profile_ids::text[]) AND p.company_id=s.company_id AND coalesce(p.is_active,true) WHERE su.user_id=auth.uid() AND su.company_id=s.company_id AND coalesce(p.permissions->'materiais','[]'::jsonb) ? ('materiais.'||_acao)));
$$;
REVOKE EXECUTE ON FUNCTION public.materiais_tem_permissao(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.materiais_tem_permissao(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.almox_custo_auditar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 BEGIN
 IF NEW.custo_unitario IS NOT NULL AND (NEW.custo_unitario<0 OR NEW.custo_unitario::text IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'Custo inválido'; END IF;
 IF TG_OP='INSERT' THEN
 IF NEW.custo_unitario IS NOT NULL THEN INSERT INTO almox_custo_historico(company_id,item_id,valor_novo,usuario_id) VALUES(NEW.company_id,NEW.id,NEW.custo_unitario,auth.uid()); END IF;
 ELSIF NEW.custo_unitario IS DISTINCT FROM OLD.custo_unitario THEN
 INSERT INTO almox_custo_historico(company_id,item_id,valor_anterior,valor_novo,usuario_id) VALUES(NEW.company_id,NEW.id,OLD.custo_unitario,NEW.custo_unitario,auth.uid());
 END IF;
 RETURN NEW;
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.almox_custo_auditar() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER almox_custo_auditar AFTER INSERT OR UPDATE ON public.almox_itens FOR EACH ROW EXECUTE FUNCTION public.almox_custo_auditar();
CREATE OR REPLACE FUNCTION public.almox_material_configurar(_item uuid,_custo numeric,_fracao boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 BEGIN
 IF NOT almox_permissao('edit') THEN RAISE EXCEPTION 'Sem permissão para editar materiais'; END IF;
 IF _fracao IS NULL OR (_custo IS NOT NULL AND (_custo<0 OR _custo::text IN ('NaN','Infinity','-Infinity'))) THEN RAISE EXCEPTION 'Custo ou unidade inválidos'; END IF;
 UPDATE almox_itens SET custo_unitario=_custo,permite_fracao=_fracao WHERE id=_item AND company_id=get_user_company_id(auth.uid()) AND categoria<>'medicamento';
 IF NOT FOUND THEN RAISE EXCEPTION 'Material indisponível'; END IF;
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.almox_material_configurar(uuid,numeric,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.almox_material_configurar(uuid,numeric,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.materiais_contexto_resolver(_tipo text,_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 DECLARE cid uuid:=get_user_company_id(auth.uid()); ep uuid; pid uuid; pedido uuid; nome text; n integer; a appointments;
 BEGIN
 IF auth.uid() IS NULL OR NOT almox_modulo_liberado() OR NOT (materiais_tem_permissao('registrar') OR materiais_tem_permissao('estornar')) THEN RAISE EXCEPTION 'Sem permissão para materiais'; END IF;
 IF _tipo='post' THEN
 SELECT o.hospital_episode_id,o.patient_id,o.patient_name,t.order_id INTO ep,pid,nome,pedido FROM bed_occupancies o JOIN beds b ON b.id=o.bed_id AND b.company_id=o.company_id AND b.current_occupancy_id=o.id AND b.status='occupied' LEFT JOIN triage_entries t ON t.id=o.triage_entry_id AND t.company_id=o.company_id WHERE o.id=_id AND o.company_id=cid AND o.status='active' AND NOT o.away FOR UPDATE OF o,b;
 ELSIF _tipo='admission' THEN
 SELECT r.hospital_episode_id,r.patient_id,r.patient_name INTO ep,pid,nome FROM admission_requests r JOIN inpatient_beds b ON b.current_request_id=r.id AND b.company_id=r.company_id AND b.status='occupied' WHERE r.id=_id AND r.company_id=cid AND r.status='admitted' FOR UPDATE OF r,b;
 SELECT order_id INTO pedido FROM triage_entries WHERE hospital_episode_id=ep AND company_id=cid ORDER BY created_at DESC LIMIT 1;
 ELSIF _tipo='medical' THEN
 SELECT * INTO a FROM appointments WHERE id=_id AND company_id=cid AND sched_status='in_progress' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Atendimento médico não está ativo'; END IF;
 SELECT count(*) INTO n FROM triage_entries WHERE company_id=cid AND patient_id=a.patient_id AND status IN ('in_doctor','in_attendance') AND hospital_episode_id IS NOT NULL;
 IF n<>1 THEN RAISE EXCEPTION 'Atendimento hospitalar ativo não identificado de forma única'; END IF;
 SELECT hospital_episode_id,patient_id,patient_name,order_id INTO ep,pid,nome,pedido FROM triage_entries WHERE company_id=cid AND patient_id=a.patient_id AND status IN ('in_doctor','in_attendance') FOR UPDATE;
 ELSE RAISE EXCEPTION 'Contexto inválido'; END IF;
 IF ep IS NULL OR pid IS NULL THEN RAISE EXCEPTION 'Paciente precisa ter atendimento ativo identificado'; END IF;
 IF EXISTS(SELECT 1 FROM bi_jornada_eventos WHERE company_id=cid AND hospital_episode_id=ep AND tipo_evento IN ('saida_evasao','saida_alta')) THEN RAISE EXCEPTION 'Atendimento encerrado'; END IF;
 RETURN jsonb_build_object('episode_id',ep,'patient_id',pid,'patient_name',nome,'order_id',pedido);
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.materiais_contexto_resolver(text,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.materiais_setor_validar(_setor text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM company_sectors s WHERE s.id=_setor AND s.company_id=get_user_company_id(auth.uid()) AND coalesce(s.is_active,true) AND (is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users u WHERE u.sector_id=s.id AND u.company_id=s.company_id AND u.user_id=auth.uid()))) THEN RAISE EXCEPTION 'Sem acesso ao setor do profissional'; END IF;
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.materiais_setor_validar(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.materiais_painel(_tipo text,_id uuid,_setor text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 DECLARE c jsonb; cid uuid:=get_user_company_id(auth.uid()); setores jsonb; itens jsonb; usos jsonb;
 BEGIN
 c:=materiais_contexto_resolver(_tipo,_id);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'nome',s.name) ORDER BY s.name),'[]') INTO setores FROM company_sectors s WHERE s.company_id=cid AND coalesce(s.is_active,true) AND (is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users u WHERE u.user_id=auth.uid() AND u.company_id=cid AND u.sector_id=s.id));
 IF _setor IS NOT NULL THEN
 PERFORM materiais_setor_validar(_setor);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'nome',i.nome,'unidade',i.unidade,'saldo',b.quantidade,'custo',i.custo_unitario,'fracao',i.permite_fracao) ORDER BY i.nome),'[]') INTO itens FROM almox_itens i JOIN almox_saldos b ON b.item_id=i.id AND b.company_id=i.company_id WHERE i.company_id=cid AND i.ativo AND i.categoria<>'medicamento' AND b.local='setor:'||_setor AND b.setor_id=_setor AND b.quantidade>0;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',u.id,'nome',u.item_nome,'quantidade',u.quantidade,'custo',u.valor_unitario,'setor_id',u.setor_id,'created_at',u.created_at,'observacao',u.detalhes->>'observacao','estornado',EXISTS(SELECT 1 FROM bi_consumo_itens e WHERE e.estorno_de=u.id AND e.company_id=cid)) ORDER BY u.created_at DESC),'[]') INTO usos FROM bi_consumo_itens u WHERE u.company_id=cid AND u.hospital_episode_id=(c->>'episode_id')::uuid AND u.tipo='material' AND u.estorno_de IS NULL AND (is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users su WHERE su.user_id=auth.uid() AND su.company_id=cid AND su.sector_id=u.setor_id));
 RETURN c||jsonb_build_object('setores',setores,'itens',coalesce(itens,'[]'),'usos',usos,'registrar',materiais_tem_permissao('registrar'),'estornar',materiais_tem_permissao('estornar'));
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.materiais_painel(text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.materiais_painel(text,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.materiais_registrar(_tipo text,_id uuid,_setor text,_item uuid,_quantidade numeric,_observacao text,_chave uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 DECLARE cid uuid:=get_user_company_id(auth.uid()); c jsonb; i almox_itens; saldo numeric; rid uuid; antigo bi_consumo_itens;
 BEGIN
 IF NOT materiais_tem_permissao('registrar') THEN RAISE EXCEPTION 'Sem permissão para registrar materiais'; END IF;
 PERFORM materiais_setor_validar(_setor);
 IF _chave IS NULL OR _quantidade IS NULL OR _quantidade<=0 OR _quantidade::text IN ('NaN','Infinity','-Infinity') OR length(coalesce(_observacao,''))>1000 THEN RAISE EXCEPTION 'Quantidade ou observação inválida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(cid::text||_chave::text));
 SELECT * INTO antigo FROM bi_consumo_itens WHERE company_id=cid AND idempotencia=_chave;
 IF FOUND THEN
 IF antigo.contexto_tipo IS DISTINCT FROM _tipo OR antigo.contexto_id IS DISTINCT FROM _id OR antigo.material_item_id IS DISTINCT FROM _item OR antigo.setor_id IS DISTINCT FROM _setor OR antigo.quantidade IS DISTINCT FROM _quantidade OR antigo.estorno_de IS NOT NULL OR antigo.detalhes->>'observacao' IS DISTINCT FROM coalesce(trim(_observacao),'') OR antigo.detalhes->>'responsavel' IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Chave já utilizada em outro registro'; END IF;
 RETURN antigo.id;
 END IF;
 c:=materiais_contexto_resolver(_tipo,_id);
 SELECT * INTO i FROM almox_itens WHERE id=_item AND company_id=cid AND ativo AND categoria<>'medicamento' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Material indisponível'; END IF;
 IF NOT i.permite_fracao AND _quantidade<>trunc(_quantidade) THEN RAISE EXCEPTION 'Este material exige quantidade inteira'; END IF;
 SELECT quantidade INTO saldo FROM almox_saldos WHERE company_id=cid AND item_id=_item AND local='setor:'||_setor AND setor_id=_setor FOR UPDATE;
 IF saldo IS NULL OR saldo<_quantidade THEN RAISE EXCEPTION 'Saldo insuficiente no setor'; END IF;
 UPDATE almox_saldos SET quantidade=quantidade-_quantidade WHERE company_id=cid AND item_id=_item AND local='setor:'||_setor;
 INSERT INTO bi_consumo_itens(company_id,hospital_episode_id,patient_id,attendance_order_id,tipo,item_codigo,item_nome,quantidade,administrado_em,valor_unitario,sem_valor_cadastrado,origem_tabela,origem_id,detalhes,material_item_id,setor_id,idempotencia,contexto_tipo,contexto_id) VALUES(cid,(c->>'episode_id')::uuid,(c->>'patient_id')::uuid,(c->>'order_id')::uuid,'material',i.id::text,i.nome,_quantidade,now(),i.custo_unitario,i.custo_unitario IS NULL,'almox_itens',i.id,jsonb_build_object('unidade',i.unidade,'observacao',coalesce(trim(_observacao),''),'responsavel',auth.uid(),'valor_total',i.custo_unitario*_quantidade),i.id,_setor,_chave,_tipo,_id) RETURNING id INTO rid;
 INSERT INTO almox_movimentos(company_id,item_id,origem,destino,setor_id,quantidade,ator) VALUES(cid,i.id,'setor:'||_setor,'consumo:'||rid::text,_setor,_quantidade,auth.uid());
 INSERT INTO bi_jornada_eventos(company_id,hospital_episode_id,patient_id,attendance_order_id,tipo_evento,fase,setor,usuario_id,origem_tabela,origem_id,detalhes) VALUES(cid,(c->>'episode_id')::uuid,(c->>'patient_id')::uuid,(c->>'order_id')::uuid,'material_usado','consumo',_setor,auth.uid(),'bi_consumo_itens',rid,jsonb_build_object('material',i.nome,'quantidade',_quantidade));
 RETURN rid;
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.materiais_registrar(text,uuid,text,uuid,numeric,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.materiais_registrar(text,uuid,text,uuid,numeric,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.materiais_estornar(_uso uuid,_motivo text,_chave uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 DECLARE cid uuid:=get_user_company_id(auth.uid()); u bi_consumo_itens; rid uuid; antigo bi_consumo_itens;
 BEGIN
 IF NOT materiais_tem_permissao('estornar') THEN RAISE EXCEPTION 'Sem permissão para estornar materiais'; END IF;
 IF _chave IS NULL OR coalesce(trim(_motivo),'')='' OR length(_motivo)>1000 THEN RAISE EXCEPTION 'Informe a justificativa do estorno'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(cid::text||_chave::text));
 SELECT * INTO antigo FROM bi_consumo_itens WHERE company_id=cid AND idempotencia=_chave;
 IF FOUND THEN
 PERFORM materiais_setor_validar(antigo.setor_id);
 IF antigo.estorno_de IS DISTINCT FROM _uso OR antigo.detalhes->>'justificativa' IS DISTINCT FROM trim(_motivo) OR antigo.detalhes->>'responsavel' IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Chave já utilizada em outro registro'; END IF;
 RETURN antigo.id;
 END IF;
 SELECT * INTO u FROM bi_consumo_itens WHERE id=_uso AND company_id=cid AND tipo='material' AND estorno_de IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Uso de material indisponível'; END IF;
 PERFORM materiais_setor_validar(u.setor_id);
 IF EXISTS(SELECT 1 FROM bi_consumo_itens WHERE estorno_de=u.id) THEN RAISE EXCEPTION 'Uso já estornado'; END IF;
 PERFORM 1 FROM almox_itens WHERE id=u.material_item_id AND company_id=cid FOR UPDATE;
 UPDATE almox_saldos SET quantidade=quantidade+u.quantidade WHERE item_id=u.material_item_id AND company_id=cid AND local='setor:'||u.setor_id AND setor_id=u.setor_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Saldo do setor indisponível'; END IF;
 INSERT INTO bi_consumo_itens(company_id,hospital_episode_id,patient_id,attendance_order_id,tipo,item_codigo,item_nome,quantidade,administrado_em,valor_unitario,sem_valor_cadastrado,origem_tabela,origem_id,detalhes,material_item_id,setor_id,estorno_de,idempotencia,contexto_tipo,contexto_id) VALUES(cid,u.hospital_episode_id,u.patient_id,u.attendance_order_id,'material',u.item_codigo,u.item_nome,-u.quantidade,now(),u.valor_unitario,u.sem_valor_cadastrado,'bi_consumo_itens',u.id,jsonb_build_object('unidade',u.detalhes->>'unidade','justificativa',trim(_motivo),'responsavel',auth.uid(),'valor_total',-u.quantidade*u.valor_unitario),u.material_item_id,u.setor_id,u.id,_chave,u.contexto_tipo,u.contexto_id) RETURNING id INTO rid;
 INSERT INTO almox_movimentos(company_id,item_id,origem,destino,setor_id,quantidade,ator) VALUES(cid,u.material_item_id,'estorno:'||rid::text,'setor:'||u.setor_id,u.setor_id,u.quantidade,auth.uid());
 INSERT INTO bi_jornada_eventos(company_id,hospital_episode_id,patient_id,attendance_order_id,tipo_evento,fase,setor,usuario_id,origem_tabela,origem_id,ajuste_de,justificativa,detalhes) VALUES(cid,u.hospital_episode_id,u.patient_id,u.attendance_order_id,'material_estornado','consumo',u.setor_id,auth.uid(),'bi_consumo_itens',rid,(SELECT id FROM bi_jornada_eventos WHERE company_id=cid AND origem_tabela='bi_consumo_itens' AND origem_id=u.id AND tipo_evento='material_usado' LIMIT 1),trim(_motivo),jsonb_build_object('uso',u.id,'quantidade',-u.quantidade));
 RETURN rid;
 END;
$$;
REVOKE EXECUTE ON FUNCTION public.materiais_estornar(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.materiais_estornar(uuid,text,uuid) TO authenticated;