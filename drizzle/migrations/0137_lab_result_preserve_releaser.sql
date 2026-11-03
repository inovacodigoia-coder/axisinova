CREATE OR REPLACE FUNCTION public.lab_result_preserve_releaser()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Quem liberou fica gravado: salvar/liberar de novo não troca o bioquímico.
  IF OLD.status = 'released' AND NEW.status = 'released' AND OLD.released_by IS NOT NULL THEN
    NEW.released_by := OLD.released_by;
    NEW.released_at := COALESCE(OLD.released_at, NEW.released_at);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.lab_result_preserve_releaser() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS lab_result_preserve_releaser ON public.lab_exam_results;
CREATE TRIGGER lab_result_preserve_releaser BEFORE UPDATE ON public.lab_exam_results
FOR EACH ROW EXECUTE FUNCTION public.lab_result_preserve_releaser();