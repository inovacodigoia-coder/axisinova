-- Force grant execute on the actual function in the private schema
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;

-- Update RLS policies to use the confirmed private.is_super_admin()
DROP POLICY IF EXISTS "system_settings_super_admin_write" ON public.system_settings;

CREATE POLICY "system_settings_super_admin_write" ON public.system_settings 
FOR ALL TO authenticated
USING (private.is_super_admin())
WITH CHECK (private.is_super_admin());

-- Ensure Data API has explicit grants on the table for the authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
