CREATE OR REPLACE FUNCTION public.handle_new_company_initialization()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_establishment_id UUID;
BEGIN
    -- 1. Create default establishment (MATRIZ) with internal_code '00'
    INSERT INTO public.establishments (company_id, name, is_main_branch, internal_code)
    VALUES (NEW.id, 'MATRIZ', true, '00')
    RETURNING id INTO v_establishment_id;

    -- 2. Create default origin (MATRIZ 00)
    INSERT INTO public.origins (company_id, establishment_id, name, internal_code)
    VALUES (NEW.id, v_establishment_id, 'MATRIZ', '00');

    RETURN NEW;
END;
$$;
