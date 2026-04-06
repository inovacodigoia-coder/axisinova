
CREATE UNIQUE INDEX IF NOT EXISTS companies_cnpj_unique ON public.companies (cnpj) WHERE cnpj IS NOT NULL;
