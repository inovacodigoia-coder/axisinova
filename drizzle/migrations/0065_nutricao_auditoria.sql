CREATE OR REPLACE FUNCTION public.admission_set_companion(_request_id uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE admission_requests SET has_companion = coalesce(_value,false)
   WHERE id=_request_id AND company_id=get_user_company_id(auth.uid()) AND status IN ('pending','approved','admitted');
  IF NOT FOUND THEN RAISE EXCEPTION 'Internação não encontrada'; END IF;
END $$;
CREATE TRIGGER nutricao_paciente_audit AFTER INSERT OR UPDATE ON public.nutricao_paciente FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();
CREATE TRIGGER nutricao_refeicao_audit AFTER INSERT OR UPDATE ON public.nutricao_refeicao FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();
CREATE TRIGGER nutricao_dieta_audit AFTER INSERT OR UPDATE ON public.nutricao_dieta FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();