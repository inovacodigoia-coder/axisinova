CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_identifier ON public.login_attempts (lower(user_identifier), attempted_at DESC);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts (ip_address, attempted_at DESC);
CREATE INDEX idx_login_attempts_company ON public.login_attempts (company_id, attempted_at DESC);

GRANT SELECT ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read login attempts"
  ON public.login_attempts FOR SELECT TO authenticated
  USING (private.is_super_admin());

CREATE TABLE public.auth_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_type text NOT NULL CHECK (lock_type IN ('identifier','ip')),
  lock_key text NOT NULL,
  reason text NOT NULL DEFAULT 'too_many_attempts',
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  failed_count integer NOT NULL DEFAULT 0,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_auth_lockouts_active ON public.auth_lockouts (lock_type, lower(lock_key)) WHERE released_at IS NULL;

GRANT SELECT ON public.auth_lockouts TO authenticated;
GRANT ALL ON public.auth_lockouts TO service_role;
ALTER TABLE public.auth_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read lockouts"
  ON public.auth_lockouts FOR SELECT TO authenticated
  USING (private.is_super_admin());

CREATE TRIGGER update_auth_lockouts_updated_at
  BEFORE UPDATE ON public.auth_lockouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ip_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  label text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_allowlist TO authenticated;
GRANT ALL ON public.ip_allowlist TO service_role;
ALTER TABLE public.ip_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage ip allowlist"
  ON public.ip_allowlist FOR ALL TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

CREATE TRIGGER update_ip_allowlist_updated_at
  BEFORE UPDATE ON public.ip_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server-side lockout evaluation (service role only)
CREATE OR REPLACE FUNCTION public.auth_check_lockout(_identifier text, _ip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_lock record;
BEGIN
  UPDATE public.auth_lockouts
     SET released_at = v_now
   WHERE released_at IS NULL AND expires_at <= v_now;

  SELECT * INTO v_lock
    FROM public.auth_lockouts
   WHERE released_at IS NULL
     AND ((lock_type = 'identifier' AND lower(lock_key) = lower(coalesce(_identifier,'')))
       OR (lock_type = 'ip' AND lock_key = coalesce(_ip,'')))
   ORDER BY expires_at DESC
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'locked', true,
      'lock_type', v_lock.lock_type,
      'expires_at', v_lock.expires_at,
      'retry_after_seconds', greatest(0, ceil(extract(epoch from (v_lock.expires_at - v_now)))::int)
    );
  END IF;

  RETURN jsonb_build_object('locked', false);
END;
$$;

REVOKE ALL ON FUNCTION public.auth_check_lockout(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_check_lockout(text, text) TO service_role;

-- Records an attempt and applies lockout rules (service role only)
CREATE OR REPLACE FUNCTION public.auth_record_attempt(_identifier text, _ip text, _user_agent text, _success boolean, _company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_fail_count int;
  v_ip_fail_count int;
  v_distinct_ids int;
  v_allowlisted boolean := false;
  v_expires timestamptz;
BEGIN
  INSERT INTO public.login_attempts (user_identifier, ip_address, user_agent, success, company_id)
  VALUES (lower(coalesce(_identifier,'')), nullif(_ip,''), nullif(_user_agent,''), coalesce(_success,false), _company_id);

  IF coalesce(_success,false) THEN
    UPDATE public.auth_lockouts
       SET released_at = v_now
     WHERE released_at IS NULL
       AND lock_type = 'identifier'
       AND lower(lock_key) = lower(coalesce(_identifier,''));
    RETURN jsonb_build_object('locked', false);
  END IF;

  SELECT count(*) INTO v_fail_count
    FROM public.login_attempts
   WHERE success = false
     AND lower(user_identifier) = lower(coalesce(_identifier,''))
     AND attempted_at > v_now - interval '15 minutes';

  IF v_fail_count >= 5 THEN
    v_expires := v_now + interval '15 minutes';
    INSERT INTO public.auth_lockouts (lock_type, lock_key, reason, company_id, failed_count, expires_at)
    VALUES ('identifier', lower(coalesce(_identifier,'')), 'too_many_attempts', _company_id, v_fail_count, v_expires)
    ON CONFLICT DO NOTHING;
  END IF;

  IF nullif(_ip,'') IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.ip_allowlist WHERE ip_address = _ip) INTO v_allowlisted;

    IF NOT v_allowlisted THEN
      SELECT count(*), count(DISTINCT lower(user_identifier))
        INTO v_ip_fail_count, v_distinct_ids
        FROM public.login_attempts
       WHERE success = false
         AND ip_address = _ip
         AND attempted_at > v_now - interval '5 minutes';

      IF v_ip_fail_count >= 10 AND v_distinct_ids > 1 THEN
        v_expires := v_now + interval '15 minutes';
        INSERT INTO public.auth_lockouts (lock_type, lock_key, reason, failed_count, expires_at)
        VALUES ('ip', _ip, 'suspected_brute_force', v_ip_fail_count, v_expires)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN public.auth_check_lockout(_identifier, _ip);
END;
$$;

REVOKE ALL ON FUNCTION public.auth_record_attempt(text, text, text, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_record_attempt(text, text, text, boolean, uuid) TO service_role;

-- Manual unlock by super admin
CREATE OR REPLACE FUNCTION public.auth_release_lockout(_lockout_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.auth_lockouts
     SET released_at = now(), released_by = auth.uid()
   WHERE id = _lockout_id AND released_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_release_lockout(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_release_lockout(uuid) TO authenticated, service_role;