
-- =========================================================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER, restricted EXECUTE)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
$$;

REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_super_admin()      FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin()      TO authenticated, service_role;

-- Lock down trigger-only helpers (flagged by linter)
REVOKE ALL ON FUNCTION public.handle_new_user()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column()  FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 2. GENERIC HELPER TO APPLY company-scoped policies
-- =========================================================================
-- We inline SQL per-table for clarity.

-- ---------------- APPOINTMENTS ----------------
DROP POLICY IF EXISTS "Appointments deletable by authenticated" ON public.appointments;
DROP POLICY IF EXISTS "Appointments insertable by authenticated" ON public.appointments;
DROP POLICY IF EXISTS "Appointments updatable by authenticated" ON public.appointments;
DROP POLICY IF EXISTS "Appointments viewable by authenticated" ON public.appointments;
CREATE POLICY "appointments_company_select" ON public.appointments FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "appointments_company_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "appointments_company_update" ON public.appointments FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "appointments_company_delete" ON public.appointments FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- COMPANIES ----------------
DROP POLICY IF EXISTS "Anon can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Anon can read companies for registration" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can read companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can update companies" ON public.companies;
DROP POLICY IF EXISTS "Companies are viewable by authenticated users" ON public.companies;
CREATE POLICY "companies_own_select" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "companies_admin_insert" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "companies_own_update" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "companies_admin_delete" ON public.companies FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ---------------- COMPANY_BRANDING ----------------
DROP POLICY IF EXISTS "Branding insertable by authenticated" ON public.company_branding;
DROP POLICY IF EXISTS "Branding updatable by authenticated" ON public.company_branding;
DROP POLICY IF EXISTS "Branding viewable by authenticated" ON public.company_branding;
CREATE POLICY "company_branding_select" ON public.company_branding FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "company_branding_insert" ON public.company_branding FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "company_branding_update" ON public.company_branding FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "company_branding_delete" ON public.company_branding FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- CONVENIOS ----------------
DROP POLICY IF EXISTS "Convenios deletable by authenticated" ON public.convenios;
DROP POLICY IF EXISTS "Convenios insertable by authenticated" ON public.convenios;
DROP POLICY IF EXISTS "Convenios updatable by authenticated" ON public.convenios;
DROP POLICY IF EXISTS "Convenios viewable by authenticated" ON public.convenios;
CREATE POLICY "convenios_select" ON public.convenios FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "convenios_insert" ON public.convenios FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "convenios_update" ON public.convenios FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "convenios_delete" ON public.convenios FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- DOCTORS ----------------
DROP POLICY IF EXISTS "Doctors deletable by authenticated" ON public.doctors;
DROP POLICY IF EXISTS "Doctors insertable by authenticated" ON public.doctors;
DROP POLICY IF EXISTS "Doctors updatable by authenticated" ON public.doctors;
DROP POLICY IF EXISTS "Doctors viewable by authenticated" ON public.doctors;
CREATE POLICY "doctors_select" ON public.doctors FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "doctors_insert" ON public.doctors FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "doctors_update" ON public.doctors FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "doctors_delete" ON public.doctors FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- EXAMS ----------------
DROP POLICY IF EXISTS "Exams deletable by authenticated" ON public.exams;
DROP POLICY IF EXISTS "Exams insertable by authenticated" ON public.exams;
DROP POLICY IF EXISTS "Exams updatable by authenticated" ON public.exams;
DROP POLICY IF EXISTS "Exams viewable by authenticated" ON public.exams;
CREATE POLICY "exams_select" ON public.exams FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "exams_insert" ON public.exams FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "exams_update" ON public.exams FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "exams_delete" ON public.exams FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- MEDICAL_RECORDS ----------------
DROP POLICY IF EXISTS "Records insertable by authenticated" ON public.medical_records;
DROP POLICY IF EXISTS "Records updatable by authenticated" ON public.medical_records;
DROP POLICY IF EXISTS "Records viewable by authenticated" ON public.medical_records;
CREATE POLICY "medical_records_select" ON public.medical_records FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "medical_records_insert" ON public.medical_records FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "medical_records_update" ON public.medical_records FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "medical_records_delete" ON public.medical_records FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- PATIENTS ----------------
DROP POLICY IF EXISTS "Patients deletable by authenticated" ON public.patients;
DROP POLICY IF EXISTS "Patients insertable by authenticated" ON public.patients;
DROP POLICY IF EXISTS "Patients updatable by authenticated" ON public.patients;
DROP POLICY IF EXISTS "Patients viewable by company members" ON public.patients;
CREATE POLICY "patients_select" ON public.patients FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "patients_insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "patients_update" ON public.patients FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "patients_delete" ON public.patients FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- PROCEDURES ----------------
DROP POLICY IF EXISTS "Procedures deletable by authenticated" ON public.procedures;
DROP POLICY IF EXISTS "Procedures insertable by authenticated" ON public.procedures;
DROP POLICY IF EXISTS "Procedures updatable by authenticated" ON public.procedures;
DROP POLICY IF EXISTS "Procedures viewable by authenticated" ON public.procedures;
CREATE POLICY "procedures_select" ON public.procedures FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "procedures_insert" ON public.procedures FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "procedures_update" ON public.procedures FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "procedures_delete" ON public.procedures FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- SPECIALTIES ----------------
DROP POLICY IF EXISTS "Specialties deletable by authenticated" ON public.specialties;
DROP POLICY IF EXISTS "Specialties insertable by authenticated" ON public.specialties;
DROP POLICY IF EXISTS "Specialties updatable by authenticated" ON public.specialties;
DROP POLICY IF EXISTS "Specialties viewable by authenticated" ON public.specialties;
CREATE POLICY "specialties_select" ON public.specialties FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "specialties_insert" ON public.specialties FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "specialties_update" ON public.specialties FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "specialties_delete" ON public.specialties FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- TISS_GUIDES ----------------
DROP POLICY IF EXISTS "Guides deletable by authenticated" ON public.tiss_guides;
DROP POLICY IF EXISTS "Guides insertable by authenticated" ON public.tiss_guides;
DROP POLICY IF EXISTS "Guides updatable by authenticated" ON public.tiss_guides;
DROP POLICY IF EXISTS "Guides viewable by authenticated" ON public.tiss_guides;
CREATE POLICY "tiss_guides_select" ON public.tiss_guides FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "tiss_guides_insert" ON public.tiss_guides FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "tiss_guides_update" ON public.tiss_guides FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "tiss_guides_delete" ON public.tiss_guides FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- QUEUE_UNITS / LINES / GUICHES / TICKETS ----------------
DROP POLICY IF EXISTS "queue_units_select" ON public.queue_units;
DROP POLICY IF EXISTS "queue_units_insert" ON public.queue_units;
DROP POLICY IF EXISTS "queue_units_update" ON public.queue_units;
DROP POLICY IF EXISTS "queue_units_delete" ON public.queue_units;
CREATE POLICY "queue_units_select" ON public.queue_units FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_units_insert" ON public.queue_units FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_units_update" ON public.queue_units FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_units_delete" ON public.queue_units FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "queue_lines_select" ON public.queue_lines;
DROP POLICY IF EXISTS "queue_lines_insert" ON public.queue_lines;
DROP POLICY IF EXISTS "queue_lines_update" ON public.queue_lines;
DROP POLICY IF EXISTS "queue_lines_delete" ON public.queue_lines;
CREATE POLICY "queue_lines_select" ON public.queue_lines FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_lines_insert" ON public.queue_lines FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_lines_update" ON public.queue_lines FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_lines_delete" ON public.queue_lines FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "queue_guiches_select" ON public.queue_guiches;
DROP POLICY IF EXISTS "queue_guiches_insert" ON public.queue_guiches;
DROP POLICY IF EXISTS "queue_guiches_update" ON public.queue_guiches;
DROP POLICY IF EXISTS "queue_guiches_delete" ON public.queue_guiches;
CREATE POLICY "queue_guiches_select" ON public.queue_guiches FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_guiches_insert" ON public.queue_guiches FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_guiches_update" ON public.queue_guiches FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_guiches_delete" ON public.queue_guiches FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "queue_tickets_select" ON public.queue_tickets;
DROP POLICY IF EXISTS "queue_tickets_insert" ON public.queue_tickets;
DROP POLICY IF EXISTS "queue_tickets_update" ON public.queue_tickets;
DROP POLICY IF EXISTS "queue_tickets_delete" ON public.queue_tickets;
CREATE POLICY "queue_tickets_select" ON public.queue_tickets FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_tickets_insert" ON public.queue_tickets FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_tickets_update" ON public.queue_tickets FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_tickets_delete" ON public.queue_tickets FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- QUEUE_TOTEMS ----------------
DROP POLICY IF EXISTS "queue_totems_select" ON public.queue_totems;
DROP POLICY IF EXISTS "queue_totems_insert" ON public.queue_totems;
DROP POLICY IF EXISTS "queue_totems_update" ON public.queue_totems;
DROP POLICY IF EXISTS "queue_totems_delete" ON public.queue_totems;
CREATE POLICY "queue_totems_select" ON public.queue_totems FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_totems_insert" ON public.queue_totems FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_totems_update" ON public.queue_totems FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_totems_delete" ON public.queue_totems FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- ---------------- QUEUE_TVS ----------------
DROP POLICY IF EXISTS "queue_tvs_select" ON public.queue_tvs;
DROP POLICY IF EXISTS "queue_tvs_insert" ON public.queue_tvs;
DROP POLICY IF EXISTS "queue_tvs_update" ON public.queue_tvs;
DROP POLICY IF EXISTS "queue_tvs_delete" ON public.queue_tvs;
CREATE POLICY "queue_tvs_select" ON public.queue_tvs FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_tvs_insert" ON public.queue_tvs FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_tvs_update" ON public.queue_tvs FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin())
  WITH CHECK (company_id = public.current_company_id() OR public.is_super_admin());
CREATE POLICY "queue_tvs_delete" ON public.queue_tvs FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() OR public.is_super_admin());

-- =========================================================================
-- 3. PROFILES: privilege escalation fix + super admin policy correctness
-- =========================================================================
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles deletable by authenticated" ON public.profiles;

CREATE POLICY "Super admins can read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- Trigger to prevent role / company_id escalation by non-super-admins
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;
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

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- =========================================================================
-- 4. PRICING PLANS: only super admins can write, public may read visible
-- =========================================================================
DROP POLICY IF EXISTS "Pricing plans delete public" ON public.pricing_plans;
DROP POLICY IF EXISTS "Pricing plans insert public" ON public.pricing_plans;
DROP POLICY IF EXISTS "Pricing plans update public" ON public.pricing_plans;
DROP POLICY IF EXISTS "Pricing plans public read" ON public.pricing_plans;

CREATE POLICY "pricing_plans_public_read" ON public.pricing_plans FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "pricing_plans_admin_insert" ON public.pricing_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "pricing_plans_admin_update" ON public.pricing_plans FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "pricing_plans_admin_delete" ON public.pricing_plans FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- =========================================================================
-- 5. STORAGE: tv-media listing lockdown (keep public URL reads via bucket flag)
-- =========================================================================
DROP POLICY IF EXISTS "TV media public read" ON storage.objects;
DROP POLICY IF EXISTS "TV media anon upload" ON storage.objects;
DROP POLICY IF EXISTS "TV media anon update" ON storage.objects;
DROP POLICY IF EXISTS "TV media anon delete" ON storage.objects;

CREATE POLICY "TV media authenticated upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tv-media');
CREATE POLICY "TV media authenticated update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tv-media')
  WITH CHECK (bucket_id = 'tv-media');
CREATE POLICY "TV media authenticated delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tv-media');
