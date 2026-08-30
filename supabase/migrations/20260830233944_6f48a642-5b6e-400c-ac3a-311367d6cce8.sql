CREATE TABLE public.external_accesses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('parceiro','local','medico','paciente')),
  name text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  access_code text NOT NULL,
  access_password text NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
  origin_id uuid REFERENCES public.origins(id) ON DELETE SET NULL,
  partner_origin_ids uuid[] NOT NULL DEFAULT '{}',
  partner_type text,
  cnpj text,
  responsible_name text,
  phone text,
  crm text,
  specialty text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_access_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX external_accesses_code_unique ON public.external_accesses (access_code);
CREATE INDEX idx_external_accesses_company_type ON public.external_accesses (company_id, type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_accesses TO authenticated;
GRANT ALL ON public.external_accesses TO service_role;

ALTER TABLE public.external_accesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users manage their external accesses"
ON public.external_accesses FOR ALL TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TABLE public.external_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  access_id uuid REFERENCES public.external_accesses(id) ON DELETE SET NULL,
  access_code text NOT NULL,
  access_type text,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  details text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_external_access_logs_company ON public.external_access_logs (company_id, created_at DESC);
CREATE INDEX idx_external_access_logs_code ON public.external_access_logs (access_code, created_at DESC);

GRANT SELECT ON public.external_access_logs TO authenticated;
GRANT ALL ON public.external_access_logs TO service_role;

ALTER TABLE public.external_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users read external access logs"
ON public.external_access_logs FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_external_access_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'paciente' AND NEW.patient_id IS NULL THEN
    RAISE EXCEPTION 'Acesso de paciente exige vínculo com um paciente cadastrado';
  ELSIF NEW.type = 'medico' AND NEW.doctor_id IS NULL THEN
    RAISE EXCEPTION 'Acesso de médico exige vínculo com um médico cadastrado';
  ELSIF NEW.type = 'local' AND NEW.origin_id IS NULL THEN
    RAISE EXCEPTION 'Acesso de local exige vínculo com uma origem/unidade';
  ELSIF NEW.type = 'parceiro' AND (NEW.partner_origin_ids IS NULL OR array_length(NEW.partner_origin_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'Acesso de parceiro exige ao menos uma origem vinculada';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_external_access_link_trg
BEFORE INSERT OR UPDATE ON public.external_accesses
FOR EACH ROW EXECUTE FUNCTION public.validate_external_access_link();

CREATE OR REPLACE FUNCTION public.generate_external_access_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  LOOP
    candidate := lpad((10000 + floor(random() * 90000))::int::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.external_accesses WHERE access_code = candidate);
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Não foi possível gerar um código de acesso único';
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_external_access_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_external_access_code() TO authenticated, service_role;