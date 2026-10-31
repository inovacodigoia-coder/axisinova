CREATE OR REPLACE FUNCTION public.portal_origem_edicao_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name IS NOT DISTINCT FROM OLD.name AND NEW.internal_code IS NOT DISTINCT FROM OLD.internal_code THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL AND (auth.jwt() IS NULL OR auth.jwt()->>'role' = 'service_role') THEN RETURN NEW; END IF;
  IF NOT (private.is_super_admin() OR (OLD.company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'))) THEN
    RAISE EXCEPTION 'Somente administradores podem editar nome e código da origem';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.portal_origem_edicao_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER portal_origem_edicao_guard BEFORE UPDATE OF name, internal_code ON public.origins FOR EACH ROW EXECUTE FUNCTION public.portal_origem_edicao_guard();
CREATE OR REPLACE FUNCTION public.portal_origem_editar(p_origem_id uuid, p_nome text, p_codigo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_origem public.origins%ROWTYPE; v_nome text := upper(btrim(p_nome)); v_codigo text := nullif(btrim(p_codigo), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login obrigatório'; END IF;
  SELECT * INTO v_origem FROM public.origins WHERE id = p_origem_id FOR UPDATE;
  IF NOT FOUND OR NOT (private.is_super_admin() OR (v_origem.company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'))) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta origem';
  END IF;
  IF v_nome IS NULL OR length(v_nome) < 2 THEN RAISE EXCEPTION 'Informe o nome da origem'; END IF;
  IF v_codigo IS NOT NULL AND EXISTS (SELECT 1 FROM public.origins WHERE company_id=v_origem.company_id AND id<>p_origem_id AND lower(btrim(internal_code))=lower(v_codigo)) THEN
    RAISE EXCEPTION 'Este código já pertence a outra origem';
  END IF;
  UPDATE public.origins SET name=v_nome, internal_code=v_codigo WHERE id=p_origem_id;
  IF v_origem.establishment_id IS NOT NULL THEN
    UPDATE public.establishments SET name=v_nome, internal_code=v_codigo WHERE id=v_origem.establishment_id AND company_id=v_origem.company_id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.portal_origem_editar(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_origem_editar(uuid,text,text) TO authenticated;