CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  raw_role text := new.raw_user_meta_data->>'role';
  mapped_role public.app_role;
BEGIN
  BEGIN
    mapped_role := raw_role::public.app_role;
  EXCEPTION WHEN others THEN
    mapped_role := 'other'::public.app_role;
  END;

  INSERT INTO public.profiles (id, full_name, cpf, role, company_id, badge_code)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    coalesce(raw_role, 'other'),
    (new.raw_user_meta_data->>'company_id')::uuid,
    new.raw_user_meta_data->>'badge_code'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, mapped_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$function$;