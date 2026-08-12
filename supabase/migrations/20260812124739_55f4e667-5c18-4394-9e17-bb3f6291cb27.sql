-- Correcting the RLS policy for system_settings to use the correct schema (private)
DROP POLICY IF EXISTS "system_settings_super_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_super_admin_write" ON public.system_settings 
FOR ALL TO authenticated
USING (private.is_super_admin())
WITH CHECK (private.is_super_admin());
