DROP POLICY IF EXISTS "Allow anonymous to insert company" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated to insert company during signup" ON public.companies;
DROP POLICY IF EXISTS "Allow anyone to check CNPJ existence" ON public.companies;

CREATE POLICY "Allow anonymous to insert company" ON public.companies FOR INSERT TO anon WITH CHECK (true);
GRANT INSERT ON public.companies TO anon;

CREATE POLICY "Allow authenticated to insert company during signup" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
GRANT INSERT ON public.companies TO authenticated;

CREATE POLICY "Allow anyone to check CNPJ existence" ON public.companies FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.companies TO anon, authenticated;
