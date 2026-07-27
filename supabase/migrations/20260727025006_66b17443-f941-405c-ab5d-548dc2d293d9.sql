-- Fix establishments policy
DROP POLICY IF EXISTS "Users can see their company establishments" ON public.establishments;
DROP POLICY IF EXISTS "Admins can manage company establishments" ON public.establishments;

CREATE POLICY "establishments_select" ON public.establishments
    FOR SELECT TO authenticated 
    USING ((company_id = private.current_company_id()) OR private.is_super_admin());

CREATE POLICY "establishments_insert" ON public.establishments
    FOR INSERT TO authenticated 
    WITH CHECK ((company_id = private.current_company_id()) OR private.is_super_admin());

CREATE POLICY "establishments_update" ON public.establishments
    FOR UPDATE TO authenticated 
    USING ((company_id = private.current_company_id()) OR private.is_super_admin())
    WITH CHECK ((company_id = private.current_company_id()) OR private.is_super_admin());

CREATE POLICY "establishments_delete" ON public.establishments
    FOR DELETE TO authenticated 
    USING ((company_id = private.current_company_id()) OR private.is_super_admin());

-- Fix origins policy
DROP POLICY IF EXISTS "Users can see their company origins" ON public.origins;
DROP POLICY IF EXISTS "Admins can manage company origins" ON public.origins;

CREATE POLICY "origins_select" ON public.origins
    FOR SELECT TO authenticated 
    USING ((company_id = private.current_company_id()) OR private.is_super_admin());

CREATE POLICY "origins_insert" ON public.origins
    FOR INSERT TO authenticated 
    WITH CHECK ((company_id = private.current_company_id()) OR private.is_super_admin());

CREATE POLICY "origins_update" ON public.origins
    FOR UPDATE TO authenticated 
    USING ((company_id = private.current_company_id()) OR private.is_super_admin())
    WITH CHECK ((company_id = private.current_company_id()) OR private.is_super_admin());

CREATE POLICY "origins_delete" ON public.origins
    FOR DELETE TO authenticated 
    USING ((company_id = private.current_company_id()) OR private.is_super_admin());

-- Fix user_origin_preferences
DROP POLICY IF EXISTS "Users can manage their origin preferences" ON public.user_origin_preferences;

CREATE POLICY "user_origin_prefs_select" ON public.user_origin_preferences
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "user_origin_prefs_insert" ON public.user_origin_preferences
    FOR INSERT TO authenticated 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_origin_prefs_update" ON public.user_origin_preferences
    FOR UPDATE TO authenticated 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_origin_prefs_delete" ON public.user_origin_preferences
    FOR DELETE TO authenticated 
    USING (user_id = auth.uid());
