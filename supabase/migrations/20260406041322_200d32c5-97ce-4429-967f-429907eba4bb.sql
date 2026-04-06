
DROP POLICY IF EXISTS "Anyone can insert companies" ON public.companies;
CREATE POLICY "Anon can insert companies" ON public.companies FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
