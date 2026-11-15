-- Soroteca: equipamentos (grade linhas × colunas), tubos armazenados, movimentações imutáveis e configuração.
-- Gravação só por RPCs soroteca_*; leitura por empresa + permissão (permissions.soroteca).

CREATE OR REPLACE FUNCTION public.soroteca_tem_permissao(p_codigo text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_company_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = auth.uid()
        AND ap.company_id = public.get_user_company_id(auth.uid())
        AND (coalesce(ap.permissions->'soroteca', '[]'::jsonb) ? p_codigo
          OR (p_codigo = 'soroteca.ver' AND coalesce(ap.permissions->'soroteca', '[]'::jsonb)
              ?| ARRAY['soroteca.armazenar', 'soroteca.descartar', 'soroteca.configurar']))));
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca_tem_permissao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_tem_permissao(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_acesso()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'ver', public.soroteca_tem_permissao('soroteca.ver'),
    'armazenar', public.soroteca_tem_permissao('soroteca.armazenar'),
    'descartar', public.soroteca_tem_permissao('soroteca.descartar'),
    'configurar', public.soroteca_tem_permissao('soroteca.configurar'));
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca_acesso() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_acesso() TO authenticated;

-- Código do tubo e hash alfanumérico (mesma conta de buildSampleCode / generateSampleHash do navegador)
CREATE OR REPLACE FUNCTION public.soroteca_codigo_tubo(p_protocolo text, p_indice int, p_seq int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT trim(coalesce(p_protocolo, '')) || '-' || p_indice || CASE WHEN coalesce(p_seq, 0) <> 0 THEN '-' || p_seq ELSE '' END;
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca_codigo_tubo(text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_codigo_tubo(text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_base36(p_n bigint)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE d text := '0123456789abcdefghijklmnopqrstuvwxyz'; n bigint := p_n; s text := '';
BEGIN
  IF n = 0 THEN RETURN '0'; END IF;
  WHILE n > 0 LOOP s := substr(d, (n % 36)::int + 1, 1) || s; n := n / 36; END LOOP;
  RETURN s;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_base36(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_base36(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_hash_amostra(p_codigo text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE inp text := upper(coalesce(p_codigo, '')); a bigint := 2166136261; b bigint := 2654435769; c int; i int;
  raw text; h text;
BEGIN
  IF inp = '' THEN RETURN ''; END IF;
  FOR i IN 1..length(inp) LOOP
    c := ascii(substr(inp, i, 1));
    a := ((a # c) * 16777619) % 4294967296;
    b := ((b # c) * 16777619) % 4294967296;
  END LOOP;
  raw := regexp_replace(upper(public.soroteca_base36(a) || public.soroteca_base36(b)), '[^A-Z0-9]', '', 'g');
  h := substr(raw || '000000000', 1, 9);
  RETURN chr(65 + (position(substr(h, 1, 1) IN '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') - 1) % 26)
    || substr(h, 2, 7)
    || ((position(substr(h, 9, 1) IN '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') - 1) % 10)::text;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_hash_amostra(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_hash_amostra(text) TO authenticated;

-- Tabelas
CREATE TABLE public.soroteca_config (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id),
  aviso_dias int NOT NULL DEFAULT 7 CHECK (aviso_dias BETWEEN 1 AND 90),
  responsavel_descarte text,
  retencao_bancadas jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.soroteca_config TO authenticated;
GRANT ALL ON public.soroteca_config TO service_role;
ALTER TABLE public.soroteca_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê config da empresa" ON public.soroteca_config FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));

CREATE TABLE public.soroteca_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'geladeira' CHECK (tipo IN ('geladeira', 'freezer', 'estante', 'outro')),
  temperatura text,
  workbench_id text,
  linhas int NOT NULL CHECK (linhas BETWEEN 1 AND 52),
  colunas int NOT NULL CHECK (colunas BETWEEN 1 AND 99),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX soroteca_equipamento_nome_uq ON public.soroteca_equipamento (company_id, lower(trim(nome)));
GRANT SELECT ON public.soroteca_equipamento TO authenticated;
GRANT ALL ON public.soroteca_equipamento TO service_role;
ALTER TABLE public.soroteca_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê equipamentos da empresa" ON public.soroteca_equipamento FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));

CREATE TABLE public.soroteca_amostra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  codigo_amostra text NOT NULL,
  codigo_alfanumerico text NOT NULL,
  order_id uuid NOT NULL,
  tubo_indice int NOT NULL,
  protocolo text,
  patient_id uuid,
  patient_name text,
  workbench_id text,
  bancada_nome text,
  tubo_nome text,
  exame_ids text[] NOT NULL DEFAULT '{}',
  exames_nomes text[] NOT NULL DEFAULT '{}',
  tem_apoio boolean NOT NULL DEFAULT false,
  coletada_em timestamptz,
  validade timestamptz,
  status text NOT NULL DEFAULT 'armazenada' CHECK (status IN ('armazenada', 'retirada', 'descartada')),
  equipamento_id uuid REFERENCES public.soroteca_equipamento(id),
  linha int,
  coluna int,
  armazenada_em timestamptz,
  descartada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (company_id, codigo_amostra),
  CHECK ((status = 'armazenada') = (equipamento_id IS NOT NULL AND linha IS NOT NULL AND coluna IS NOT NULL))
);
CREATE UNIQUE INDEX soroteca_amostra_posicao_uq ON public.soroteca_amostra (equipamento_id, linha, coluna) WHERE status = 'armazenada';
CREATE INDEX soroteca_amostra_status_idx ON public.soroteca_amostra (company_id, status, validade);
CREATE INDEX soroteca_amostra_pedido_idx ON public.soroteca_amostra (company_id, order_id);
CREATE INDEX soroteca_amostra_hash_idx ON public.soroteca_amostra (company_id, codigo_alfanumerico);
GRANT SELECT ON public.soroteca_amostra TO authenticated;
GRANT ALL ON public.soroteca_amostra TO service_role;
ALTER TABLE public.soroteca_amostra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê amostras da empresa" ON public.soroteca_amostra FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));

CREATE OR REPLACE FUNCTION public.soroteca_amostra_sem_exclusao()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Amostra da soroteca não pode ser excluída (fica no histórico)'; END; $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_amostra_sem_exclusao() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_soroteca_amostra_sem_exclusao BEFORE DELETE ON public.soroteca_amostra
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_amostra_sem_exclusao();

CREATE TABLE public.soroteca_movimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  amostra_id uuid NOT NULL REFERENCES public.soroteca_amostra(id),
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'movimentacao', 'retirada', 'descarte')),
  equipamento_id uuid,
  equipamento_nome text,
  linha int,
  coluna int,
  de_equipamento_nome text,
  de_linha int,
  de_coluna int,
  motivo text,
  observacao text,
  status_resultado text,
  responsavel_nome text,
  usuario_id uuid,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX soroteca_movimento_amostra_idx ON public.soroteca_movimento (amostra_id, created_at);
CREATE INDEX soroteca_movimento_empresa_idx ON public.soroteca_movimento (company_id, tipo, created_at);
GRANT SELECT ON public.soroteca_movimento TO authenticated;
GRANT ALL ON public.soroteca_movimento TO service_role;
ALTER TABLE public.soroteca_movimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soroteca lê movimentações da empresa" ON public.soroteca_movimento FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.soroteca_tem_permissao('soroteca.ver'));

CREATE OR REPLACE FUNCTION public.soroteca_movimento_imutavel()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'Movimentação da soroteca não pode ser alterada nem excluída'; END; $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_movimento_imutavel() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_soroteca_movimento_imutavel BEFORE UPDATE OR DELETE ON public.soroteca_movimento
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_movimento_imutavel();

-- Retenção por bancada (padrão: Hematologia e Uroanálise 3 dias; demais 7)
CREATE OR REPLACE FUNCTION public.soroteca_retencao_padrao(p_nome text)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN lower(coalesce(p_nome, '')) ~ '(hemat|uro|urin)' THEN 3 ELSE 7 END;
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca_retencao_padrao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_retencao_padrao(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca__retencao_dias(p_company uuid, p_workbench text, p_nome text)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(
    (SELECT CASE WHEN (c.retencao_bancadas->>p_workbench) ~ '^\d+$' THEN (c.retencao_bancadas->>p_workbench)::int END
       FROM public.soroteca_config c WHERE c.company_id = p_company),
    public.soroteca_retencao_padrao(coalesce((SELECT w.name FROM public.lab_workbenches w WHERE w.id::text = p_workbench), p_nome)));
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca__retencao_dias(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Status dos resultados do tubo (exames internos): total não cancelado e liberados
CREATE OR REPLACE FUNCTION public.soroteca__resultados(p_company uuid, p_order uuid, p_exames text[])
RETURNS TABLE(total int, liberados int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*) FILTER (WHERE coalesce(r.status, '') <> 'cancelled')::int,
         count(*) FILTER (WHERE r.status = 'released')::int
  FROM unnest(coalesce(p_exames, '{}'::text[])) x(eid)
  LEFT JOIN public.lab_exam_results r ON r.company_id = p_company AND r.exam_ref = p_order::text || ':' || x.eid;
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca__resultados(uuid, uuid, text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.soroteca__status(p_total int, p_liberados int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN p_total > 0 AND p_liberados >= p_total THEN 'liberado' WHEN p_liberados > 0 THEN 'parcial' ELSE 'em_analise' END;
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca__status(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca__status(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca__usuario_nome()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT full_name FROM public.profiles WHERE id = auth.uid()), '');
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca__usuario_nome() FROM PUBLIC, anon, authenticated;

-- Lista de amostras com status calculado (jsonb: sem corte de 1.000 linhas; teto 5.000 avisado)
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
    SELECT a.*, e.nome AS equipamento_nome, res.total, res.liberados,
      public.soroteca__status(res.total, res.liberados) AS status_resultado
    FROM public.soroteca_amostra a
    LEFT JOIN public.soroteca_equipamento e ON e.id = a.equipamento_id
    LEFT JOIN public.patients pt ON pt.id = a.patient_id
    CROSS JOIN LATERAL public.soroteca__resultados(a.company_id, a.order_id, a.exame_ids) res
    WHERE a.company_id = v_company
      AND (v_st = 'todas' OR (v_st = 'ativas' AND a.status IN ('armazenada', 'retirada')) OR a.status = v_st)
      AND (v_cod = '' OR upper(a.codigo_amostra) = v_cod OR a.codigo_alfanumerico = v_cod OR upper(coalesce(a.protocolo, '')) = v_cod)
      AND (v_pac = '' OR coalesce(pt.name, a.patient_name, '') ILIKE '%' || v_pac || '%'
           OR (length(v_cpf) >= 11 AND regexp_replace(coalesce(pt.cpf, ''), '\D', '', 'g') = v_cpf))
      AND (nullif(f->>'equipamento_id', '') IS NULL OR a.equipamento_id::text = f->>'equipamento_id')
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
      'equipamento_nome', equipamento_nome, 'linha', linha, 'coluna', coluna, 'armazenada_em', armazenada_em,
      'descartada_em', descartada_em, 'total', total, 'liberados', liberados, 'status_resultado', status_resultado)
      ORDER BY coalesce(validade, armazenada_em) NULLS LAST, codigo_amostra), '[]'::jsonb)
  INTO v_n, v_lista FROM filtrada;
  IF v_n > v_teto THEN v_lista := v_lista - v_teto; END IF;
  RETURN jsonb_build_object('amostras', v_lista, 'limitado', v_n > v_teto);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_amostras(jsonb) TO authenticated;

-- Resumo do dashboard: KPIs e ocupação por equipamento
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
        'workbench_id', e.workbench_id, 'bancada_nome', w.name, 'linhas', e.linhas, 'colunas', e.colunas, 'ativo', e.ativo,
        'ocupadas', (SELECT count(*) FROM public.soroteca_amostra a WHERE a.equipamento_id = e.id AND a.status = 'armazenada'))
        ORDER BY e.ativo DESC, e.nome)
      FROM public.soroteca_equipamento e LEFT JOIN public.lab_workbenches w ON w.id::text = e.workbench_id
      WHERE e.company_id = v_company), '[]'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_resumo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_resumo() TO authenticated;

-- Localizar pedido/tubo pelo bipe (código de barras alfanumérico), código da amostra, nº do pedido ou nome
CREATE OR REPLACE FUNCTION public.soroteca_localizar(p_termo text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_t text := upper(trim(coalesce(p_termo, '')));
  v_seq int; v_hits jsonb := '[]'::jsonb; v_modo text := 'nenhum';
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF length(v_t) < 2 THEN RETURN jsonb_build_object('modo', 'nenhum', 'pedidos', '[]'::jsonb); END IF;
  SELECT sequence_id INTO v_seq FROM public.companies WHERE id = v_company;

  CREATE TEMP TABLE IF NOT EXISTS _sor_hit(order_id uuid, tubo_indice int) ON COMMIT DROP;
  DELETE FROM _sor_hit;

  -- 1) tubo já guardado
  INSERT INTO _sor_hit SELECT order_id, tubo_indice FROM public.soroteca_amostra
    WHERE company_id = v_company AND (upper(codigo_amostra) = v_t OR codigo_alfanumerico = v_t);
  IF FOUND THEN v_modo := 'tubo'; END IF;

  -- 2) código da amostra (protocolo-tubo[-empresa]) ou nº do pedido
  IF v_modo = 'nenhum' THEN
    INSERT INTO _sor_hit
    SELECT o.id, (SELECT min(i) FROM generate_series(1, 40) i
                  WHERE upper(public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), i, coalesce(o.empresa_seq, v_seq))) = v_t)
    FROM public.attendance_orders o
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND (upper(coalesce(o.order_number, o.protocol, '')) = v_t
        OR upper(coalesce(o.order_number, o.protocol, '')) IN (regexp_replace(v_t, '-[^-]*$', ''), regexp_replace(v_t, '-[^-]*-[^-]*$', '')));
    DELETE FROM _sor_hit h USING public.attendance_orders o
      WHERE o.id = h.order_id AND h.tubo_indice IS NULL AND upper(coalesce(o.order_number, o.protocol, '')) <> v_t;
    IF EXISTS (SELECT 1 FROM _sor_hit WHERE tubo_indice IS NOT NULL) THEN v_modo := 'tubo';
    ELSIF EXISTS (SELECT 1 FROM _sor_hit) THEN v_modo := 'pedido'; END IF;
  END IF;

  -- 3) código de barras alfanumérico de tubo ainda não guardado (pedidos dos últimos 400 dias)
  IF v_modo = 'nenhum' AND v_t ~ '^[A-Z][A-Z0-9]{7}[0-9]$' THEN
    INSERT INTO _sor_hit
    SELECT o.id, i
    FROM public.attendance_orders o
    CROSS JOIN LATERAL generate_series(1, least(40, 2 + 2 * (
      SELECT count(*) FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e)::int)) i
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND o.created_at >= now() - interval '400 days'
      AND public.soroteca_hash_amostra(public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), i, coalesce(o.empresa_seq, v_seq))) = v_t;
    IF FOUND THEN v_modo := 'tubo'; END IF;
  END IF;

  -- 4) nome do paciente (30 pedidos mais recentes)
  IF v_modo = 'nenhum' AND length(v_t) >= 3 AND v_t !~ '[0-9]' THEN
    INSERT INTO _sor_hit
    SELECT o.id, NULL FROM public.attendance_orders o LEFT JOIN public.patients pt ON pt.id = o.patient_id
    WHERE o.company_id = v_company AND o.status::text NOT IN ('deleted', 'cancelled')
      AND coalesce(pt.name, o.patient_name, '') ILIKE '%' || trim(p_termo) || '%'
    ORDER BY o.created_at DESC LIMIT 30;
    IF FOUND THEN v_modo := 'paciente'; END IF;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'order_id', o.id, 'protocolo', coalesce(o.order_number, o.protocol), 'empresa_seq', coalesce(o.empresa_seq, v_seq),
      'patient_id', o.patient_id, 'patient_name', coalesce(pt.name, o.patient_name), 'patient_birth', pt.birth_date,
      'is_urgent', coalesce(o.is_urgent, false), 'created_at', o.created_at, 'lab_guides', coalesce(o.lab_guides, '[]'::jsonb),
      'tubo_indice', h.tubo_indice,
      'resultados', (SELECT coalesce(jsonb_object_agg(split_part(r.exam_ref, ':', 2), r.status), '{}'::jsonb)
                     FROM public.lab_exam_results r WHERE r.company_id = v_company AND r.order_id = o.id),
      'guardados', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'tubo_indice', a.tubo_indice, 'codigo_amostra', a.codigo_amostra,
                      'status', a.status, 'equipamento_id', a.equipamento_id, 'equipamento_nome', e.nome, 'linha', a.linha, 'coluna', a.coluna)), '[]'::jsonb)
                    FROM public.soroteca_amostra a LEFT JOIN public.soroteca_equipamento e ON e.id = a.equipamento_id
                    WHERE a.company_id = v_company AND a.order_id = o.id))
      ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_hits
  FROM (SELECT DISTINCT ON (order_id) order_id, tubo_indice FROM _sor_hit ORDER BY order_id, tubo_indice NULLS LAST) h
  JOIN public.attendance_orders o ON o.id = h.order_id
  LEFT JOIN public.patients pt ON pt.id = o.patient_id;
  RETURN jsonb_build_object('modo', v_modo, 'pedidos', v_hits);
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_localizar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_localizar(text) TO authenticated;

-- Armazenar / mover tubos (lote atômico: tudo ou nada)
CREATE OR REPLACE FUNCTION public.soroteca_armazenar(p_itens jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_seq int; it jsonb; o record; eq record; a record;
  v_idx int; v_codigo text; v_ids text[]; v_int text[]; v_nomes text[]; v_apoio boolean; v_coleta timestamptz;
  v_wb text; v_wb_nome text; v_lin int; v_col int; v_tot int; v_lib int; v_status text; v_user text := public.soroteca__usuario_nome();
  v_id uuid; v_out jsonb := '[]'::jsonb; v_ocupante text;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para armazenar amostras na Soroteca' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Nenhuma amostra para armazenar';
  END IF;
  IF jsonb_array_length(p_itens) > 200 THEN RAISE EXCEPTION 'No máximo 200 amostras por vez'; END IF;
  SELECT sequence_id INTO v_seq FROM public.companies WHERE id = v_company;

  FOR it IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    v_idx := nullif(it->>'tubo_indice', '')::int;
    v_lin := nullif(it->>'linha', '')::int; v_col := nullif(it->>'coluna', '')::int;
    IF v_idx IS NULL OR v_idx < 1 OR v_idx > 40 THEN RAISE EXCEPTION 'Tubo inválido'; END IF;

    SELECT * INTO o FROM public.attendance_orders
      WHERE id = nullif(it->>'order_id', '')::uuid AND company_id = v_company AND status::text NOT IN ('deleted', 'cancelled');
    IF o.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado' USING ERRCODE = 'P0002'; END IF;
    v_codigo := public.soroteca_codigo_tubo(coalesce(o.order_number, o.protocol), v_idx, coalesce(o.empresa_seq, v_seq));

    -- exames do tubo: precisam existir no pedido; apoio não conta
    SELECT array_agg(DISTINCT x) INTO v_ids FROM jsonb_array_elements_text(coalesce(it->'exame_ids', '[]'::jsonb)) x;
    SELECT array_agg(eid ORDER BY ord), array_agg(nome ORDER BY ord), bool_or(apoio),
           min(CASE WHEN NOT apoio THEN coleta END)
      INTO v_int, v_nomes, v_apoio, v_coleta
    FROM (
      SELECT DISTINCT ON (eid) eid, ord, nome, apoio, coleta FROM (
        SELECT coalesce(e->>'examId', e->>'id') eid, row_number() OVER () ord, coalesce(e->>'name', e->>'examName', '') nome,
          coalesce(e->>'bancadaTipo', '') = 'apoio' apoio,
          CASE WHEN coalesce(e->>'collected', '') <> 'false' AND e->>'collectedAt' ~ '^\d{4}-\d{2}-\d{2}'
               AND (e->>'collectedAt')::timestamptz <= now() + interval '5 minutes' THEN (e->>'collectedAt')::timestamptz END coleta
        FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
      ) t WHERE eid = ANY(coalesce(v_ids, '{}')) ORDER BY eid, ord
    ) s;
    IF coalesce(cardinality(v_ids), 0) = 0 OR coalesce(cardinality(v_int), 0) <> cardinality(v_ids) THEN
      RAISE EXCEPTION 'Exames do tubo % não conferem com o pedido', v_codigo;
    END IF;
    SELECT array_agg(i) , array_agg(n) INTO v_int, v_nomes FROM (
      SELECT unnest(v_int) i, unnest(v_nomes) n) z
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
                        WHERE coalesce(e->>'examId', e->>'id') = z.i AND coalesce(e->>'bancadaTipo', '') = 'apoio');
    IF coalesce(cardinality(v_int), 0) = 0 THEN
      RAISE EXCEPTION 'O tubo % só tem exames de apoio e não fica na soroteca', v_codigo;
    END IF;
    IF v_coleta IS NULL THEN RAISE EXCEPTION 'O tubo % ainda não foi coletado', v_codigo; END IF;

    -- bancada do tubo: a mais frequente entre os exames internos
    SELECT wb, nm INTO v_wb, v_wb_nome FROM (
      SELECT coalesce(nullif(e->>'bancadaId', ''), nullif(e->>'workbenchId', '')) wb, max(coalesce(w.name, e->>'bancadaNome')) nm, count(*) n
      FROM jsonb_array_elements(coalesce(o.lab_guides, '[]'::jsonb)) g, jsonb_array_elements(coalesce(g->'exams', '[]'::jsonb)) e
      LEFT JOIN public.lab_workbenches w ON w.id::text = coalesce(nullif(e->>'bancadaId', ''), nullif(e->>'workbenchId', ''))
      WHERE coalesce(e->>'examId', e->>'id') = ANY(v_int)
      GROUP BY 1 ORDER BY n DESC, 1 NULLS LAST LIMIT 1) b;

    SELECT * INTO eq FROM public.soroteca_equipamento
      WHERE id = nullif(it->>'equipamento_id', '')::uuid AND company_id = v_company FOR UPDATE;
    IF eq.id IS NULL OR NOT eq.ativo THEN RAISE EXCEPTION 'Equipamento não encontrado ou inativo'; END IF;
    IF v_lin IS NULL OR v_col IS NULL OR v_lin < 1 OR v_lin > eq.linhas OR v_col < 1 OR v_col > eq.colunas THEN
      RAISE EXCEPTION 'Posição fora da grade de %', eq.nome;
    END IF;

    SELECT * INTO a FROM public.soroteca_amostra WHERE company_id = v_company AND codigo_amostra = v_codigo FOR UPDATE;
    IF a.id IS NOT NULL AND a.status = 'descartada' THEN
      RAISE EXCEPTION 'A amostra % já foi descartada', v_codigo;
    END IF;
    IF a.id IS NOT NULL AND a.status = 'armazenada' AND a.equipamento_id = eq.id AND a.linha = v_lin AND a.coluna = v_col THEN
      v_out := v_out || jsonb_build_object('id', a.id, 'codigo_amostra', v_codigo, 'equipamento_nome', eq.nome, 'linha', v_lin, 'coluna', v_col, 'repetido', true);
      CONTINUE;
    END IF;
    SELECT codigo_amostra INTO v_ocupante FROM public.soroteca_amostra
      WHERE equipamento_id = eq.id AND linha = v_lin AND coluna = v_col AND status = 'armazenada';
    IF v_ocupante IS NOT NULL THEN
      RAISE EXCEPTION 'A posição escolhida em % já está ocupada pela amostra %', eq.nome, v_ocupante;
    END IF;

    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, o.id, v_int);
    v_status := public.soroteca__status(v_tot, v_lib);

    IF a.id IS NULL THEN
      INSERT INTO public.soroteca_amostra (company_id, codigo_amostra, codigo_alfanumerico, order_id, tubo_indice, protocolo, patient_id,
        patient_name, workbench_id, bancada_nome, tubo_nome, exame_ids, exames_nomes, tem_apoio, coletada_em, validade, status,
        equipamento_id, linha, coluna, armazenada_em, updated_by)
      VALUES (v_company, v_codigo, public.soroteca_hash_amostra(v_codigo), o.id, v_idx, coalesce(o.order_number, o.protocol), o.patient_id,
        coalesce((SELECT name FROM public.patients WHERE id = o.patient_id), o.patient_name), v_wb, v_wb_nome,
        nullif(left(trim(coalesce(it->>'tubo_nome', '')), 80), ''), v_int, v_nomes, coalesce(v_apoio, false), v_coleta,
        v_coleta + make_interval(days => public.soroteca__retencao_dias(v_company, v_wb, v_wb_nome)), 'armazenada',
        eq.id, v_lin, v_col, now(), auth.uid())
      RETURNING id INTO v_id;
      INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, equipamento_id, equipamento_nome, linha, coluna, status_resultado, usuario_id, usuario_nome)
      VALUES (v_company, v_id, 'entrada', eq.id, eq.nome, v_lin, v_col, v_status, auth.uid(), v_user);
    ELSE
      UPDATE public.soroteca_amostra SET status = 'armazenada', equipamento_id = eq.id, linha = v_lin, coluna = v_col,
        armazenada_em = CASE WHEN a.status = 'armazenada' THEN armazenada_em ELSE now() END,
        updated_at = now(), updated_by = auth.uid()
      WHERE id = a.id;
      v_id := a.id;
      INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, equipamento_id, equipamento_nome, linha, coluna,
        de_equipamento_nome, de_linha, de_coluna, status_resultado, usuario_id, usuario_nome)
      VALUES (v_company, v_id, CASE WHEN a.status = 'armazenada' THEN 'movimentacao' ELSE 'entrada' END, eq.id, eq.nome, v_lin, v_col,
        CASE WHEN a.status = 'armazenada' THEN (SELECT nome FROM public.soroteca_equipamento WHERE id = a.equipamento_id) END,
        CASE WHEN a.status = 'armazenada' THEN a.linha END, CASE WHEN a.status = 'armazenada' THEN a.coluna END,
        v_status, auth.uid(), v_user);
    END IF;
    v_out := v_out || jsonb_build_object('id', v_id, 'codigo_amostra', v_codigo, 'equipamento_nome', eq.nome, 'linha', v_lin, 'coluna', v_col, 'repetido', false);
  END LOOP;
  RETURN v_out;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_armazenar(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_armazenar(jsonb) TO authenticated;

-- Retirada (libera a posição; histórico registra o motivo)
CREATE OR REPLACE FUNCTION public.soroteca_retirar(p_amostra_id uuid, p_motivo text, p_observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_tot int; v_lib int;
  v_obs text := nullif(trim(coalesce(p_observacao, '')), '');
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.armazenar') THEN
    RAISE EXCEPTION 'Sem permissão para retirar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_motivo, '') NOT IN ('Recoleta solicitada', 'Consulta externa', 'Exame complementar', 'Descarte antecipado', 'Outro') THEN
    RAISE EXCEPTION 'Motivo da retirada inválido';
  END IF;
  IF p_motivo = 'Outro' AND v_obs IS NULL THEN RAISE EXCEPTION 'Descreva o motivo na observação'; END IF;
  SELECT s.*, e.nome AS eq_nome INTO a FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
    WHERE s.id = p_amostra_id AND s.company_id = v_company FOR UPDATE OF s;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF a.status <> 'armazenada' THEN RAISE EXCEPTION 'A amostra % não está armazenada', a.codigo_amostra; END IF;
  SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
  UPDATE public.soroteca_amostra SET status = 'retirada', equipamento_id = NULL, linha = NULL, coluna = NULL,
    updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
  INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_linha, de_coluna, motivo, observacao,
    status_resultado, usuario_id, usuario_nome)
  VALUES (v_company, a.id, 'retirada', a.eq_nome, a.linha, a.coluna, p_motivo, left(v_obs, 500),
    public.soroteca__status(v_tot, v_lib), auth.uid(), public.soroteca__usuario_nome());
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_retirar(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_retirar(uuid, text, text) TO authenticated;

-- Descarte (lote atômico). A amostra continua no histórico como descartada.
CREATE OR REPLACE FUNCTION public.soroteca_descartar(p_ids uuid[], p_motivo text, p_responsavel text, p_observacao text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; v_n int := 0; v_tot int; v_lib int;
  v_resp text := nullif(left(trim(coalesce(p_responsavel, '')), 120), ''); v_mot text := nullif(left(trim(coalesce(p_motivo, '')), 120), '');
  v_obs text := nullif(left(trim(coalesce(p_observacao, '')), 500), ''); v_user text := public.soroteca__usuario_nome();
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.descartar') THEN
    RAISE EXCEPTION 'Sem permissão para descartar amostras da Soroteca' USING ERRCODE = '42501';
  END IF;
  IF coalesce(cardinality(p_ids), 0) = 0 THEN RAISE EXCEPTION 'Nenhuma amostra selecionada'; END IF;
  IF cardinality(p_ids) > 5000 THEN RAISE EXCEPTION 'No máximo 5.000 amostras por descarte'; END IF;
  IF v_resp IS NULL THEN RAISE EXCEPTION 'Informe o responsável pelo descarte'; END IF;
  IF v_mot IS NULL THEN RAISE EXCEPTION 'Informe o motivo do descarte'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_ids) i WHERE NOT EXISTS (SELECT 1 FROM public.soroteca_amostra s WHERE s.id = i AND s.company_id = v_company)) THEN
    RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002';
  END IF;
  FOR a IN SELECT s.*, e.nome AS eq_nome FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
           WHERE s.id = ANY(p_ids) AND s.company_id = v_company AND s.status <> 'descartada' ORDER BY s.codigo_amostra FOR UPDATE OF s LOOP
    SELECT total, liberados INTO v_tot, v_lib FROM public.soroteca__resultados(v_company, a.order_id, a.exame_ids);
    UPDATE public.soroteca_amostra SET status = 'descartada', descartada_em = now(), equipamento_id = NULL, linha = NULL, coluna = NULL,
      updated_at = now(), updated_by = auth.uid() WHERE id = a.id;
    INSERT INTO public.soroteca_movimento (company_id, amostra_id, tipo, de_equipamento_nome, de_linha, de_coluna, motivo, observacao,
      status_resultado, responsavel_nome, usuario_id, usuario_nome)
    VALUES (v_company, a.id, 'descarte', a.eq_nome, a.linha, a.coluna, v_mot, v_obs, public.soroteca__status(v_tot, v_lib), v_resp, auth.uid(), v_user);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_descartar(uuid[], text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_descartar(uuid[], text, text, text) TO authenticated;

-- Rastreabilidade: coleta, movimentações e liberações de resultado
CREATE OR REPLACE FUNCTION public.soroteca_rastreio(p_amostra_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); a record; o record;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT s.*, e.nome AS eq_nome INTO a FROM public.soroteca_amostra s LEFT JOIN public.soroteca_equipamento e ON e.id = s.equipamento_id
    WHERE s.id = p_amostra_id AND s.company_id = v_company;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Amostra não encontrada' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO o FROM public.attendance_orders WHERE id = a.order_id;
  RETURN jsonb_build_object(
    'amostra', jsonb_build_object('id', a.id, 'codigo_amostra', a.codigo_amostra, 'codigo_alfanumerico', a.codigo_alfanumerico,
      'order_id', a.order_id, 'protocolo', a.protocolo, 'patient_name', a.patient_name,
      'patient_birth', (SELECT birth_date FROM public.patients WHERE id = a.patient_id),
      'bancada_nome', a.bancada_nome, 'tubo_nome', a.tubo_nome, 'tem_apoio', a.tem_apoio, 'coletada_em', a.coletada_em,
      'validade', a.validade, 'status', a.status, 'equipamento_nome', a.eq_nome, 'linha', a.linha, 'coluna', a.coluna,
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
    'movimentos', (SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', m.tipo, 'quando', m.created_at, 'equipamento_nome', m.equipamento_nome,
        'linha', m.linha, 'coluna', m.coluna, 'de_equipamento_nome', m.de_equipamento_nome, 'de_linha', m.de_linha, 'de_coluna', m.de_coluna,
        'motivo', m.motivo, 'observacao', m.observacao, 'status_resultado', m.status_resultado,
        'responsavel_nome', m.responsavel_nome, 'usuario_nome', m.usuario_nome) ORDER BY m.created_at), '[]'::jsonb)
      FROM public.soroteca_movimento m WHERE m.amostra_id = a.id),
    'laboratorio', (SELECT jsonb_build_object('nome', coalesce(s.lab_name, (SELECT brand_name FROM public.company_branding WHERE company_id = v_company LIMIT 1)),
        'responsavel', s.responsible_name, 'registro', s.responsible_register,
        'logo', coalesce(s.report_logo_primary_url, (SELECT logo_url FROM public.company_branding WHERE company_id = v_company LIMIT 1)))
      FROM (SELECT 1) d LEFT JOIN public.lab_settings s ON s.company_id = v_company));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_rastreio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_rastreio(uuid) TO authenticated;

-- Configuração
CREATE OR REPLACE FUNCTION public.soroteca_config_ler()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); c record;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.soroteca_config WHERE company_id = v_company;
  RETURN jsonb_build_object('aviso_dias', coalesce(c.aviso_dias, 7), 'responsavel_descarte', c.responsavel_descarte,
    'bancadas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', w.id, 'nome', w.name,
        'dias', coalesce(CASE WHEN (c.retencao_bancadas->>w.id::text) ~ '^\d+$' THEN (c.retencao_bancadas->>w.id::text)::int END, public.soroteca_retencao_padrao(w.name)),
        'padrao', public.soroteca_retencao_padrao(w.name),
        'personalizado', (c.retencao_bancadas ? w.id::text)) ORDER BY w.name)
      FROM public.lab_workbenches w WHERE w.company_id = v_company AND coalesce(w.is_active, true) AND coalesce(w.tipo, 'interna') <> 'apoio'), '[]'::jsonb));
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_config_ler() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_config_ler() TO authenticated;

CREATE OR REPLACE FUNCTION public.soroteca_config_salvar(p_aviso_dias int, p_responsavel text, p_retencao jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); k text; v jsonb; v_ret jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.configurar') THEN
    RAISE EXCEPTION 'Sem permissão para configurar a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF p_aviso_dias IS NULL OR p_aviso_dias < 1 OR p_aviso_dias > 90 THEN RAISE EXCEPTION 'Aviso de vencimento deve ficar entre 1 e 90 dias'; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(coalesce(p_retencao, '{}'::jsonb)) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.lab_workbenches WHERE id::text = k AND company_id = v_company) THEN
      RAISE EXCEPTION 'Bancada não encontrada';
    END IF;
    IF jsonb_typeof(v) <> 'number' OR (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric) OR (v #>> '{}')::int < 1 OR (v #>> '{}')::int > 3650 THEN
      RAISE EXCEPTION 'Prazo de retenção deve ser um número inteiro entre 1 e 3650 dias';
    END IF;
    v_ret := v_ret || jsonb_build_object(k, (v #>> '{}')::int);
  END LOOP;
  INSERT INTO public.soroteca_config (company_id, aviso_dias, responsavel_descarte, retencao_bancadas, updated_at, updated_by)
  VALUES (v_company, p_aviso_dias, nullif(left(trim(coalesce(p_responsavel, '')), 120), ''), v_ret, now(), auth.uid())
  ON CONFLICT (company_id) DO UPDATE SET aviso_dias = EXCLUDED.aviso_dias, responsavel_descarte = EXCLUDED.responsavel_descarte,
    retencao_bancadas = EXCLUDED.retencao_bancadas, updated_at = now(), updated_by = auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_config_salvar(int, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_config_salvar(int, text, jsonb) TO authenticated;

-- Equipamentos (sem exclusão: inativar; não encolhe grade com amostras fora dela)
CREATE OR REPLACE FUNCTION public.soroteca_equipamento_salvar(p_id uuid, p_nome text, p_tipo text, p_temperatura text,
  p_workbench_id text, p_linhas int, p_colunas int, p_ativo boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); v_id uuid; v_nome text := trim(coalesce(p_nome, ''));
  v_wb text := nullif(trim(coalesce(p_workbench_id, '')), '');
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.configurar') THEN
    RAISE EXCEPTION 'Sem permissão para configurar a Soroteca' USING ERRCODE = '42501';
  END IF;
  IF v_nome = '' THEN RAISE EXCEPTION 'Informe o nome do equipamento'; END IF;
  IF coalesce(p_tipo, '') NOT IN ('geladeira', 'freezer', 'estante', 'outro') THEN RAISE EXCEPTION 'Tipo de equipamento inválido'; END IF;
  IF p_linhas IS NULL OR p_linhas < 1 OR p_linhas > 52 THEN RAISE EXCEPTION 'Linhas devem ficar entre 1 e 52'; END IF;
  IF p_colunas IS NULL OR p_colunas < 1 OR p_colunas > 99 THEN RAISE EXCEPTION 'Colunas devem ficar entre 1 e 99'; END IF;
  IF v_wb IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lab_workbenches WHERE id::text = v_wb AND company_id = v_company) THEN
    RAISE EXCEPTION 'Bancada não encontrada';
  END IF;
  IF EXISTS (SELECT 1 FROM public.soroteca_equipamento WHERE company_id = v_company AND lower(trim(nome)) = lower(v_nome) AND id IS DISTINCT FROM p_id) THEN
    RAISE EXCEPTION 'Já existe um equipamento com esse nome';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.soroteca_equipamento (company_id, nome, tipo, temperatura, workbench_id, linhas, colunas, ativo, created_by)
    VALUES (v_company, left(v_nome, 80), p_tipo, nullif(left(trim(coalesce(p_temperatura, '')), 40), ''), v_wb, p_linhas, p_colunas, coalesce(p_ativo, true), auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
  PERFORM 1 FROM public.soroteca_equipamento WHERE id = p_id AND company_id = v_company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Equipamento não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF NOT coalesce(p_ativo, true) AND EXISTS (SELECT 1 FROM public.soroteca_amostra WHERE equipamento_id = p_id AND status = 'armazenada') THEN
    RAISE EXCEPTION 'Retire ou descarte as amostras antes de inativar o equipamento';
  END IF;
  IF EXISTS (SELECT 1 FROM public.soroteca_amostra WHERE equipamento_id = p_id AND status = 'armazenada' AND (linha > p_linhas OR coluna > p_colunas)) THEN
    RAISE EXCEPTION 'Há amostras guardadas fora da nova grade; mova-as antes de diminuir';
  END IF;
  UPDATE public.soroteca_equipamento SET nome = left(v_nome, 80), tipo = p_tipo, temperatura = nullif(left(trim(coalesce(p_temperatura, '')), 40), ''),
    workbench_id = v_wb, linhas = p_linhas, colunas = p_colunas, ativo = coalesce(p_ativo, true), updated_at = now()
  WHERE id = p_id;
  RETURN p_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_equipamento_salvar(uuid, text, text, text, text, int, int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_equipamento_salvar(uuid, text, text, text, text, int, int, boolean) TO authenticated;

-- Perfis que já tinham acesso ao módulo Soroteca recebem as permissões equivalentes
UPDATE public.access_profiles ap
SET permissions = jsonb_set(coalesce(ap.permissions, '{}'::jsonb), '{soroteca}', (
  SELECT coalesce(jsonb_agg(DISTINCT c), '[]'::jsonb) FROM (
    SELECT jsonb_array_elements_text(coalesce(ap.permissions->'soroteca', '[]'::jsonb)) c
    UNION SELECT 'soroteca.ver' WHERE coalesce(ap.permissions->'serotheque', '[]'::jsonb) ? 'view'
    UNION SELECT 'soroteca.armazenar' WHERE coalesce(ap.permissions->'serotheque', '[]'::jsonb) ? 'create'
    UNION SELECT 'soroteca.descartar' WHERE coalesce(ap.permissions->'serotheque', '[]'::jsonb) ? 'delete'
    UNION SELECT 'soroteca.configurar' WHERE coalesce(ap.permissions->'serotheque', '[]'::jsonb) ? 'edit') z))
WHERE coalesce(ap.permissions->'serotheque', '[]'::jsonb) ?| ARRAY['view', 'create', 'delete', 'edit'];