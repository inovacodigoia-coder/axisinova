ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_print_labels boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_title text,
ADD COLUMN IF NOT EXISTS council_type text,
ADD COLUMN IF NOT EXISTS council_uf text,
ADD COLUMN IF NOT EXISTS council_number text;

COMMENT ON COLUMN public.profiles.can_print_labels IS 'Indica se o usuário tem permissão para imprimir etiquetas';
COMMENT ON COLUMN public.profiles.professional_title IS 'Cargo ou título profissional (ex: Biomédico)';
COMMENT ON COLUMN public.profiles.council_type IS 'Tipo do conselho (ex: CRM, CRBM)';
COMMENT ON COLUMN public.profiles.council_uf IS 'UF do conselho profissional';
COMMENT ON COLUMN public.profiles.council_number IS 'Número do registro no conselho';