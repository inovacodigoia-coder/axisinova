-- Allow authenticated users to DELETE companies
CREATE POLICY "Authenticated can delete companies"
ON public.companies FOR DELETE TO authenticated USING (true);

-- Allow authenticated users to UPDATE companies
CREATE POLICY "Authenticated can update companies"
ON public.companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow delete on profiles by authenticated users
CREATE POLICY "Profiles deletable by authenticated"
ON public.profiles FOR DELETE TO authenticated USING (true);