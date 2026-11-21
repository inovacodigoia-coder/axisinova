-- Etapa 3A: bancada_itens_exame e bancada_item_tem_resultado exigem login e mesma empresa.
-- Reversão: recriar as versões de 0027_bancada_destino_exame.sql e GRANT EXECUTE ... TO anon, PUBLIC.

CREATE OR REPLACE FUNCTION public.bancada_itens_exame(_exam uuid)
 RETURNS TABLE(pedido_id uuid, order_number text, paciente text, criado_em timestamp with time zone, gi integer, ei integer, bancada_id uuid, origem text, coletado boolean, apoio_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ao.id, coalesce(ao.order_number, ao.protocol), ao.patient_name, ao.created_at, (g.o - 1)::int, (x.o - 1)::int,
    coalesce(nullif(x.ex->>'bancadaId','')::uuid, e.workbench_id), coalesce(x.ex->>'bancadaOrigem','cadastro'),
    bancada_item_coletado(ao.status, x.ex),
    (SELECT pe.status::text FROM apoio_pedido_exame pe WHERE pe.pedido_id = ao.id AND pe.exame_id = _exam AND pe.status <> 'cancelado' ORDER BY pe.created_at DESC LIMIT 1)
  FROM exams e
  JOIN attendance_orders ao ON ao.company_id = e.company_id
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides)='array' THEN ao.lab_guides ELSE '[]'::jsonb END) WITH ORDINALITY g(gd, o)
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(g.gd->'exams')='array' THEN g.gd->'exams' ELSE '[]'::jsonb END) WITH ORDINALITY x(ex, o)
  WHERE e.id = _exam AND (x.ex->>'id') = _exam::text
    AND auth.uid() IS NOT NULL
    AND e.company_id = get_user_company_id(auth.uid())
    AND coalesce(ao.status,'') NOT IN ('deleted','cancelled','completed','released')
    AND coalesce((x.ex->>'cancelled')::boolean,false) = false;
$function$;

CREATE OR REPLACE FUNCTION public.bancada_item_tem_resultado(_order uuid, _exam uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM attendance_orders ao WHERE ao.id = _order AND ao.company_id = get_user_company_id(auth.uid()))
    AND EXISTS (SELECT 1 FROM lab_exam_results r WHERE r.order_id = _order AND r.exam_catalog_id = _exam
      AND (r.status IN ('digitized','released') OR EXISTS (SELECT 1 FROM lab_result_values v WHERE v.result_id = r.id)));
$function$;

REVOKE EXECUTE ON FUNCTION public.bancada_itens_exame(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bancada_item_tem_resultado(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bancada_itens_exame(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bancada_item_tem_resultado(uuid, uuid) TO authenticated, service_role;