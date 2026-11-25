CREATE TABLE public.user_attendance_origin_restrictions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT false,
  origin_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_attendance_origin_restrictions_nonempty
    CHECK (NOT enabled OR cardinality(origin_ids) > 0)
);

GRANT SELECT ON public.user_attendance_origin_restrictions TO authenticated;
GRANT ALL ON public.user_attendance_origin_restrictions TO service_role;

ALTER TABLE public.user_attendance_origin_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario le sua restricao e administrador le da empresa"
ON public.user_attendance_origin_restrictions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    public.is_company_manager(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.usuario_origens_restricao_salvar(
  _user_id uuid,
  _enabled boolean,
  _origin_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_ids uuid[];
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_company_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores podem alterar a restrição de origens';
  END IF;

  SELECT p.company_id INTO v_company
  FROM public.profiles p
  WHERE p.id = _user_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Usuário ou empresa não encontrados';
  END IF;

  IF public.get_user_company_id(auth.uid()) IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'Sem permissão para alterar usuários desta empresa';
  END IF;

  SELECT coalesce(array_agg(DISTINCT origin_id), '{}'::uuid[])
  INTO v_ids
  FROM unnest(coalesce(_origin_ids, '{}'::uuid[])) AS origin_id;

  IF coalesce(_enabled, false) AND cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos uma origem para ativar a restrição';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.origins o
  WHERE o.company_id = v_company
    AND o.id = ANY(v_ids);

  IF v_count <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Uma ou mais origens não pertencem à empresa do usuário';
  END IF;

  INSERT INTO public.user_attendance_origin_restrictions
    (user_id, company_id, enabled, origin_ids)
  VALUES
    (_user_id, v_company, coalesce(_enabled, false), v_ids)
  ON CONFLICT (user_id) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      origin_ids = EXCLUDED.origin_ids,
      updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.usuario_origens_restricao_salvar(uuid, boolean, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_origens_restricao_salvar(uuid, boolean, uuid[]) TO authenticated, service_role;