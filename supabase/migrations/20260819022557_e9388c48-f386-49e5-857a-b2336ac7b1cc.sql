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

  IF NEW.role IS DISTINCT FROM OLD.role THEN
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