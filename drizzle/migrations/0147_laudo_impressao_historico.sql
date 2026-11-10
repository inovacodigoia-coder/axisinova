-- Histórico de impressões do laudo (Detalhes Atendimento).
-- Registro imutável: gravação só pela função laudo_impressao_registrar, leitura só pela laudo_impressao_lista.
CREATE TABLE IF NOT EXISTS public.laudo_impressao_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  attendance_id uuid NOT NULL REFERENCES public.attendance_orders(id),
  printed_by uuid NOT NULL,
  printed_by_name text,
  acao text NOT NULL CHECK (acao IN ('abrir','imprimir','download')),
  exames jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS laudo_impressao_log_pedido ON public.laudo_impressao_log (attendance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS laudo_impressao_log_empresa ON public.laudo_impressao_log (company_id, created_at DESC);
ALTER TABLE public.laudo_impressao_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.laudo_impressao_log FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.laudo_impressao_registrar(_pedido uuid, _acao text, _exames jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
  lista jsonb;
  novo uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Login necessário'; END IF;
  cid := public.get_user_company_id(uid);
  IF _acao IS NULL OR _acao NOT IN ('abrir','imprimir','download') THEN RAISE EXCEPTION 'Ação de impressão inválida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM attendance_orders o WHERE o.id = _pedido AND o.company_id = cid) THEN
    RAISE EXCEPTION 'Atendimento não encontrado';
  END IF;
  IF _exames IS NULL OR jsonb_typeof(_exames) <> 'array' OR jsonb_array_length(_exames) = 0 THEN
    RAISE EXCEPTION 'Informe os exames impressos';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', left(coalesce(e->>'id',''), 80),
           'codigo', left(coalesce(e->>'codigo',''), 40),
           'nome', left(coalesce(e->>'nome',''), 200))), '[]'::jsonb)
    INTO lista
    FROM (SELECT e FROM jsonb_array_elements(_exames) e WHERE jsonb_typeof(e) = 'object' LIMIT 300) x;
  IF jsonb_array_length(lista) = 0 THEN RAISE EXCEPTION 'Informe os exames impressos'; END IF;
  INSERT INTO laudo_impressao_log (company_id, attendance_id, printed_by, printed_by_name, acao, exames)
  VALUES (cid, _pedido, uid, (SELECT p.full_name FROM profiles p WHERE p.id = uid), _acao, lista)
  RETURNING id INTO novo;
  RETURN novo;
END $$;
REVOKE EXECUTE ON FUNCTION public.laudo_impressao_registrar(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.laudo_impressao_registrar(uuid, text, jsonb) TO authenticated;

-- Lista o histórico: impressões de laudo + declarações/termos impressos no atendimento.
CREATE OR REPLACE FUNCTION public.laudo_impressao_lista(_pedido uuid)
RETURNS TABLE(id text, tipo text, acao text, usuario_nome text, created_at timestamptz, exames jsonb, detalhe text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cid uuid := public.get_user_company_id(auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.atendimento_detalhes_tem_permissao('atendimento.historico_impressoes') THEN
    RAISE EXCEPTION 'Sem permissão para consultar o histórico de impressões';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM attendance_orders o WHERE o.id = _pedido AND o.company_id = cid) THEN
    RAISE EXCEPTION 'Atendimento não encontrado';
  END IF;
  RETURN QUERY
  SELECT * FROM (
    SELECT 'laudo:'||l.id::text, 'laudo'::text, l.acao,
           coalesce(p.full_name, l.printed_by_name, 'Usuário sem nome disponível'),
           l.created_at, l.exames, NULL::text
      FROM laudo_impressao_log l LEFT JOIN profiles p ON p.id = l.printed_by
     WHERE l.attendance_id = _pedido AND l.company_id = cid
    UNION ALL
    SELECT 'documento:'||d.id::text, 'documento'::text, 'imprimir'::text,
           coalesce(p.full_name, 'Usuário sem nome disponível'),
           d.printed_at, '[]'::jsonb, d.template_name || ' (' || d.format || ')'
      FROM document_print_logs d LEFT JOIN profiles p ON p.id = d.printed_by
     WHERE d.attendance_id = _pedido AND d.company_id = cid
  ) h
  ORDER BY 5 DESC
  LIMIT 500;
END $$;
REVOKE EXECUTE ON FUNCTION public.laudo_impressao_lista(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.laudo_impressao_lista(uuid) TO authenticated;

-- Auditoria do atendimento também mostra as impressões do laudo.
CREATE OR REPLACE FUNCTION public.atendimento_auditoria_lista(_pedido uuid, _limite integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(id text, acao text, usuario_id uuid, usuario_nome text, created_at timestamp with time zone, antes jsonb, depois jsonb, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
 UNION ALL SELECT 'laudo_impressao:'||li.id,'impressao_laudo',li.printed_by,li.created_at,NULL,jsonb_build_object('acao',li.acao,'exame',(SELECT string_agg(coalesce(nullif(x->>'codigo','')||' - ','')||(x->>'nome'),', ') FROM jsonb_array_elements(li.exames) x),'responsavel',li.printed_by_name)
 FROM laudo_impressao_log li WHERE li.attendance_id=_pedido AND li.company_id=cid
 ) SELECT e.eid,e.action,e.actor,coalesce(p.full_name,e.d->>'responsavel',CASE WHEN e.actor IS NULL THEN 'Sistema / integração (sem usuário registrado)' ELSE 'Usuário sem nome disponível' END),e.em,e.b,e.d,count(*) OVER()
 FROM eventos e LEFT JOIN profiles p ON p.id=e.actor AND p.company_id=cid
 ORDER BY e.em DESC,e.eid LIMIT least(greatest(_limite,1),200) OFFSET greatest(_offset,0);
END $function$;
