-- Re-create the trigger first
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Manually insert the profile for the new user
INSERT INTO public.profiles (
  id, 
  full_name, 
  cpf, 
  role, 
  company_id
)
VALUES (
  '0040ce00-0dbd-4d3a-8d85-8cd6319697f5', 
  'Hostinger Inova Super Admin', 
  NULL, 
  'super_admin', 
  '7858af33-878e-40c4-9305-e912cc6655c3'
);

-- Manually insert the role into user_roles (using a compatible role or bypassing if necessary)
-- Since app_role doesn't have super_admin, we'll assign company_admin and then the profile role 'super_admin' will be used by the is_super_admin() function logic.
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '0040ce00-0dbd-4d3a-8d85-8cd6319697f5', 
  'company_admin'
);
