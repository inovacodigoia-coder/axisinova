ALTER TABLE public.admission_requests ADD COLUMN IF NOT EXISTS has_companion boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admission_set_companion(_request_id uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE admission_requests SET has_companion = coalesce(_value,false)
   WHERE id=_request_id AND company_id=get_user_company_id(auth.uid()) AND status IN ('pending','approved','admitted');
  IF NOT FOUND THEN RAISE EXCEPTION 'Internação não encontrada'; END IF;
  PERFORM apoio_auditar('admission_requests', _request_id, 'acompanhante', NULL, jsonb_build_object('has_companion',_value));
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.nutricao_tem_permissao(_acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND coalesce(ap.permissions->'nutrition','[]'::jsonb) ? _acao));
$$;

CREATE TABLE public.nutricao_dieta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome)
);
GRANT SELECT, INSERT, UPDATE ON public.nutricao_dieta TO authenticated;
GRANT ALL ON public.nutricao_dieta TO service_role;
ALTER TABLE public.nutricao_dieta ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutricao_dieta_sel ON public.nutricao_dieta FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY nutricao_dieta_ins ON public.nutricao_dieta FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()) AND nutricao_tem_permissao('edit'));
CREATE POLICY nutricao_dieta_upd ON public.nutricao_dieta FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND nutricao_tem_permissao('edit'));

INSERT INTO public.nutricao_dieta (company_id, nome, ordem)
SELECT c.id, d.nome, d.ordem FROM public.companies c
CROSS JOIN (VALUES ('Normal',1),('Branda',2),('Para Diabético',3),('Hipossódica',4),('Líquida',5),('Pastosa',6)) d(nome,ordem)
ON CONFLICT DO NOTHING;

CREATE TABLE public.nutricao_paciente (
  admission_request_id uuid PRIMARY KEY REFERENCES public.admission_requests(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  dieta_id uuid REFERENCES public.nutricao_dieta(id),
  observacoes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.nutricao_paciente TO authenticated;
GRANT ALL ON public.nutricao_paciente TO service_role;
ALTER TABLE public.nutricao_paciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutricao_paciente_sel ON public.nutricao_paciente FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY nutricao_paciente_ins ON public.nutricao_paciente FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()) AND nutricao_tem_permissao('edit'));
CREATE POLICY nutricao_paciente_upd ON public.nutricao_paciente FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND nutricao_tem_permissao('edit'));

CREATE TABLE public.nutricao_refeicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  admission_request_id uuid NOT NULL REFERENCES public.admission_requests(id) ON DELETE CASCADE,
  data date NOT NULL,
  refeicao text NOT NULL CHECK (refeicao IN ('cafe','almoco','lanche','janta','ceia')),
  dieta_nome text,
  acompanhante boolean NOT NULL DEFAULT false,
  conferido_em timestamptz, conferido_por uuid,
  servido_em timestamptz, servido_por uuid,
  UNIQUE (admission_request_id, data, refeicao)
);
GRANT SELECT ON public.nutricao_refeicao TO authenticated;
GRANT ALL ON public.nutricao_refeicao TO service_role;
ALTER TABLE public.nutricao_refeicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutricao_refeicao_sel ON public.nutricao_refeicao FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Conferência (nutricionista) antes de servir; servir exige conferência.
CREATE OR REPLACE FUNCTION public.nutricao_marcar(_request_id uuid, _data date, _refeicao text, _etapa text, _valor boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cid uuid := get_user_company_id(auth.uid()); r admission_requests; np nutricao_paciente; dn text; cur nutricao_refeicao;
BEGIN
  SELECT * INTO r FROM admission_requests WHERE id=_request_id AND company_id=cid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paciente não encontrado'; END IF;
  SELECT * INTO np FROM nutricao_paciente WHERE admission_request_id=_request_id;
  SELECT nome INTO dn FROM nutricao_dieta WHERE id=np.dieta_id;
  SELECT * INTO cur FROM nutricao_refeicao WHERE admission_request_id=_request_id AND data=_data AND refeicao=_refeicao;
  IF _etapa='conferir' THEN
    IF NOT nutricao_tem_permissao('approve') THEN RAISE EXCEPTION 'Sem permissão para conferir'; END IF;
    IF _valor AND dn IS NULL THEN RAISE EXCEPTION 'Defina o tipo de dieta antes de conferir'; END IF;
    IF NOT _valor AND cur.servido_em IS NOT NULL THEN RAISE EXCEPTION 'Refeição já servida'; END IF;
    INSERT INTO nutricao_refeicao(company_id, admission_request_id, data, refeicao, dieta_nome, acompanhante, conferido_em, conferido_por)
    VALUES (cid, _request_id, _data, _refeicao, dn, r.has_companion, CASE WHEN _valor THEN now() END, CASE WHEN _valor THEN auth.uid() END)
    ON CONFLICT (admission_request_id, data, refeicao) DO UPDATE SET
      dieta_nome=EXCLUDED.dieta_nome, acompanhante=EXCLUDED.acompanhante,
      conferido_em=EXCLUDED.conferido_em, conferido_por=EXCLUDED.conferido_por;
  ELSIF _etapa='servir' THEN
    IF NOT nutricao_tem_permissao('create') THEN RAISE EXCEPTION 'Sem permissão para marcar servido'; END IF;
    IF cur.conferido_em IS NULL THEN RAISE EXCEPTION 'A nutricionista precisa conferir antes de servir'; END IF;
    UPDATE nutricao_refeicao SET servido_em=CASE WHEN _valor THEN now() END, servido_por=CASE WHEN _valor THEN auth.uid() END WHERE id=cur.id;
  ELSE RAISE EXCEPTION 'Etapa inválida'; END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.nutricao_refeicao;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nutricao_paciente;