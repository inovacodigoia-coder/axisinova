-- Permite ao laudo mostrar nome/registro de quem liberou o exame sem furar a RLS de profiles.
-- Expõe apenas nome e registro profissional (dados já impressos no laudo).
CREATE OR REPLACE FUNCTION public.lab_aprovador_info(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, council_type text, council_uf text, council_number text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.council_type, p.council_uf, p.council_number
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
$$;

REVOKE ALL ON FUNCTION public.lab_aprovador_info(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_aprovador_info(uuid[]) TO authenticated;