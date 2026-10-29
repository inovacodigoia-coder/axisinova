CREATE TABLE public.financeiro_caixas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),nome text NOT NULL,conta_id uuid NOT NULL REFERENCES public.financeiro_contas(id),ativo boolean NOT NULL DEFAULT true,UNIQUE(company_id,conta_id));
GRANT SELECT ON public.financeiro_caixas TO authenticated; GRANT ALL ON public.financeiro_caixas TO service_role;
ALTER TABLE public.financeiro_caixas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.financeiro_caixa_sessoes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),caixa_id uuid NOT NULL REFERENCES public.financeiro_caixas(id),operador_id uuid NOT NULL,aberto_em timestamptz NOT NULL DEFAULT now(),fundo numeric(14,2) NOT NULL CHECK(fundo>=0),fechado_em timestamptz,contado numeric(14,2),esperado jsonb,diferenca numeric(14,2),justificativa text);
GRANT SELECT ON public.financeiro_caixa_sessoes TO authenticated; GRANT ALL ON public.financeiro_caixa_sessoes TO service_role;
ALTER TABLE public.financeiro_caixa_sessoes ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX financeiro_caixa_aberto ON public.financeiro_caixa_sessoes(caixa_id) WHERE fechado_em IS NULL;
CREATE UNIQUE INDEX financeiro_operador_aberto ON public.financeiro_caixa_sessoes(operador_id) WHERE fechado_em IS NULL;
CREATE TABLE public.financeiro_transferencias(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),origem_id uuid NOT NULL REFERENCES public.financeiro_contas(id),destino_id uuid NOT NULL REFERENCES public.financeiro_contas(id),valor numeric(14,2) NOT NULL CHECK(valor>0),data date NOT NULL,motivo text NOT NULL,usuario_id uuid NOT NULL,chave uuid NOT NULL,estornado_em timestamptz,estorno_motivo text,estornado_por uuid,UNIQUE(company_id,chave),CHECK(origem_id<>destino_id));
GRANT SELECT ON public.financeiro_transferencias TO authenticated; GRANT ALL ON public.financeiro_transferencias TO service_role;
ALTER TABLE public.financeiro_transferencias ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.financeiro_caixa_movimentos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),sessao_id uuid NOT NULL REFERENCES public.financeiro_caixa_sessoes(id),tipo text NOT NULL CHECK(tipo IN ('receber','pagar','sangria','suprimento')),valor numeric(14,2) NOT NULL CHECK(valor>0),descricao text NOT NULL,formas jsonb NOT NULL,chave uuid NOT NULL,payload jsonb NOT NULL,lancamento_id uuid REFERENCES public.financeiro_lancamentos(id),baixa_ids uuid[] NOT NULL DEFAULT '{}',transferencia_id uuid REFERENCES public.financeiro_transferencias(id),avulso boolean NOT NULL DEFAULT false,criado_em timestamptz NOT NULL DEFAULT now(),estornado_em timestamptz,estorno_motivo text,estornado_por uuid,UNIQUE(company_id,chave));
GRANT SELECT ON public.financeiro_caixa_movimentos TO authenticated; GRANT ALL ON public.financeiro_caixa_movimentos TO service_role;
ALTER TABLE public.financeiro_caixa_movimentos ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.financeiro_recibo_contadores(company_id uuid PRIMARY KEY REFERENCES public.companies(id),ultimo bigint NOT NULL DEFAULT 0);
GRANT ALL ON public.financeiro_recibo_contadores TO service_role;
ALTER TABLE public.financeiro_recibo_contadores ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.financeiro_caixa_recibos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),movimento_id uuid NOT NULL UNIQUE REFERENCES public.financeiro_caixa_movimentos(id),numero bigint NOT NULL,paciente_id uuid,pagador text,emitido_em timestamptz NOT NULL DEFAULT now(),impressoes integer NOT NULL DEFAULT 0,UNIQUE(company_id,numero));
GRANT SELECT ON public.financeiro_caixa_recibos TO authenticated; GRANT ALL ON public.financeiro_caixa_recibos TO service_role;
ALTER TABLE public.financeiro_caixa_recibos ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.financeiro_caixa_acesso() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('company_id',get_user_company_id(auth.uid()),'operar',financeiro_tem_permissao('caixa.operar'),'ver_todos',financeiro_tem_permissao('caixa.ver_todos'),'reabrir',financeiro_tem_permissao('caixa.reabrir'),'configurar',financeiro_tem_permissao('caixa.configurar')) $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_acesso() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_acesso() TO authenticated;
CREATE FUNCTION public.financeiro_caixa_visivel(_sessao uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM financeiro_caixa_sessoes s WHERE s.id=_sessao AND s.company_id=get_user_company_id(auth.uid()) AND ((s.operador_id=auth.uid() AND financeiro_tem_permissao('caixa.operar')) OR financeiro_tem_permissao('caixa.ver_todos'))) $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_visivel(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_visivel(uuid) TO authenticated;
CREATE POLICY caixa_ler ON public.financeiro_caixas FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND (financeiro_tem_permissao('caixa.operar') OR financeiro_tem_permissao('caixa.ver_todos') OR financeiro_tem_permissao('caixa.configurar')));
CREATE POLICY sessao_ler ON public.financeiro_caixa_sessoes FOR SELECT TO authenticated USING(financeiro_caixa_visivel(id));
CREATE POLICY movimento_ler ON public.financeiro_caixa_movimentos FOR SELECT TO authenticated USING(financeiro_caixa_visivel(sessao_id));
CREATE POLICY recibo_ler ON public.financeiro_caixa_recibos FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND EXISTS(SELECT 1 FROM financeiro_caixa_movimentos m WHERE m.id=movimento_id AND financeiro_caixa_visivel(m.sessao_id)));
CREATE POLICY transferencia_ler ON public.financeiro_transferencias FOR SELECT TO authenticated USING(company_id=get_user_company_id(auth.uid()) AND financeiro_tem_permissao('ver'));
CREATE FUNCTION public.financeiro_caixa_configurar(_nome text,_conta uuid,_ativo boolean DEFAULT true,_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); r uuid:=coalesce(_id,gen_random_uuid()); BEGIN
IF NOT financeiro_tem_permissao('caixa.configurar') THEN RAISE EXCEPTION 'Sem permissão para configurar caixa'; END IF;
IF nullif(btrim(_nome),'') IS NULL OR NOT EXISTS(SELECT 1 FROM financeiro_contas WHERE id=_conta AND company_id=c AND tipo='caixa' AND ativa) THEN RAISE EXCEPTION 'Nome ou conta caixa inválida'; END IF;
IF _id IS NOT NULL THEN
PERFORM 1 FROM financeiro_caixas WHERE id=_id AND company_id=c FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Caixa indisponível'; END IF;
IF EXISTS(SELECT 1 FROM financeiro_caixa_sessoes WHERE caixa_id=_id) AND (SELECT conta_id FROM financeiro_caixas WHERE id=_id)<>_conta THEN RAISE EXCEPTION 'Conta de caixa utilizado é imutável'; END IF;
UPDATE financeiro_caixas SET nome=btrim(_nome),conta_id=_conta,ativo=coalesce(_ativo,true) WHERE id=_id;
ELSE INSERT INTO financeiro_caixas(id,company_id,nome,conta_id,ativo) VALUES(r,c,btrim(_nome),_conta,coalesce(_ativo,true)); END IF;
PERFORM financeiro__auditar(c,'financeiro_caixas',r,'caixa_configurar',NULL,jsonb_build_object('nome',_nome,'ativo',_ativo)); RETURN r; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_configurar(text,uuid,boolean,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_configurar(text,uuid,boolean,uuid) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_abrir(_caixa uuid,_fundo numeric) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); x financeiro_caixas; r uuid; BEGIN
IF NOT financeiro_tem_permissao('caixa.operar') THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
IF _fundo IS NULL OR _fundo<0 OR _fundo::text IN ('NaN','Infinity','-Infinity') OR _fundo<>round(_fundo,2) THEN RAISE EXCEPTION 'Fundo inválido'; END IF;
SELECT * INTO x FROM financeiro_caixas WHERE id=_caixa AND company_id=c AND ativo FOR UPDATE;
IF x.id IS NULL OR NOT EXISTS(SELECT 1 FROM financeiro_contas WHERE id=x.conta_id AND ativa AND tipo='caixa' AND data_inicial<=(now() AT TIME ZONE 'America/Sao_Paulo')::date) THEN RAISE EXCEPTION 'Caixa indisponível'; END IF;
INSERT INTO financeiro_caixa_sessoes(company_id,caixa_id,operador_id,fundo) VALUES(c,x.id,auth.uid(),_fundo) RETURNING id INTO r;
PERFORM financeiro__auditar(c,'financeiro_caixa_sessoes',r,'abertura',NULL,jsonb_build_object('fundo',_fundo)); RETURN r; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_abrir(uuid,numeric) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_abrir(uuid,numeric) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_totais(_sessao uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE r jsonb; BEGIN
IF NOT financeiro_caixa_visivel(_sessao) THEN RAISE EXCEPTION 'Sessão indisponível'; END IF;
SELECT jsonb_object_agg(forma,valor) INTO r FROM(SELECT forma,sum(valor) valor FROM(SELECT 'dinheiro' forma,s.fundo valor FROM financeiro_caixa_sessoes s WHERE s.id=_sessao UNION ALL SELECT f->>'forma',CASE WHEN m.tipo IN ('receber','suprimento') THEN 1 ELSE -1 END*(f->>'valor')::numeric FROM financeiro_caixa_movimentos m CROSS JOIN LATERAL jsonb_array_elements(m.formas) f WHERE m.sessao_id=_sessao AND m.estornado_em IS NULL) a GROUP BY forma) b; RETURN coalesce(r,'{}'); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_totais(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_totais(uuid) TO authenticated;
CREATE FUNCTION public.financeiro_transferir(_origem uuid,_destino uuid,_valor numeric,_data date,_motivo text,_chave uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); r uuid; t financeiro_transferencias; BEGIN
IF NOT financeiro_tem_permissao('lancar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
IF _chave IS NULL THEN RAISE EXCEPTION 'Chave obrigatória'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(c::text||_chave::text,0));
SELECT * INTO t FROM financeiro_transferencias WHERE company_id=c AND chave=_chave;
IF t.id IS NOT NULL THEN IF t.origem_id IS DISTINCT FROM _origem OR t.destino_id IS DISTINCT FROM _destino OR t.valor IS DISTINCT FROM _valor OR t.data IS DISTINCT FROM _data OR t.motivo IS DISTINCT FROM btrim(_motivo) THEN RAISE EXCEPTION 'Chave reutilizada com dados diferentes'; END IF; RETURN t.id; END IF;
IF _valor IS NULL OR _valor<=0 OR _valor::text IN ('NaN','Infinity','-Infinity') OR _valor<>round(_valor,2) OR _origem IS NOT DISTINCT FROM _destino OR _data IS NULL OR _data>(now() AT TIME ZONE 'America/Sao_Paulo')::date OR nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Transferência inválida'; END IF;
PERFORM 1 FROM financeiro_contas WHERE id IN (_origem,_destino) AND company_id=c AND ativa AND data_inicial<=_data ORDER BY id FOR UPDATE;
IF (SELECT count(*) FROM financeiro_contas WHERE id IN (_origem,_destino) AND company_id=c AND ativa AND data_inicial<=_data)<>2 THEN RAISE EXCEPTION 'Contas inválidas'; END IF;
IF EXISTS(SELECT 1 FROM financeiro_caixas x JOIN financeiro_caixa_sessoes s ON s.caixa_id=x.id WHERE x.conta_id IN (_origem,_destino) AND s.fechado_em IS NULL) THEN RAISE EXCEPTION 'Use sangria ou suprimento no caixa aberto'; END IF;
INSERT INTO financeiro_transferencias(company_id,origem_id,destino_id,valor,data,motivo,usuario_id,chave) VALUES(c,_origem,_destino,_valor,_data,btrim(_motivo),auth.uid(),_chave) RETURNING id INTO r;
PERFORM financeiro__auditar(c,'financeiro_transferencias',r,'transferencia',NULL,jsonb_build_object('valor',_valor,'origem',_origem,'destino',_destino)); RETURN r; END $$;
REVOKE ALL ON FUNCTION public.financeiro_transferir(uuid,uuid,numeric,date,text,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_transferir(uuid,uuid,numeric,date,text,uuid) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_movimentar(_sessao uuid,_tipo text,_dados jsonb,_chave uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid:=get_user_company_id(auth.uid()); s financeiro_caixa_sessoes; x financeiro_caixas; m financeiro_caixa_movimentos; ct financeiro_contas; l financeiro_lancamentos; r uuid:=gen_random_uuid(); lid uuid; bid uuid; bids uuid[]:='{}'; tid uuid; cat uuid; v numeric(14,2); f jsonb; formas jsonb; total numeric:=0; dt date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date; av boolean; n bigint; BEGIN
IF NOT financeiro_tem_permissao('caixa.operar') THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
SELECT * INTO s FROM financeiro_caixa_sessoes WHERE id=_sessao AND company_id=c FOR UPDATE;
IF s.id IS NULL OR s.operador_id<>auth.uid() THEN RAISE EXCEPTION 'Sessão indisponível'; END IF;
IF _chave IS NULL THEN RAISE EXCEPTION 'Chave obrigatória'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(c::text||_chave::text,0));
SELECT * INTO m FROM financeiro_caixa_movimentos WHERE company_id=c AND chave=_chave;
IF m.id IS NOT NULL THEN IF m.sessao_id<>_sessao OR m.tipo IS DISTINCT FROM _tipo OR m.payload IS DISTINCT FROM _dados THEN RAISE EXCEPTION 'Chave reutilizada com dados diferentes'; END IF; RETURN m.id; END IF;
IF s.fechado_em IS NOT NULL THEN RAISE EXCEPTION 'Sessão fechada'; END IF;
IF _tipo IS NULL OR _tipo NOT IN ('receber','pagar','sangria','suprimento') OR nullif(btrim(_dados->>'descricao'),'') IS NULL THEN RAISE EXCEPTION 'Movimento inválido'; END IF;
IF (_dados->>'valor')::numeric IS NULL OR (_dados->>'valor')::numeric<=0 OR (_dados->>'valor')::numeric::text IN ('NaN','Infinity','-Infinity') OR (_dados->>'valor')::numeric<>round((_dados->>'valor')::numeric,2) THEN RAISE EXCEPTION 'Valor inválido'; END IF; v:=(_dados->>'valor')::numeric;
SELECT * INTO x FROM financeiro_caixas WHERE id=s.caixa_id;
SELECT * INTO ct FROM financeiro_contas WHERE id=x.conta_id AND company_id=c AND ativa AND tipo='caixa' AND data_inicial<=dt FOR UPDATE;
IF ct.id IS NULL THEN RAISE EXCEPTION 'Conta caixa indisponível'; END IF;
IF _tipo IN ('sangria','suprimento') THEN
formas:=jsonb_build_array(jsonb_build_object('forma','dinheiro','valor',v));
PERFORM 1 FROM financeiro_contas WHERE id=(_dados->>'conta_id')::uuid AND company_id=c AND ativa AND id<>ct.id AND data_inicial<=dt FOR UPDATE;
IF NOT FOUND OR EXISTS(SELECT 1 FROM financeiro_caixas q JOIN financeiro_caixa_sessoes z ON z.caixa_id=q.id WHERE q.conta_id=(_dados->>'conta_id')::uuid AND z.fechado_em IS NULL) THEN RAISE EXCEPTION 'Conta de origem/destino inválida ou caixa aberto'; END IF;
IF _tipo='sangria' AND v>coalesce((financeiro_caixa_totais(s.id)->>'dinheiro')::numeric,0) THEN RAISE EXCEPTION 'Espécie insuficiente'; END IF;
INSERT INTO financeiro_transferencias(company_id,origem_id,destino_id,valor,data,motivo,usuario_id,chave) VALUES(c,CASE WHEN _tipo='sangria' THEN ct.id ELSE (_dados->>'conta_id')::uuid END,CASE WHEN _tipo='sangria' THEN (_dados->>'conta_id')::uuid ELSE ct.id END,v,dt,btrim(_dados->>'descricao'),auth.uid(),_chave) RETURNING id INTO tid;
PERFORM financeiro__auditar(c,'financeiro_transferencias',tid,'transferencia',NULL,jsonb_build_object('valor',v,'tipo',_tipo));
ELSE
formas:=_dados->'formas'; IF jsonb_typeof(formas) IS DISTINCT FROM 'array' OR jsonb_array_length(formas)=0 THEN RAISE EXCEPTION 'Formas obrigatórias'; END IF;
FOR f IN SELECT value FROM jsonb_array_elements(formas) LOOP
IF coalesce(f->>'forma','') NOT IN ('dinheiro','pix','debito','credito','boleto','transferencia','convenio','outro') OR (f->>'valor')::numeric IS NULL OR (f->>'valor')::numeric<=0 OR (f->>'valor')::numeric::text IN ('NaN','Infinity','-Infinity') OR (f->>'valor')::numeric<>round((f->>'valor')::numeric,2) THEN RAISE EXCEPTION 'Forma ou valor inválido'; END IF;
total:=total+(f->>'valor')::numeric; END LOOP;
IF total<>v THEN RAISE EXCEPTION 'Soma das formas difere do valor'; END IF;
IF _tipo='pagar' AND coalesce((SELECT sum((a->>'valor')::numeric) FROM jsonb_array_elements(formas) a WHERE a->>'forma'='dinheiro'),0)>coalesce((financeiro_caixa_totais(s.id)->>'dinheiro')::numeric,0) THEN RAISE EXCEPTION 'Espécie insuficiente'; END IF;
lid:=nullif(_dados->>'lancamento_id','')::uuid; av:=lid IS NULL;
IF lid IS NOT NULL THEN
SELECT * INTO l FROM financeiro_lancamentos WHERE id=lid AND company_id=c FOR UPDATE;
IF _tipo<>'receber' OR l.id IS NULL OR l.tipo<>'receita' OR l.status NOT IN ('aberto','parcial') THEN RAISE EXCEPTION 'Lançamento indisponível'; END IF;
IF v>(l.valor-coalesce((SELECT sum(valor) FROM financeiro_baixas WHERE lancamento_id=lid AND estornado_em IS NULL),0)) THEN RAISE EXCEPTION 'Recebimento excede saldo'; END IF;
ELSE
SELECT id INTO cat FROM financeiro_categorias WHERE id=(_dados->>'categoria_id')::uuid AND company_id=c AND ativa AND tipo=CASE WHEN _tipo='receber' THEN 'receita' ELSE 'despesa' END;
IF cat IS NULL THEN RAISE EXCEPTION 'Categoria inválida'; END IF;
IF nullif(_dados->>'paciente_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM patients WHERE id=(_dados->>'paciente_id')::uuid AND company_id=c) THEN RAISE EXCEPTION 'Paciente inválido'; END IF;
INSERT INTO financeiro_lancamentos(company_id,descricao,tipo,valor,categoria_id,conta_id,pagador,paciente_id,competencia,vencimento,criado_por,origem_tipo,origem_id) VALUES(c,btrim(_dados->>'descricao'),CASE WHEN _tipo='receber' THEN 'receita' ELSE 'despesa' END,v,cat,ct.id,nullif(_dados->>'pagador',''),nullif(_dados->>'paciente_id','')::uuid,dt,dt,auth.uid(),'caixa',r::text) RETURNING id INTO lid;
SELECT * INTO l FROM financeiro_lancamentos WHERE id=lid;
PERFORM financeiro__auditar(c,'financeiro_lancamentos',lid,'criacao',NULL,jsonb_build_object('valor',v,'origem','caixa')); END IF;
FOR f IN SELECT value FROM jsonb_array_elements(formas) LOOP
INSERT INTO financeiro_baixas(company_id,lancamento_id,conta_id,data,valor,forma,criado_por) VALUES(c,lid,ct.id,dt,(f->>'valor')::numeric,f->>'forma',auth.uid()) RETURNING id INTO bid; bids:=array_append(bids,bid);
PERFORM financeiro__auditar(c,'financeiro_baixas',bid,'baixa',NULL,jsonb_build_object('valor',f->'valor','origem','caixa')); END LOOP;
UPDATE financeiro_lancamentos SET status=CASE WHEN (SELECT sum(valor) FROM financeiro_baixas WHERE lancamento_id=lid AND estornado_em IS NULL)=valor THEN 'pago' ELSE 'parcial' END WHERE id=lid;
END IF;
INSERT INTO financeiro_caixa_movimentos(id,company_id,sessao_id,tipo,valor,descricao,formas,chave,payload,lancamento_id,baixa_ids,transferencia_id,avulso) VALUES(r,c,s.id,_tipo,v,btrim(_dados->>'descricao'),formas,_chave,_dados,lid,bids,tid,coalesce(av,false));
IF _tipo='receber' THEN
INSERT INTO financeiro_recibo_contadores(company_id,ultimo) VALUES(c,1) ON CONFLICT(company_id) DO UPDATE SET ultimo=financeiro_recibo_contadores.ultimo+1 RETURNING ultimo INTO n;
INSERT INTO financeiro_caixa_recibos(company_id,movimento_id,numero,pagador,paciente_id) VALUES(c,r,n,l.pagador,l.paciente_id); END IF;
PERFORM financeiro__auditar(c,'financeiro_caixa_movimentos',r,_tipo,NULL,jsonb_build_object('valor',v,'sessao',s.id)); RETURN r; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_movimentar(uuid,text,jsonb,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_movimentar(uuid,text,jsonb,uuid) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_fechar(_sessao uuid,_contado numeric,_motivo text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s financeiro_caixa_sessoes; t jsonb; d numeric(14,2); BEGIN
IF NOT financeiro_tem_permissao('caixa.operar') THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
SELECT * INTO s FROM financeiro_caixa_sessoes WHERE id=_sessao AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
IF s.id IS NULL OR s.operador_id<>auth.uid() THEN RAISE EXCEPTION 'Sessão indisponível'; END IF;
IF s.fechado_em IS NOT NULL THEN RAISE EXCEPTION 'Sessão fechada'; END IF;
IF _contado IS NULL OR _contado<0 OR _contado::text IN ('NaN','Infinity','-Infinity') OR _contado<>round(_contado,2) THEN RAISE EXCEPTION 'Contagem inválida'; END IF;
t:=financeiro_caixa_totais(s.id); d:=_contado-coalesce((t->>'dinheiro')::numeric,0);
IF d<>0 AND nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Justificativa obrigatória para diferença'; END IF;
UPDATE financeiro_caixa_sessoes SET fechado_em=now(),contado=_contado,esperado=t,diferenca=d,justificativa=nullif(btrim(_motivo),'') WHERE id=s.id;
PERFORM financeiro__auditar(s.company_id,'financeiro_caixa_sessoes',s.id,'fechamento',NULL,jsonb_build_object('esperado',t,'contado',_contado,'diferenca',d,'motivo',_motivo)); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_fechar(uuid,numeric,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_fechar(uuid,numeric,text) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_reabrir(_sessao uuid,_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s financeiro_caixa_sessoes; BEGIN
IF NOT financeiro_tem_permissao('caixa.reabrir') THEN RAISE EXCEPTION 'Sem permissão para reabrir caixa'; END IF;
IF nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
SELECT * INTO s FROM financeiro_caixa_sessoes WHERE id=_sessao AND company_id=get_user_company_id(auth.uid()) FOR UPDATE;
IF s.id IS NULL OR (s.operador_id<>auth.uid() AND NOT financeiro_tem_permissao('caixa.ver_todos')) THEN RAISE EXCEPTION 'Sessão indisponível'; END IF;
IF s.fechado_em IS NULL THEN RAISE EXCEPTION 'Sessão já aberta'; END IF;
UPDATE financeiro_caixa_sessoes SET fechado_em=NULL,contado=NULL,esperado=NULL,diferenca=NULL,justificativa=NULL WHERE id=s.id;
PERFORM financeiro__auditar(s.company_id,'financeiro_caixa_sessoes',s.id,'reabertura',to_jsonb(s),jsonb_build_object('motivo',btrim(_motivo))); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_reabrir(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_reabrir(uuid,text) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_estornar(_movimento uuid,_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); m financeiro_caixa_movimentos; s financeiro_caixa_sessoes; l financeiro_lancamentos; BEGIN
IF NOT financeiro_tem_permissao('caixa.operar') THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
IF nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
SELECT * INTO m FROM financeiro_caixa_movimentos WHERE id=_movimento AND company_id=c;
SELECT * INTO s FROM financeiro_caixa_sessoes WHERE id=m.sessao_id FOR UPDATE;
IF s.id IS NULL OR s.operador_id<>auth.uid() THEN RAISE EXCEPTION 'Sessão indisponível'; END IF;
IF s.fechado_em IS NOT NULL THEN RAISE EXCEPTION 'Sessão fechada'; END IF;
SELECT * INTO m FROM financeiro_caixa_movimentos WHERE id=_movimento FOR UPDATE;
IF m.estornado_em IS NOT NULL THEN RAISE EXCEPTION 'Movimento já estornado'; END IF;
IF m.tipo IN ('receber','suprimento') AND coalesce((SELECT sum((f->>'valor')::numeric) FROM jsonb_array_elements(m.formas) f WHERE f->>'forma'='dinheiro'),0)>coalesce((financeiro_caixa_totais(s.id)->>'dinheiro')::numeric,0) THEN RAISE EXCEPTION 'Espécie insuficiente para estorno'; END IF;
IF m.lancamento_id IS NOT NULL THEN
SELECT * INTO l FROM financeiro_lancamentos WHERE id=m.lancamento_id FOR UPDATE;
UPDATE financeiro_baixas SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=ANY(m.baixa_ids);
UPDATE financeiro_lancamentos SET status=CASE WHEN (SELECT coalesce(sum(valor),0) FROM financeiro_baixas WHERE lancamento_id=l.id AND estornado_em IS NULL)=0 THEN CASE WHEN m.avulso THEN 'cancelado' ELSE 'aberto' END ELSE 'parcial' END,cancelado_motivo=CASE WHEN m.avulso THEN btrim(_motivo) ELSE cancelado_motivo END WHERE id=l.id;
END IF;
IF m.transferencia_id IS NOT NULL THEN UPDATE financeiro_transferencias SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=m.transferencia_id; END IF;
UPDATE financeiro_caixa_movimentos SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=m.id;
PERFORM financeiro__auditar(c,'financeiro_caixa_movimentos',m.id,'estorno',jsonb_build_object('valor',m.valor),jsonb_build_object('motivo',btrim(_motivo))); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_estornar(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_estornar(uuid,text) TO authenticated;
CREATE FUNCTION public.financeiro_transferencia_estornar(_transferencia uuid,_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); t financeiro_transferencias; BEGIN
IF NOT financeiro_tem_permissao('cancelar') OR NOT financeiro_tem_permissao('ver') THEN RAISE EXCEPTION 'Sem permissão financeira'; END IF;
IF nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
SELECT * INTO t FROM financeiro_transferencias WHERE id=_transferencia AND company_id=c FOR UPDATE; IF t.id IS NULL OR t.estornado_em IS NOT NULL THEN RAISE EXCEPTION 'Transferência indisponível'; END IF;
IF EXISTS(SELECT 1 FROM financeiro_caixa_movimentos WHERE transferencia_id=t.id) THEN RAISE EXCEPTION 'Estorne pelo movimento do caixa'; END IF;
UPDATE financeiro_transferencias SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=t.id;
PERFORM financeiro__auditar(c,'financeiro_transferencias',t.id,'estorno',jsonb_build_object('valor',t.valor),jsonb_build_object('motivo',_motivo)); END $$;
REVOKE ALL ON FUNCTION public.financeiro_transferencia_estornar(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_transferencia_estornar(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.financeiro_saldos(_ate date DEFAULT CURRENT_DATE) RETURNS TABLE(id uuid,nome text,saldo numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT c.id,c.nome,c.saldo_inicial+coalesce((SELECT sum(CASE WHEN l.tipo='receita' THEN 1 ELSE -1 END*(b.valor+b.juros+b.multa-b.desconto)) FROM financeiro_baixas b JOIN financeiro_lancamentos l ON l.id=b.lancamento_id WHERE b.conta_id=c.id AND b.estornado_em IS NULL AND b.data BETWEEN c.data_inicial AND _ate),0)+coalesce((SELECT sum(CASE WHEN t.destino_id=c.id THEN t.valor ELSE -t.valor END) FROM financeiro_transferencias t WHERE (t.origem_id=c.id OR t.destino_id=c.id) AND t.estornado_em IS NULL AND t.data BETWEEN c.data_inicial AND _ate),0) FROM financeiro_contas c WHERE c.company_id=get_user_company_id(auth.uid()) AND financeiro_tem_permissao('ver') AND c.data_inicial<=_ate $$;
REVOKE ALL ON FUNCTION public.financeiro_saldos(date) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_saldos(date) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_catalogos() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); BEGIN
IF NOT (financeiro_tem_permissao('caixa.operar') OR financeiro_tem_permissao('caixa.ver_todos') OR financeiro_tem_permissao('caixa.configurar')) THEN RAISE EXCEPTION 'Sem permissão para caixa'; END IF;
RETURN jsonb_build_object('contas',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',nome,'tipo',tipo,'ativa',ativa)),'[]') FROM financeiro_contas WHERE company_id=c),'categorias',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',nome,'tipo',tipo,'ativa',ativa)),'[]') FROM financeiro_categorias WHERE company_id=c),'operadores',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',full_name)),'[]') FROM profiles WHERE company_id=c AND (id=auth.uid() OR financeiro_tem_permissao('caixa.ver_todos')))); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_catalogos() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_catalogos() TO authenticated;
CREATE FUNCTION public.financeiro_caixa_buscar_receber(_busca text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT financeiro_tem_permissao('caixa.operar') THEN RAISE EXCEPTION 'Sem permissão para caixa'; END IF;
RETURN (SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]') FROM(SELECT l.id,l.descricao,l.pagador,l.valor-coalesce((SELECT sum(b.valor) FROM financeiro_baixas b WHERE b.lancamento_id=l.id AND b.estornado_em IS NULL),0) saldo FROM financeiro_lancamentos l WHERE l.company_id=get_user_company_id(auth.uid()) AND l.tipo='receita' AND l.status IN ('aberto','parcial') AND (l.descricao ILIKE '%'||coalesce(_busca,'')||'%' OR l.pagador ILIKE '%'||coalesce(_busca,'')||'%') ORDER BY l.vencimento,l.id LIMIT 50) q); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_buscar_receber(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_buscar_receber(text) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_recibo(_movimento uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE m financeiro_caixa_movimentos; r financeiro_caixa_recibos; e jsonb; op text; BEGIN
SELECT * INTO m FROM financeiro_caixa_movimentos WHERE id=_movimento AND company_id=get_user_company_id(auth.uid());
IF NOT financeiro_caixa_visivel(m.sessao_id) THEN RAISE EXCEPTION 'Recibo indisponível'; END IF;
UPDATE financeiro_caixa_recibos SET impressoes=impressoes+1 WHERE movimento_id=m.id RETURNING * INTO r;
IF r.id IS NULL THEN RAISE EXCEPTION 'Recibo indisponível'; END IF;
SELECT jsonb_build_object('nome',coalesce(nome_fantasia,name),'razao_social',name,'cnpj',cnpj,'endereco',concat_ws(' ',logradouro,numero,bairro,cidade,estado),'telefone',telefone) INTO e FROM companies WHERE id=r.company_id;
SELECT p.full_name INTO op FROM profiles p JOIN financeiro_caixa_sessoes s ON s.operador_id=p.id WHERE s.id=m.sessao_id;
RETURN jsonb_build_object('numero',r.numero,'via',CASE WHEN r.impressoes>1 THEN '2ª via' ELSE '1ª via' END,'empresa',e,'pagador',r.pagador,'valor',m.valor,'formas',m.formas,'operador',op,'data',r.emitido_em,'estornado',m.estornado_em IS NOT NULL); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_recibo(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_recibo(uuid) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_guarda_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Guarda fiscal: exclusão proibida'; END IF;
IF TG_TABLE_NAME='financeiro_caixa_sessoes' AND OLD.fechado_em IS NOT NULL AND NEW.fechado_em IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Sessão fechada imutável'; END IF;
IF TG_TABLE_NAME='financeiro_caixa_sessoes' AND OLD.fechado_em IS NOT NULL AND NEW.fechado_em IS NULL AND NOT financeiro_tem_permissao('caixa.reabrir') THEN RAISE EXCEPTION 'Sem permissão para reabrir caixa'; END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_guarda_trg() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER caixa_sessao_guarda BEFORE UPDATE OR DELETE ON public.financeiro_caixa_sessoes FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_guarda_trg();
CREATE TRIGGER caixa_movimento_guarda BEFORE DELETE ON public.financeiro_caixa_movimentos FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_guarda_trg();
CREATE TRIGGER caixa_recibo_guarda BEFORE DELETE ON public.financeiro_caixa_recibos FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_guarda_trg();
CREATE TRIGGER transferencia_guarda BEFORE DELETE ON public.financeiro_transferencias FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_guarda_trg();
CREATE FUNCTION public.financeiro_caixa_baixa_guarda_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF EXISTS(SELECT 1 FROM financeiro_caixa_movimentos m WHERE OLD.id=ANY(m.baixa_ids) AND m.estornado_em IS NULL) AND (NOT financeiro_tem_permissao('caixa.operar') OR EXISTS(SELECT 1 FROM financeiro_caixa_movimentos m JOIN financeiro_caixa_sessoes s ON s.id=m.sessao_id WHERE OLD.id=ANY(m.baixa_ids) AND (s.fechado_em IS NOT NULL OR s.operador_id<>auth.uid()))) THEN RAISE EXCEPTION 'Baixa vinculada a sessão protegida'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_baixa_guarda_trg() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER caixa_baixa_guarda BEFORE UPDATE ON public.financeiro_baixas FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_baixa_guarda_trg();
CREATE FUNCTION public.financeiro_caixa_lgpd_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF OLD.paciente_id IS NOT NULL AND NEW.paciente_id IS NULL THEN UPDATE financeiro_caixa_recibos SET paciente_id=NULL,pagador=NULL WHERE paciente_id=OLD.paciente_id AND company_id=OLD.company_id; UPDATE financeiro_caixa_movimentos SET payload=payload-'pagador'-'paciente_id' WHERE lancamento_id=OLD.id; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_lgpd_trg() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER caixa_lgpd AFTER UPDATE OF paciente_id ON public.financeiro_lancamentos FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_lgpd_trg();
COMMENT ON TABLE public.financeiro_caixa_sessoes IS 'Guarda fiscal: fora de todos os jobs de retenção automática. Fundo é contagem de dinheiro já existente, não receita.';
COMMENT ON TABLE public.financeiro_caixa_movimentos IS 'Guarda fiscal: fora da retenção; estorno preserva o original.';
COMMENT ON TABLE public.financeiro_caixa_recibos IS 'Guarda fiscal: fora da retenção; LGPD desvincula pagador/paciente sem alterar número e valores.';
COMMENT ON TABLE public.financeiro_transferencias IS 'Guarda fiscal: fora da retenção automática; transferências neutras entre contas.';