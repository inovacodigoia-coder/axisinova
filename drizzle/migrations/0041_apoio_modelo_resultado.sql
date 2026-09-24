CREATE TABLE public.apoio_modelo_resultado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  cod_exm_apoio text NOT NULL,
  material_nome text,
  exame_nome text,
  codigo_formato text,
  modelo_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('automatico','manual')),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apoio_id, cod_exm_apoio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apoio_modelo_resultado TO authenticated;
GRANT ALL ON public.apoio_modelo_resultado TO service_role;
ALTER TABLE public.apoio_modelo_resultado ENABLE ROW LEVEL SECURITY;
CREATE POLICY amr_select ON public.apoio_modelo_resultado FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY amr_insert ON public.apoio_modelo_resultado FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()) AND apoio_modulo_liberado(company_id) AND apoio_tem_permissao('apoio.catalogo.gerenciar'));
CREATE POLICY amr_update ON public.apoio_modelo_resultado FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND apoio_modulo_liberado(company_id) AND apoio_tem_permissao('apoio.catalogo.gerenciar')) WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY amr_delete ON public.apoio_modelo_resultado FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND apoio_modulo_liberado(company_id) AND apoio_tem_permissao('apoio.catalogo.gerenciar'));