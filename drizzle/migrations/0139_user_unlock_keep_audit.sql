CREATE OR REPLACE FUNCTION public.auth_user_unlock(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_n int;
BEGIN
  v_email := public._auth_user_lock_guard(_user_id);
  IF v_email IS NULL THEN RETURN false; END IF;
  UPDATE public.auth_lockouts SET released_at = now(), released_by = auth.uid()
   WHERE released_at IS NULL AND lock_type='identifier' AND lower(lock_key)=v_email;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n > 0;
END $$;
REVOKE ALL ON FUNCTION public.auth_user_unlock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_unlock(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auth_record_attempt(_identifier text, _ip text, _user_agent text, _success boolean, _company_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now timestamptz := now();
  v_fail_count int; v_ip_fail_count int; v_distinct_ids int;
  v_allowlisted boolean := false; v_expires timestamptz; v_since timestamptz;
BEGIN
  INSERT INTO public.login_attempts (user_identifier, ip_address, user_agent, success, company_id)
  VALUES (lower(coalesce(_identifier,'')), nullif(_ip,''), nullif(_user_agent,''), coalesce(_success,false), _company_id);

  IF coalesce(_success,false) THEN
    UPDATE public.auth_lockouts SET released_at = v_now
     WHERE released_at IS NULL AND lock_type = 'identifier' AND lower(lock_key) = lower(coalesce(_identifier,''));
    RETURN jsonb_build_object('locked', false);
  END IF;

  -- falhas contam só depois do último desbloqueio manual
  SELECT max(released_at) INTO v_since FROM public.auth_lockouts
   WHERE lock_type='identifier' AND lower(lock_key)=lower(coalesce(_identifier,'')) AND released_by IS NOT NULL;
  v_since := greatest(v_now - interval '15 minutes', coalesce(v_since, '-infinity'::timestamptz));

  SELECT count(*) INTO v_fail_count FROM public.login_attempts
   WHERE success = false AND lower(user_identifier) = lower(coalesce(_identifier,'')) AND attempted_at > v_since;

  IF v_fail_count >= 5 THEN
    v_expires := v_now + interval '15 minutes';
    INSERT INTO public.auth_lockouts (lock_type, lock_key, reason, company_id, failed_count, expires_at)
    VALUES ('identifier', lower(coalesce(_identifier,'')), 'too_many_attempts', _company_id, v_fail_count, v_expires)
    ON CONFLICT DO NOTHING;
  END IF;

  IF nullif(_ip,'') IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.ip_allowlist WHERE ip_address = _ip) INTO v_allowlisted;
    IF NOT v_allowlisted THEN
      SELECT count(*), count(DISTINCT lower(user_identifier)) INTO v_ip_fail_count, v_distinct_ids
        FROM public.login_attempts WHERE success = false AND ip_address = _ip AND attempted_at > v_now - interval '5 minutes';
      IF v_ip_fail_count >= 10 AND v_distinct_ids > 1 THEN
        v_expires := v_now + interval '15 minutes';
        INSERT INTO public.auth_lockouts (lock_type, lock_key, reason, failed_count, expires_at)
        VALUES ('ip', _ip, 'suspected_brute_force', v_ip_fail_count, v_expires) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN public.auth_check_lockout(_identifier, _ip);
END $$;
REVOKE ALL ON FUNCTION public.auth_record_attempt(text, text, text, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_record_attempt(text, text, text, boolean, uuid) TO service_role;