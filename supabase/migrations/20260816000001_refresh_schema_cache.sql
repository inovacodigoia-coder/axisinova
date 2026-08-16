-- Force a schema cache refresh by doing a trivial DDL change
COMMENT ON TABLE public.lab_equipments IS 'Laboratory equipment and devices.';

-- Re-grant just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_equipments TO authenticated;
GRANT ALL ON public.lab_equipments TO service_role;
