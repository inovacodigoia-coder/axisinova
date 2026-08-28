-- Hash device access passwords (queue_totems / queue_tvs)
CREATE OR REPLACE FUNCTION public.hash_device_access_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.access_password IS NOT NULL
     AND NEW.access_password <> ''
     AND NEW.access_password NOT LIKE '$2%' THEN
    NEW.access_password := extensions.crypt(NEW.access_password, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_totem_access_password ON public.queue_totems;
CREATE TRIGGER hash_totem_access_password
BEFORE INSERT OR UPDATE OF access_password ON public.queue_totems
FOR EACH ROW EXECUTE FUNCTION public.hash_device_access_password();

DROP TRIGGER IF EXISTS hash_tv_access_password ON public.queue_tvs;
CREATE TRIGGER hash_tv_access_password
BEFORE INSERT OR UPDATE OF access_password ON public.queue_tvs
FOR EACH ROW EXECUTE FUNCTION public.hash_device_access_password();

-- Convert existing plaintext passwords
UPDATE public.queue_totems
   SET access_password = extensions.crypt(access_password, extensions.gen_salt('bf'))
 WHERE access_password IS NOT NULL AND access_password <> '' AND access_password NOT LIKE '$2%';

UPDATE public.queue_tvs
   SET access_password = extensions.crypt(access_password, extensions.gen_salt('bf'))
 WHERE access_password IS NOT NULL AND access_password <> '' AND access_password NOT LIKE '$2%';

-- Verification now compares against the stored hash
CREATE OR REPLACE FUNCTION public.device_verify_access(_kind text, _slug text, _username text, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  select case
    when _kind = 'totem' then exists (
      select 1 from public.queue_totems t
       where t.slug = _slug
         and t.access_username = _username
         and t.access_password is not null
         and t.access_password = extensions.crypt(_password, t.access_password))
    when _kind = 'tv' then exists (
      select 1 from public.queue_tvs v
       where v.slug = _slug
         and v.access_username = _username
         and v.access_password is not null
         and v.access_password = extensions.crypt(_password, v.access_password))
    else false end;
$$;