CREATE POLICY "Company members update their partner orders"
ON public.partner_orders
FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));