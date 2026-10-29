CREATE OR REPLACE FUNCTION public.financeiro_caixa_baixa_guarda_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF EXISTS(SELECT 1 FROM financeiro_caixa_movimentos m WHERE OLD.id=ANY(m.baixa_ids)) AND coalesce(current_setting('axis.caixa_estorno',true),'')<>coalesce((SELECT id::text FROM financeiro_caixa_movimentos WHERE OLD.id=ANY(baixa_ids) LIMIT 1),'') THEN RAISE EXCEPTION 'Estorne pelo movimento do caixa'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_baixa_guarda_trg() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.financeiro_caixa_estorno_contexto_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s financeiro_caixa_sessoes; BEGIN
SELECT * INTO s FROM financeiro_caixa_sessoes WHERE id=NEW.sessao_id FOR UPDATE;
IF OLD.estornado_em IS NULL AND NEW.estornado_em IS NOT NULL THEN
IF s.fechado_em IS NOT NULL OR s.operador_id<>auth.uid() OR NOT financeiro_tem_permissao('caixa.operar') OR nullif(btrim(NEW.estorno_motivo),'') IS NULL THEN RAISE EXCEPTION 'Sessão protegida'; END IF;
END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_estorno_contexto_trg() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER caixa_movimento_estorno_guard BEFORE UPDATE OF estornado_em ON public.financeiro_caixa_movimentos FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_estorno_contexto_trg();
CREATE OR REPLACE FUNCTION public.financeiro_caixa_estornar(_movimento uuid,_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c uuid:=get_user_company_id(auth.uid()); m financeiro_caixa_movimentos; s financeiro_caixa_sessoes; l financeiro_lancamentos; BEGIN
IF NOT financeiro_tem_permissao('caixa.operar') THEN RAISE EXCEPTION 'Sem permissão para operar caixa'; END IF;
IF nullif(btrim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
SELECT * INTO m FROM financeiro_caixa_movimentos WHERE id=_movimento AND company_id=c;
SELECT * INTO s FROM financeiro_caixa_sessoes WHERE id=m.sessao_id FOR UPDATE;
IF s.id IS NULL OR s.operador_id<>auth.uid() THEN RAISE EXCEPTION 'Sessão indisponível'; END IF;
IF s.fechado_em IS NOT NULL THEN RAISE EXCEPTION 'Sessão fechada'; END IF;
SELECT * INTO m FROM financeiro_caixa_movimentos WHERE id=_movimento FOR UPDATE;
IF m.estornado_em IS NOT NULL THEN RAISE EXCEPTION 'Movimento já estornado'; END IF;
IF m.tipo IN ('receber','suprimento') AND coalesce((SELECT sum((f->>'valor')::numeric) FROM jsonb_array_elements(m.formas) f WHERE f->>'forma'='dinheiro'),0)>coalesce((financeiro_caixa_totais(s.id)->>'dinheiro')::numeric,0) THEN RAISE EXCEPTION 'Espécie insuficiente para estorno'; END IF;
PERFORM set_config('axis.caixa_estorno',m.id::text,true);
IF m.lancamento_id IS NOT NULL THEN
SELECT * INTO l FROM financeiro_lancamentos WHERE id=m.lancamento_id FOR UPDATE;
UPDATE financeiro_baixas SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=ANY(m.baixa_ids);
UPDATE financeiro_lancamentos SET status=CASE WHEN (SELECT coalesce(sum(valor),0) FROM financeiro_baixas WHERE lancamento_id=l.id AND estornado_em IS NULL)=0 THEN CASE WHEN m.avulso THEN 'cancelado' ELSE 'aberto' END ELSE 'parcial' END,cancelado_motivo=CASE WHEN m.avulso THEN btrim(_motivo) ELSE cancelado_motivo END WHERE id=l.id;
END IF;
IF m.transferencia_id IS NOT NULL THEN UPDATE financeiro_transferencias SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=m.transferencia_id; END IF;
UPDATE financeiro_caixa_movimentos SET estornado_em=now(),estornado_por=auth.uid(),estorno_motivo=btrim(_motivo) WHERE id=m.id;
PERFORM set_config('axis.caixa_estorno','',true);
PERFORM financeiro__auditar(c,'financeiro_caixa_movimentos',m.id,'estorno',jsonb_build_object('valor',m.valor),jsonb_build_object('motivo',btrim(_motivo))); END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_estornar(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_caixa_estornar(uuid,text) TO authenticated;
CREATE FUNCTION public.financeiro_caixa_conta_guarda_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF (EXISTS(SELECT 1 FROM financeiro_transferencias WHERE origem_id=OLD.id OR destino_id=OLD.id) OR EXISTS(SELECT 1 FROM financeiro_caixas x JOIN financeiro_caixa_sessoes s ON s.caixa_id=x.id WHERE x.conta_id=OLD.id)) AND (NEW.saldo_inicial IS DISTINCT FROM OLD.saldo_inicial OR NEW.data_inicial IS DISTINCT FROM OLD.data_inicial OR NEW.tipo IS DISTINCT FROM OLD.tipo) THEN RAISE EXCEPTION 'Conta movimentada: saldo, data e tipo imutáveis'; END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_caixa_conta_guarda_trg() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER caixa_conta_guarda BEFORE UPDATE ON public.financeiro_contas FOR EACH ROW EXECUTE FUNCTION public.financeiro_caixa_conta_guarda_trg();
CREATE FUNCTION public.financeiro_transferencia_guarda_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF EXISTS(SELECT 1 FROM financeiro_caixa_movimentos WHERE transferencia_id=OLD.id) AND coalesce(current_setting('axis.caixa_estorno',true),'')<>coalesce((SELECT id::text FROM financeiro_caixa_movimentos WHERE transferencia_id=OLD.id),'') THEN RAISE EXCEPTION 'Estorne pelo movimento do caixa'; END IF;
IF NOT EXISTS(SELECT 1 FROM financeiro_caixa_movimentos WHERE transferencia_id=OLD.id) AND EXISTS(SELECT 1 FROM financeiro_caixas x JOIN financeiro_caixa_sessoes s ON s.caixa_id=x.id WHERE x.conta_id IN (OLD.origem_id,OLD.destino_id) AND s.fechado_em IS NULL) THEN RAISE EXCEPTION 'Transferência vinculada a conta com caixa aberto'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.financeiro_transferencia_guarda_trg() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER transferencia_estorno_guard BEFORE UPDATE ON public.financeiro_transferencias FOR EACH ROW EXECUTE FUNCTION public.financeiro_transferencia_guarda_trg();