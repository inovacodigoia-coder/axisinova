-- 1. companies: remove full public exposure, replace with narrow CNPJ lookup RPCs
DROP POLICY IF EXISTS "Allow anyone to check CNPJ existence" ON public.companies;

CREATE OR REPLACE FUNCTION public.company_cnpj_exists(_cnpj text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies c WHERE c.cnpj = _cnpj);
$$;

CREATE OR REPLACE FUNCTION public.company_id_by_cnpj(_cnpj text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id FROM public.companies c WHERE c.cnpj = _cnpj LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.company_cnpj_exists(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_id_by_cnpj(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_cnpj_exists(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_id_by_cnpj(text) TO anon, authenticated;

-- 2. system_settings: no public read, remove leaked dev credentials
DROP POLICY IF EXISTS "system_settings_read_all" ON public.system_settings;
CREATE POLICY "system_settings_super_admin_read"
  ON public.system_settings FOR SELECT TO authenticated
  USING (private.is_super_admin());
DELETE FROM public.system_settings WHERE key = 'dev_access_panel';
REVOKE SELECT ON public.system_settings FROM anon;

-- 3. measurement_units: real company scoping
DROP POLICY IF EXISTS "Users can manage measurement_units of their company" ON public.measurement_units;
CREATE POLICY "measurement_units_company_scope"
  ON public.measurement_units FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 4. lab exam parameters / reference values: verified company lookup instead of JWT claim
DROP POLICY IF EXISTS "Users can manage their company's lab exam parameters" ON public.lab_exam_parameters;
CREATE POLICY "lab_exam_parameters_company_scope"
  ON public.lab_exam_parameters FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage their company's lab exam reference values" ON public.lab_exam_reference_values;
CREATE POLICY "lab_exam_reference_values_company_scope"
  ON public.lab_exam_reference_values FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- 5. Storage: ownership checks based on the company_id folder prefix
DROP POLICY IF EXISTS "Authenticated read attendance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload attendance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update attendance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete attendance attachments" ON storage.objects;

CREATE POLICY "attendance_attachments_company_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attendance-attachments' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "attendance_attachments_company_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attendance-attachments' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "attendance_attachments_company_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'attendance-attachments' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text)
  WITH CHECK (bucket_id = 'attendance-attachments' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "attendance_attachments_company_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attendance-attachments' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);

DROP POLICY IF EXISTS "Company assets authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Company assets authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Company assets authenticated delete" ON storage.objects;

CREATE POLICY "company_assets_company_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "company_assets_company_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text)
  WITH CHECK (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "company_assets_company_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);

DROP POLICY IF EXISTS "TV media authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "TV media authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "TV media authenticated delete" ON storage.objects;

CREATE POLICY "tv_media_company_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tv-media' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "tv_media_company_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tv-media' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text)
  WITH CHECK (bucket_id = 'tv-media' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);
CREATE POLICY "tv_media_company_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tv-media' AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text);

-- 6. SECURITY DEFINER functions: only device/kiosk helpers stay callable by anon
REVOKE ALL ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_attendance_order_number(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.initialize_company_access_defaults(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_create_origin_for_establishment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_company_initialization() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_company_manager(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_attendance_order_number(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_company_access_defaults(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.device_public_info(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.device_verify_access(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.totem_queue_lines(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.totem_create_ticket(text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.panel_tickets(text) TO anon, authenticated;