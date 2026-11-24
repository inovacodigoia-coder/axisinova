CREATE TABLE public.usuario_formato_impressao (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  documento text NOT NULL CHECK (documento IN ('comprovante', 'controle_interno', 'termo_consentimento')),
  formato text NOT NULL CHECK (formato IN ('A4', 'A5', 'TÉRMICA')),
  PRIMARY KEY (user_id, company_id, documento),
  CHECK (documento <> 'termo_consentimento' OR formato IN ('A4', 'A5'))
);
REVOKE ALL ON TABLE public.usuario_formato_impressao FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.usuario_formato_impressao TO authenticated;
GRANT ALL ON TABLE public.usuario_formato_impressao TO service_role;
ALTER TABLE public.usuario_formato_impressao ENABLE ROW LEVEL SECURITY;
CREATE POLICY formato_impressao_ler ON public.usuario_formato_impressao FOR SELECT TO authenticated USING (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY formato_impressao_criar ON public.usuario_formato_impressao FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY formato_impressao_editar ON public.usuario_formato_impressao FOR UPDATE TO authenticated USING (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid())) WITH CHECK (user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid()));
COMMENT ON TABLE public.usuario_formato_impressao IS 'Último formato escolhido por usuário, empresa e documento no modal de impressão; não armazena documentos ou coleta.';