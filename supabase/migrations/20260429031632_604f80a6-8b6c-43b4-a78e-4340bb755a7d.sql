-- Expansão da tabela patients para o módulo completo de Cadastro e Gestão
-- Mantém compatibilidade com colunas existentes (name, cpf, birth_date, phone, blood_type, allergies)

-- Identificação adicional
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS social_name text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS rg_issuer text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS rg_state text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS rg_issue_date date;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS birth_city text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS birth_state text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Brasileira';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS gender text DEFAULT 'not_informed';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ethnicity text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS education text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS mother_name text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS father_name text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Contato adicional
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone1_type text DEFAULT 'mobile';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone2 text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone2_type text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone3 text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS email_secondary text;

-- Endereço estruturado (jsonb para flexibilidade)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS address_data jsonb;

-- Profissão
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS employer text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS work_phone text;

-- Convênios (array de objetos)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS convenios jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Responsável (objeto)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS responsible jsonb;

-- Dados clínicos estruturados
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinical_data jsonb NOT NULL DEFAULT '{"allergies":[],"chronicConditions":[],"continuousMedications":[]}'::jsonb;

-- Origem
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS referral_source text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS referral_by text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS registered_by uuid;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS imported_from text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS import_batch_id text;

-- Observações
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS general_notes text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS internal_alerts jsonb;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS financial_notes text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

-- Controle / cache
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS last_attendance date;

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_patients_company ON public.patients(company_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_name_lower ON public.patients(lower(name));
CREATE INDEX IF NOT EXISTS idx_patients_mother_name_lower ON public.patients(lower(mother_name));

-- Trigger para atualização do updated_at (caso ainda não exista)
DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
