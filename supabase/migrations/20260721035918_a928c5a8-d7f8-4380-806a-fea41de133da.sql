
DO $$
DECLARE
  target_ids uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000001',
    'c7de33c8-abf3-44b2-b092-df1ec8af1e22',
    '9f0625c9-0d24-40ab-a1aa-61c80610e4ac',
    '1719d8c4-2139-4862-8639-6e11f7ad64b4',
    '64f9d84f-ecaf-4325-8a48-e8989b25fac7',
    'f4dcd934-fb9e-49c0-bdb8-b3248553727f',
    '956b915a-c2d5-4504-83e6-3df070c71bcb',
    '7b015e48-f6b3-4f50-ac13-bc710b3be8c1'
  ]::uuid[];
  user_ids uuid[];
  t text;
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO user_ids
  FROM public.profiles WHERE company_id = ANY(target_ids);

  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_name = 'company_id'
      AND c.table_name <> 'profiles'
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE company_id = ANY($1)', t) USING target_ids;
  END LOOP;

  DELETE FROM public.profiles WHERE company_id = ANY(target_ids);

  IF array_length(user_ids, 1) > 0 THEN
    DELETE FROM auth.users WHERE id = ANY(user_ids);
  END IF;

  DELETE FROM public.companies WHERE id = ANY(target_ids);
END $$;
