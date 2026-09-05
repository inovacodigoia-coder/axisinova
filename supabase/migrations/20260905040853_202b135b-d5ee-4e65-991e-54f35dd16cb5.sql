CREATE TABLE public.partner_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.api_partners(id) ON DELETE SET NULL,
  client_id text NOT NULL,
  protocolo_parceiro text,
  attendance_order_id uuid REFERENCES public.attendance_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_orders TO authenticated;
GRANT ALL ON public.partner_orders TO service_role;

ALTER TABLE public.partner_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members read their partner orders"
ON public.partner_orders FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE UNIQUE INDEX ux_partner_orders_protocol
ON public.partner_orders(company_id, partner_id, protocolo_parceiro)
WHERE protocolo_parceiro IS NOT NULL;

CREATE INDEX idx_partner_orders_company ON public.partner_orders(company_id);