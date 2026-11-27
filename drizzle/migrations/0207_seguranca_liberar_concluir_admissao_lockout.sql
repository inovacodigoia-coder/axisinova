DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.apoio_analise_concluir(uuid,jsonb,text,text,text)'::regprocedure);
  d := replace(d, E'BEGIN\n  r := apoio_analise__pe(_pe);', E'BEGIN\n  IF NOT (public.apoio_tem_permissao(''apoio.remessa.operar'') OR public.apoio_tem_permissao(''apoio.manual.operar'')) THEN RAISE EXCEPTION ''Você não tem permissão para concluir exames do apoio''; END IF;\n  r := apoio_analise__pe(_pe);');
  IF position('apoio.remessa.operar' in d) = 0 THEN RAISE EXCEPTION 'patch concluir falhou'; END IF;
  EXECUTE d;
  d := pg_get_functiondef('public.apoio_analise_liberar(uuid)'::regprocedure);
  d := replace(d, E'BEGIN\n  r := apoio_analise__pe(_pe);', E'BEGIN\n  IF NOT (public.apoio_tem_permissao(''apoio.resultado.conferir'') OR public.apoio_tem_permissao(''apoio.manual.operar'')) THEN RAISE EXCEPTION ''Você não tem permissão para liberar exames do apoio''; END IF;\n  r := apoio_analise__pe(_pe);');
  IF position('apoio.resultado.conferir' in d) = 0 THEN RAISE EXCEPTION 'patch liberar falhou'; END IF;
  EXECUTE d;
  d := pg_get_functiondef('public.admission_request_create(text,uuid,text,text,text,text,uuid,uuid,uuid,text)'::regprocedure);
  d := replace(d, E'  IF _origin_occupancy_id IS NOT NULL THEN', E'  IF _patient_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patients WHERE id=_patient_id AND company_id=cid) THEN RAISE EXCEPTION ''Paciente inválido''; END IF;\n  IF _origin_occupancy_id IS NOT NULL THEN');
  IF position('Paciente inválido' in d) = 0 THEN RAISE EXCEPTION 'patch admission falhou'; END IF;
  EXECUTE d;
END $do$;

CREATE OR REPLACE FUNCTION public.auth_check_lockout(_identifier text, _ip text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_now timestamptz := now(); v_lock record; v_id text := lower(coalesce(_identifier,''));
BEGIN
  UPDATE public.auth_lockouts SET released_at = v_now WHERE released_at IS NULL AND expires_at <= v_now;
  SELECT * INTO v_lock FROM public.auth_lockouts
   WHERE released_at IS NULL
     AND ((lock_type = 'identifier' AND lower(lock_key) = v_id || '@ip:' || coalesce(_ip,''))
       OR (lock_type = 'ip' AND lock_key = coalesce(_ip,'')))
   ORDER BY expires_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('locked', true, 'lock_type', v_lock.lock_type, 'expires_at', v_lock.expires_at,
      'retry_after_seconds', greatest(0, ceil(extract(epoch from (v_lock.expires_at - v_now)))::int));
  END IF;
  RETURN jsonb_build_object('locked', false);
END $function$;

CREATE OR REPLACE FUNCTION public.auth_record_attempt(_identifier text, _ip text, _user_agent text, _success boolean, _company_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now(); v_id text := lower(coalesce(_identifier,''));
  v_key text := lower(coalesce(_identifier,'')) || '@ip:' || coalesce(_ip,'');
  v_fail_count int; v_ip_fail_count int; v_distinct_ids int;
  v_allowlisted boolean := false; v_expires timestamptz; v_since timestamptz;
BEGIN
  INSERT INTO public.login_attempts (user_identifier, ip_address, user_agent, success, company_id)
  VALUES (v_id, nullif(_ip,''), nullif(_user_agent,''), coalesce(_success,false), _company_id);

  IF coalesce(_success,false) THEN
    UPDATE public.auth_lockouts SET released_at = v_now
     WHERE released_at IS NULL AND lock_type = 'identifier'
       AND (lower(lock_key) = v_id OR lower(lock_key) LIKE v_id || '@ip:%');
    RETURN jsonb_build_object('locked', false);
  END IF;

  SELECT max(released_at) INTO v_since FROM public.auth_lockouts
   WHERE lock_type='identifier' AND (lower(lock_key)=v_id OR lower(lock_key)=v_key) AND released_by IS NOT NULL;
  v_since := greatest(v_now - interval '15 minutes', coalesce(v_since, '-infinity'::timestamptz));

  -- Só conta falhas do mesmo e-mail vindas do mesmo endereço: ninguém de fora bloqueia a conta de outra pessoa
  SELECT count(*) INTO v_fail_count FROM public.login_attempts
   WHERE success = false AND lower(user_identifier) = v_id
     AND coalesce(ip_address,'') = coalesce(nullif(_ip,''),'') AND attempted_at > v_since;

  IF v_fail_count >= 5 THEN
    v_expires := v_now + interval '15 minutes';
    INSERT INTO public.auth_lockouts (lock_type, lock_key, reason, company_id, failed_count, expires_at)
    VALUES ('identifier', v_key, 'too_many_attempts', _company_id, v_fail_count, v_expires)
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
END $function$;