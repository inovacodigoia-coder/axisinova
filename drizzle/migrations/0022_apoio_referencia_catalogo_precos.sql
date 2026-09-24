ALTER TABLE public.apoio_laboratorio ADD COLUMN IF NOT EXISTS licenca_arquivo_path text;

CREATE TABLE public.apoio_catalogo_sincronizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  arquivo_nome text,
  total_arquivo integer NOT NULL DEFAULT 0,
  novos integer NOT NULL DEFAULT 0,
  alterados integer NOT NULL DEFAULT 0,
  desativados integer NOT NULL DEFAULT 0,
  terceirizados_afetados integer NOT NULL DEFAULT 0,
  executado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apoio_catalogo_sincronizacao TO authenticated;
GRANT ALL ON public.apoio_catalogo_sincronizacao TO service_role;
ALTER TABLE public.apoio_catalogo_sincronizacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY apoio_cat_sync_select ON public.apoio_catalogo_sincronizacao FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE INDEX apoio_cat_sync_apoio_idx ON public.apoio_catalogo_sincronizacao(apoio_id, created_at DESC);

CREATE TABLE public.apoio_catalogo_alerta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  sincronizacao_id uuid REFERENCES public.apoio_catalogo_sincronizacao(id) ON DELETE SET NULL,
  exame_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  codigo_apoio text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('desativado','alterado')),
  mensagem text NOT NULL,
  lido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.apoio_catalogo_alerta TO authenticated;
GRANT ALL ON public.apoio_catalogo_alerta TO service_role;
ALTER TABLE public.apoio_catalogo_alerta ENABLE ROW LEVEL SECURITY;
CREATE POLICY apoio_cat_alerta_select ON public.apoio_catalogo_alerta FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY apoio_cat_alerta_update ON public.apoio_catalogo_alerta FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_tem_permissao('apoio.catalogo.gerenciar'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.apoio_referencia_resumo(_apoio_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'catalogo_total', (SELECT count(*) FROM apoio_catalogo_exame c WHERE c.apoio_id = l.id AND c.ativo),
    'catalogo_atualizado_em', (SELECT max(created_at) FROM apoio_catalogo_sincronizacao s WHERE s.apoio_id = l.id),
    'preco_vigente_desde', (SELECT max(vigencia_inicio) FROM apoio_preco p WHERE p.apoio_id = l.id AND p.vigencia_fim IS NULL),
    'preco_ficticio', COALESCE((SELECT bool_or(ficticio) FROM apoio_preco p WHERE p.apoio_id = l.id AND p.vigencia_fim IS NULL), false),
    'alertas_abertos', (SELECT count(*) FROM apoio_catalogo_alerta a WHERE a.apoio_id = l.id AND NOT a.lido)
  )
  FROM apoio_laboratorio l
  WHERE l.id = _apoio_id AND l.company_id = public.get_user_company_id(auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.apoio_referencia_resumo(uuid) TO authenticated;