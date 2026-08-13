CREATE TABLE public.access_profiles (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code integer NOT NULL,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_profiles TO authenticated;
GRANT ALL ON public.access_profiles TO service_role;
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users can read access profiles" ON public.access_profiles FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company admins can create access profiles" ON public.access_profiles FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "Company admins can update access profiles" ON public.access_profiles FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin')) WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "Company admins can delete access profiles" ON public.access_profiles FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER update_access_profiles_updated_at BEFORE UPDATE ON public.access_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.company_sectors (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  allowed_profile_ids text[] NOT NULL DEFAULT '{}',
  allowed_queue_types text[] NOT NULL DEFAULT ARRAY['internal','external']::text[],
  allowed_deadline_profile_ids text[] NOT NULL DEFAULT '{}',
  module_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_sectors TO authenticated;
GRANT ALL ON public.company_sectors TO service_role;
ALTER TABLE public.company_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company users can read sectors" ON public.company_sectors FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company admins can create sectors" ON public.company_sectors FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "Company admins can update sectors" ON public.company_sectors FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin')) WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));
CREATE POLICY "Company admins can delete sectors" ON public.company_sectors FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'));
CREATE TRIGGER update_company_sectors_updated_at BEFORE UPDATE ON public.company_sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.initialize_company_access_defaults(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reception_profile_id text := 'prof_reception_' || replace(_company_id::text, '-', '');
  admin_profile_id text := 'prof_admin_' || replace(_company_id::text, '-', '');
  lab_profile_id text := 'prof_lab_' || replace(_company_id::text, '-', '');
  reception_sector_id text := 'sec_reception_' || replace(_company_id::text, '-', '');
  admin_sector_id text := 'sec_admin_' || replace(_company_id::text, '-', '');
  lab_sector_id text := 'sec_lab_' || replace(_company_id::text, '-', '');
BEGIN
  INSERT INTO public.access_profiles (id, company_id, code, name, description, permissions, is_active, created_by)
  VALUES
    (reception_profile_id, _company_id, 7000, 'Recepção – Padrão', 'Atendimento e acolhimento de pacientes', '{"dashboard":["view"],"scheduling":["view","create","edit"],"reception":["view","create","edit"],"totem":["view","create"]}'::jsonb, true, 'admin'),
    (admin_profile_id, _company_id, 9000, 'TI – Administração', 'Gestão administrativa e TI', '{"dashboard":["view"],"scheduling":["view","create","edit","delete","export","approve"],"reception":["view","create","edit","delete","export","approve"],"totem":["view","create","edit","delete","export","approve"],"medical_record":["view","create","edit","delete","export","approve"],"billing":["view","create","edit","delete","export","approve"],"results":["view","create","edit","delete","export","approve"],"reports":["view","create","edit","delete","export","approve"],"bi":["view","create","edit","delete","export","approve"],"users":["view","create","edit","delete","export","approve"],"settings":["view","create","edit","delete","export","approve"],"registers":["view","create","edit","delete","export","approve"],"lab_technical":["view","create","edit","delete","export","approve"],"lab_registers":["view","create","edit","delete","export","approve"],"finance":["view","create","edit","delete","export","approve"],"inventory":["view","create","edit","delete","export","approve"],"pharmacy":["view","create","edit","delete","export","approve"],"serotheque":["view","create","edit","delete","export","approve"],"portals":["view","create","edit","delete","export","approve"]}'::jsonb, true, 'admin'),
    (lab_profile_id, _company_id, 1000, 'Digitação – Laudos', 'Análises clínicas e laudos', '{"dashboard":["view"],"results":["view","create","edit"],"reports":["view"],"lab_technical":["view","create","edit"],"lab_registers":["view"]}'::jsonb, true, 'admin')
  ON CONFLICT (company_id, name) DO NOTHING;

  SELECT id INTO reception_profile_id FROM public.access_profiles WHERE company_id = _company_id AND name = 'Recepção – Padrão';
  SELECT id INTO admin_profile_id FROM public.access_profiles WHERE company_id = _company_id AND name = 'TI – Administração';
  SELECT id INTO lab_profile_id FROM public.access_profiles WHERE company_id = _company_id AND name = 'Digitação – Laudos';

  INSERT INTO public.company_sectors (id, company_id, name, description, allowed_profile_ids)
  VALUES
    (admin_sector_id, _company_id, 'TI – Administração', 'Gestão administrativa e TI', ARRAY[admin_profile_id]),
    (reception_sector_id, _company_id, 'Recepção – Padrão', 'Atendimento e acolhimento de pacientes', ARRAY[reception_profile_id]),
    (lab_sector_id, _company_id, 'Digitação – Laudos', 'Análises clínicas e laudos', ARRAY[lab_profile_id])
  ON CONFLICT (company_id, name) DO NOTHING;
END;
$$;

DO $$
DECLARE company_record record;
BEGIN
  FOR company_record IN SELECT id FROM public.companies LOOP
    PERFORM public.initialize_company_access_defaults(company_record.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_company_initialization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_establishment_id uuid;
BEGIN
  INSERT INTO public.establishments (company_id, name, is_main_branch, internal_code)
  VALUES (NEW.id, 'MATRIZ', true, '00')
  RETURNING id INTO v_establishment_id;
  INSERT INTO public.origins (company_id, establishment_id, name, internal_code)
  VALUES (NEW.id, v_establishment_id, 'MATRIZ', '00');
  PERFORM public.initialize_company_access_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DELETE FROM public.sector_users;
INSERT INTO public.sector_users (company_id, sector_id, user_id)
SELECT p.company_id, s.id, p.id
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'company_admin'
JOIN public.company_sectors s ON s.company_id = p.company_id
WHERE p.company_id IS NOT NULL
ON CONFLICT DO NOTHING;