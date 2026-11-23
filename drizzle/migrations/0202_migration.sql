-- Criação de usuário pelo sistema (create-user): o gatilho de cadastro não enxerga a marca
-- "provisionado" no momento da inserção, então a empresa/função/ativo eram descartados.
-- A Edge Function passa a gravar esses dados por esta função (só service_role).

-- 1) A proteção de perfis passa a aceitar o próprio servidor (service_role) e contexto interno sem login.
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
  IF auth.jwt() IS NULL OR coalesce(auth.jwt()->>'role', '') = 'service_role' THEN RETURN NEW; END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Only super admins can change company_id';
  END IF;

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
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- 2) Grava empresa, função, crachá e ativo do usuário recém-criado pelo create-user.
CREATE OR REPLACE FUNCTION public.usuario_provisionar(p_user uuid, p_company uuid, p_role text, p_badge text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text := nullif(trim(coalesce(p_role, '')), '');
  v_app public.app_role;
BEGIN
  IF auth.jwt() IS NOT NULL AND coalesce(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF p_user IS NULL OR p_company IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'Dados incompletos para criar o usuário';
  END IF;
  IF v_role = 'super_admin' THEN
    RAISE EXCEPTION 'Função não permitida';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company) THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  UPDATE public.profiles
     SET company_id = p_company,
         role = v_role,
         badge_code = nullif(trim(coalesce(p_badge, '')), ''),
         is_active = true,
         must_change_password = true
   WHERE id = p_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado';
  END IF;

  BEGIN
    v_app := v_role::public.app_role;
  EXCEPTION WHEN others THEN
    v_app := 'other'::public.app_role;
  END;
  DELETE FROM public.user_roles WHERE user_id = p_user AND role <> v_app;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user, v_app)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;
REVOKE ALL ON FUNCTION public.usuario_provisionar(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_provisionar(uuid, uuid, text, text) TO service_role;