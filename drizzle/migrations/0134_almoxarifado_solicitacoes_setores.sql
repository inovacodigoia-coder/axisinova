CREATE OR REPLACE FUNCTION public.almox_permissao(_acao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_company_manager(auth.uid()) OR EXISTS (
 SELECT 1 FROM sector_users su JOIN company_sectors s ON s.id=su.sector_id AND s.company_id=public.get_user_company_id(auth.uid()) AND coalesce(s.is_active,true)
 JOIN access_profiles p ON p.id=ANY(s.allowed_profile_ids::text[]) AND p.company_id=s.company_id AND coalesce(p.is_active,true)
 WHERE su.user_id=auth.uid() AND coalesce(p.permissions->'inventory','[]'::jsonb) ? _acao));
$$;
CREATE OR REPLACE FUNCTION public.almox_setor_acesso(_setor text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM company_sectors s WHERE s.id=_setor AND s.company_id=public.get_user_company_id(auth.uid()) AND coalesce(s.is_active,true) AND (public.is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users u WHERE u.sector_id=s.id AND u.user_id=auth.uid() AND u.company_id=s.company_id)));
$$;
REVOKE EXECUTE ON FUNCTION public.almox_permissao(text),public.almox_setor_acesso(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.almox_permissao(text),public.almox_setor_acesso(text) TO authenticated;
CREATE TABLE public.almox_itens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,nome text NOT NULL,categoria text NOT NULL,unidade text NOT NULL DEFAULT 'unidade',ativo boolean NOT NULL DEFAULT true,medicamento_id uuid REFERENCES public.farmacia_medicamentos(id),dados_medicamento jsonb NOT NULL DEFAULT '{}',created_by uuid,created_at timestamptz NOT NULL DEFAULT now(),CONSTRAINT almox_categoria CHECK(categoria IN ('material','equipamento','acessorio','medicamento')));
GRANT SELECT ON public.almox_itens TO authenticated; GRANT ALL ON public.almox_itens TO service_role;
ALTER TABLE public.almox_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY almox_itens_ler ON public.almox_itens FOR SELECT TO authenticated USING(company_id=public.get_user_company_id(auth.uid()));
CREATE TABLE public.almox_saldos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,item_id uuid NOT NULL REFERENCES public.almox_itens(id),local text NOT NULL,setor_id text REFERENCES public.company_sectors(id),quantidade numeric NOT NULL DEFAULT 0,UNIQUE(company_id,item_id,local),CONSTRAINT almox_saldo_positivo CHECK(quantidade>=0));
GRANT SELECT ON public.almox_saldos TO authenticated; GRANT ALL ON public.almox_saldos TO service_role;
ALTER TABLE public.almox_saldos ENABLE ROW LEVEL SECURITY;
CREATE POLICY almox_saldos_ler ON public.almox_saldos FOR SELECT TO authenticated USING(company_id=public.get_user_company_id(auth.uid()) AND (local='almoxarifado' OR public.almox_setor_acesso(setor_id) OR public.almox_permissao('view')));
CREATE TABLE public.almox_solicitacoes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,setor_id text NOT NULL REFERENCES public.company_sectors(id),destino text NOT NULL DEFAULT 'setor',status text NOT NULL DEFAULT 'pendente',observacao text,solicitado_por uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),decidido_por uuid,decidido_em timestamptz,motivo text,CONSTRAINT almox_destino CHECK(destino IN ('setor','farmacia')),CONSTRAINT almox_status CHECK(status IN ('pendente','aprovada','recusada')));
GRANT SELECT ON public.almox_solicitacoes TO authenticated; GRANT ALL ON public.almox_solicitacoes TO service_role;
ALTER TABLE public.almox_solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY almox_solicitacoes_ler ON public.almox_solicitacoes FOR SELECT TO authenticated USING(company_id=public.get_user_company_id(auth.uid()) AND (public.almox_setor_acesso(setor_id) OR public.almox_permissao('view') OR public.almox_permissao('approve')));
CREATE TABLE public.almox_solicitacao_itens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,solicitacao_id uuid NOT NULL REFERENCES public.almox_solicitacoes(id),item_id uuid NOT NULL REFERENCES public.almox_itens(id),quantidade numeric NOT NULL,UNIQUE(solicitacao_id,item_id),CONSTRAINT almox_quantidade CHECK(quantidade>0));
GRANT SELECT ON public.almox_solicitacao_itens TO authenticated; GRANT ALL ON public.almox_solicitacao_itens TO service_role;
ALTER TABLE public.almox_solicitacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY almox_linhas_ler ON public.almox_solicitacao_itens FOR SELECT TO authenticated USING(company_id=public.get_user_company_id(auth.uid()) AND EXISTS(SELECT 1 FROM public.almox_solicitacoes s WHERE s.id=solicitacao_id));
CREATE TABLE public.almox_movimentos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,item_id uuid NOT NULL REFERENCES public.almox_itens(id),solicitacao_id uuid REFERENCES public.almox_solicitacoes(id),origem text NOT NULL,destino text NOT NULL,setor_id text REFERENCES public.company_sectors(id),quantidade numeric NOT NULL,ator uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(solicitacao_id,item_id),CONSTRAINT almox_mov_q CHECK(quantidade>0));
GRANT SELECT ON public.almox_movimentos TO authenticated; GRANT ALL ON public.almox_movimentos TO service_role;
ALTER TABLE public.almox_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY almox_movimentos_ler ON public.almox_movimentos FOR SELECT TO authenticated USING(company_id=public.get_user_company_id(auth.uid()) AND (public.almox_setor_acesso(setor_id) OR public.almox_permissao('view')));
CREATE OR REPLACE FUNCTION public.almox_movimento_imutavel() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Histórico de movimentação imutável'; END $$;
REVOKE EXECUTE ON FUNCTION public.almox_movimento_imutavel() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER almox_movimento_imutavel BEFORE UPDATE OR DELETE ON public.almox_movimentos FOR EACH ROW EXECUTE FUNCTION public.almox_movimento_imutavel();
CREATE OR REPLACE FUNCTION public.almox_contexto() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('aprovar',public.almox_permissao('approve'),'cadastrar',public.almox_permissao('create'),'entrada',public.almox_permissao('edit'),'ver_todos',public.almox_permissao('view'),'setores',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'nome',s.name) ORDER BY s.name) FROM company_sectors s WHERE public.almox_setor_acesso(s.id)),'[]'::jsonb));
$$;
CREATE OR REPLACE FUNCTION public.almox_item_criar(_nome text,_categoria text,_unidade text,_quantidade numeric,_medicamento uuid DEFAULT NULL,_dados jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.get_user_company_id(auth.uid()); rid uuid; m farmacia_medicamentos;
BEGIN
 IF NOT public.almox_permissao('create') THEN RAISE EXCEPTION 'Sem permissão para cadastrar itens'; END IF;
 IF coalesce(trim(_nome),'')='' OR coalesce(trim(_unidade),'')='' OR _quantidade IS NULL OR _quantidade<0 OR _quantidade::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Informe nome, unidade e saldo válido'; END IF;
 IF _medicamento IS NOT NULL THEN
 SELECT * INTO m FROM farmacia_medicamentos WHERE id=_medicamento AND company_id=cid AND ativo;
 IF NOT FOUND OR _categoria<>'medicamento' OR m.unidade<>trim(_unidade) THEN RAISE EXCEPTION 'Medicamento ou unidade incompatível'; END IF;
 END IF;
 INSERT INTO almox_itens(company_id,nome,categoria,unidade,medicamento_id,dados_medicamento,created_by) VALUES(cid,trim(_nome),_categoria,trim(_unidade),_medicamento,coalesce(_dados,'{}'),auth.uid()) RETURNING id INTO rid;
 INSERT INTO almox_saldos(company_id,item_id,local,quantidade) VALUES(cid,rid,'almoxarifado',_quantidade);
 IF _quantidade>0 THEN INSERT INTO almox_movimentos(company_id,item_id,origem,destino,quantidade,ator) VALUES(cid,rid,'entrada','almoxarifado',_quantidade,auth.uid()); END IF;
 RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.almox_entrada(_item uuid,_quantidade numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.get_user_company_id(auth.uid());
BEGIN
 IF NOT public.almox_permissao('edit') THEN RAISE EXCEPTION 'Sem permissão para entrada'; END IF;
 IF _quantidade IS NULL OR _quantidade<=0 OR _quantidade::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
 PERFORM 1 FROM almox_itens WHERE id=_item AND company_id=cid AND ativo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
 UPDATE almox_saldos SET quantidade=quantidade+_quantidade WHERE company_id=cid AND item_id=_item AND local='almoxarifado';
 INSERT INTO almox_movimentos(company_id,item_id,origem,destino,quantidade,ator) VALUES(cid,_item,'entrada','almoxarifado',_quantidade,auth.uid());
END $$;
CREATE OR REPLACE FUNCTION public.almox_solicitar(_setor text,_destino text,_itens jsonb,_observacao text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.get_user_company_id(auth.uid()); rid uuid; e jsonb; q numeric; i almox_itens;
BEGIN
 IF NOT public.almox_setor_acesso(_setor) THEN RAISE EXCEPTION 'Sem acesso ao setor'; END IF;
 IF jsonb_typeof(_itens) IS DISTINCT FROM 'array' OR jsonb_array_length(_itens)=0 THEN RAISE EXCEPTION 'Selecione ao menos um item'; END IF;
 INSERT INTO almox_solicitacoes(company_id,setor_id,destino,observacao,solicitado_por) VALUES(cid,_setor,_destino,nullif(trim(_observacao),''),auth.uid()) RETURNING id INTO rid;
 FOR e IN SELECT * FROM jsonb_array_elements(_itens) LOOP
 q:=(e->>'quantidade')::numeric;
 IF q IS NULL OR q<=0 OR q::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
 SELECT * INTO i FROM almox_itens WHERE id=(e->>'item_id')::uuid AND company_id=cid AND ativo;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
 INSERT INTO almox_solicitacao_itens(company_id,solicitacao_id,item_id,quantidade) VALUES(cid,rid,i.id,q);
 END LOOP;
 RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.almox_decidir(_id uuid,_aprovar boolean,_motivo text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.get_user_company_id(auth.uid()); s almox_solicitacoes; e record; i almox_itens; saldo numeric; loc text; mid uuid;
BEGIN
 IF NOT public.almox_permissao('approve') THEN RAISE EXCEPTION 'Sem permissão para aprovar ou recusar'; END IF;
 IF _aprovar IS NULL THEN RAISE EXCEPTION 'Informe a decisão'; END IF;
 SELECT * INTO s FROM almox_solicitacoes WHERE id=_id AND company_id=cid FOR UPDATE;
 IF NOT FOUND OR s.status<>'pendente' THEN RAISE EXCEPTION 'Solicitação não pendente'; END IF;
 IF NOT EXISTS(SELECT 1 FROM company_sectors WHERE id=s.setor_id AND company_id=cid AND coalesce(is_active,true)) THEN RAISE EXCEPTION 'Setor inativo'; END IF;
 IF NOT _aprovar AND coalesce(trim(_motivo),'')='' THEN RAISE EXCEPTION 'Informe o motivo da recusa'; END IF;
 IF _aprovar THEN
 loc:=CASE WHEN s.destino='farmacia' THEN 'farmacia' ELSE 'setor:'||s.setor_id END;
 FOR e IN SELECT * FROM almox_solicitacao_itens WHERE solicitacao_id=s.id ORDER BY item_id LOOP
 SELECT * INTO i FROM almox_itens WHERE id=e.item_id AND company_id=cid AND ativo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível'; END IF;
 SELECT quantidade INTO saldo FROM almox_saldos WHERE item_id=i.id AND company_id=cid AND local='almoxarifado' FOR UPDATE;
 IF saldo IS NULL OR saldo<e.quantidade THEN RAISE EXCEPTION 'Saldo insuficiente para %',i.nome; END IF;
 IF s.destino='farmacia' AND i.categoria='medicamento' THEN
 mid:=i.medicamento_id;
 IF mid IS NULL THEN
 PERFORM pg_advisory_xact_lock(hashtext('farmacia_med_'||cid::text));
 INSERT INTO farmacia_medicamentos(company_id,codigo,nome,principio_ativo,apresentacao,forma,unidade,created_by) VALUES(cid,coalesce((SELECT max(codigo) FROM farmacia_medicamentos WHERE company_id=cid),0)+1,i.nome,nullif(i.dados_medicamento->>'principio_ativo',''),nullif(i.dados_medicamento->>'apresentacao',''),nullif(i.dados_medicamento->>'forma',''),i.unidade,auth.uid()) RETURNING id INTO mid;
 UPDATE almox_itens SET medicamento_id=mid WHERE id=i.id;
 ELSE
 PERFORM 1 FROM farmacia_medicamentos WHERE id=mid AND company_id=cid AND ativo AND unidade=i.unidade;
 IF NOT FOUND THEN RAISE EXCEPTION 'Medicamento ou unidade incompatível'; END IF;
 END IF;
 END IF;
 UPDATE almox_saldos SET quantidade=quantidade-e.quantidade WHERE company_id=cid AND item_id=i.id AND local='almoxarifado';
 INSERT INTO almox_saldos(company_id,item_id,local,setor_id,quantidade) VALUES(cid,i.id,loc,s.setor_id,e.quantidade) ON CONFLICT(company_id,item_id,local) DO UPDATE SET quantidade=almox_saldos.quantidade+EXCLUDED.quantidade;
 INSERT INTO almox_movimentos(company_id,item_id,solicitacao_id,origem,destino,setor_id,quantidade,ator) VALUES(cid,i.id,s.id,'almoxarifado',loc,s.setor_id,e.quantidade,auth.uid());
 END LOOP;
 END IF;
 UPDATE almox_solicitacoes SET status=CASE WHEN _aprovar THEN 'aprovada' ELSE 'recusada' END,decidido_por=auth.uid(),decidido_em=now(),motivo=nullif(trim(_motivo),'') WHERE id=s.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.almox_contexto(),public.almox_item_criar(text,text,text,numeric,uuid,jsonb),public.almox_entrada(uuid,numeric),public.almox_solicitar(text,text,jsonb,text),public.almox_decidir(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.almox_contexto(),public.almox_item_criar(text,text,text,numeric,uuid,jsonb),public.almox_entrada(uuid,numeric),public.almox_solicitar(text,text,jsonb,text),public.almox_decidir(uuid,boolean,text) TO authenticated;