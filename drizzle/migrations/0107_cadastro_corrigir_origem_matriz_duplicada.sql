CREATE OR REPLACE FUNCTION public.handle_new_company_initialization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_establishment_id uuid;
BEGIN
  INSERT INTO public.establishments (company_id, name, is_main_branch, internal_code)
  VALUES (NEW.id, 'MATRIZ', true, '00')
  RETURNING id INTO v_establishment_id;
  -- The establishment trigger may already have created its origin.
  INSERT INTO public.origins (company_id, establishment_id, name, internal_code)
  VALUES (NEW.id, v_establishment_id, 'MATRIZ', '00')
  ON CONFLICT (establishment_id) WHERE establishment_id IS NOT NULL DO NOTHING;
  PERFORM public.initialize_company_access_defaults(NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_company_initialization() FROM PUBLIC, anon, authenticated;