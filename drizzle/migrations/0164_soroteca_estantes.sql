-- Soroteca S04: estantes (grade de tubos com etiqueta própria) guardadas nas prateleiras de geladeira/freezer.
-- Tubo fica sempre numa estante; geladeira/freezer guarda estantes (capacidade = posições por prateleira).
ALTER TABLE public.soroteca_equipamento
  ADD COLUMN codigo text,
  ADD COLUMN situacao text CHECK (situacao IN ('em_preenchimento', 'armazenada')),
  ADD COLUMN local_equipamento_id uuid REFERENCES public.soroteca_equipamento(id),
  ADD COLUMN local_prateleira_id uuid REFERENCES public.soroteca_prateleira(id),
  ADD COLUMN local_em timestamptz;

-- Estantes já cadastradas ganham código E00001… e ficam em preenchimento; a grade única fica sem nome
UPDATE public.soroteca_equipamento e SET codigo = x.cod, situacao = 'em_preenchimento'
FROM (SELECT id, 'E' || lpad((row_number() OVER (PARTITION BY company_id ORDER BY created_at, id))::text, 5, '0') AS cod
      FROM public.soroteca_equipamento WHERE tipo = 'estante') x
WHERE x.id = e.id;
UPDATE public.soroteca_prateleira p SET nome = ''
FROM public.soroteca_equipamento e
WHERE e.id = p.equipamento_id AND e.tipo = 'estante'
  AND (SELECT count(*) FROM public.soroteca_prateleira q WHERE q.equipamento_id = e.id) = 1;

ALTER TABLE public.soroteca_equipamento
  ADD CONSTRAINT soroteca_equipamento_estante_campos CHECK (tipo = 'estante' OR (situacao IS NULL AND local_equipamento_id IS NULL AND local_prateleira_id IS NULL)),
  ADD CONSTRAINT soroteca_equipamento_estante_codigo CHECK (tipo <> 'estante' OR (situacao IS NOT NULL AND codigo IS NOT NULL)),
  ADD CONSTRAINT soroteca_equipamento_estante_local CHECK (coalesce(situacao, '') <> 'armazenada' OR (local_equipamento_id IS NOT NULL AND local_prateleira_id IS NOT NULL));
CREATE UNIQUE INDEX soroteca_equipamento_codigo_uq ON public.soroteca_equipamento (company_id, upper(codigo)) WHERE codigo IS NOT NULL;
CREATE INDEX soroteca_equipamento_local_idx ON public.soroteca_equipamento (local_prateleira_id) WHERE local_prateleira_id IS NOT NULL;

-- Histórico imutável da estante (criada, guardada na geladeira, aberta para preencher)
CREATE TABLE public.soroteca_estante_movimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  estante_id uuid NOT NULL REFERENCES public.soroteca_equipamento(id),
  tipo text NOT NULL CHECK (tipo IN ('criada', 'guardada', 'aberta')),
  estante_nome text,
  equipamento_nome text,
  prateleira_nome text,
  tubos int NOT NULL DEFAULT 0,
  usuario_id uuid,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX soroteca_estante_movimento_idx ON public.soroteca_estante_movimento (estante_id, created_at);
GRANT SELECT ON public.soroteca_estante_movimento TO authenticated;
GRANT ALL ON public.soroteca_estante_movimento TO service_role;
ALTER TABLE public.soroteca_estante_movimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê histórico das estantes da empresa" ON public.soroteca_estante_movimento FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));
CREATE TRIGGER trg_soroteca_estante_movimento_imutavel BEFORE UPDATE OR DELETE ON public.soroteca_estante_movimento
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_movimento_imutavel();

-- Gravações antigas (equipamento com prateleiras de tubos) saem do navegador: telas usam estante/armário
COMMENT ON FUNCTION public.soroteca_equipamento_gravar(uuid, text, text, text, text, jsonb, boolean) IS 'DEPRECATED: use soroteca_estante_gravar / soroteca_armario_gravar';
COMMENT ON FUNCTION public.soroteca_equipamento_salvar(uuid, text, text, text, text, int, int, boolean) IS 'DEPRECATED: use soroteca_estante_gravar / soroteca_armario_gravar';
REVOKE EXECUTE ON FUNCTION public.soroteca_equipamento_gravar(uuid, text, text, text, text, jsonb, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.soroteca_equipamento_salvar(uuid, text, text, text, text, int, int, boolean) FROM authenticated;

-- Estante: uma grade (linha = letra, coluna = número) e uma etiqueta própria. Criar: quem armazena ou configura; editar: só configura.
CREATE OR REPLACE FUNCTION public.soroteca_estante_gravar(p_id uuid, p_codigo text, p_nome text, p_linhas int, p_colunas int,
  p_workbench_id text, p_ativo boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_cod text := upper(trim(coalesce(p_codigo, '')));
  v_nome text; v_wb text := nullif(trim(coalesce(p_workbench_id, '')), ''); e record; v_id uuid; v_pid uuid; v_tubos int;
BEGIN
  IF p_id IS NULL THEN
    IF NOT (public.soroteca_tem_permissao('soroteca.armazenar') OR public.soroteca_tem_permissao('soroteca.configurar')) THEN
      RAISE EXCEPTION 'Sem permissão para criar estantes na Soroteca' USING ERRCODE = '42501';
    END IF;
  ELSIF NOT public.soroteca_tem_permissao('soroteca.configurar') THEN
    RAISE EXCEPTION 'Sem permissão para configurar a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF v_cod !~ '^[A-Z0-9][A-Z0-9-]{1,29}$' THEN
    RAISE EXCEPTION 'Código da estante: de 2 a 30 letras, números ou hífen';
  END IF;
  -- não pode confundir com a etiqueta de um tubo (código de barras de 9 caracteres ou código da amostra)
  IF v_cod ~ '^[A-Z][A-Z0-9]{7}[0-9]$' OR EXISTS (SELECT 1 FROM public.soroteca_amostra
       WHERE company_id = v_company AND (upper(codigo_amostra) = v_cod OR codigo_alfanumerico = v_cod)) THEN
    RAISE EXCEPTION 'O código % se parece com a etiqueta de um tubo; escolha outro para a estante', v_cod;
  END IF;
  IF p_linhas IS NULL OR p_linhas NOT BETWEEN 1 AND 52 THEN RAISE EXCEPTION 'Linhas da estante devem ficar entre 1 e 52'; END IF;
  IF p_colunas IS NULL OR p_colunas NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Colunas da estante devem ficar entre 1 e 99'; END IF;
  IF v_wb IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lab_workbenches WHERE id::text = v_wb AND company_id = v_company) THEN
    RAISE EXCEPTION 'Bancada não encontrada';
  END IF;
  v_nome := left(coalesce(nullif(trim(coalesce(p_nome, '')), ''), 'Estante ' || v_cod), 80);
  IF EXISTS (SELECT 1 FROM public.soroteca_equipamento WHERE company_id = v_company AND upper(codigo) = v_cod AND id IS DISTINCT FROM p_id) THEN
    RAISE EXCEPTION 'Já existe uma estante com o código %', v_cod;
  END IF;
  IF EXISTS (SELECT 1 FROM public.soroteca_equipamento WHERE company_id = v_company AND lower(trim(nome)) = lower(v_nome) AND id IS DISTINCT FROM p_id) THEN
    RAISE EXCEPTION 'Já existe um equipamento com o nome %', v_nome;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.soroteca_equipamento (company_id, nome, tipo, codigo, situacao, workbench_id, linhas, colunas, ativo, created_by)
    VALUES (v_company, v_nome, 'estante', v_cod, 'em_preenchimento', v_wb, p_linhas, p_colunas, true, auth.uid())
    RETURNING id INTO v_id;
    INSERT INTO public.soroteca_prateleira (company_id, equipamento_id, nome, linhas, colunas, ordem)
    VALUES (v_company, v_id, '', p_linhas, p_colunas, 1);
    INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, usuario_id, usuario_nome)
    VALUES (v_company, v_id, 'criada', v_nome, auth.uid(), public.soroteca__usuario_nome());
    RETURN v_id;
  END IF;

  SELECT * INTO e FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF e.tipo <> 'estante' THEN RAISE EXCEPTION 'Este equipamento não é uma estante'; END IF;
  IF (SELECT count(*) FROM public.soroteca_prateleira WHERE equipamento_id = e.id) <> 1 THEN
    RAISE EXCEPTION 'Esta estante antiga tem várias prateleiras; retire os tubos e cadastre uma estante nova';
  END IF;
  SELECT id INTO v_pid FROM public.soroteca_prateleira WHERE equipamento_id = e.id FOR UPDATE;
  SELECT count(*) INTO v_tubos FROM public.soroteca_amostra WHERE prateleira_id = v_pid AND status = 'armazenada';
  IF NOT coalesce(p_ativo, true) AND v_tubos > 0 THEN
    RAISE EXCEPTION 'Retire ou descarte os % tubo(s) antes de inativar a estante', v_tubos;
  END IF;
  IF EXISTS (SELECT 1 FROM public.soroteca_amostra WHERE prateleira_id = v_pid AND status = 'armazenada' AND (linha > p_linhas OR coluna > p_colunas)) THEN
    RAISE EXCEPTION 'Há tubos fora da nova grade da estante %; mova-os antes de diminuir', e.nome;
  END IF;
  UPDATE public.soroteca_equipamento SET nome = v_nome, codigo = v_cod, workbench_id = v_wb, linhas = p_linhas, colunas = p_colunas,
    ativo = coalesce(p_ativo, true),
    -- estante inativada sai da geladeira (vaga liberada)
    situacao = CASE WHEN coalesce(p_ativo, true) THEN situacao ELSE 'em_preenchimento' END,
    local_equipamento_id = CASE WHEN coalesce(p_ativo, true) THEN local_equipamento_id END,
    local_prateleira_id = CASE WHEN coalesce(p_ativo, true) THEN local_prateleira_id END,
    local_em = CASE WHEN coalesce(p_ativo, true) THEN local_em END,
    updated_at = now()
  WHERE id = e.id;
  UPDATE public.soroteca_prateleira SET nome = '', linhas = p_linhas, colunas = p_colunas, ordem = 1, updated_at = now() WHERE id = v_pid;
  RETURN e.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_gravar(uuid, text, text, int, int, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_gravar(uuid, text, text, int, int, text, boolean) TO authenticated;

-- Geladeira / freezer / outro: N prateleiras, cada uma com X posições de estante
CREATE OR REPLACE FUNCTION public.soroteca_armario_gravar(p_id uuid, p_nome text, p_tipo text, p_temperatura text,
  p_prateleiras int, p_posicoes int, p_ativo boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_nome text := left(trim(coalesce(p_nome, '')), 80);
  v_temp text := nullif(left(trim(coalesce(p_temperatura, '')), 40), ''); e record; v_id uuid; pr record; v_i int := 0; v_n int;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.configurar') THEN
    RAISE EXCEPTION 'Sem permissão para configurar a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF v_nome = '' THEN RAISE EXCEPTION 'Informe o nome do equipamento'; END IF;
  IF coalesce(p_tipo, '') NOT IN ('geladeira', 'freezer', 'outro') THEN RAISE EXCEPTION 'Tipo de equipamento inválido'; END IF;
  IF p_prateleiras IS NULL OR p_prateleiras NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Número de prateleiras deve ficar entre 1 e 30'; END IF;
  IF p_posicoes IS NULL OR p_posicoes NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Posições por prateleira devem ficar entre 1 e 99'; END IF;
  IF EXISTS (SELECT 1 FROM public.soroteca_equipamento WHERE company_id = v_company AND lower(trim(nome)) = lower(v_nome) AND id IS DISTINCT FROM p_id) THEN
    RAISE EXCEPTION 'Já existe um equipamento com esse nome';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.soroteca_equipamento (company_id, nome, tipo, temperatura, linhas, colunas, ativo, created_by)
    VALUES (v_company, v_nome, p_tipo, v_temp, 1, p_posicoes, true, auth.uid()) RETURNING id INTO v_id;
    INSERT INTO public.soroteca_prateleira (company_id, equipamento_id, nome, linhas, colunas, ordem)
    SELECT v_company, v_id, 'Prateleira ' || i, 1, p_posicoes, i FROM generate_series(1, p_prateleiras) i;
    RETURN v_id;
  END IF;

  SELECT * INTO e FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Equipamento não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF e.tipo = 'estante' THEN RAISE EXCEPTION 'Estante se edita pela grade (linhas × colunas)'; END IF;
  IF EXISTS (SELECT 1 FROM public.soroteca_amostra WHERE equipamento_id = e.id AND status = 'armazenada') THEN
    RAISE EXCEPTION 'Há tubos guardados direto em %; retire-os antes de alterar (os tubos agora ficam nas estantes)', e.nome;
  END IF;
  IF NOT coalesce(p_ativo, true) AND EXISTS (SELECT 1 FROM public.soroteca_equipamento WHERE local_equipamento_id = e.id AND situacao = 'armazenada') THEN
    RAISE EXCEPTION 'Retire as estantes de % antes de inativar', e.nome;
  END IF;
  FOR pr IN SELECT p.* FROM public.soroteca_prateleira p WHERE p.equipamento_id = e.id ORDER BY p.ordem, p.nome FOR UPDATE LOOP
    v_i := v_i + 1;
    SELECT count(*) INTO v_n FROM public.soroteca_equipamento WHERE local_prateleira_id = pr.id AND situacao = 'armazenada';
    IF v_i > p_prateleiras THEN
      IF v_n > 0 THEN RAISE EXCEPTION 'A % tem % estante(s); retire-as antes de diminuir as prateleiras', pr.nome, v_n; END IF;
      DELETE FROM public.soroteca_prateleira WHERE id = pr.id;
    ELSE
      IF v_n > p_posicoes THEN RAISE EXCEPTION 'A % tem % estante(s); não dá para deixar só % posição(ões)', pr.nome, v_n, p_posicoes; END IF;
      UPDATE public.soroteca_prateleira SET linhas = 1, colunas = p_posicoes, ordem = v_i, updated_at = now() WHERE id = pr.id;
    END IF;
  END LOOP;
  IF v_i < p_prateleiras THEN
    INSERT INTO public.soroteca_prateleira (company_id, equipamento_id, nome, linhas, colunas, ordem)
    SELECT v_company, e.id, 'Prateleira ' || i, 1, p_posicoes, i FROM generate_series(v_i + 1, p_prateleiras) i;
  END IF;
  UPDATE public.soroteca_equipamento SET nome = v_nome, tipo = p_tipo, temperatura = v_temp, workbench_id = NULL, linhas = 1, colunas = p_posicoes,
    ativo = coalesce(p_ativo, true), updated_at = now() WHERE id = e.id;
  RETURN e.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_armario_gravar(uuid, text, text, text, int, int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_armario_gravar(uuid, text, text, text, int, int, boolean) TO authenticated;

-- Bipe de estante guardada: sai da geladeira para receber tubos (fica no histórico)
CREATE OR REPLACE FUNCTION public.soroteca_estante_abrir(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record; v_de text; v_tubos int;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para armazenar amostras na Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT s.*, g.nome AS g_nome, gp.nome AS gp_nome INTO e FROM public.soroteca_equipamento s
    LEFT JOIN public.soroteca_equipamento g ON g.id = s.local_equipamento_id LEFT JOIN public.soroteca_prateleira gp ON gp.id = s.local_prateleira_id
    WHERE s.id = p_id AND s.company_id = v_company FOR UPDATE OF s;
  IF e.id IS NULL OR e.tipo <> 'estante' THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF NOT e.ativo THEN RAISE EXCEPTION 'A estante % está inativa', e.codigo; END IF;
  IF e.situacao <> 'armazenada' THEN RETURN jsonb_build_object('aberta', false, 'de', NULL); END IF;
  v_de := concat_ws(' > ', e.g_nome, nullif(e.gp_nome, ''));
  SELECT count(*) INTO v_tubos FROM public.soroteca_amostra WHERE equipamento_id = e.id AND status = 'armazenada';
  UPDATE public.soroteca_equipamento SET situacao = 'em_preenchimento', local_equipamento_id = NULL, local_prateleira_id = NULL, local_em = NULL, updated_at = now()
    WHERE id = e.id;
  INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, equipamento_nome, prateleira_nome, tubos, usuario_id, usuario_nome)
  VALUES (v_company, e.id, 'aberta', e.nome, e.g_nome, e.gp_nome, v_tubos, auth.uid(), public.soroteca__usuario_nome());
  RETURN jsonb_build_object('aberta', true, 'de', v_de);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_abrir(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_abrir(uuid) TO authenticated;

-- Finalizar: guarda a estante (mesmo parcialmente cheia) numa prateleira de geladeira/freezer com vaga
CREATE OR REPLACE FUNCTION public.soroteca_estante_guardar(p_id uuid, p_equipamento_id uuid, p_prateleira_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record; g record; pr record; v_n int; v_tubos int;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para armazenar amostras na Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company FOR UPDATE;
  IF e.id IS NULL OR e.tipo <> 'estante' THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF NOT e.ativo THEN RAISE EXCEPTION 'A estante % está inativa', e.codigo; END IF;
  SELECT * INTO g FROM public.soroteca_equipamento WHERE id = p_equipamento_id AND company_id = v_company FOR UPDATE;
  IF g.id IS NULL OR g.tipo = 'estante' OR NOT g.ativo THEN RAISE EXCEPTION 'Geladeira ou freezer não encontrado ou inativo'; END IF;
  SELECT * INTO pr FROM public.soroteca_prateleira WHERE id = p_prateleira_id AND equipamento_id = g.id;
  IF pr.id IS NULL THEN RAISE EXCEPTION 'Prateleira não encontrada em %', g.nome; END IF;
  SELECT count(*) INTO v_tubos FROM public.soroteca_amostra WHERE equipamento_id = e.id AND status = 'armazenada';
  IF v_tubos = 0 THEN RAISE EXCEPTION 'A estante % está vazia: bipe pelo menos um tubo antes de guardar', e.codigo; END IF;
  IF e.situacao = 'armazenada' AND e.local_prateleira_id = pr.id THEN
    RETURN jsonb_build_object('equipamento_nome', g.nome, 'prateleira_nome', pr.nome, 'tubos', v_tubos);
  END IF;
  SELECT count(*) INTO v_n FROM public.soroteca_equipamento WHERE local_prateleira_id = pr.id AND situacao = 'armazenada' AND id <> e.id;
  IF v_n >= pr.linhas * pr.colunas THEN
    RAISE EXCEPTION 'A % de % já está cheia (% de % estantes)', pr.nome, g.nome, v_n, pr.linhas * pr.colunas;
  END IF;
  UPDATE public.soroteca_equipamento SET situacao = 'armazenada', local_equipamento_id = g.id, local_prateleira_id = pr.id, local_em = now(), updated_at = now()
    WHERE id = e.id;
  INSERT INTO public.soroteca_estante_movimento (company_id, estante_id, tipo, estante_nome, equipamento_nome, prateleira_nome, tubos, usuario_id, usuario_nome)
  VALUES (v_company, e.id, 'guardada', e.nome, g.nome, pr.nome, v_tubos, auth.uid(), public.soroteca__usuario_nome());
  RETURN jsonb_build_object('equipamento_nome', g.nome, 'prateleira_nome', pr.nome, 'tubos', v_tubos);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_guardar(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_guardar(uuid, uuid, uuid) TO authenticated;

-- Leituras/gravações existentes passam a conhecer a estante e onde ela está guardada
CREATE OR REPLACE FUNCTION public.soroteca_resumo()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_aviso int; v_mes timestamptz;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce((SELECT aviso_dias FROM public.soroteca_config WHERE company_id = v_company), 7) INTO v_aviso;
  v_mes := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  RETURN jsonb_build_object(
    'aviso_dias', v_aviso,
    'armazenadas', (SELECT count(*) FROM public.soroteca_amostra WHERE company_id = v_company AND status = 'armazenada'),
    'vencidas', (SELECT count(*) FROM public.soroteca_amostra WHERE company_id = v_company AND status = 'armazenada' AND validade < now()),
    'vencendo_aviso', (SELECT count(*) FROM public.soroteca_amostra WHERE company_id = v_company AND status = 'armazenada' AND validade <= now() + make_interval(days => v_aviso)),
    'vencendo_30', (SELECT count(*) FROM public.soroteca_amostra WHERE company_id = v_company AND status = 'armazenada' AND validade <= now() + interval '30 days'),
    'descartadas_mes', (SELECT count(*) FROM public.soroteca_amostra WHERE company_id = v_company AND status = 'descartada' AND descartada_em >= v_mes),
    'equipamentos', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'tipo', e.tipo, 'temperatura', e.temperatura,
        'workbench_id', e.workbench_id, 'bancada_nome', w.name, 'ativo', e.ativo,
        'codigo', e.codigo, 'situacao', e.situacao, 'local_em', e.local_em,
        'local_equipamento_id', e.local_equipamento_id, 'local_equipamento_nome', g.nome,
        'local_prateleira_id', e.local_prateleira_id, 'local_prateleira_nome', gp.nome,
        'prateleiras', pr.lista, 'capacidade', pr.capacidade,
        'ocupadas', CASE WHEN e.tipo = 'estante' THEN (SELECT count(*) FROM public.soroteca_amostra a WHERE a.equipamento_id = e.id AND a.status = 'armazenada')
                    ELSE (SELECT count(*) FROM public.soroteca_equipamento x WHERE x.local_equipamento_id = e.id AND x.situacao = 'armazenada') END)
        ORDER BY e.ativo DESC, e.nome)
      FROM public.soroteca_equipamento e LEFT JOIN public.lab_workbenches w ON w.id::text = e.workbench_id
      LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
      LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
      CROSS JOIN LATERAL (
        SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'linhas', p.linhas, 'colunas', p.colunas, 'ordem', p.ordem,
            'ocupadas', CASE WHEN e.tipo = 'estante' THEN (SELECT count(*) FROM public.soroteca_amostra a WHERE a.prateleira_id = p.id AND a.status = 'armazenada')
                          ELSE (SELECT count(*) FROM public.soroteca_equipamento x WHERE x.local_prateleira_id = p.id AND x.situacao = 'armazenada') END)
            ORDER BY p.ordem, p.nome), '[]'::jsonb) AS lista,
          coalesce(sum(p.linhas * p.colunas), 0)::int AS capacidade
        FROM public.soroteca_prateleira p WHERE p.equipamento_id = e.id) pr
      WHERE e.company_id = v_company), '[]'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_resumo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_resumo() TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_amostras(p_filtros jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); f jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_st text := coalesce(nullif(f->>'situacao', ''), 'ativas'); v_cod text := upper(trim(coalesce(f->>'codigo', '')));
  v_pac text := trim(coalesce(f->>'paciente', '')); v_cpf text := regexp_replace(coalesce(f->>'paciente', ''), '\D', '', 'g');
  v_lista jsonb; v_teto int := 5000; v_n int;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  WITH base AS (
    SELECT a.*, e.nome AS equipamento_nome, sp.nome AS prateleira_nome, e.tipo AS equipamento_tipo, e.codigo AS estante_codigo,
      e.local_equipamento_id, g.nome AS local_nome, gp.nome AS local_prateleira_nome, res.total, res.liberados,
      public.soroteca__status(res.total, res.liberados) AS status_resultado
    FROM public.soroteca_amostra a
    LEFT JOIN public.soroteca_equipamento e ON e.id = a.equipamento_id
    LEFT JOIN public.soroteca_prateleira sp ON sp.id = a.prateleira_id
    LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
    LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
    LEFT JOIN public.patients pt ON pt.id = a.patient_id
    CROSS JOIN LATERAL public.soroteca__resultados(a.company_id, a.order_id, a.exame_ids) res
    WHERE a.company_id = v_company
      AND (v_st = 'todas' OR (v_st = 'ativas' AND a.status IN ('armazenada', 'retirada')) OR a.status = v_st)
      AND (v_cod = '' OR upper(a.codigo_amostra) = v_cod OR a.codigo_alfanumerico = v_cod OR upper(coalesce(a.protocolo, '')) = v_cod)
      AND (v_pac = '' OR coalesce(pt.name, a.patient_name, '') ILIKE '%' || v_pac || '%'
           OR (length(v_cpf) >= 11 AND regexp_replace(coalesce(pt.cpf, ''), '\D', '', 'g') = v_cpf))
      AND (nullif(f->>'equipamento_id', '') IS NULL OR a.equipamento_id::text = f->>'equipamento_id' OR e.local_equipamento_id::text = f->>'equipamento_id')
      AND (nullif(f->>'workbench_id', '') IS NULL OR a.workbench_id = f->>'workbench_id')
      AND (nullif(f->>'order_id', '') IS NULL OR a.order_id::text = f->>'order_id')
      AND (nullif(f->>'de', '') IS NULL OR a.armazenada_em >= ((f->>'de')::date::timestamp AT TIME ZONE 'America/Sao_Paulo'))
      AND (nullif(f->>'ate', '') IS NULL OR a.armazenada_em < (((f->>'ate')::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
      AND (nullif(f->>'vence_ate', '') IS NULL OR a.validade <= (f->>'vence_ate')::timestamptz)
  ), filtrada AS (
    SELECT * FROM base
    WHERE nullif(f->>'status_resultado', '') IS NULL
       OR (f->>'status_resultado' = 'descartada' AND status = 'descartada')
       OR (f->>'status_resultado' <> 'descartada' AND status <> 'descartada' AND status_resultado = f->>'status_resultado')
    ORDER BY coalesce(validade, armazenada_em) NULLS LAST, codigo_amostra
    LIMIT v_teto + 1
  )
  SELECT count(*), coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'codigo_amostra', codigo_amostra, 'codigo_alfanumerico', codigo_alfanumerico, 'order_id', order_id,
      'tubo_indice', tubo_indice, 'protocolo', protocolo, 'patient_name', patient_name, 'workbench_id', workbench_id,
      'bancada_nome', bancada_nome, 'tubo_nome', tubo_nome, 'exames_nomes', to_jsonb(exames_nomes), 'tem_apoio', tem_apoio,
      'coletada_em', coletada_em, 'validade', validade, 'status', status, 'equipamento_id', equipamento_id,
      'equipamento_nome', equipamento_nome, 'prateleira_id', prateleira_id, 'prateleira_nome', prateleira_nome,
      'equipamento_tipo', equipamento_tipo, 'estante_codigo', estante_codigo, 'local_equipamento_id', local_equipamento_id,
      'local_nome', local_nome, 'local_prateleira_nome', local_prateleira_nome, 'linha', linha, 'coluna', coluna, 'armazenada_em', armazenada_em,
      'descartada_em', descartada_em, 'total', total, 'liberados', liberados, 'status_resultado', status_resultado)
      ORDER BY coalesce(validade, armazenada_em) NULLS LAST, codigo_amostra), '[]'::jsonb)
  INTO v_n, v_lista FROM filtrada;
  IF v_n > v_teto THEN v_lista := v_lista - v_teto; END IF;
  RETURN jsonb_build_object('amostras', v_lista, 'limitado', v_n > v_teto);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) TO authenticated;

-- Tubo fica sempre numa estante; estante guardada na geladeira precisa ser aberta (bipada) antes de receber tubo
CREATE OR REPLACE FUNCTION public.soroteca_amostra_estante_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e record;
BEGIN
  IF NEW.status <> 'armazenada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'armazenada' AND OLD.prateleira_id IS NOT DISTINCT FROM NEW.prateleira_id
     AND OLD.linha IS NOT DISTINCT FROM NEW.linha AND OLD.coluna IS NOT DISTINCT FROM NEW.coluna THEN RETURN NEW; END IF;
  SELECT tipo, codigo, situacao INTO e FROM public.soroteca_equipamento WHERE id = NEW.equipamento_id;
  IF e.tipo IS DISTINCT FROM 'estante' THEN
    RAISE EXCEPTION 'Os tubos ficam dentro de estantes: bipe a etiqueta de uma estante';
  END IF;
  IF e.situacao = 'armazenada' THEN
    RAISE EXCEPTION 'A estante % está guardada na geladeira; bipe a estante para abrir antes de colocar tubos', e.codigo;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_amostra_estante_trg() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_soroteca_amostra_estante BEFORE INSERT OR UPDATE ON public.soroteca_amostra
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_amostra_estante_trg();

CREATE OR REPLACE FUNCTION public.soroteca_rastreio(p_amostra_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; o record;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT s.*, e.nome AS eq_nome, sp.nome AS prat_nome, e.tipo AS eq_tipo, e.codigo AS est_codigo, g.nome AS loc_nome, gp.nome AS loc_prat_nome
    INTO a FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
    LEFT JOIN public.soroteca_prateleira sp ON sp.id = s.prateleira_id
    LEFT JOIN public.soroteca_equipamento g ON g.id = e.local_equipamento_id
    LEFT JOIN public.soroteca_prateleira gp ON gp.id = e.local_prateleira_id
    WHERE s.id = p_amostra_id AND s.company_id = v_company;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO o FROM public.attendance_orders WHERE id = a.order_id;
  RETURN jsonb_build_object(
    'amostra', jsonb_build_object('id', a.id, 'codigo_amostra', a.codigo_amostra, 'codigo_alfanumerico', a.codigo_alfanumerico,
      'order_id', a.order_id, 'protocolo', a.protocolo, 'patient_name', a.patient_name,
      'patient_birth', (SELECT birth_date FROM public.patients WHERE id = a.patient_id),
      'bancada_nome', a.bancada_nome, 'tubo_nome', a.tubo_nome, 'tem_apoio', a.tem_apoio, 'coletada_em', a.coletada_em,
      'validade', a.validade, 'status', a.status, 'equipamento_nome', a.eq_nome, 'prateleira_nome', a.prat_nome, 'linha', a.linha, 'coluna', a.coluna,
      'equipamento_tipo', a.eq_tipo, 'estante_codigo', a.est_codigo, 'local_nome', a.loc_nome, 'local_prateleira_nome', a.loc_prat_nome,
      'armazenada_em', a.armazenada_em, 'descartada_em', a.descartada_em),
    'coleta', (SELECT jsonb_build_object('quando', min(c.quando), 'responsavel', (array_agg(c.quem ORDER BY c.quando) FILTER (WHERE c.quem IS NOT NULL))[1])
      FROM (SELECT (e->>'collectedAt')::timestamptz quando,
              CASE jsonb_typeof(e->'collectedBy') WHEN 'object' THEN e->'collectedBy'->>'name' WHEN 'string' THEN e->>'collectedBy' END quem
            FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
            WHERE coalesce(e->>'examId', e->>'id') = ANY(a.exame_ids) AND e->>'collectedAt' ~ '^\d{4}-\d{2}-\d{2}') c),
    'exames', (SELECT coalesce(jsonb_agg(jsonb_build_object('exam_id', x.eid, 'nome', coalesce(r.exam_name, a.exames_nomes[x.n]),
        'status', coalesce(r.status, 'pending'), 'liberado_em', r.released_at,
        'liberado_por', (SELECT full_name FROM public.profiles WHERE id = r.released_by)) ORDER BY x.n), '[]'::jsonb)
      FROM unnest(a.exame_ids) WITH ORDINALITY x(eid, n)
      LEFT JOIN public.lab_exam_results r ON r.company_id = v_company AND r.exam_ref = a.order_id::text || ':' || x.eid),
    'movimentos', (SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', m.tipo, 'quando', m.created_at, 'equipamento_nome', m.equipamento_nome, 'prateleira_nome', m.prateleira_nome,
        'linha', m.linha, 'coluna', m.coluna, 'de_equipamento_nome', m.de_equipamento_nome, 'de_prateleira_nome', m.de_prateleira_nome, 'de_linha', m.de_linha, 'de_coluna', m.de_coluna,
        'motivo', m.motivo, 'observacao', m.observacao, 'status_resultado', m.status_resultado,
        'responsavel_nome', m.responsavel_nome, 'usuario_nome', m.usuario_nome) ORDER BY m.created_at), '[]'::jsonb)
      FROM public.soroteca_movimento m WHERE m.amostra_id = a.id),
    -- estante guardada/aberta enquanto o tubo estava nela
    'estante_movimentos', (SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', em.tipo, 'quando', em.created_at, 'estante_nome', em.estante_nome,
        'equipamento_nome', em.equipamento_nome, 'prateleira_nome', em.prateleira_nome, 'usuario_nome', em.usuario_nome) ORDER BY em.created_at), '[]'::jsonb)
      FROM (SELECT m.equipamento_id, m.created_at AS ini, lead(m.created_at) OVER (ORDER BY m.created_at) AS fim
            FROM public.soroteca_movimento m WHERE m.amostra_id = a.id) j
      JOIN public.soroteca_estante_movimento em ON em.estante_id = j.equipamento_id AND em.tipo IN ('guardada', 'aberta')
        AND em.created_at >= j.ini AND (j.fim IS NULL OR em.created_at < j.fim)),
    'laboratorio', (SELECT jsonb_build_object('nome', coalesce(s.lab_name, (SELECT brand_name FROM public.company_branding WHERE company_id = v_company LIMIT 1)),
        'responsavel', s.responsible_name, 'registro', s.responsible_register,
        'logo', coalesce(s.report_logo_primary_url, (SELECT logo_url FROM public.company_branding WHERE company_id = v_company LIMIT 1)))
      FROM (SELECT 1) d LEFT JOIN public.lab_settings s ON s.company_id = v_company));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_rastreio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_rastreio(uuid) TO authenticated;