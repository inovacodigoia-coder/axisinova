-- Soroteca S06-C: rastreabilidade por estante (quem criou, colocou, removeu, retirou, devolveu, finalizou, reabriu, descartou).
-- Nada é apagado nem editado: o histórico só cresce; o que não dá para recuperar dos registros antigos vale a partir de agora.

-- (1) Estante de onde o tubo saiu, gravada no próprio movimento (remoção, retirada, descarte, mudança de lugar).
ALTER TABLE public.soroteca_amostra ADD COLUMN ultimo_equipamento_id uuid REFERENCES public.soroteca_equipamento(id);
COMMENT ON COLUMN public.soroteca_amostra.ultimo_equipamento_id IS 'Última estante em que o tubo esteve (preenchido por trigger ao sair ou mudar de posição)';
ALTER TABLE public.soroteca_movimento ADD COLUMN de_equipamento_id uuid REFERENCES public.soroteca_equipamento(id);
COMMENT ON COLUMN public.soroteca_movimento.de_equipamento_id IS 'Estante de onde o tubo saiu (preenchido por trigger; movimentos antigos ficam nulos e são ligados pelo nome)';
CREATE INDEX soroteca_movimento_equipamento_idx ON public.soroteca_movimento (equipamento_id, created_at) WHERE equipamento_id IS NOT NULL;
CREATE INDEX soroteca_movimento_de_equipamento_idx ON public.soroteca_movimento (de_equipamento_id, created_at) WHERE de_equipamento_id IS NOT NULL;
CREATE INDEX soroteca_estante_movimento_estante_idx ON public.soroteca_estante_movimento (estante_id, created_at);
CREATE INDEX soroteca_impressao_equipamento_idx ON public.soroteca_impressao (equipamento_id, created_at) WHERE equipamento_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.soroteca_amostra_ultimo_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.equipamento_id IS NOT NULL AND (NEW.equipamento_id IS DISTINCT FROM OLD.equipamento_id OR NEW.prateleira_id IS DISTINCT FROM OLD.prateleira_id
       OR NEW.linha IS DISTINCT FROM OLD.linha OR NEW.coluna IS DISTINCT FROM OLD.coluna) THEN
    NEW.ultimo_equipamento_id := OLD.equipamento_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_amostra_ultimo_trg() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_soroteca_amostra_ultimo BEFORE UPDATE ON public.soroteca_amostra
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_amostra_ultimo_trg();

CREATE OR REPLACE FUNCTION public.soroteca_movimento_origem_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.de_equipamento_id IS NULL AND NEW.tipo IN ('remocao', 'retirada', 'descarte', 'movimentacao') THEN
    SELECT ultimo_equipamento_id INTO NEW.de_equipamento_id FROM public.soroteca_amostra WHERE id = NEW.amostra_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_movimento_origem_trg() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_soroteca_movimento_origem BEFORE INSERT ON public.soroteca_movimento
  FOR EACH ROW EXECUTE FUNCTION public.soroteca_movimento_origem_trg();

-- (2) Histórico também não pode ser esvaziado de uma vez (TRUNCATE), nem por administrador.
CREATE TRIGGER trg_soroteca_movimento_sem_truncate BEFORE TRUNCATE ON public.soroteca_movimento
  FOR EACH STATEMENT EXECUTE FUNCTION public.soroteca_movimento_imutavel();
CREATE TRIGGER trg_soroteca_estante_movimento_sem_truncate BEFORE TRUNCATE ON public.soroteca_estante_movimento
  FOR EACH STATEMENT EXECUTE FUNCTION public.soroteca_movimento_imutavel();
CREATE TRIGGER trg_soroteca_impressao_sem_truncate BEFORE TRUNCATE ON public.soroteca_impressao
  FOR EACH STATEMENT EXECUTE FUNCTION public.soroteca_movimento_imutavel();
CREATE TRIGGER trg_soroteca_descarte_sem_truncate BEFORE TRUNCATE ON public.soroteca_descarte
  FOR EACH STATEMENT EXECUTE FUNCTION public.soroteca_movimento_imutavel();
CREATE TRIGGER trg_soroteca_descarte_item_sem_truncate BEFORE TRUNCATE ON public.soroteca_descarte_item
  FOR EACH STATEMENT EXECUTE FUNCTION public.soroteca_movimento_imutavel();

-- (3) Todos os eventos de uma estante, em uma lista só (uso interno das RPCs).
CREATE OR REPLACE FUNCTION public.soroteca__estante_eventos(p_company uuid, p_estante uuid)
RETURNS TABLE (id uuid, tipo text, quando timestamptz, usuario_nome text, amostra_id uuid, codigo_amostra text, patient_name text,
  posicao text, de_posicao text, outra_estante text, equipamento_nome text, prateleira_nome text, motivo text, observacao text,
  tubos int, destino text, descarte_id uuid, reimpressao boolean, recuperado boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH est AS (
    SELECT e.* FROM public.soroteca_equipamento e WHERE e.id = p_estante AND e.company_id = p_company AND e.tipo = 'estante'
  ), nomes AS (
    SELECT nome FROM est UNION SELECT em.estante_nome FROM public.soroteca_estante_movimento em WHERE em.estante_id = p_estante AND em.estante_nome IS NOT NULL
  ), descartes_estante AS (
    SELECT em.created_at FROM public.soroteca_estante_movimento em WHERE em.estante_id = p_estante AND em.tipo = 'descartada'
  ), mov AS (
    SELECT m.*, lag(m.tipo) OVER (PARTITION BY m.amostra_id ORDER BY m.created_at, m.id) AS anterior,
           -- movimentos antigos (sem a estante de origem gravada): liga pelo nome, se o tubo já tinha entrado nesta estante
           coalesce(m.de_equipamento_id = p_estante, m.de_equipamento_id IS NULL AND m.de_equipamento_nome IN (SELECT nome FROM nomes)
             AND EXISTS (SELECT 1 FROM public.soroteca_movimento x WHERE x.amostra_id = m.amostra_id AND x.equipamento_id = p_estante
                         AND x.created_at < m.created_at)) AS saiu_daqui
    FROM public.soroteca_movimento m
    WHERE m.company_id = p_company AND m.amostra_id IN (
      SELECT x.amostra_id FROM public.soroteca_movimento x WHERE x.company_id = p_company AND (x.equipamento_id = p_estante OR x.de_equipamento_id = p_estante))
  )
  -- eventos da estante
  SELECT em.id,
    CASE em.tipo WHEN 'guardada' THEN 'finalizada' WHEN 'aberta' THEN 'reaberta' ELSE em.tipo END,
    em.created_at, coalesce(em.responsavel_nome, em.usuario_nome), NULL::uuid, NULL, NULL, NULL, NULL, NULL,
    em.equipamento_nome, em.prateleira_nome, em.motivo, em.observacao, em.tubos, em.destino, em.descarte_id, NULL::boolean, false
  FROM public.soroteca_estante_movimento em JOIN est ON est.id = em.estante_id
  UNION ALL
  -- estante antiga sem registro de criação: recuperada do cadastro
  SELECT est.id, 'criada', est.created_at, (SELECT full_name FROM public.profiles WHERE profiles.id = est.created_by),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true
  FROM est WHERE NOT EXISTS (SELECT 1 FROM public.soroteca_estante_movimento em WHERE em.estante_id = est.id AND em.tipo = 'criada')
  UNION ALL
  -- etiqueta da estante e folhas dos descartes dela
  SELECT i.id, CASE i.tipo WHEN 'etiqueta' THEN 'etiqueta' ELSE 'folha' END, i.created_at, i.usuario_nome,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, i.descarte_id, i.reimpressao, false
  FROM public.soroteca_impressao i
  WHERE i.company_id = p_company AND (i.equipamento_id = p_estante
    OR i.descarte_id IN (SELECT d.id FROM public.soroteca_descarte d WHERE d.estante_id = p_estante))
  UNION ALL
  -- tubos que entraram nesta estante (colocado, devolvido ou trocado de posição aqui dentro)
  SELECT m.id,
    CASE WHEN m.tipo = 'entrada' AND m.anterior IN ('retirada', 'remocao') THEN 'tubo_devolvido'
         WHEN m.tipo = 'movimentacao' AND m.saiu_daqui THEN 'tubo_movido'
         ELSE 'tubo_colocado' END,
    m.created_at, m.usuario_nome, m.amostra_id, a.codigo_amostra, a.patient_name,
    public.soroteca__posicao(m.linha, m.coluna),
    CASE WHEN m.tipo = 'movimentacao' THEN public.soroteca__posicao(m.de_linha, m.de_coluna) END,
    CASE WHEN m.tipo = 'movimentacao' AND NOT m.saiu_daqui THEN m.de_equipamento_nome END,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false
  FROM mov m JOIN public.soroteca_amostra a ON a.id = m.amostra_id
  WHERE m.equipamento_id = p_estante AND m.tipo IN ('entrada', 'movimentacao')
  UNION ALL
  -- tubos que saíram desta estante
  SELECT m.id,
    CASE m.tipo WHEN 'remocao' THEN 'tubo_removido' WHEN 'retirada' THEN 'tubo_retirado' WHEN 'descarte' THEN 'tubo_descartado' ELSE 'tubo_movido' END,
    m.created_at, coalesce(m.responsavel_nome, m.usuario_nome), m.amostra_id, a.codigo_amostra, a.patient_name,
    CASE WHEN m.tipo = 'movimentacao' THEN public.soroteca__posicao(m.linha, m.coluna) END,
    public.soroteca__posicao(m.de_linha, m.de_coluna),
    CASE WHEN m.tipo = 'movimentacao' THEN m.equipamento_nome END,
    NULL, NULL, m.motivo, m.observacao, NULL, NULL, NULL, NULL, m.de_equipamento_id IS NULL
  FROM mov m JOIN public.soroteca_amostra a ON a.id = m.amostra_id
  WHERE m.saiu_daqui AND m.tipo IN ('remocao', 'retirada', 'descarte', 'movimentacao')
    AND NOT (m.tipo = 'movimentacao' AND m.equipamento_id = p_estante)
    -- descarte da estante inteira já aparece como um evento só ("Estante descartada")
    AND NOT (m.tipo = 'descarte' AND m.created_at IN (SELECT created_at FROM descartes_estante));
$$;
REVOKE EXECUTE ON FUNCTION public.soroteca__estante_eventos(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- (4) Rastreabilidade da estante: cabeçalho + linha do tempo filtrada e paginada (mais novo primeiro).
CREATE OR REPLACE FUNCTION public.soroteca_estante_rastreio(p_id uuid, p_filtros jsonb DEFAULT '{}'::jsonb, p_limite int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company uuid := public.get_user_company_id(auth.uid()); e record; f jsonb := coalesce(p_filtros, '{}'::jsonb);
  v_tipos text[]; v_usuario text := nullif(trim(coalesce(f->>'usuario', '')), ''); v_de date; v_ate date;
  v_lim int := least(greatest(coalesce(p_limite, 50), 1), 1000); v_off int := greatest(coalesce(p_offset, 0), 0);
BEGIN
  IF NOT public.soroteca_tem_permissao('soroteca.ver') THEN
    RAISE EXCEPTION 'Sem permissão para a Soroteca' USING ERRCODE = '42501';
  END IF;
  SELECT s.*, w.name AS bancada_nome, g.nome AS g_nome, gp.nome AS gp_nome,
    (SELECT count(*) FROM public.soroteca_amostra a WHERE a.equipamento_id = s.id AND a.status = 'armazenada') AS tubos
    INTO e FROM public.soroteca_equipamento s
    LEFT JOIN public.lab_workbenches w ON w.id::text = s.workbench_id
    LEFT JOIN public.soroteca_equipamento g ON g.id = s.local_equipamento_id
    LEFT JOIN public.soroteca_prateleira gp ON gp.id = s.local_prateleira_id
    WHERE s.id = p_id AND s.company_id = v_company AND s.tipo = 'estante';
  IF e.id IS NULL THEN RAISE EXCEPTION 'Estante não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF jsonb_typeof(f->'tipos') = 'array' AND jsonb_array_length(f->'tipos') > 0 THEN
    SELECT array_agg(x) INTO v_tipos FROM jsonb_array_elements_text(f->'tipos') x;
  END IF;
  IF coalesce(f->>'de', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN v_de := (f->>'de')::date; END IF;
  IF coalesce(f->>'ate', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN v_ate := (f->>'ate')::date; END IF;

  RETURN (
    WITH todos AS (SELECT * FROM public.soroteca__estante_eventos(v_company, p_id)),
    filtrados AS (
      SELECT * FROM todos t
      WHERE (v_tipos IS NULL OR t.tipo = ANY(v_tipos))
        AND (v_usuario IS NULL OR t.usuario_nome = v_usuario)
        AND (v_de IS NULL OR (t.quando AT TIME ZONE 'America/Sao_Paulo')::date >= v_de)
        AND (v_ate IS NULL OR (t.quando AT TIME ZONE 'America/Sao_Paulo')::date <= v_ate)
    ),
    pagina AS (SELECT * FROM filtrados ORDER BY quando DESC, id DESC LIMIT v_lim OFFSET v_off),
    criacao AS (SELECT quando, usuario_nome FROM todos WHERE tipo = 'criada' ORDER BY quando LIMIT 1)
    SELECT jsonb_build_object(
      'estante', jsonb_build_object('id', e.id, 'codigo', e.codigo, 'nome', e.nome, 'linhas', e.linhas, 'colunas', e.colunas,
        'bancada_nome', e.bancada_nome, 'ativo', e.ativo, 'situacao', e.situacao, 'local_equipamento_nome', e.g_nome,
        'local_prateleira_nome', e.gp_nome, 'tubos', e.tubos,
        'criada_em', coalesce((SELECT quando FROM criacao), e.created_at), 'criada_por', (SELECT usuario_nome FROM criacao)),
      'total', (SELECT count(*) FROM filtrados),
      'usuarios', (SELECT coalesce(jsonb_agg(DISTINCT t.usuario_nome), '[]'::jsonb) FROM todos t WHERE t.usuario_nome IS NOT NULL),
      'eventos', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.quando DESC, p.id DESC), '[]'::jsonb) FROM pagina p))
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.soroteca_estante_rastreio(uuid, jsonb, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soroteca_estante_rastreio(uuid, jsonb, int, int) TO authenticated;