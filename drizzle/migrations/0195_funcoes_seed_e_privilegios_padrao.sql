-- Etapa 3B: seeds sem acesso indevido + funções novas nascem sem acesso de visitante.

-- 1) apoio_seed_company: só o gatilho de empresa nova (apoio_seed_company_trg é SECURITY DEFINER do dono) e o servidor.
REVOKE EXECUTE ON FUNCTION public.apoio_seed_company(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_seed_company(uuid) TO service_role;

-- 2) lab_materiais_seed: exige login na mesma empresa (service_role continua permitido).
CREATE OR REPLACE FUNCTION public.lab_materiais_seed(_company uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (coalesce(auth.jwt()->>'role', '') = 'service_role'
          OR (auth.uid() IS NOT NULL AND _company IS NOT DISTINCT FROM public.get_user_company_id(auth.uid()))) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM lab_recipiente WHERE company_id = _company) THEN
    INSERT INTO lab_recipiente(company_id, nome, sigla, cor_tampa, cor_hex, ordem) VALUES
      (_company,'Tubo com gel separador','GEL','Amarela','#FACC15',1),
      (_company,'Tubo seco','SECO','Vermelha','#DC2626',2),
      (_company,'EDTA','EDTA','Roxa','#9333EA',3),
      (_company,'Citrato de sódio','CIT','Azul','#2563EB',4),
      (_company,'Fluoreto','FLU','Cinza','#9CA3AF',5),
      (_company,'Heparina','HEP','Verde','#16A34A',6),
      (_company,'Frasco coletor estéril','FRASCO',NULL,NULL,7),
      (_company,'Swab com meio de transporte','SWAB',NULL,NULL,8),
      (_company,'Coletor de urina 24 h','U24',NULL,NULL,9)
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO lab_material(company_id, nome, legado, ordem)
  SELECT _company, nome, true, row_number() over () FROM (
    SELECT DISTINCT ON (lab_norm(n)) btrim(n) nome FROM (
      SELECT unnest(ARRAY['Sangue Total','Soro','Plasma','Urina','Fezes','Secreção','Líquor','Swab']) n
      UNION ALL SELECT jsonb_array_elements_text(coalesce(selected_materials,'[]')) FROM exams WHERE company_id = _company AND jsonb_typeof(selected_materials)='array'
      UNION ALL SELECT jsonb_array_elements_text(coalesce(selected_materials,'[]')) FROM exam_laudos WHERE company_id = _company AND jsonb_typeof(selected_materials)='array'
    ) s WHERE btrim(coalesce(n,'')) <> ''
  ) d
  ON CONFLICT DO NOTHING;
END $function$;
REVOKE EXECUTE ON FUNCTION public.lab_materiais_seed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_materiais_seed(uuid) TO authenticated, service_role;

-- 3) Funções novas criadas pelo papel das migrações nascem sem EXECUTE para PUBLIC e anon.
--    (O padrão de PUBLIC é global; o de anon vem da regra do schema public.)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Reversão (rodar em nova migração se precisar voltar):
-- GRANT EXECUTE ON FUNCTION public.apoio_seed_company(uuid) TO PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.lab_materiais_seed(uuid) TO PUBLIC, anon;
-- (texto anterior de lab_materiais_seed: checagem "IF auth.uid() IS NOT NULL AND _company <> get_user_company_id(auth.uid())")
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;