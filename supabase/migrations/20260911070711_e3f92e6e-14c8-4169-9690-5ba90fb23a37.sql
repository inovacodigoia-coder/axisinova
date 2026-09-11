-- 1) Block self privilege escalation on profiles (role, is_admin, company_id)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
  caller_company uuid;
BEGIN
  IF private.is_super_admin() THEN RETURN NEW; END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Only super admins can change company_id';
  END IF;

  -- Nobody may flip their own admin flag or role; is_admin is super-admin only.
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Only super admins can change is_admin';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() = OLD.id THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;

    SELECT p.role, p.company_id INTO caller_role, caller_company
      FROM public.profiles p WHERE p.id = auth.uid();

    IF caller_role IS DISTINCT FROM 'company_admin'
       OR caller_company IS NULL
       OR caller_company IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Only super admins can change role';
    END IF;

    IF NEW.role = 'super_admin' THEN
      RAISE EXCEPTION 'Cannot promote to super admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Block self-upgrade of plan / billing / limit fields on companies
CREATE OR REPLACE FUNCTION public.protect_company_plan_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF private.is_super_admin() THEN
    RETURN NEW;
  END IF;

  NEW.plano := OLD.plano;
  NEW.valor_mensal := OLD.valor_mensal;
  NEW.usuarios_limite := OLD.usuarios_limite;
  NEW.medicos_limite := OLD.medicos_limite;
  NEW.armazenamento_limite_gb := OLD.armazenamento_limite_gb;
  NEW.status := OLD.status;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_company_plan_fields ON public.companies;
CREATE TRIGGER protect_company_plan_fields
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.protect_company_plan_fields();

-- 3) Remove blanket PUBLIC execute on SECURITY DEFINER functions; grant only what is needed
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Intentionally public endpoints (totem, TV panel, external portal, signup)
GRANT EXECUTE ON FUNCTION public.device_public_info(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.device_verify_access(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.panel_tickets(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.totem_queue_lines(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.totem_create_ticket(text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_fetch(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_fetch_laudo(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_log_attempt(text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_cnpj_exists(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_id_by_cnpj(text) TO anon, authenticated;

-- Signed-in only helpers (used by RLS policies and admin screens)
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_attendance_order_number(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_release_lockout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lab_equipments_master_company() TO authenticated;
