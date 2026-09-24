CREATE OR REPLACE FUNCTION public.apoio_set_senha(_apoio_id uuid, _senha text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sid uuid;
BEGIN
  IF _senha IS NULL OR length(_senha) = 0 OR length(_senha) > 500 THEN RAISE EXCEPTION 'Senha inválida'; END IF;
  SELECT senha_secret_id INTO sid FROM public.apoio_laboratorio WHERE id = _apoio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laboratório de apoio não encontrado'; END IF;
  IF sid IS NOT NULL AND EXISTS (SELECT 1 FROM vault.secrets WHERE id = sid) THEN
    PERFORM vault.update_secret(sid, _senha);
  ELSE
    sid := vault.create_secret(_senha, 'apoio_senha_' || _apoio_id::text, 'Senha do conector do laboratório de apoio');
    UPDATE public.apoio_laboratorio SET senha_secret_id = sid WHERE id = _apoio_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.apoio_set_senha(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_set_senha(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.apoio_audit_entitlement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.apoio_enabled IS DISTINCT FROM OLD.apoio_enabled THEN
    INSERT INTO public.apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
    VALUES (NEW.id, 'companies', NEW.id::text, CASE WHEN NEW.apoio_enabled THEN 'modulo_liberado' ELSE 'modulo_bloqueado' END,
      jsonb_build_object('apoio_enabled', OLD.apoio_enabled), jsonb_build_object('apoio_enabled', NEW.apoio_enabled, 'released_by', NEW.apoio_released_by), auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS apoio_audit_entitlement ON public.companies;
CREATE TRIGGER apoio_audit_entitlement AFTER UPDATE OF apoio_enabled ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.apoio_audit_entitlement();