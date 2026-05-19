DROP POLICY IF EXISTS "Pricing plans insert authenticated" ON public.pricing_plans;
DROP POLICY IF EXISTS "Pricing plans update authenticated" ON public.pricing_plans;
DROP POLICY IF EXISTS "Pricing plans delete authenticated" ON public.pricing_plans;

CREATE POLICY "Pricing plans insert public"
  ON public.pricing_plans FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Pricing plans update public"
  ON public.pricing_plans FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pricing plans delete public"
  ON public.pricing_plans FOR DELETE
  TO anon, authenticated
  USING (true);