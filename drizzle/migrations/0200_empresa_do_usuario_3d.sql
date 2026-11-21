-- Etapa 3D — funções de usuário logado passam a conferir a empresa do usuário.
-- Mantêm assinatura e formato de retorno. Servidor (service_role) e contexto interno do banco (sem requisição) seguem liberados.
-- Nenhum dado é alterado. Reversão: ver bloco "REVERSÃO" no fim deste arquivo.

-- 1. Nome e conselho só de profissionais da empresa do usuário.
CREATE OR REPLACE FUNCTION public.lab_aprovador_info(_ids uuid[])
 RETURNS TABLE(id uuid, full_name text, council_type text, council_uf text, council_number text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.council_type, p.council_uf, p.council_number
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role'
         OR (auth.uid() IS NOT NULL AND p.company_id = public.get_user_company_id(auth.uid())))
$function$;

-- 2. Material do exame e código da alíquota só para pedido da empresa do usuário (outra empresa: vazio / nulo).
CREATE OR REPLACE FUNCTION public.apoio_item_material(_pedido uuid, _exame uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce((SELECT coalesce(ex->>'material', ex->>'selectedMaterial', ex->>'materialName')
    FROM public.attendance_orders ao,
      jsonb_array_elements(CASE WHEN jsonb_typeof(ao.lab_guides)='array' THEN ao.lab_guides ELSE '[]'::jsonb END) g,
      jsonb_array_elements(CASE WHEN jsonb_typeof(g->'exams')='array' THEN g->'exams' ELSE '[]'::jsonb END) ex
    WHERE ao.id = _pedido AND coalesce(ex->>'examId', ex->>'id') = _exame::text
      AND (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role'
           OR (auth.uid() IS NOT NULL AND ao.company_id = public.get_user_company_id(auth.uid())))
    LIMIT 1), '');
$function$;

CREATE OR REPLACE FUNCTION public.apoio_codigo_aliquota(_pedido uuid, _apoio uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT upper(coalesce(ao.order_number, left(ao.id::text,8))) || '-AP' || (
    SELECT count(DISTINCT pe.apoio_id) FROM public.apoio_pedido_exame pe
     WHERE pe.pedido_id = _pedido AND pe.apoio_id::text <= _apoio::text)
  FROM public.attendance_orders ao WHERE ao.id = _pedido
    AND (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role'
         OR (auth.uid() IS NOT NULL AND ao.company_id = public.get_user_company_id(auth.uid())));
$function$;

-- 3. Próximo número de pedido só da empresa do usuário (ou servidor).
CREATE OR REPLACE FUNCTION public.next_attendance_order_number(_company_id uuid, _origin_id uuid, _origin_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  nxt integer;
  suffix text := lpad(coalesce(nullif(regexp_replace(coalesce(_origin_code,'00'), '\D', '', 'g'), ''), '0'), 2, '0');
BEGIN
  IF NOT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role'
          OR (auth.uid() IS NOT NULL AND _company_id IS NOT DISTINCT FROM public.get_user_company_id(auth.uid()))) THEN
    RAISE EXCEPTION 'Sem permissão para numerar pedidos desta empresa' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_company_id::text || ':pedido:' || suffix));

  SELECT coalesce(max(nullif(regexp_replace(split_part(order_number, '-', 1), '\D', '', 'g'), '')::int), 0) + 1
    INTO nxt
    FROM public.attendance_orders
   WHERE company_id = _company_id
     AND split_part(order_number, '-', 2) = suffix;

  WHILE EXISTS (
    SELECT 1 FROM public.attendance_orders
     WHERE company_id = _company_id
       AND (order_number = nxt::text || '-' || suffix OR protocol = nxt::text || '-' || suffix)
  ) LOOP
    nxt := nxt + 1;
  END LOOP;

  RETURN nxt::text || '-' || suffix;
END;
$function$;

-- 4. Feriados nacionais: só gestor da empresa ou Super Admin. Continua sem duplicar (ON CONFLICT DO NOTHING).
CREATE OR REPLACE FUNCTION public.carregar_feriados_nacionais(_ano integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p date; n int;
BEGIN
  IF NOT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role'
          OR (auth.uid() IS NOT NULL AND (public.is_company_manager(auth.uid()) OR private.is_super_admin()))) THEN
    RAISE EXCEPTION 'Apenas o administrador da empresa pode carregar os feriados nacionais' USING ERRCODE = '42501';
  END IF;
  IF _ano < 2000 OR _ano > 2100 THEN RAISE EXCEPTION 'Ano inválido'; END IF;
  p := public.data_pascoa(_ano);
  INSERT INTO public.feriado (company_id, data, descricao, abrangencia)
  SELECT NULL, d, t, 'nacional' FROM (VALUES
    (make_date(_ano,1,1),'Confraternização Universal'),
    (p - 48,'Carnaval (segunda-feira)'),
    (p - 47,'Carnaval (terça-feira)'),
    (p - 2,'Sexta-feira Santa'),
    (make_date(_ano,4,21),'Tiradentes'),
    (make_date(_ano,5,1),'Dia do Trabalho'),
    (p + 60,'Corpus Christi'),
    (make_date(_ano,9,7),'Independência do Brasil'),
    (make_date(_ano,10,12),'Nossa Senhora Aparecida'),
    (make_date(_ano,11,2),'Finados'),
    (make_date(_ano,11,15),'Proclamação da República'),
    (make_date(_ano,11,20),'Dia Nacional de Zumbi e da Consciência Negra'),
    (make_date(_ano,12,25),'Natal')
  ) v(d,t)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;

-- 5 e 6. Usadas só por dentro de outras funções do banco: sem acesso direto de usuário logado.
REVOKE EXECUTE ON FUNCTION public.chat_interno_ativo(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_interno_ativo(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.apoio_valida_cod_ped(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_valida_cod_ped(uuid, text) TO service_role;

-- Permissões das funções reescritas ficam como estavam: só logado e servidor.
REVOKE EXECUTE ON FUNCTION public.lab_aprovador_info(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apoio_item_material(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apoio_codigo_aliquota(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_attendance_order_number(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.carregar_feriados_nacionais(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_aprovador_info(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apoio_item_material(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apoio_codigo_aliquota(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_attendance_order_number(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.carregar_feriados_nacionais(integer) TO authenticated, service_role;

-- REVERSÃO (nova migração, nunca editar esta):
-- * Acesso direto: GRANT EXECUTE ON FUNCTION public.chat_interno_ativo(uuid), public.apoio_valida_cod_ped(uuid, text) TO authenticated;
-- * Funções reescritas: recriar com o texto anterior, que é este mesmo texto sem as linhas
--   "AND (auth.jwt() IS NULL OR ... get_user_company_id(auth.uid())))" (lab_aprovador_info, apoio_item_material, apoio_codigo_aliquota)
--   e sem o bloco "IF NOT (auth.jwt() IS NULL ...) THEN RAISE ... END IF;" (next_attendance_order_number, carregar_feriados_nacionais).
