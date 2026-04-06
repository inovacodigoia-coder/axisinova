
CREATE POLICY "Anon can read companies for registration" ON public.companies FOR SELECT TO anon USING (true);
