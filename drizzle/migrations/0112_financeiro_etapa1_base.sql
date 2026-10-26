ALTER TABLE public.companies ADD COLUMN financeiro_habilitado boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies ALTER COLUMN financeiro_habilitado SET DEFAULT true;
CREATE TABLE public.financeiro_contas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), nome text NOT NULL, tipo text NOT NULL CHECK(tipo IN ('caixa','banco','cartao')), saldo_inicial numeric(14,2) NOT NULL DEFAULT 0, data_inicial date NOT NULL, ativa boolean NOT NULL DEFAULT true, criado_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.financeiro_contas TO authenticated; GRANT ALL ON public.financeiro_contas TO service_role;
ALTER TABLE public.financeiro_contas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.financeiro_categorias(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), nome text NOT NULL, tipo text NOT NULL CHECK(tipo IN ('receita','despesa')), pai_id uuid REFERENCES public.financeiro_categorias(id), ativa boolean NOT NULL DEFAULT true, UNIQUE(company_id,tipo,nome,pai_id));
GRANT SELECT ON public.financeiro_categorias TO authenticated; GRANT ALL ON public.financeiro_categorias TO service_role;
ALTER TABLE public.financeiro_categorias ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.financeiro_lancamentos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), descricao text NOT NULL, tipo text NOT NULL CHECK(tipo IN ('receita','despesa')), valor numeric(14,2) NOT NULL CHECK(valor>0), moeda text NOT NULL DEFAULT 'BRL' CHECK(moeda='BRL'), categoria_id uuid NOT NULL REFERENCES public.financeiro_categorias(id), conta_id uuid NOT NULL REFERENCES public.financeiro_contas(id), pagador text, paciente_id uuid REFERENCES public.patients(id) ON DELETE SET NULL, profissional_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL, competencia date NOT NULL, vencimento date NOT NULL, forma_prevista text, observacoes text, comprovante_path text, origem_tipo text, origem_id text, grupo_id uuid, parcela integer, parcelas integer, status text NOT NULL DEFAULT 'aberto' CHECK(status IN ('aberto','parcial','pago','cancelado')), cancelado_motivo text, criado_por uuid NOT NULL, criado_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.financeiro_lancamentos TO authenticated; GRANT ALL ON public.financeiro_lancamentos TO service_role;
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.financeiro_baixas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), lancamento_id uuid NOT NULL REFERENCES public.financeiro_lancamentos(id), conta_id uuid NOT NULL REFERENCES public.financeiro_contas(id), data date NOT NULL, valor numeric(14,2) NOT NULL CHECK(valor>0), juros numeric(14,2) NOT NULL DEFAULT 0 CHECK(juros>=0), multa numeric(14,2) NOT NULL DEFAULT 0 CHECK(multa>=0), desconto numeric(14,2) NOT NULL DEFAULT 0 CHECK(desconto>=0), forma text NOT NULL CHECK(forma IN ('dinheiro','pix','debito','credito','boleto','transferencia','convenio','outro')), estornado_em timestamptz, estornado_por uuid, estorno_motivo text, criado_por uuid NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), CHECK(valor+juros+multa-desconto>=0));
GRANT SELECT ON public.financeiro_baixas TO authenticated; GRANT ALL ON public.financeiro_baixas TO service_role;
ALTER TABLE public.financeiro_baixas ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.financeiro_lancamentos(company_id,vencimento); CREATE INDEX ON public.financeiro_baixas(company_id,lancamento_id); CREATE INDEX ON public.financeiro_lancamentos(paciente_id);
CREATE FUNCTION public.financeiro_tem_permissao(_acao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM companies c WHERE c.id=get_user_company_id(auth.uid()) AND c.financeiro_habilitado) AND (is_company_manager(auth.uid()) OR EXISTS(SELECT 1 FROM sector_users su JOIN company_sectors cs ON cs.id=su.sector_id AND coalesce(cs.is_active,true) JOIN access_profiles ap ON ap.id=ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active,true) WHERE su.user_id=auth.uid() AND cs.company_id=get_user_company_id(auth.uid()) AND ap.company_id=cs.company_id AND coalesce(ap.permissions->'financeiro','[]'::jsonb) ? ('financeiro.'||_acao))) $$;
REVOKE ALL ON FUNCTION public.financeiro_tem_permissao(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_tem_permissao(text) TO authenticated;
CREATE FUNCTION public.financeiro_meu_acesso() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('company_id',get_user_company_id(auth.uid()),'ver',financeiro_tem_permissao('ver'),'lancar',financeiro_tem_permissao('lancar'),'baixar',financeiro_tem_permissao('baixar'),'cancelar',financeiro_tem_permissao('cancelar'),'configurar',financeiro_tem_permissao('configurar')) $$;
REVOKE ALL ON FUNCTION public.financeiro_meu_acesso() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_meu_acesso() TO authenticated;
CREATE POLICY financeiro_contas_leitura ON public.financeiro_contas FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND financeiro_tem_permissao('ver'));
CREATE POLICY financeiro_categorias_leitura ON public.financeiro_categorias FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND financeiro_tem_permissao('ver'));
CREATE POLICY financeiro_lancamentos_leitura ON public.financeiro_lancamentos FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND financeiro_tem_permissao('ver'));
CREATE POLICY financeiro_baixas_leitura ON public.financeiro_baixas FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND financeiro_tem_permissao('ver'));
CREATE FUNCTION public.financeiro__auditar(_company uuid,_tabela text,_id uuid,_acao text,_antes jsonb,_depois jsonb) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ INSERT INTO apoio_auditoria(company_id,tabela,registro_id,acao,antes,depois,usuario_id) VALUES(_company,_tabela,_id::text,_acao,_antes,_depois,auth.uid()) $$;
REVOKE ALL ON FUNCTION public.financeiro__auditar(uuid,text,uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.financeiro__padroes(_company uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO financeiro_categorias(company_id,tipo,nome) SELECT _company,t,n FROM (VALUES('receita','Consultas'),('receita','Exames'),('receita','Procedimentos'),('receita','Convênios'),('receita','Outras'),('despesa','Aluguel'),('despesa','Folha e encargos'),('despesa','Insumos'),('despesa','Impostos'),('despesa','Marketing'),('despesa','Água/Energia/Internet'),('despesa','Equipamentos'),('despesa','Outras')) v(t,n) WHERE NOT EXISTS(SELECT 1 FROM financeiro_categorias c WHERE c.company_id=_company AND c.tipo=t AND c.nome=n AND c.pai_id IS NULL);
END $$;
REVOKE ALL ON FUNCTION public.financeiro__padroes(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.financeiro_empresa_nova_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.financeiro_habilitado THEN PERFORM financeiro__padroes(NEW.id); END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_empresa_nova_trg() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER financeiro_empresa_nova AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.financeiro_empresa_nova_trg();
CREATE FUNCTION public.financeiro_liberar(_company uuid,_habilitado boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT private.is_super_admin() THEN RAISE EXCEPTION 'Somente Super Admin'; END IF;
UPDATE companies SET financeiro_habilitado=_habilitado WHERE id=_company; IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;
IF _habilitado THEN PERFORM financeiro__padroes(_company); END IF;
PERFORM financeiro__auditar(_company,'companies',_company,'financeiro_liberar',NULL,jsonb_build_object('habilitado',_habilitado)); END $$;
REVOKE ALL ON FUNCTION public.financeiro_liberar(uuid,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_liberar(uuid,boolean) TO authenticated;
CREATE FUNCTION public.financeiro_configurar(_entidade text,_dados jsonb,_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid:=get_user_company_id(auth.uid()); r uuid:=coalesce(_id,gen_random_uuid()); antes jsonb; pai financeiro_categorias; BEGIN
IF NOT financeiro_tem_permissao('configurar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
IF nullif(btrim(_dados->>'nome'),'') IS NULL THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
IF _entidade='conta' THEN
IF _id IS NOT NULL THEN SELECT to_jsonb(x) INTO antes FROM financeiro_contas x WHERE id=_id AND company_id=c FOR UPDATE; IF antes IS NULL THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
IF EXISTS(SELECT 1 FROM financeiro_baixas WHERE conta_id=_id) AND ((antes->>'saldo_inicial')::numeric IS DISTINCT FROM (_dados->>'saldo_inicial')::numeric OR (antes->>'data_inicial')::date IS DISTINCT FROM (_dados->>'data_inicial')::date) THEN RAISE EXCEPTION 'Conta movimentada: saldo inicial imutável'; END IF;
UPDATE financeiro_contas SET nome=btrim(_dados->>'nome'),tipo=_dados->>'tipo',saldo_inicial=(_dados->>'saldo_inicial')::numeric,data_inicial=(_dados->>'data_inicial')::date,ativa=coalesce((_dados->>'ativa')::boolean,true) WHERE id=_id;
ELSE INSERT INTO financeiro_contas(id,company_id,nome,tipo,saldo_inicial,data_inicial) VALUES(r,c,btrim(_dados->>'nome'),_dados->>'tipo',coalesce((_dados->>'saldo_inicial')::numeric,0),(_dados->>'data_inicial')::date); END IF;
ELSIF _entidade='categoria' THEN
IF nullif(_dados->>'pai_id','') IS NOT NULL THEN SELECT * INTO pai FROM financeiro_categorias WHERE id=(_dados->>'pai_id')::uuid AND company_id=c; IF pai.id IS NULL OR pai.pai_id IS NOT NULL OR pai.tipo<>_dados->>'tipo' OR pai.id=r THEN RAISE EXCEPTION 'Subcategoria inválida: máximo dois níveis'; END IF; END IF;
IF _id IS NOT NULL THEN SELECT to_jsonb(x) INTO antes FROM financeiro_categorias x WHERE id=_id AND company_id=c FOR UPDATE; IF antes IS NULL THEN RAISE EXCEPTION 'Categoria não encontrada'; END IF;
IF (antes->>'tipo' IS DISTINCT FROM _dados->>'tipo' OR antes->>'pai_id' IS DISTINCT FROM nullif(_dados->>'pai_id','')) AND (EXISTS(SELECT 1 FROM financeiro_lancamentos WHERE categoria_id=_id) OR EXISTS(SELECT 1 FROM financeiro_categorias WHERE pai_id=_id)) THEN RAISE EXCEPTION 'Categoria utilizada: tipo e nível imutáveis'; END IF;
UPDATE financeiro_categorias SET nome=btrim(_dados->>'nome'),tipo=_dados->>'tipo',pai_id=nullif(_dados->>'pai_id','')::uuid,ativa=coalesce((_dados->>'ativa')::boolean,true) WHERE id=_id;
ELSE INSERT INTO financeiro_categorias(id,company_id,nome,tipo,pai_id) VALUES(r,c,btrim(_dados->>'nome'),_dados->>'tipo',nullif(_dados->>'pai_id','')::uuid); END IF;
ELSE RAISE EXCEPTION 'Cadastro inválido'; END IF;
PERFORM financeiro__auditar(c,'financeiro_'||_entidade,r,CASE WHEN _id IS NULL THEN 'criacao' ELSE 'edicao' END,antes,_dados); RETURN r; END $$;
REVOKE ALL ON FUNCTION public.financeiro_configurar(text,jsonb,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_configurar(text,jsonb,uuid) TO authenticated;
CREATE FUNCTION public.financeiro_lancar(_dados jsonb,_quantidade integer DEFAULT 1,_modo text DEFAULT 'unico',_id uuid DEFAULT NULL) RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid:=get_user_company_id(auth.uid()); v numeric(14,2):=(_dados->>'valor')::numeric; cat financeiro_categorias; ct financeiro_contas; l financeiro_lancamentos; r uuid; ids uuid[]:='{}'; grupo uuid:=gen_random_uuid(); i integer; cents bigint; part numeric(14,2); comp date:=(_dados->>'competencia')::date; venc date:=(_dados->>'vencimento')::date; BEGIN
IF NOT financeiro_tem_permissao('lancar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
IF v IS NULL OR v<=0 OR nullif(btrim(_dados->>'descricao'),'') IS NULL OR comp IS NULL OR venc IS NULL OR coalesce(_dados->>'moeda','BRL')<>'BRL' THEN RAISE EXCEPTION 'Valor, descrição, datas ou moeda inválidos'; END IF;
IF _modo NOT IN ('unico','parcelado','recorrente') OR _quantidade<1 OR _quantidade>120 OR (_modo='recorrente' AND _quantidade>12) OR (_modo='unico' AND _quantidade<>1) THEN RAISE EXCEPTION 'Quantidade inválida (recorrência até 12 meses)'; END IF;
SELECT * INTO cat FROM financeiro_categorias WHERE id=(_dados->>'categoria_id')::uuid AND company_id=c AND ativa; SELECT * INTO ct FROM financeiro_contas WHERE id=(_dados->>'conta_id')::uuid AND company_id=c AND ativa;
IF cat.id IS NULL OR ct.id IS NULL OR cat.tipo<>_dados->>'tipo' THEN RAISE EXCEPTION 'Categoria ou conta inválida'; END IF;
IF nullif(_dados->>'paciente_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM patients WHERE id=(_dados->>'paciente_id')::uuid AND company_id=c) THEN RAISE EXCEPTION 'Paciente de outra empresa'; END IF;
IF nullif(_dados->>'profissional_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM doctors WHERE id=(_dados->>'profissional_id')::uuid AND company_id=c) THEN RAISE EXCEPTION 'Profissional de outra empresa'; END IF;
IF nullif(_dados->>'comprovante_path','') IS NOT NULL AND split_part(_dados->>'comprovante_path','/',1)<>c::text THEN RAISE EXCEPTION 'Comprovante de outra empresa'; END IF;
IF _id IS NOT NULL THEN
SELECT * INTO l FROM financeiro_lancamentos WHERE id=_id AND company_id=c FOR UPDATE;
IF l.id IS NULL OR l.status<>'aberto' OR EXISTS(SELECT 1 FROM financeiro_baixas WHERE lancamento_id=_id) OR _quantidade<>1 THEN RAISE EXCEPTION 'Lançamento com baixa ou cancelado não pode ser editado'; END IF;
UPDATE financeiro_lancamentos SET descricao=btrim(_dados->>'descricao'),tipo=cat.tipo,valor=v,categoria_id=cat.id,conta_id=ct.id,pagador=nullif(_dados->>'pagador',''),paciente_id=nullif(_dados->>'paciente_id','')::uuid,profissional_id=nullif(_dados->>'profissional_id','')::uuid,competencia=comp,vencimento=venc,forma_prevista=_dados->>'forma_prevista',observacoes=_dados->>'observacoes',comprovante_path=nullif(_dados->>'comprovante_path','') WHERE id=_id;
PERFORM financeiro__auditar(c,'financeiro_lancamentos',_id,'edicao',jsonb_build_object('valor',l.valor,'status',l.status),jsonb_build_object('valor',v)); RETURN ARRAY[_id]; END IF;
cents:=(v*100)::bigint; IF _modo='parcelado' AND cents<_quantidade THEN RAISE EXCEPTION 'Valor insuficiente para parcelas'; END IF;
FOR i IN 1.._quantidade LOOP
part:=CASE WHEN _modo='parcelado' THEN (cents/_quantidade+CASE WHEN i<=cents%_quantidade THEN 1 ELSE 0 END)::numeric/100 ELSE v END;
INSERT INTO financeiro_lancamentos(company_id,descricao,tipo,valor,categoria_id,conta_id,pagador,paciente_id,profissional_id,competencia,vencimento,forma_prevista,observacoes,comprovante_path,origem_tipo,origem_id,grupo_id,parcela,parcelas,criado_por)
VALUES(c,btrim(_dados->>'descricao'),cat.tipo,part,cat.id,ct.id,nullif(_dados->>'pagador',''),nullif(_dados->>'paciente_id','')::uuid,nullif(_dados->>'profissional_id','')::uuid,(comp+make_interval(months=>i-1))::date,(venc+make_interval(months=>i-1))::date,_dados->>'forma_prevista',_dados->>'observacoes',nullif(_dados->>'comprovante_path',''),_dados->>'origem_tipo',_dados->>'origem_id',grupo,i,_quantidade,auth.uid()) RETURNING id INTO r;
ids:=array_append(ids,r); PERFORM financeiro__auditar(c,'financeiro_lancamentos',r,'criacao',NULL,jsonb_build_object('valor',part,'grupo',grupo,'parcela',i)); END LOOP; RETURN ids; END $$;
REVOKE ALL ON FUNCTION public.financeiro_lancar(jsonb,integer,text,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_lancar(jsonb,integer,text,uuid) TO authenticated;
CREATE FUNCTION public.financeiro_baixar(_lancamento uuid,_dados jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid:=get_user_company_id(auth.uid()); l financeiro_lancamentos; ct financeiro_contas; v numeric(14,2):=(_dados->>'valor')::numeric; j numeric(14,2):=coalesce((_dados->>'juros')::numeric,0); m numeric(14,2):=coalesce((_dados->>'multa')::numeric,0); d numeric(14,2):=coalesce((_dados->>'desconto')::numeric,0); dt date:=(_dados->>'data')::date; total numeric(14,2); r uuid; st text; BEGIN
IF NOT financeiro_tem_permissao('baixar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
SELECT * INTO l FROM financeiro_lancamentos WHERE id=_lancamento AND company_id=c FOR UPDATE; IF l.id IS NULL OR l.status IN ('pago','cancelado') THEN RAISE EXCEPTION 'Lançamento indisponível'; END IF;
SELECT * INTO ct FROM financeiro_contas WHERE id=(_dados->>'conta_id')::uuid AND company_id=c AND ativa FOR UPDATE;
IF ct.id IS NULL OR dt IS NULL OR dt<ct.data_inicial OR dt>(now() AT TIME ZONE 'America/Sao_Paulo')::date OR v IS NULL OR v<=0 OR j<0 OR m<0 OR d<0 OR v+j+m-d<0 THEN RAISE EXCEPTION 'Conta, data ou valores inválidos'; END IF;
SELECT coalesce(sum(valor),0) INTO total FROM financeiro_baixas WHERE lancamento_id=l.id AND estornado_em IS NULL;
IF total+v>l.valor THEN RAISE EXCEPTION 'Baixa excede saldo do lançamento'; END IF;
INSERT INTO financeiro_baixas(company_id,lancamento_id,conta_id,data,valor,juros,multa,desconto,forma,criado_por) VALUES(c,l.id,ct.id,dt,v,j,m,d,_dados->>'forma',auth.uid()) RETURNING id INTO r;
st:=CASE WHEN total+v=l.valor THEN 'pago' ELSE 'parcial' END; UPDATE financeiro_lancamentos SET status=st WHERE id=l.id;
PERFORM financeiro__auditar(c,'financeiro_baixas',r,'baixa',NULL,jsonb_build_object('lancamento',l.id,'valor',v,'juros',j,'multa',m,'desconto',d,'status',st)); RETURN r; END $$;
REVOKE ALL ON FUNCTION public.financeiro_baixar(uuid,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_baixar(uuid,jsonb) TO authenticated;
CREATE FUNCTION public.financeiro_estornar(_baixa uuid,_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid:=get_user_company_id(auth.uid()); b financeiro_baixas; l financeiro_lancamentos; total numeric; BEGIN
IF NOT financeiro_tem_permissao('cancelar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
IF nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
SELECT * INTO b FROM financeiro_baixas WHERE id=_baixa AND company_id=c;
IF b.id IS NULL THEN RAISE EXCEPTION 'Baixa não encontrada'; END IF;
SELECT * INTO l FROM financeiro_lancamentos WHERE id=b.lancamento_id FOR UPDATE;
SELECT * INTO b FROM financeiro_baixas WHERE id=_baixa FOR UPDATE;
IF b.estornado_em IS NOT NULL THEN RAISE EXCEPTION 'Baixa já estornada'; END IF;
UPDATE financeiro_baixas SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=b.id;
SELECT coalesce(sum(valor),0) INTO total FROM financeiro_baixas WHERE lancamento_id=l.id AND estornado_em IS NULL;
UPDATE financeiro_lancamentos SET status=CASE WHEN total=0 THEN 'aberto' WHEN total=l.valor THEN 'pago' ELSE 'parcial' END WHERE id=l.id;
PERFORM financeiro__auditar(c,'financeiro_baixas',b.id,'estorno',jsonb_build_object('valor',b.valor),jsonb_build_object('motivo',btrim(_motivo))); END $$;
REVOKE ALL ON FUNCTION public.financeiro_estornar(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_estornar(uuid,text) TO authenticated;
CREATE FUNCTION public.financeiro_cancelar(_lancamento uuid,_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); l financeiro_lancamentos; BEGIN
IF NOT financeiro_tem_permissao('cancelar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
IF nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
SELECT * INTO l FROM financeiro_lancamentos WHERE id=_lancamento AND company_id=c FOR UPDATE;
IF l.id IS NULL OR l.status='cancelado' THEN RAISE EXCEPTION 'Lançamento indisponível'; END IF;
IF EXISTS(SELECT 1 FROM financeiro_baixas WHERE lancamento_id=l.id AND estornado_em IS NULL) THEN RAISE EXCEPTION 'Estorne as baixas antes de cancelar'; END IF;
UPDATE financeiro_lancamentos SET status='cancelado',cancelado_motivo=btrim(_motivo) WHERE id=l.id;
PERFORM financeiro__auditar(c,'financeiro_lancamentos',l.id,'cancelamento',jsonb_build_object('status',l.status),jsonb_build_object('motivo',btrim(_motivo))); END $$;
REVOKE ALL ON FUNCTION public.financeiro_cancelar(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_cancelar(uuid,text) TO authenticated;
CREATE FUNCTION public.financeiro_saldos(_ate date DEFAULT CURRENT_DATE) RETURNS TABLE(id uuid,nome text,saldo numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT c.id,c.nome,c.saldo_inicial+coalesce(sum(CASE WHEN l.tipo='receita' THEN 1 ELSE -1 END*(b.valor+b.juros+b.multa-b.desconto)) FILTER(WHERE b.estornado_em IS NULL AND b.data<=_ate AND b.data>=c.data_inicial),0) FROM financeiro_contas c LEFT JOIN financeiro_baixas b ON b.conta_id=c.id LEFT JOIN financeiro_lancamentos l ON l.id=b.lancamento_id WHERE c.company_id=get_user_company_id(auth.uid()) AND financeiro_tem_permissao('ver') AND c.data_inicial<=_ate GROUP BY c.id $$;
REVOKE ALL ON FUNCTION public.financeiro_saldos(date) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_saldos(date) TO authenticated;
CREATE FUNCTION public.financeiro_lgpd_desvincular(_paciente uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); n integer; BEGIN
IF NOT financeiro_tem_permissao('configurar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
IF NOT EXISTS(SELECT 1 FROM patients WHERE id=_paciente AND company_id=c) THEN RAISE EXCEPTION 'Paciente não encontrado'; END IF;
UPDATE financeiro_lancamentos SET paciente_id=NULL,pagador=NULL WHERE paciente_id=_paciente AND company_id=c; GET DIAGNOSTICS n=ROW_COUNT;
PERFORM financeiro__auditar(c,'financeiro_lancamentos',_paciente,'lgpd_desvincular',NULL,jsonb_build_object('quantidade',n)); RETURN n; END $$;
REVOKE ALL ON FUNCTION public.financeiro_lgpd_desvincular(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_lgpd_desvincular(uuid) TO authenticated;
COMMENT ON TABLE public.financeiro_lancamentos IS 'Guarda fiscal: fora da retenção automática; exclusão LGPD somente desvincula paciente_id e pagador, preservando valores e histórico.';
CREATE POLICY financeiro_comprovantes_ler ON storage.objects FOR SELECT TO authenticated USING(bucket_id='financeiro-comprovantes' AND split_part(name,'/',1)=get_user_company_id(auth.uid())::text AND financeiro_tem_permissao('ver'));
CREATE POLICY financeiro_comprovantes_enviar ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='financeiro-comprovantes' AND split_part(name,'/',1)=get_user_company_id(auth.uid())::text AND financeiro_tem_permissao('ver') AND financeiro_tem_permissao('lancar'));
