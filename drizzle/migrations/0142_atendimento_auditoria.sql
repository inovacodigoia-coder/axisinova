CREATE OR REPLACE FUNCTION public.atendimento_auditar_alteracao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b jsonb; a jsonb; r jsonb; cid uuid; pedido uuid; anterior jsonb; posterior jsonb;
BEGIN
 IF TG_OP <> 'INSERT' THEN b:=to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN a:=to_jsonb(NEW); END IF;
 r:=coalesce(a,b); cid:=(r->>'company_id')::uuid;
 IF TG_TABLE_NAME='attendance_orders' THEN pedido:=(r->>'id')::uuid;
 ELSIF TG_TABLE_NAME='lab_exam_results' THEN pedido:=(r->>'order_id')::uuid;
 ELSE SELECT order_id INTO pedido FROM lab_exam_results WHERE id=(r->>'result_id')::uuid AND company_id=cid; END IF;
 IF pedido IS NULL THEN RETURN coalesce(NEW,OLD); END IF;
 b:=b-ARRAY['updated_at','hash','authorization_password','authorization_code','card_number','attachments'];
 a:=a-ARRAY['updated_at','hash','authorization_password','authorization_code','card_number','attachments'];
 SELECT jsonb_object_agg(k,b->k),jsonb_object_agg(k,a->k) INTO anterior,posterior
 FROM (SELECT key k FROM jsonb_each(coalesce(a,'{}')) UNION SELECT key FROM jsonb_each(coalesce(b,'{}'))) keys
 WHERE b->k IS DISTINCT FROM a->k;
 IF anterior IS NULL AND posterior IS NULL THEN RETURN coalesce(NEW,OLD); END IF;
 INSERT INTO apoio_auditoria(company_id,tabela,registro_id,acao,antes,depois,usuario_id)
 VALUES(cid,'atendimento_evento',pedido::text,lower(TG_OP),
 jsonb_build_object('fonte',TG_TABLE_NAME,'exame',coalesce(r->>'exam_name',r->>'parameter_name'),'campos',anterior),
 jsonb_build_object('fonte',TG_TABLE_NAME,'exame',coalesce(r->>'exam_name',r->>'parameter_name'),'campos',posterior),auth.uid());
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.atendimento_auditar_alteracao() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER atendimento_audit_order AFTER INSERT OR UPDATE OR DELETE ON public.attendance_orders FOR EACH ROW EXECUTE FUNCTION public.atendimento_auditar_alteracao();
CREATE TRIGGER atendimento_audit_result AFTER INSERT OR UPDATE OR DELETE ON public.lab_exam_results FOR EACH ROW EXECUTE FUNCTION public.atendimento_auditar_alteracao();
CREATE TRIGGER atendimento_audit_value AFTER INSERT OR UPDATE OR DELETE ON public.lab_result_values FOR EACH ROW EXECUTE FUNCTION public.atendimento_auditar_alteracao();
CREATE INDEX IF NOT EXISTS apoio_auditoria_pedido_idx ON public.apoio_auditoria(company_id,registro_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.atendimento_auditoria_lista(_pedido uuid,_limite integer DEFAULT 50,_offset integer DEFAULT 0)
RETURNS TABLE(id text,acao text,usuario_id uuid,usuario_nome text,created_at timestamptz,antes jsonb,depois jsonb,total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid:=public.get_user_company_id(auth.uid());
BEGIN
 IF auth.uid() IS NULL OR NOT public.atendimento_detalhes_tem_permissao('atendimento.auditoria') THEN RAISE EXCEPTION 'Sem permissão para consultar a auditoria'; END IF;
 IF NOT EXISTS(SELECT 1 FROM attendance_orders o WHERE o.id=_pedido AND o.company_id=cid) THEN RAISE EXCEPTION 'Atendimento não encontrado'; END IF;
 RETURN QUERY WITH eventos AS (
 SELECT a.id::text eid,a.acao action,a.usuario_id actor,a.created_at em,a.antes b,a.depois d
 FROM apoio_auditoria a WHERE a.company_id=cid AND (
 (a.registro_id=_pedido::text AND a.tabela IN ('attendance_orders','atendimento_evento','coleta_horario')) OR
 (a.tabela LIKE 'apoio_%' AND EXISTS(SELECT 1 FROM apoio_pedido_exame pe WHERE pe.company_id=cid AND pe.pedido_id=_pedido AND pe.id::text=a.registro_id)))
 UNION ALL SELECT 'cadastro:'||o.id,'cadastro',o.registered_by,o.created_at,NULL,jsonb_build_object('pedido',o.order_number,'responsavel',o.registered_by_name)
 FROM attendance_orders o WHERE o.id=_pedido AND o.company_id=cid
 UNION ALL SELECT 'digitacao:'||r.id,'digitacao',r.typed_by,r.typed_at,NULL,jsonb_build_object('exame',r.exam_name)
 FROM lab_exam_results r WHERE r.order_id=_pedido AND r.company_id=cid AND r.typed_at IS NOT NULL
 UNION ALL SELECT 'liberacao:'||r.id,'liberacao',r.released_by,r.released_at,NULL,jsonb_build_object('exame',r.exam_name)
 FROM lab_exam_results r WHERE r.order_id=_pedido AND r.company_id=cid AND r.released_at IS NOT NULL
 UNION ALL SELECT 'substituicao:'||h.id,'substituicao_aparelho',NULL,h.created_at,jsonb_build_object('parametro',h.parameter_name,'valor',h.value,'unidade',h.unit),jsonb_build_object('motivo',h.reason,'origem',h.replaced_by)
 FROM lab_result_value_history h JOIN lab_exam_results r ON r.id=h.result_id AND r.company_id=h.company_id
 WHERE r.order_id=_pedido AND h.company_id=cid
 UNION ALL SELECT 'apoio:'||h.id,'status_apoio',h.usuario_id,h.created_at,jsonb_build_object('status',h.status_de),jsonb_build_object('status',h.status_para,'motivo',h.motivo,'origem',h.origem)
 FROM apoio_pedido_exame_historico h JOIN apoio_pedido_exame pe ON pe.id=h.pedido_exame_id AND pe.company_id=h.company_id WHERE pe.pedido_id=_pedido AND h.company_id=cid
 UNION ALL SELECT 'impressao:'||l.id,'impressao',l.printed_by,l.printed_at,NULL,jsonb_build_object('documento',l.template_name,'formato',l.format)
 FROM document_print_logs l WHERE l.attendance_id=_pedido AND l.company_id=cid
 ) SELECT e.eid,e.action,e.actor,coalesce(p.full_name,e.d->>'responsavel',CASE WHEN e.actor IS NULL THEN 'Sistema / integração (sem usuário registrado)' ELSE 'Usuário sem nome disponível' END),e.em,e.b,e.d,count(*) OVER()
 FROM eventos e LEFT JOIN profiles p ON p.id=e.actor AND p.company_id=cid
 ORDER BY e.em DESC,e.eid LIMIT least(greatest(_limite,1),200) OFFSET greatest(_offset,0);
END $$;
REVOKE EXECUTE ON FUNCTION public.atendimento_auditoria_lista(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.atendimento_auditoria_lista(uuid,integer,integer) TO authenticated;