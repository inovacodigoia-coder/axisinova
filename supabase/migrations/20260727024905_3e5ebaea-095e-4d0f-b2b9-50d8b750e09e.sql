-- Function to initialize company data
CREATE OR REPLACE FUNCTION public.handle_new_company_initialization()
RETURNS TRIGGER AS $$
DECLARE
    v_establishment_id UUID;
BEGIN
    -- 1. Create default establishment (MATRIZ)
    INSERT INTO public.establishments (company_id, name, is_main_branch)
    VALUES (NEW.id, 'MATRIZ', true)
    RETURNING id INTO v_establishment_id;

    -- 2. Create default origin (MATRIZ 00)
    INSERT INTO public.origins (company_id, establishment_id, name, internal_code)
    VALUES (NEW.id, v_establishment_id, 'MATRIZ', '00');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after company creation
DROP TRIGGER IF EXISTS on_company_created_initialize ON public.companies;
CREATE TRIGGER on_company_created_initialize
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_initialization();

-- Ensure existing companies have a Matriz if they don't already
DO $$
DECLARE
    r RECORD;
    v_est_id UUID;
BEGIN
    FOR r IN SELECT id FROM public.companies
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE company_id = r.id AND is_main_branch = true) THEN
            INSERT INTO public.establishments (company_id, name, is_main_branch)
            VALUES (r.id, 'MATRIZ', true)
            RETURNING id INTO v_est_id;
            
            INSERT INTO public.origins (company_id, establishment_id, name, internal_code)
            VALUES (r.id, v_est_id, 'MATRIZ', '00');
        END IF;
    END LOOP;
END $$;
