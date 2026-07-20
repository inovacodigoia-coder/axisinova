CREATE POLICY "Allow anonymous to insert company" ON public.companies FOR INSERT TO anon WITH CHECK (true);
GRANT INSERT ON public.companies TO anon;

CREATE POLICY "Allow authenticated to insert company during signup" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
GRANT INSERT ON public.companies TO authenticated;
