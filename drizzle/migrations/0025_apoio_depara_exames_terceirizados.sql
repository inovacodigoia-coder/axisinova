ALTER TABLE public.apoio_depara_exame
  ADD COLUMN IF NOT EXISTS exige_pdf boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS codigo_formato text,
  ADD COLUMN IF NOT EXISTS modelo jsonb,
  ADD COLUMN IF NOT EXISTS codigo_formato_anterior text,
  ADD COLUMN IF NOT EXISTS modelo_anterior jsonb,
  ADD COLUMN IF NOT EXISTS modelo_mudou boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modelo_carregado_em timestamptz;
COMMENT ON COLUMN public.apoio_depara_exame.prioridade IS 'DEPRECATED: o apoio de destino é decidido pela Bancada Técnica do exame';

-- Excluir De/Para já usado em envio é bloqueado (deve-se inativar)
CREATE OR REPLACE FUNCTION public.apoio_depara_exame_delete_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM apoio_pedido_exame WHERE exame_id = OLD.exame_id AND apoio_id = OLD.apoio_id;
  IF n > 0 THEN RAISE EXCEPTION 'Esta terceirização já foi usada em % envio(s). Inative em vez de excluir', n; END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS apoio_depara_exame_delete_guard ON public.apoio_depara_exame;
CREATE TRIGGER apoio_depara_exame_delete_guard BEFORE DELETE ON public.apoio_depara_exame FOR EACH ROW EXECUTE FUNCTION public.apoio_depara_exame_delete_guard();

CREATE OR REPLACE FUNCTION public.apoio_depara_envios(_ids uuid[])
RETURNS TABLE(depara_id uuid, envios bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, (SELECT count(*) FROM apoio_pedido_exame pe WHERE pe.exame_id = d.exame_id AND pe.apoio_id = d.apoio_id)
  FROM apoio_depara_exame d WHERE d.id = ANY(_ids) AND d.company_id = get_user_company_id(auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.apoio_depara_envios(uuid[]) TO authenticated;

-- Situação da referência (preço/prazo vigentes sem expor custo a quem não tem permissão)
CREATE OR REPLACE FUNCTION public.apoio_depara_referencia(_apoio_id uuid, _codigo text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'tem_preco', p.id IS NOT NULL,
    'preco', CASE WHEN apoio_tem_permissao('apoio.financeiro.ver') OR apoio_tem_permissao('apoio.catalogo.gerenciar') THEN p.preco END,
    'ficticio', coalesce(p.ficticio, false),
    'prazo_dias', public.apoio_prazo_vigente(_apoio_id, _codigo))
  FROM apoio_laboratorio l
  LEFT JOIN LATERAL (SELECT * FROM apoio_preco x WHERE x.apoio_id = l.id AND x.codigo = _codigo
      AND x.vigencia_inicio <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
      AND (x.vigencia_fim IS NULL OR x.vigencia_fim >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
      ORDER BY x.vigencia_inicio DESC LIMIT 1) p ON true
  WHERE l.id = _apoio_id AND l.company_id = get_user_company_id(auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.apoio_depara_referencia(uuid, text) TO authenticated;