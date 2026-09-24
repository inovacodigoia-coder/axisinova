CREATE OR REPLACE FUNCTION public.lab_norm(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(btrim(regexp_replace(translate(coalesce(t,''),'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ','AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'),'\s+',' ','g')))
$$;

CREATE TABLE public.lab_recipiente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sigla text NOT NULL,
  cor_tampa text,
  cor_hex text,
  aditivo text,
  volume_ml numeric,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lab_recipiente_nome_uq ON public.lab_recipiente(company_id, public.lab_norm(nome));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_recipiente TO authenticated;
GRANT ALL ON public.lab_recipiente TO service_role;
ALTER TABLE public.lab_recipiente ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_recipiente_all ON public.lab_recipiente FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TABLE public.lab_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sigla text,
  recipiente_id uuid REFERENCES public.lab_recipiente(id) ON DELETE RESTRICT,
  descricao text,
  legado boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.lab_material.legado IS 'Material migrado do texto antigo: sem recipiente, a etiqueta usa a regra antiga (transição)';
CREATE UNIQUE INDEX lab_material_nome_uq ON public.lab_material(company_id, public.lab_norm(nome));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_material TO authenticated;
GRANT ALL ON public.lab_material TO service_role;
ALTER TABLE public.lab_material ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_material_all ON public.lab_material FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE TABLE public.apoio_depara_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  material_apoio text NOT NULL,
  mnmat text,
  material_id uuid NOT NULL REFERENCES public.lab_material(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX apoio_depara_material_uq ON public.apoio_depara_material(apoio_id, public.lab_norm(material_apoio));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apoio_depara_material TO authenticated;
GRANT ALL ON public.apoio_depara_material TO service_role;
ALTER TABLE public.apoio_depara_material ENABLE ROW LEVEL SECURITY;
CREATE POLICY apoio_depara_material_all ON public.apoio_depara_material FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS material_tubos jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.exam_laudos ADD COLUMN IF NOT EXISTS material_tubos jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.exam_laudos.material_tubos IS '{ material_id: { recipiente_id, volume_ml } } — tubo específico deste laudo';

-- Sugestões iniciais de tubos + materiais a partir dos textos existentes
CREATE OR REPLACE FUNCTION public.lab_materiais_seed(_company uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND _company <> public.get_user_company_id(auth.uid()) THEN
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
END $$;
GRANT EXECUTE ON FUNCTION public.lab_materiais_seed(uuid) TO authenticated;

SELECT public.lab_materiais_seed(c.id) FROM public.companies c
WHERE EXISTS (SELECT 1 FROM public.exams e WHERE e.company_id = c.id);

-- Uso dos materiais (nº de exames que usam)
CREATE OR REPLACE FUNCTION public.lab_materiais_uso() RETURNS TABLE(material_id uuid, exames int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, count(DISTINCT x.exam_id)::int
  FROM lab_material m
  LEFT JOIN (
    SELECT e.id exam_id, e.company_id, jsonb_array_elements_text(e.selected_materials) n FROM exams e WHERE jsonb_typeof(e.selected_materials)='array'
    UNION ALL
    SELECT l.exam_id, l.company_id, jsonb_array_elements_text(l.selected_materials) FROM exam_laudos l WHERE jsonb_typeof(l.selected_materials)='array'
  ) x ON x.company_id = m.company_id AND lab_norm(x.n) = lab_norm(m.nome)
  WHERE m.company_id = get_user_company_id(auth.uid())
  GROUP BY m.id
$$;
GRANT EXECUTE ON FUNCTION public.lab_materiais_uso() TO authenticated;

-- Renomear material atualiza o nome nos exames/laudos
CREATE OR REPLACE FUNCTION public.lab_material_renomear_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lab_norm(NEW.nome) = lab_norm(OLD.nome) AND NEW.nome = OLD.nome THEN RETURN NEW; END IF;
  UPDATE exams SET selected_materials = (SELECT coalesce(jsonb_agg(CASE WHEN lab_norm(v) = lab_norm(OLD.nome) THEN NEW.nome ELSE v END),'[]') FROM jsonb_array_elements_text(selected_materials) v)
   WHERE company_id = NEW.company_id AND jsonb_typeof(selected_materials)='array'
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(selected_materials) v WHERE lab_norm(v) = lab_norm(OLD.nome));
  UPDATE exams SET default_material = NEW.nome WHERE company_id = NEW.company_id AND lab_norm(default_material) = lab_norm(OLD.nome);
  UPDATE exam_laudos SET selected_materials = (SELECT coalesce(jsonb_agg(CASE WHEN lab_norm(v) = lab_norm(OLD.nome) THEN NEW.nome ELSE v END),'[]') FROM jsonb_array_elements_text(selected_materials) v)
   WHERE company_id = NEW.company_id AND jsonb_typeof(selected_materials)='array'
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(selected_materials) v WHERE lab_norm(v) = lab_norm(OLD.nome));
  UPDATE exam_laudos SET default_material = NEW.nome WHERE company_id = NEW.company_id AND lab_norm(default_material) = lab_norm(OLD.nome);
  RETURN NEW;
END $$;
CREATE TRIGGER lab_material_renomear AFTER UPDATE OF nome ON public.lab_material
  FOR EACH ROW EXECUTE FUNCTION public.lab_material_renomear_trg();