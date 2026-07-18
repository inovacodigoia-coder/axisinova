
-- Move helpers to private schema (not exposed by API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;

REVOKE ALL ON FUNCTION private.current_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_super_admin()      FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin()      TO authenticated, service_role;

-- Rewrite all policies to point at private.* helpers, then drop public.* helpers.
-- Because you cannot ALTER a policy expression, drop+recreate.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%current_company_id%' OR qual LIKE '%is_super_admin%'
        OR with_check LIKE '%current_company_id%' OR with_check LIKE '%is_super_admin%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Recreate all policies using private.* helpers
-- APPOINTMENTS
CREATE POLICY "appointments_company_select" ON public.appointments FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "appointments_company_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "appointments_company_update" ON public.appointments FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "appointments_company_delete" ON public.appointments FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- COMPANIES
CREATE POLICY "companies_own_select" ON public.companies FOR SELECT TO authenticated
  USING (id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "companies_admin_insert" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin());
CREATE POLICY "companies_own_update" ON public.companies FOR UPDATE TO authenticated
  USING (id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "companies_admin_delete" ON public.companies FOR DELETE TO authenticated
  USING (private.is_super_admin());

-- COMPANY_BRANDING
CREATE POLICY "company_branding_select" ON public.company_branding FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "company_branding_insert" ON public.company_branding FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "company_branding_update" ON public.company_branding FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "company_branding_delete" ON public.company_branding FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- CONVENIOS
CREATE POLICY "convenios_select" ON public.convenios FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "convenios_insert" ON public.convenios FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "convenios_update" ON public.convenios FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "convenios_delete" ON public.convenios FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- DOCTORS
CREATE POLICY "doctors_select" ON public.doctors FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "doctors_insert" ON public.doctors FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "doctors_update" ON public.doctors FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "doctors_delete" ON public.doctors FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- EXAMS
CREATE POLICY "exams_select" ON public.exams FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "exams_insert" ON public.exams FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "exams_update" ON public.exams FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "exams_delete" ON public.exams FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- MEDICAL_RECORDS
CREATE POLICY "medical_records_select" ON public.medical_records FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "medical_records_insert" ON public.medical_records FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "medical_records_update" ON public.medical_records FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "medical_records_delete" ON public.medical_records FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- PATIENTS
CREATE POLICY "patients_select" ON public.patients FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "patients_insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "patients_update" ON public.patients FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "patients_delete" ON public.patients FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- PROCEDURES
CREATE POLICY "procedures_select" ON public.procedures FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "procedures_insert" ON public.procedures FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "procedures_update" ON public.procedures FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "procedures_delete" ON public.procedures FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- SPECIALTIES
CREATE POLICY "specialties_select" ON public.specialties FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "specialties_insert" ON public.specialties FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "specialties_update" ON public.specialties FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "specialties_delete" ON public.specialties FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- TISS_GUIDES
CREATE POLICY "tiss_guides_select" ON public.tiss_guides FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "tiss_guides_insert" ON public.tiss_guides FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "tiss_guides_update" ON public.tiss_guides FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "tiss_guides_delete" ON public.tiss_guides FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- QUEUE_UNITS
CREATE POLICY "queue_units_select" ON public.queue_units FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_units_insert" ON public.queue_units FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_units_update" ON public.queue_units FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_units_delete" ON public.queue_units FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- QUEUE_LINES
CREATE POLICY "queue_lines_select" ON public.queue_lines FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_lines_insert" ON public.queue_lines FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_lines_update" ON public.queue_lines FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_lines_delete" ON public.queue_lines FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- QUEUE_GUICHES
CREATE POLICY "queue_guiches_select" ON public.queue_guiches FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_guiches_insert" ON public.queue_guiches FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_guiches_update" ON public.queue_guiches FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_guiches_delete" ON public.queue_guiches FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- QUEUE_TICKETS
CREATE POLICY "queue_tickets_select" ON public.queue_tickets FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_tickets_insert" ON public.queue_tickets FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_tickets_update" ON public.queue_tickets FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_tickets_delete" ON public.queue_tickets FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- QUEUE_TOTEMS
CREATE POLICY "queue_totems_select" ON public.queue_totems FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_totems_insert" ON public.queue_totems FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_totems_update" ON public.queue_totems FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_totems_delete" ON public.queue_totems FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- QUEUE_TVS
CREATE POLICY "queue_tvs_select" ON public.queue_tvs FOR SELECT TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_tvs_insert" ON public.queue_tvs FOR INSERT TO authenticated
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_tvs_update" ON public.queue_tvs FOR UPDATE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin())
  WITH CHECK (company_id = private.current_company_id() OR private.is_super_admin());
CREATE POLICY "queue_tvs_delete" ON public.queue_tvs FOR DELETE TO authenticated
  USING (company_id = private.current_company_id() OR private.is_super_admin());

-- PROFILES
CREATE POLICY "Super admins can read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.is_super_admin());
CREATE POLICY "Super admins can update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());
CREATE POLICY "Super admins can delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (private.is_super_admin());

-- PRICING PLANS
CREATE POLICY "pricing_plans_admin_insert" ON public.pricing_plans FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin());
CREATE POLICY "pricing_plans_admin_update" ON public.pricing_plans FOR UPDATE TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());
CREATE POLICY "pricing_plans_admin_delete" ON public.pricing_plans FOR DELETE TO authenticated
  USING (private.is_super_admin());

-- Update escalation trigger to use private helper
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF private.is_super_admin() THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only super admins can change role';
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Only super admins can change company_id';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- Drop public.* helper duplicates
DROP FUNCTION IF EXISTS public.current_company_id();
DROP FUNCTION IF EXISTS public.is_super_admin();

-- Restrict profile signup insert to own row
DROP POLICY IF EXISTS "Allow insert during signup" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
