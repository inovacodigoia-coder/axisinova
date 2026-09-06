CREATE OR REPLACE FUNCTION public.protect_partner_api_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.is_super_admin() THEN
    RETURN NEW;
  END IF;
  NEW.partner_api_enabled := OLD.partner_api_enabled;
  NEW.partner_api_max_partners := OLD.partner_api_max_partners;
  NEW.partner_api_released_at := OLD.partner_api_released_at;
  NEW.partner_api_released_by := OLD.partner_api_released_by;
  NEW.partner_api_note := OLD.partner_api_note;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partner_api_entitlement ON public.companies;
CREATE TRIGGER protect_partner_api_entitlement
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_api_entitlement();

CREATE OR REPLACE FUNCTION public.protect_partner_api_authorization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.api_authorized := false;
  ELSE
    NEW.api_authorized := OLD.api_authorized;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partner_api_authorization ON public.api_partners;
CREATE TRIGGER protect_partner_api_authorization
BEFORE INSERT OR UPDATE ON public.api_partners
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_api_authorization();

UPDATE public.api_partners SET api_authorized = false WHERE api_authorized IS TRUE;