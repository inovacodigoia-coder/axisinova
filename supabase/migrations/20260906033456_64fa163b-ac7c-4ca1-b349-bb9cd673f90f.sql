REVOKE ALL ON FUNCTION public.lab_equipments_master_company() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.replicate_master_lab_equipment() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.seed_lab_equipments_for_new_company() FROM anon, authenticated, public;