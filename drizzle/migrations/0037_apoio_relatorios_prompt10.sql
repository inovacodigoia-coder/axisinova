
-- Casas decimais na máscara do parâmetro
ALTER TABLE public.lab_exam_parameters ADD COLUMN IF NOT EXISTS casas_decimais integer;

-- Períodos de modo manual
CREATE TABLE IF NOT EXISTS public.apoio_modo_manual_periodo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  apoio_id uuid NOT NULL REFERENCES public.apoio_laboratorio(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  ligado_por uuid,
  desligado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apoio_modo_manual_periodo TO authenticated;
GRANT ALL ON public.apoio_modo_manual_periodo TO service_role;
ALTER TABLE public.apoio_modo_manual_periodo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver periodos manual" ON public.apoio_modo_manual_periodo FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.apoio_tem_permissao('apoio.relatorios.ver'));

INSERT INTO public.apoio_modo_manual_periodo(company_id, apoio_id, inicio, ligado_por)
SELECT company_id, id, coalesce(modo_manual_desde, updated_at), modo_manual_por FROM public.apoio_laboratorio
WHERE modo_contingencia AND NOT EXISTS (SELECT 1 FROM public.apoio_modo_manual_periodo p WHERE p.apoio_id = apoio_laboratorio.id AND p.fim IS NULL);

CREATE OR REPLACE FUNCTION public.apoio_modo_manual_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.modo_contingencia,false) AND NOT coalesce(OLD.modo_contingencia,false) THEN
    INSERT INTO apoio_modo_manual_periodo(company_id, apoio_id, inicio, ligado_por) VALUES (NEW.company_id, NEW.id, now(), auth.uid());
  ELSIF NOT coalesce(NEW.modo_contingencia,false) AND coalesce(OLD.modo_contingencia,false) THEN
    UPDATE apoio_modo_manual_periodo SET fim = now(), desligado_por = auth.uid() WHERE apoio_id = NEW.id AND fim IS NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS apoio_modo_manual_trg ON public.apoio_laboratorio;
CREATE TRIGGER apoio_modo_manual_trg AFTER UPDATE OF modo_contingencia ON public.apoio_laboratorio FOR EACH ROW EXECUTE FUNCTION public.apoio_modo_manual_trg();

-- Configuração e histórico das notificações automáticas
CREATE TABLE IF NOT EXISTS public.notificacao_evento_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  publico text NOT NULL,
  evento text NOT NULL,
  canal_email boolean NOT NULL DEFAULT true,
  canal_sms boolean NOT NULL DEFAULT false,
  canal_sistema boolean NOT NULL DEFAULT true,
  assunto text,
  template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, evento)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacao_evento_config TO authenticated;
GRANT ALL ON public.notificacao_evento_config TO service_role;
ALTER TABLE public.notificacao_evento_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver config notif" ON public.notificacao_evento_config FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "gerir config notif" ON public.notificacao_evento_config FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));

CREATE TABLE IF NOT EXISTS public.notificacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  evento text NOT NULL,
  destinatario text,
  canal text NOT NULL,
  conteudo text,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notificacao_historico TO authenticated;
GRANT ALL ON public.notificacao_historico TO service_role;
ALTER TABLE public.notificacao_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver historico notif" ON public.notificacao_historico FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_manager(auth.uid()));
CREATE INDEX IF NOT EXISTS notificacao_historico_company_idx ON public.notificacao_historico(company_id, created_at DESC);

-- Usuários de uma empresa com uma permissão do apoio (sem depender de auth.uid)
CREATE OR REPLACE FUNCTION public.apoio_usuarios_com(_company uuid, _perm text) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM profiles p WHERE p.company_id = _company AND (
    public.is_company_manager(p.id) OR (_perm IS NOT NULL AND EXISTS (
      SELECT 1 FROM sector_users su
      JOIN company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = p.id AND ap.company_id = _company AND coalesce(ap.permissions->'apoio','[]'::jsonb) ? _perm)));
$$;
REVOKE ALL ON FUNCTION public.apoio_usuarios_com(uuid, text) FROM PUBLIC, anon, authenticated;

-- Envia um alerta ao sininho (respeita a configuração) e registra no histórico
CREATE OR REPLACE FUNCTION public.apoio_alertar(_company uuid, _evento text, _perm text, _titulo text, _msg text, _rota text, _prioridade text DEFAULT 'high')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int := 0; u uuid; cfg record;
BEGIN
  SELECT * INTO cfg FROM notificacao_evento_config WHERE company_id = _company AND evento = _evento;
  IF FOUND AND NOT cfg.canal_sistema THEN RETURN 0; END IF;
  FOR u IN SELECT public.apoio_usuarios_com(_company, _perm) LOOP
    INSERT INTO user_notifications(company_id, user_id, category, priority, title, message, action_route)
    VALUES (_company, u, 'apoio', _prioridade, _titulo, _msg, _rota);
    n := n + 1;
  END LOOP;
  IF n > 0 THEN
    INSERT INTO notificacao_historico(company_id, evento, destinatario, canal, conteudo)
    VALUES (_company, _evento, n || ' usuário(s)', 'Sininho', _titulo || ': ' || _msg);
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.apoio_alertar(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Pendência técnica nova -> imediato
CREATE OR REPLACE FUNCTION public.apoio_alerta_pendencia_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nome text;
BEGIN
  SELECT e.name INTO nome FROM apoio_pedido_exame pe LEFT JOIN exams e ON e.id = pe.exame_id WHERE pe.id = NEW.pedido_exame_id;
  PERFORM apoio_alertar(NEW.company_id, 'Pendência técnica do apoio', 'apoio.kanban.ver', 'Pendência técnica do apoio',
    coalesce(nome,'Exame') || ': ' || coalesce(NEW.pendencia, NEW.detalhamento, 'sem descrição'), '/app/apoio/kanban');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS apoio_alerta_pendencia_trg ON public.apoio_pendencia_tecnica;
CREATE TRIGGER apoio_alerta_pendencia_trg AFTER INSERT ON public.apoio_pendencia_tecnica FOR EACH ROW EXECUTE FUNCTION public.apoio_alerta_pendencia_trg();

-- Recoleta nova -> imediato
CREATE OR REPLACE FUNCTION public.apoio_alerta_recoleta_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nome text;
BEGIN
  IF NEW.status_para = 'nova_coleta' THEN
    SELECT e.name INTO nome FROM apoio_pedido_exame pe LEFT JOIN exams e ON e.id = pe.exame_id WHERE pe.id = NEW.pedido_exame_id;
    PERFORM apoio_alertar(NEW.company_id, 'Pendência técnica do apoio', 'apoio.kanban.ver', 'Recoleta necessária (apoio)',
      coalesce(nome,'Exame') || coalesce(': ' || NEW.motivo, ''), '/app/apoio/kanban');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS apoio_alerta_recoleta_trg ON public.apoio_pedido_exame_historico;
CREATE TRIGGER apoio_alerta_recoleta_trg AFTER INSERT ON public.apoio_pedido_exame_historico FOR EACH ROW EXECUTE FUNCTION public.apoio_alerta_recoleta_trg();

-- Rotina de alertas: _resumo=true às 8h (resumo diário de atrasos); a cada hora: críticos, integração, qualificação
CREATE OR REPLACE FUNCTION public.apoio_alertas_rodar(_resumo boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; total int := 0;
BEGIN
  -- Exames que passaram a atrasar (prazo = ontem, ainda em aberto)
  FOR r IN
    SELECT pe.company_id, count(*) n, count(*) FILTER (WHERE pe.critico) nc,
      string_agg(DISTINCT e.name, ', ') FILTER (WHERE pe.critico) criticos
    FROM apoio_pedido_exame pe LEFT JOIN exams e ON e.id = pe.exame_id
    WHERE pe.prazo_previsto = current_date - 1
      AND pe.status NOT IN ('liberado_apoio','importado','importado_com_pendencia','liberado_local','cancelado')
      AND coalesce(pe.info_complementar->>'alerta_atraso_em','') <> current_date::text
    GROUP BY pe.company_id
  LOOP
    IF _resumo THEN
      total := total + apoio_alertar(r.company_id, 'Exame de apoio atrasado', 'apoio.kanban.ver', 'Exames de apoio atrasados',
        r.n || ' exame(s) passaram a atrasar hoje', '/app/apoio/kanban', 'medium');
    ELSIF r.nc > 0 THEN
      total := total + apoio_alertar(r.company_id, 'Exame de apoio atrasado', 'apoio.kanban.ver', 'Exame CRÍTICO de apoio atrasado',
        r.criticos, '/app/apoio/kanban', 'critical');
    END IF;
  END LOOP;
  UPDATE apoio_pedido_exame SET info_complementar = coalesce(info_complementar,'{}'::jsonb) || jsonb_build_object('alerta_atraso_em', current_date::text)
  WHERE prazo_previsto = current_date - 1
    AND status NOT IN ('liberado_apoio','importado','importado_com_pendencia','liberado_local','cancelado')
    AND coalesce(info_complementar->>'alerta_atraso_em','') <> current_date::text
    AND (_resumo OR critico);

  -- Integração sem sucesso há mais de 1 hora (ao menos uma falha e nenhum sucesso na última hora)
  FOR r IN
    SELECT l.company_id, a.nome FROM apoio_laboratorio a JOIN apoio_chamada_log l ON l.apoio_id = a.id
    WHERE a.ativo AND NOT a.modo_contingencia AND l.created_at > now() - interval '1 hour'
    GROUP BY l.company_id, a.id, a.nome
    HAVING count(*) FILTER (WHERE l.erro IS NULL AND coalesce(l.http_status,200) < 400) = 0
       AND NOT EXISTS (SELECT 1 FROM notificacao_historico h WHERE h.company_id = l.company_id AND h.evento = 'Integração com o apoio falhou'
                       AND h.conteudo LIKE '%' || a.nome || '%' AND h.created_at > now() - interval '6 hours')
  LOOP
    total := total + apoio_alertar(r.company_id, 'Integração com o apoio falhou', NULL, 'Integração com o apoio falhou',
      r.nome || ': sem sucesso há mais de 1 hora', '/app/apoio/relatorios?r=log', 'high');
  END LOOP;

  -- Licença/certificação vencendo em 30 dias (1 aviso por semana)
  FOR r IN
    SELECT a.company_id, a.nome || ' – licença sanitária' item, a.licenca_validade validade FROM apoio_laboratorio a
      WHERE a.ativo AND a.licenca_validade BETWEEN current_date AND current_date + 30
    UNION ALL
    SELECT c.company_id, a.nome || ' – ' || c.tipo, c.validade FROM apoio_certificacao c JOIN apoio_laboratorio a ON a.id = c.apoio_id
      WHERE a.ativo AND c.validade BETWEEN current_date AND current_date + 30
  LOOP
    IF NOT EXISTS (SELECT 1 FROM notificacao_historico h WHERE h.company_id = r.company_id AND h.evento = 'Licença/certificação do apoio vencendo'
                   AND h.conteudo LIKE '%' || r.item || '%' AND h.created_at > now() - interval '7 days') THEN
      total := total + apoio_alertar(r.company_id, 'Licença/certificação do apoio vencendo', NULL, 'Licença/certificação do apoio vencendo',
        r.item || ' vence em ' || to_char(r.validade, 'DD/MM/YYYY'), '/app/apoio/relatorios?r=qualificacao', 'medium');
    END IF;
  END LOOP;
  RETURN jsonb_build_object('notificacoes', total);
END $$;
REVOKE ALL ON FUNCTION public.apoio_alertas_rodar(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apoio_alertas_rodar(boolean) TO service_role;

-- Base dos relatórios (interna)
CREATE OR REPLACE FUNCTION public.apoio_rel__base(_ini date, _fim date, _apoio uuid, _unidade uuid)
RETURNS TABLE(id uuid, company_id uuid, pedido_id uuid, protocolo text, paciente text, exame_id uuid, exame_nome text,
  apoio_id uuid, apoio_nome text, unidade_id uuid, unidade_nome text, status text, prazo_previsto date, custo_previsto numeric,
  preco_ficticio boolean, critico boolean, responsavel_id uuid, modo text, criado_em timestamptz,
  transmitido_em timestamptz, liberado_em timestamptz, convenio_id uuid, recoleta boolean, erro_transmissao boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pe.id, pe.company_id, pe.pedido_id, coalesce(o.protocol, o.order_number::text), o.patient_name, pe.exame_id, e.name,
    pe.apoio_id, a.nome, o.origin_id, o.origin_name, pe.status::text, pe.prazo_previsto, pe.custo_previsto,
    coalesce(pe.preco_ficticio,false), coalesce(pe.critico,false), pe.responsavel_id, pe.modo, pe.created_at,
    (SELECT min(h.created_at) FROM apoio_pedido_exame_historico h WHERE h.pedido_exame_id = pe.id AND h.status_para = 'transmitido'),
    coalesce((SELECT min(h.created_at) FROM apoio_pedido_exame_historico h WHERE h.pedido_exame_id = pe.id AND h.status_para = 'liberado_apoio'),
      CASE WHEN pe.status IN ('importado','importado_com_pendencia','liberado_local') THEN pe.status_apoio_em END),
    o.convenio_id,
    EXISTS (SELECT 1 FROM apoio_pedido_exame_historico h WHERE h.pedido_exame_id = pe.id AND h.status_para = 'nova_coleta'),
    EXISTS (SELECT 1 FROM apoio_pedido_exame_historico h WHERE h.pedido_exame_id = pe.id AND h.status_para = 'erro_transmissao') OR pe.status = 'erro_transmissao'
  FROM apoio_pedido_exame pe
  JOIN attendance_orders o ON o.id = pe.pedido_id
  LEFT JOIN exams e ON e.id = pe.exame_id
  LEFT JOIN apoio_laboratorio a ON a.id = pe.apoio_id
  WHERE pe.company_id = public.get_user_company_id(auth.uid())
    AND pe.created_at::date BETWEEN _ini AND _fim
    AND (_apoio IS NULL OR pe.apoio_id = _apoio)
    AND (_unidade IS NULL OR o.origin_id = _unidade);
$$;
REVOKE ALL ON FUNCTION public.apoio_rel__base(date, date, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apoio_rel__checar(_perm text) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.apoio_tem_permissao('apoio.relatorios.ver') OR (_perm IS NOT NULL AND NOT public.apoio_tem_permissao(_perm)) THEN
    RAISE EXCEPTION 'Você não tem permissão para ver este relatório' USING ERRCODE = '42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.apoio_rel__checar(text) FROM PUBLIC, anon, authenticated;

-- 1. Painel
CREATE OR REPLACE FUNCTION public.apoio_rel_painel(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb; cid uuid := public.get_user_company_id(auth.uid());
BEGIN
  PERFORM apoio_rel__checar(NULL);
  WITH b AS (SELECT * FROM apoio_rel__base(_ini, _fim, _apoio, _unidade)),
  env AS (SELECT * FROM b WHERE transmitido_em IS NOT NULL),
  lib AS (SELECT *, apoio_dias_uteis(company_id, transmitido_em::date, liberado_em::date) tat_real,
                 apoio_dias_uteis(company_id, transmitido_em::date, prazo_previsto) tat_prom
          FROM env WHERE liberado_em IS NOT NULL)
  SELECT jsonb_build_object(
    'cards', jsonb_build_object(
      'enviados', (SELECT count(*) FROM env),
      'no_prazo_pct', (SELECT round(100.0 * count(*) FILTER (WHERE liberado_em::date <= prazo_previsto) / nullif(count(*),0), 1) FROM lib WHERE prazo_previsto IS NOT NULL),
      'tat_real', (SELECT round(avg(tat_real), 1) FROM lib),
      'tat_prometido', (SELECT round(avg(tat_prom), 1) FROM lib WHERE prazo_previsto IS NOT NULL),
      'recoleta_pct', (SELECT round(100.0 * count(*) FILTER (WHERE recoleta) / nullif(count(*),0), 1) FROM env),
      'erro_transmissao_pct', (SELECT round(100.0 * count(*) FILTER (WHERE erro_transmissao) / nullif(count(*),0), 1) FROM b WHERE status <> 'aguardando_remessa' AND status <> 'em_remessa' OR erro_transmissao),
      'excecoes_hoje', (SELECT count(DISTINCT pe.id) FROM apoio_pedido_exame pe
          LEFT JOIN attendance_orders o ON o.id = pe.pedido_id
          WHERE pe.company_id = cid AND (_apoio IS NULL OR pe.apoio_id = _apoio) AND (_unidade IS NULL OR o.origin_id = _unidade)
            AND pe.status NOT IN ('liberado_local','cancelado')
            AND (pe.status IN ('erro_transmissao','pendencia_tecnica','nova_coleta','importado_com_pendencia')
              OR EXISTS (SELECT 1 FROM apoio_acao_pendente ac WHERE ac.pedido_exame_id = pe.id AND ac.concluida_em IS NULL)
              OR (pe.prazo_previsto < current_date AND pe.status NOT IN ('liberado_apoio','importado')))),
      'ficticio', (SELECT bool_or(preco_ficticio) FROM b)),
    'volume_dia', coalesce((SELECT jsonb_agg(jsonb_build_object('dia', d, 'enviados', n) ORDER BY d)
        FROM (SELECT transmitido_em::date d, count(*) n FROM env GROUP BY 1) x), '[]'),
    'tat_apoio', coalesce((SELECT jsonb_agg(jsonb_build_object('apoio', apoio_nome, 'real', r, 'prometido', p))
        FROM (SELECT apoio_nome, round(avg(tat_real),1) r, round(avg(tat_prom),1) p FROM lib GROUP BY apoio_nome) x), '[]'),
    'atraso_exame', coalesce((SELECT jsonb_agg(jsonb_build_object('exame', exame_nome, 'atrasos', n) ORDER BY n DESC)
        FROM (SELECT exame_nome, count(*) n FROM b WHERE prazo_previsto < coalesce(liberado_em::date, current_date) AND status <> 'cancelado'
              GROUP BY exame_nome ORDER BY 2 DESC LIMIT 10) x), '[]'),
    'motivos_pendencia', coalesce((SELECT jsonb_agg(jsonb_build_object('motivo', m, 'total', n) ORDER BY n DESC)
        FROM (SELECT coalesce(nullif(pt.pendencia,''), 'Sem motivo') m, count(*) n FROM apoio_pendencia_tecnica pt JOIN b ON b.id = pt.pedido_exame_id
              GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x), '[]')
  ) INTO res;
  RETURN res;
END $$;

-- 2.1 Exames em atraso
CREATE OR REPLACE FUNCTION public.apoio_rel_atrasos(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(paciente text, pedido text, exame text, apoio text, etapa text, dias_atraso int, responsavel text, critico boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar(NULL);
  RETURN QUERY SELECT b.paciente, b.protocolo, b.exame_nome, b.apoio_nome, b.status,
    (current_date - b.prazo_previsto)::int, pr.full_name, b.critico
  FROM apoio_rel__base(_ini, _fim, _apoio, _unidade) b LEFT JOIN profiles pr ON pr.id = b.responsavel_id
  WHERE b.prazo_previsto < current_date AND b.liberado_em IS NULL AND b.status NOT IN ('cancelado','liberado_local','importado','importado_com_pendencia')
  ORDER BY 6 DESC;
END $$;

-- 2.2 Pendências e recoletas
CREATE OR REPLACE FUNCTION public.apoio_rel_pendencias(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(tipo text, paciente text, pedido text, exame text, apoio text, motivo text, aberta_em timestamptz, resolvida_em timestamptz, horas_ate_resolver numeric, situacao text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar(NULL);
  RETURN QUERY
  SELECT 'Pendência técnica'::text, b.paciente, b.protocolo, b.exame_nome, b.apoio_nome, coalesce(pt.pendencia, pt.detalhamento),
    coalesce(pt.recebida_em, pt.created_at), pt.resolvida_em,
    round(extract(epoch FROM (pt.resolvida_em - coalesce(pt.recebida_em, pt.created_at))) / 3600.0, 1),
    CASE WHEN pt.resolvida_em IS NULL THEN 'Aberta' ELSE 'Resolvida' END
  FROM apoio_pendencia_tecnica pt JOIN apoio_rel__base(_ini, _fim, _apoio, _unidade) b ON b.id = pt.pedido_exame_id
  UNION ALL
  SELECT 'Recoleta', b.paciente, b.protocolo, b.exame_nome, b.apoio_nome, h.motivo, h.created_at,
    (SELECT min(h2.created_at) FROM apoio_pedido_exame_historico h2 WHERE h2.pedido_exame_id = h.pedido_exame_id AND h2.created_at > h.created_at AND h2.status_para <> 'nova_coleta'),
    NULL, NULL
  FROM apoio_pedido_exame_historico h JOIN apoio_rel__base(_ini, _fim, _apoio, _unidade) b ON b.id = h.pedido_exame_id
  WHERE h.status_para = 'nova_coleta'
  ORDER BY 7 DESC;
END $$;

-- 2.3 Desempenho (TAT) por exame
CREATE OR REPLACE FUNCTION public.apoio_rel_tat(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(apoio text, exame text, exames bigint, prometido_medio numeric, real_medio numeric, real_mediana numeric, real_p90 numeric, no_prazo_pct numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar(NULL);
  RETURN QUERY
  WITH l AS (SELECT b.*, apoio_dias_uteis(b.company_id, b.transmitido_em::date, b.liberado_em::date) r,
                    apoio_dias_uteis(b.company_id, b.transmitido_em::date, b.prazo_previsto) p
             FROM apoio_rel__base(_ini, _fim, _apoio, _unidade) b WHERE b.transmitido_em IS NOT NULL AND b.liberado_em IS NOT NULL)
  SELECT l.apoio_nome, l.exame_nome, count(*), round(avg(l.p),1), round(avg(l.r),1),
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY l.r)::numeric,1), round(percentile_cont(0.9) WITHIN GROUP (ORDER BY l.r)::numeric,1),
    round(100.0 * count(*) FILTER (WHERE l.liberado_em::date <= l.prazo_previsto) / nullif(count(*) FILTER (WHERE l.prazo_previsto IS NOT NULL),0),1)
  FROM l GROUP BY 1,2 ORDER BY 1,2;
END $$;

-- 2.4 Remessas
CREATE OR REPLACE FUNCTION public.apoio_rel_remessas(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(lote bigint, apoio text, criada_em timestamptz, status text, tubos bigint, exames bigint, conferencia text, conferido_por text, temperatura text, entregue_a text, entregue_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar(NULL);
  RETURN QUERY
  SELECT r.cod_lote_lab, a.nome, r.created_at, r.status,
    (SELECT count(DISTINCT coalesce(pe.amostra_id::text, pe.recipiente_id::text, pe.id::text)) FROM apoio_pedido_exame pe WHERE pe.remessa_id = r.id),
    (SELECT count(*) FROM apoio_pedido_exame pe WHERE pe.remessa_id = r.id),
    CASE WHEN r.conferencia_forcada IS NOT NULL THEN 'Forçada: ' || r.conferencia_forcada WHEN r.conferido_em IS NOT NULL THEN 'Bipada' ELSE 'Não conferida' END,
    pr.full_name, r.temperatura, r.entregue_a, r.entregue_em
  FROM apoio_remessa r JOIN apoio_laboratorio a ON a.id = r.apoio_id LEFT JOIN profiles pr ON pr.id = r.conferido_por
  WHERE r.company_id = public.get_user_company_id(auth.uid()) AND r.created_at::date BETWEEN _ini AND _fim
    AND (_apoio IS NULL OR r.apoio_id = _apoio)
    AND (_unidade IS NULL OR EXISTS (SELECT 1 FROM apoio_pedido_exame pe JOIN attendance_orders o ON o.id = pe.pedido_id WHERE pe.remessa_id = r.id AND o.origin_id = _unidade))
  ORDER BY r.created_at DESC;
END $$;

-- 2.5 Modo manual
CREATE OR REPLACE FUNCTION public.apoio_rel_modo_manual(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(apoio text, ligado_em timestamptz, desligado_em timestamptz, horas numeric, ligado_por text, desligado_por text, exames_manuais bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar(NULL);
  RETURN QUERY
  SELECT a.nome, p.inicio, p.fim, round(extract(epoch FROM (coalesce(p.fim, now()) - p.inicio)) / 3600.0, 1),
    p1.full_name, p2.full_name,
    (SELECT count(*) FROM apoio_pedido_exame pe JOIN attendance_orders o ON o.id = pe.pedido_id
      WHERE pe.apoio_id = p.apoio_id AND pe.modo = 'manual' AND pe.created_at BETWEEN p.inicio AND coalesce(p.fim, now())
        AND (_unidade IS NULL OR o.origin_id = _unidade))
  FROM apoio_modo_manual_periodo p JOIN apoio_laboratorio a ON a.id = p.apoio_id
  LEFT JOIN profiles p1 ON p1.id = p.ligado_por LEFT JOIN profiles p2 ON p2.id = p.desligado_por
  WHERE p.company_id = public.get_user_company_id(auth.uid()) AND (_apoio IS NULL OR p.apoio_id = _apoio)
    AND p.inicio::date <= _fim AND coalesce(p.fim, now())::date >= _ini
  ORDER BY p.inicio DESC;
END $$;

-- 2.6 Custo (financeiro)
CREATE OR REPLACE FUNCTION public.apoio_rel_custo(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(mes text, apoio text, exame text, exames bigint, custo_total numeric, custo_medio numeric, ficticio boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar('apoio.financeiro.ver');
  RETURN QUERY SELECT to_char(b.criado_em, 'YYYY-MM'), b.apoio_nome, b.exame_nome, count(*), sum(b.custo_previsto), round(avg(b.custo_previsto),2), bool_or(b.preco_ficticio)
  FROM apoio_rel__base(_ini, _fim, _apoio, _unidade) b WHERE b.status <> 'cancelado' GROUP BY 1,2,3 ORDER BY 1 DESC, 2, 3;
END $$;

-- 2.7 Margem (financeiro): valor cobrado = tabela do convênio do pedido
CREATE OR REPLACE FUNCTION public.apoio_rel_margem(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(exame text, apoio text, exames bigint, custo_medio numeric, cobrado_medio numeric, margem_media numeric, margem_pct numeric, sem_preco bigint, ficticio boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar('apoio.financeiro.ver');
  RETURN QUERY
  WITH x AS (
    SELECT b.*, (SELECT nullif(replace(ep->>'price', ',', '.'), '')::numeric FROM convenios c, jsonb_array_elements(CASE WHEN jsonb_typeof(c.exam_prices) = 'array' THEN c.exam_prices ELSE '[]'::jsonb END) ep
                 WHERE c.id = b.convenio_id AND ep->>'examId' = b.exame_id::text LIMIT 1) cobrado
    FROM apoio_rel__base(_ini, _fim, _apoio, _unidade) b WHERE b.status <> 'cancelado')
  SELECT x.exame_nome, x.apoio_nome, count(*), round(avg(x.custo_previsto),2), round(avg(x.cobrado),2),
    round(avg(x.cobrado - x.custo_previsto),2), round(100 * avg(x.cobrado - x.custo_previsto) / nullif(avg(x.cobrado),0), 1),
    count(*) FILTER (WHERE x.cobrado IS NULL), bool_or(x.preco_ficticio)
  FROM x GROUP BY 1,2 ORDER BY 6 NULLS LAST;
END $$;

-- 2.8 Qualificação
CREATE OR REPLACE FUNCTION public.apoio_rel_qualificacao(_ini date DEFAULT NULL, _fim date DEFAULT NULL, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL)
RETURNS TABLE(apoio text, documento text, numero text, validade date, dias_restantes int, situacao text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM apoio_rel__checar(NULL);
  RETURN QUERY
  WITH d AS (
    SELECT a.nome n, 'Licença sanitária'::text doc, a.licenca_sanitaria num, a.licenca_validade v FROM apoio_laboratorio a
      WHERE a.company_id = public.get_user_company_id(auth.uid()) AND (_apoio IS NULL OR a.id = _apoio)
    UNION ALL
    SELECT a.nome, c.tipo, c.numero, c.validade FROM apoio_certificacao c JOIN apoio_laboratorio a ON a.id = c.apoio_id
      WHERE c.company_id = public.get_user_company_id(auth.uid()) AND (_apoio IS NULL OR a.id = _apoio))
  SELECT d.n, d.doc, d.num, d.v, (d.v - current_date)::int,
    CASE WHEN d.v IS NULL THEN 'Sem validade' WHEN d.v < current_date THEN 'Vencida' WHEN d.v <= current_date + 60 THEN 'Vencendo' ELSE 'Válida' END
  FROM d ORDER BY d.v NULLS LAST;
END $$;

-- 2.9 Log de integração (admin) com senha mascarada
CREATE OR REPLACE FUNCTION public.apoio__mascarar(_t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(regexp_replace(regexp_replace(coalesce(_t,''),
    '(<[^>]*(senha|password|pwd)[^>]*>)[^<]*(</)', '\1****\3', 'gi'),
    '("(senha|password|pwd)"\s*:\s*")[^"]*(")', '\1****\3', 'gi'),
    '((senha|password|pwd)=)[^&\s]*', '\1****', 'gi');
$$;

CREATE OR REPLACE FUNCTION public.apoio_rel_log(_ini date, _fim date, _apoio uuid DEFAULT NULL, _unidade uuid DEFAULT NULL, _operacao text DEFAULT NULL, _so_erros boolean DEFAULT false)
RETURNS TABLE(id uuid, criado_em timestamptz, apoio text, operacao text, http_status int, duracao_ms int, erro text, requisicao text, resposta text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_company_manager(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores veem o log de integração' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT l.id, l.created_at, a.nome, l.operacao, l.http_status, l.duracao_ms, l.erro,
    apoio__mascarar(l.requisicao), apoio__mascarar(l.resposta)
  FROM apoio_chamada_log l LEFT JOIN apoio_laboratorio a ON a.id = l.apoio_id
  WHERE l.company_id = public.get_user_company_id(auth.uid()) AND l.created_at::date BETWEEN _ini AND _fim
    AND (_apoio IS NULL OR l.apoio_id = _apoio) AND (_operacao IS NULL OR l.operacao = _operacao)
    AND (NOT _so_erros OR l.erro IS NOT NULL OR coalesce(l.http_status,200) >= 400)
  ORDER BY l.created_at DESC LIMIT 1000;
END $$;

-- Reprocessar resultado (marca para a próxima rodada da integração)
CREATE OR REPLACE FUNCTION public.apoio_log_reprocessar(_log uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  IF NOT public.is_company_manager(auth.uid()) THEN RAISE EXCEPTION 'Somente administradores' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM apoio_chamada_log WHERE id = _log AND company_id = public.get_user_company_id(auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Registro não encontrado'; END IF;
  INSERT INTO apoio_chamada_log(company_id, apoio_id, operacao, requisicao, resposta)
  VALUES (l.company_id, l.apoio_id, 'reprocessar_solicitado', jsonb_build_object('log_origem', l.id, 'operacao', l.operacao, 'por', auth.uid())::text, 'Aguardando próxima rodada da integração');
  INSERT INTO apoio_auditoria(company_id, tabela, registro_id, acao, depois, usuario_id)
  VALUES (l.company_id, 'apoio_chamada_log', l.id::text, 'reprocessar', jsonb_build_object('operacao', l.operacao), auth.uid());
END $$;

GRANT EXECUTE ON FUNCTION public.apoio_rel_painel(date,date,uuid,uuid), public.apoio_rel_atrasos(date,date,uuid,uuid),
  public.apoio_rel_pendencias(date,date,uuid,uuid), public.apoio_rel_tat(date,date,uuid,uuid), public.apoio_rel_remessas(date,date,uuid,uuid),
  public.apoio_rel_modo_manual(date,date,uuid,uuid), public.apoio_rel_custo(date,date,uuid,uuid), public.apoio_rel_margem(date,date,uuid,uuid),
  public.apoio_rel_qualificacao(date,date,uuid,uuid), public.apoio_rel_log(date,date,uuid,uuid,text,boolean), public.apoio_log_reprocessar(uuid)
  TO authenticated;
REVOKE EXECUTE ON FUNCTION public.apoio_rel_painel(date,date,uuid,uuid), public.apoio_rel_atrasos(date,date,uuid,uuid),
  public.apoio_rel_pendencias(date,date,uuid,uuid), public.apoio_rel_tat(date,date,uuid,uuid), public.apoio_rel_remessas(date,date,uuid,uuid),
  public.apoio_rel_modo_manual(date,date,uuid,uuid), public.apoio_rel_custo(date,date,uuid,uuid), public.apoio_rel_margem(date,date,uuid,uuid),
  public.apoio_rel_qualificacao(date,date,uuid,uuid), public.apoio_rel_log(date,date,uuid,uuid,text,boolean), public.apoio_log_reprocessar(uuid)
  FROM anon, PUBLIC;

-- Agendamento: resumo diário às 8h (Brasília = 11h UTC) e rodada horária
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('apoio-alertas-resumo','apoio-alertas-hora');
SELECT cron.schedule('apoio-alertas-resumo', '0 11 * * *', $$SELECT public.apoio_alertas_rodar(true)$$);
SELECT cron.schedule('apoio-alertas-hora', '5 * * * *', $$SELECT public.apoio_alertas_rodar(false)$$);
