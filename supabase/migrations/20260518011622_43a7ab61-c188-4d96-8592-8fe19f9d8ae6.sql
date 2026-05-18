
CREATE TABLE public.pricing_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_annual numeric NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_doctors integer,
  max_users integer,
  storage_gb numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing plans public read"
  ON public.pricing_plans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Pricing plans insert authenticated"
  ON public.pricing_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Pricing plans update authenticated"
  ON public.pricing_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pricing plans delete authenticated"
  ON public.pricing_plans FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pricing_plans (slug, name, description, price_monthly, price_annual, features, max_doctors, max_users, storage_gb, sort_order, is_popular, is_visible) VALUES
('starter', 'Starter', 'Para consultórios pequenos começando a digitalizar', 490, 392,
  '["Até 3 usuários simultâneos","1 médico cadastrado","Agendamento e recepção","Prontuário básico","Relatórios essenciais","Suporte via chat (horário comercial)","Armazenamento: 10 GB"]'::jsonb,
  1, 3, 10, 1, false, true),
('pro', 'Pro', 'Para clínicas em crescimento que precisam de tudo', 990, 792,
  '["Usuários ilimitados","Até 15 médicos","Todos os módulos inclusos","BI com dashboards em tempo real","Digitalização de guias ilimitada","Integração com convênios","Suporte prioritário (chat + WhatsApp)","Armazenamento: 100 GB"]'::jsonb,
  15, NULL, 100, 2, true, true),
('enterprise', 'Enterprise', 'Para redes e hospitais que precisam de escala', 2490, 1992,
  '["Médicos ilimitados","Multi-unidades (até 5 CNPJs)","Tudo do Pro +","API de integração","Onboarding dedicado com consultor","SLA de uptime 99,9%","Treinamento presencial/remoto incluso","Armazenamento: 1 TB","Suporte 24/7 com gerente de conta"]'::jsonb,
  NULL, NULL, 1000, 3, false, true);
