-- Painel Operacional: liberação por empresa (desligado por padrão; só a labsaude ativa)
CREATE TABLE public.lab_painel_modulo (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT false,
  alterado_por uuid,
  alterado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_painel_modulo TO authenticated;
GRANT ALL ON public.lab_painel_modulo TO service_role;
ALTER TABLE public.lab_painel_modulo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Painel Operacional lê situação do módulo da própria empresa" ON public.lab_painel_modulo FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

INSERT INTO public.lab_painel_modulo (company_id, ativo)
SELECT id, true FROM public.companies WHERE id = '7858af33-878e-40c4-9305-e912cc6655c3'
ON CONFLICT (company_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.lab_painel_modulo_ativo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND coalesce((SELECT ativo FROM public.lab_painel_modulo
    WHERE company_id = public.get_user_company_id(auth.uid())), false);
$$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_modulo_ativo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_modulo_ativo() TO authenticated;

-- Permissão do painel: exige o módulo ligado na empresa (sem exceção para administrador)
CREATE OR REPLACE FUNCTION public.lab_painel_tem_permissao()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.lab_painel_modulo_ativo()
    AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'lab','[]'::jsonb) ? 'lab.painel_operacional'));
$$;
REVOKE EXECUTE ON FUNCTION public.lab_painel_tem_permissao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_painel_tem_permissao() TO authenticated;