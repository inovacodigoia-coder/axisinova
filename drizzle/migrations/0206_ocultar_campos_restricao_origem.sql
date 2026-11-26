ALTER TABLE public.user_attendance_origin_restrictions ADD COLUMN IF NOT EXISTS hidden_fields text[] NOT NULL DEFAULT '{}';
DROP FUNCTION IF EXISTS public.usuario_origens_restricao_salvar(uuid, boolean, uuid[]);
CREATE FUNCTION public.usuario_origens_restricao_salvar(_user_id uuid, _enabled boolean, _origin_ids uuid[], _hidden_fields text[] DEFAULT '{}')
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_company uuid; v_ids uuid[]; v_count integer; v_hidden text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_company_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem alterar a restrição de origens';
  END IF;
  SELECT p.company_id INTO v_company FROM public.profiles p WHERE p.id = _user_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Usuário ou empresa não encontrados'; END IF;
  IF public.get_user_company_id(auth.uid()) IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'Sem permissão para alterar usuários desta empresa';
  END IF;
  SELECT coalesce(array_agg(DISTINCT origin_id), '{}'::uuid[]) INTO v_ids FROM unnest(coalesce(_origin_ids, '{}'::uuid[])) AS origin_id;
  IF coalesce(_enabled, false) AND cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos uma origem para ativar a restrição';
  END IF;
  SELECT count(*) INTO v_count FROM public.origins o WHERE o.company_id = v_company AND o.id = ANY(v_ids);
  IF v_count <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Uma ou mais origens não pertencem à empresa do usuário';
  END IF;
  SELECT coalesce(array_agg(DISTINCT f), '{}'::text[]) INTO v_hidden
  FROM unnest(coalesce(_hidden_fields, '{}'::text[])) f WHERE f IN ('busca_global','unidade');
  INSERT INTO public.user_attendance_origin_restrictions (user_id, company_id, enabled, origin_ids, hidden_fields)
  VALUES (_user_id, v_company, coalesce(_enabled, false), v_ids, v_hidden)
  ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, origin_ids = EXCLUDED.origin_ids,
    hidden_fields = EXCLUDED.hidden_fields, updated_at = now();
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.usuario_origens_restricao_salvar(uuid, boolean, uuid[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_origens_restricao_salvar(uuid, boolean, uuid[], text[]) TO authenticated;