CREATE OR REPLACE FUNCTION public._auth_user_lock_guard(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller record; v_target_company uuid; v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT company_id INTO v_target_company FROM public.profiles WHERE id = _user_id;
  IF NOT private.is_super_admin() THEN
    SELECT company_id, role, is_admin INTO v_caller FROM public.profiles WHERE id = auth.uid();
    IF v_caller.company_id IS NULL OR v_caller.company_id IS DISTINCT FROM v_target_company
       OR NOT (coalesce(v_caller.is_admin,false) OR v_caller.role = 'company_admin') THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
  END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = _user_id;
  RETURN v_email;
END $$;
REVOKE ALL ON FUNCTION public._auth_user_lock_guard(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.auth_user_lockout_status(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_lock record;
BEGIN
  v_email := public._auth_user_lock_guard(_user_id);
  IF v_email IS NULL THEN RETURN jsonb_build_object('locked', false); END IF;
  SELECT * INTO v_lock FROM public.auth_lockouts
   WHERE released_at IS NULL AND expires_at > now() AND lock_type='identifier' AND lower(lock_key)=v_email
   ORDER BY expires_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('locked', false); END IF;
  RETURN jsonb_build_object('locked', true, 'locked_at', v_lock.locked_at, 'expires_at', v_lock.expires_at, 'failed_count', v_lock.failed_count);
END $$;
REVOKE ALL ON FUNCTION public.auth_user_lockout_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_lockout_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auth_user_unlock(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_n int;
BEGIN
  v_email := public._auth_user_lock_guard(_user_id);
  IF v_email IS NULL THEN RETURN false; END IF;
  UPDATE public.auth_lockouts SET released_at = now(), released_by = auth.uid()
   WHERE released_at IS NULL AND lock_type='identifier' AND lower(lock_key)=v_email;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  -- zera a contagem de falhas recentes para não bloquear de novo na próxima tentativa
  UPDATE public.login_attempts SET success = true
   WHERE success = false AND lower(user_identifier)=v_email AND attempted_at > now() - interval '15 minutes';
  RETURN v_n > 0;
END $$;
REVOKE ALL ON FUNCTION public.auth_user_unlock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_unlock(uuid) TO authenticated;