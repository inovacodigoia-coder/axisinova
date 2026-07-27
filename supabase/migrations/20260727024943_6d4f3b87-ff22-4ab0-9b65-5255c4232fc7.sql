-- Fix establishments policy
DROP POLICY IF EXISTS "Users can see their company establishments" ON public.establishments;
CREATE POLICY "Users can see their company establishments" ON public.establishments
    FOR SELECT TO authenticated 
    USING (company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);

-- Fix origins policy
DROP POLICY IF EXISTS "Users can see their company origins" ON public.origins;
CREATE POLICY "Users can see their company origins" ON public.origins
    FOR SELECT TO authenticated 
    USING (company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);

-- Add missing management policies (INSERT/UPDATE/DELETE) for company admins
CREATE POLICY "Admins can manage company establishments" ON public.establishments
    FOR ALL TO authenticated 
    USING (company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid)
    WITH CHECK (company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Admins can manage company origins" ON public.origins
    FOR ALL TO authenticated 
    USING (company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid)
    WITH CHECK (company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);
