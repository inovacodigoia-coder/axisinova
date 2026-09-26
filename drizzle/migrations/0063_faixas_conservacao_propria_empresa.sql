CREATE OR REPLACE FUNCTION public.apoio_faixas_conservacao(_company uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_object_agg(conservacao, jsonb_strip_nulls(jsonb_build_object('min', temp_min, 'max', temp_max, 'nome', nome, 'condicao_id', id))), '{}'::jsonb)
  FROM triagem_condicao_transporte
  WHERE company_id = CASE WHEN auth.uid() IS NULL THEN _company ELSE public.get_user_company_id(auth.uid()) END
    AND conservacao IS NOT NULL AND ativo
$$;