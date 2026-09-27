ALTER TABLE public.admission_requests ADD COLUMN IF NOT EXISTS companion_confirmed boolean NOT NULL DEFAULT false;
UPDATE public.admission_requests SET companion_confirmed = true WHERE requested_at >= '2026-09-27 02:03:00+00' OR has_companion = true;
ALTER TABLE public.lab_settings ADD COLUMN IF NOT EXISTS nutricao_label_config jsonb;
CREATE OR REPLACE FUNCTION public.admission_set_companion(_request_id uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE admission_requests SET has_companion = coalesce(_value,false), companion_confirmed = true
   WHERE id=_request_id AND company_id=get_user_company_id(auth.uid()) AND status IN ('pending','approved','admitted');
  IF NOT FOUND THEN RAISE EXCEPTION 'Internação não encontrada'; END IF;
END $$;