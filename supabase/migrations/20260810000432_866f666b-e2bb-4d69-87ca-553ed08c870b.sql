CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    cpf, 
    role, 
    company_id,
    badge_code
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'cpf', 
    new.raw_user_meta_data->>'role', 
    (new.raw_user_meta_data->>'company_id')::uuid,
    new.raw_user_meta_data->>'badge_code'
  );
  RETURN new;
END;
$$;
