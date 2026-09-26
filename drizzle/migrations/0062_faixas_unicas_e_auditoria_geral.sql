-- 1) Faixas de temperatura: fonte única = Condições de transporte
ALTER TABLE public.triagem_condicao_transporte ADD COLUMN IF NOT EXISTS conservacao text;
ALTER TABLE public.triagem_condicao_transporte DROP CONSTRAINT IF EXISTS tct_conservacao_chk;
ALTER TABLE public.triagem_condicao_transporte ADD CONSTRAINT tct_conservacao_chk CHECK (conservacao IS NULL OR conservacao IN ('ambiente','refrigerado','congelado'));
UPDATE public.triagem_condicao_transporte t SET conservacao = x.k
FROM (SELECT DISTINCT ON (company_id, k) id, k FROM (
  SELECT id, company_id, CASE lower(unaccent_nome) WHEN 'ambiente' THEN 'ambiente' WHEN 'refrigerado' THEN 'refrigerado' WHEN 'congelado' THEN 'congelado' END k, created_at
  FROM (SELECT id, company_id, created_at, trim(nome) unaccent_nome FROM public.triagem_condicao_transporte) a) b
  WHERE k IS NOT NULL ORDER BY company_id, k, created_at) x
WHERE t.id = x.id AND t.conservacao IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tct_conservacao_uniq ON public.triagem_condicao_transporte(company_id, conservacao) WHERE conservacao IS NOT NULL;
COMMENT ON COLUMN public.triagem_condicao_transporte.conservacao IS 'Qual conservação do Apoio (tubo/saco) esta condição representa. Fonte única das faixas de temperatura.';
COMMENT ON COLUMN public.apoio_laboratorio.faixas_temperatura IS 'DEPRECATED: faixas agora vêm de triagem_condicao_transporte.conservacao (Condições de transporte). Mantido só como histórico.';

CREATE OR REPLACE FUNCTION public.apoio_faixas_conservacao(_company uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_object_agg(conservacao, jsonb_strip_nulls(jsonb_build_object('min', temp_min, 'max', temp_max, 'nome', nome, 'condicao_id', id))), '{}'::jsonb)
  FROM triagem_condicao_transporte WHERE company_id = _company AND conservacao IS NOT NULL AND ativo
$$;
REVOKE EXECUTE ON FUNCTION public.apoio_faixas_conservacao(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apoio_faixas_conservacao(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tct_protege_conservacao() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.conservacao IS NOT NULL THEN
    RAISE EXCEPTION 'Esta condição é usada pelo Apoio (%). Inative ou desvincule antes de excluir.', OLD.conservacao;
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_tct_protege ON public.triagem_condicao_transporte;
CREATE TRIGGER trg_tct_protege BEFORE DELETE ON public.triagem_condicao_transporte FOR EACH ROW EXECUTE FUNCTION public.tct_protege_conservacao();

CREATE OR REPLACE FUNCTION public.apoio_remessa_entrega(_remessa uuid, _entregue_a text, _entregue_em timestamp with time zone, _sacos jsonb DEFAULT NULL::jsonb, _forcar text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c uuid := public.apoio_remessa_checar(); r apoio_remessa%ROWTYPE; faixas jsonb; pend int; s jsonb; saida jsonb := '[]'::jsonb; t numeric; f jsonb; fora boolean; nc int := 0;
BEGIN
  IF length(trim(coalesce(_entregue_a,''))) = 0 THEN RAISE EXCEPTION 'Informe quem levou a remessa'; END IF;
  SELECT * INTO r FROM apoio_remessa WHERE id = _remessa AND company_id = c AND status <> 'cancelada';
  IF NOT FOUND THEN RAISE EXCEPTION 'Remessa não encontrada'; END IF;
  faixas := public.apoio_faixas_conservacao(c);
  SELECT count(*) INTO pend FROM apoio_recipiente WHERE remessa_id = r.id AND NOT cancelado AND (NOT separado OR coalesce(conservacao,'verificar') = 'verificar');
  IF pend > 0 AND length(trim(coalesce(_forcar,''))) < 5 THEN
    RAISE EXCEPTION 'Há % tubo(s) em "Verificar" ou não separado(s). Separe por temperatura ou force com justificativa.', pend;
  END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(coalesce(_sacos, '[]'::jsonb)) LOOP
    t := nullif(s->>'temperatura','')::numeric; f := faixas -> (s->>'conservacao');
    fora := t IS NOT NULL AND f IS NOT NULL AND ((f ? 'min' AND t < (f->>'min')::numeric) OR (f ? 'max' AND t > (f->>'max')::numeric));
    IF fora THEN nc := nc + 1; END IF;
    saida := saida || jsonb_build_array(s || jsonb_build_object('fora_da_faixa', fora, 'faixa', f));
  END LOOP;
  UPDATE apoio_remessa SET entregue_a = trim(_entregue_a), entregue_em = coalesce(_entregue_em, now()), entregue_registrado_por = auth.uid(),
    entrega_sacos = saida, entrega_forcada = CASE WHEN pend > 0 THEN trim(_forcar) ELSE NULL END WHERE id = r.id;
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (c, 'apoio_remessa', r.id, CASE WHEN nc > 0 THEN 'ENTREGA_NAO_CONFORMIDADE_TEMPERATURA' WHEN pend > 0 THEN 'ENTREGA_FORCADA' ELSE 'ENTREGA' END,
    jsonb_build_object('pendentes', pend), jsonb_build_object('sacos', saida, 'forcar', _forcar, 'nao_conformidades', nc), auth.uid());
  RETURN jsonb_build_object('ok', true, 'nao_conformidades', nc);
END $function$;

-- 2) Auditoria de permissões (antes não era gravada)
DROP TRIGGER IF EXISTS aud_access_profiles ON public.access_profiles;
CREATE TRIGGER aud_access_profiles AFTER INSERT OR UPDATE OR DELETE ON public.access_profiles FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();
DROP TRIGGER IF EXISTS aud_sector_users ON public.sector_users;
CREATE TRIGGER aud_sector_users AFTER INSERT OR UPDATE OR DELETE ON public.sector_users FOR EACH ROW EXECUTE FUNCTION public.apoio_auditar();

CREATE OR REPLACE FUNCTION public.auditar_profiles_acesso() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_admin IS DISTINCT FROM NEW.is_admin OR OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
    INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
    VALUES (NEW.company_id, 'profiles', NEW.id::text, 'acesso_usuario',
      jsonb_build_object('nome', OLD.full_name, 'role', OLD.role, 'is_admin', OLD.is_admin, 'is_active', OLD.is_active),
      jsonb_build_object('nome', NEW.full_name, 'role', NEW.role, 'is_admin', NEW.is_admin, 'is_active', NEW.is_active), auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aud_profiles_acesso ON public.profiles;
CREATE TRIGGER aud_profiles_acesso AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auditar_profiles_acesso();

CREATE OR REPLACE FUNCTION public.auditar_user_roles() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record := coalesce(NEW, OLD); c uuid;
BEGIN
  c := public.get_user_company_id(r.user_id);
  IF c IS NOT NULL THEN
    INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
    VALUES (c, 'user_roles', r.user_id::text, lower(TG_OP),
      CASE WHEN TG_OP <> 'INSERT' THEN jsonb_build_object('role', OLD.role, 'user_id', OLD.user_id, 'nome', (SELECT full_name FROM profiles WHERE id = OLD.user_id)) END,
      CASE WHEN TG_OP <> 'DELETE' THEN jsonb_build_object('role', NEW.role, 'user_id', NEW.user_id, 'nome', (SELECT full_name FROM profiles WHERE id = NEW.user_id)) END, auth.uid());
  END IF;
  RETURN r;
END $$;
DROP TRIGGER IF EXISTS aud_user_roles ON public.user_roles;
CREATE TRIGGER aud_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.auditar_user_roles();

-- 3) Lista unificada de auditoria
CREATE OR REPLACE FUNCTION public.auditoria_lista(_modulo text DEFAULT NULL, _usuario uuid DEFAULT NULL, _de timestamptz DEFAULT NULL, _ate timestamptz DEFAULT NULL, _limite int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE(id text, fonte text, modulo text, tabela text, acao text, usuario_id uuid, usuario_nome text, created_at timestamptz, antes jsonb, depois jsonb, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (SELECT public.get_user_company_id(auth.uid()) cid),
  todos AS (
    SELECT a.id::text id, 'apoio_auditoria' fonte,
      CASE WHEN a.tabela IN ('origins','triagem_condicao_transporte','triagem_rota','lab_motivo_coleta','coleta_horario') THEN 'triagem'
           WHEN a.tabela IN ('access_profiles','profiles','user_roles','sector_users') THEN 'permissoes'
           WHEN a.tabela LIKE 'apoio_%' OR a.tabela IN ('companies','exam_laudos') OR a.acao LIKE 'AJUSTE_LAUDO%' THEN 'apoio'
           ELSE 'cadastros' END modulo,
      a.tabela, a.acao, a.usuario_id, a.created_at, a.antes, a.depois
    FROM apoio_auditoria a, c WHERE a.company_id = c.cid
    UNION ALL
    SELECT h.id::text, 'apoio_pedido_exame_historico', 'apoio', 'apoio_pedido_exame', 'status', h.usuario_id, h.created_at,
      jsonb_build_object('status', h.status_de), jsonb_build_object('status', h.status_para, 'origem', h.origem, 'motivo', h.motivo)
    FROM apoio_pedido_exame_historico h, c WHERE h.company_id = c.cid
    UNION ALL
    SELECT l.id::text, 'apoio_chamada_log', 'apoio_integracao', 'apoio_chamada_log', l.operacao, l.usuario_id, l.created_at, NULL,
      jsonb_strip_nulls(jsonb_build_object('origem', coalesce(l.origem,'rotina'), 'http_status', l.http_status, 'erro', l.erro, 'duracao_ms', l.duracao_ms, 'observacao', l.observacao))
    FROM apoio_chamada_log l, c WHERE l.company_id = c.cid
    UNION ALL
    SELECT s.id::text, 'support_card_audit', 'suporte', 'support_cards', s.action, s.actor_id, s.created_at,
      jsonb_strip_nulls(jsonb_build_object('campo', s.field_label, 'valor', s.old_value)), jsonb_strip_nulls(jsonb_build_object('campo', s.field_label, 'valor', s.new_value))
    FROM support_card_audit s, c WHERE s.company_id = c.cid AND public.can_view_support_board(s.board_id)
    UNION ALL
    SELECT e.id::text, 'external_access_logs', 'acesso_externo', 'external_accesses', e.action, NULL, e.created_at, NULL,
      jsonb_strip_nulls(jsonb_build_object('codigo', e.access_code, 'tipo', e.access_type, 'sucesso', e.success, 'ip', e.ip_address))
    FROM external_access_logs e, c WHERE e.company_id = c.cid
    UNION ALL
    SELECT b.id::text, 'bed_status_log', 'leitos', 'beds', 'status', b.changed_by, b.changed_at, jsonb_build_object('status', b.from_status), jsonb_strip_nulls(jsonb_build_object('status', b.to_status, 'obs', b.note))
    FROM bed_status_log b, c WHERE b.company_id = c.cid
    UNION ALL
    SELECT i.id::text, 'inpatient_bed_log', 'leitos', 'inpatient_beds', 'status', i.changed_by, i.changed_at, jsonb_build_object('status', i.from_status), jsonb_strip_nulls(jsonb_build_object('status', i.to_status, 'obs', i.note))
    FROM inpatient_bed_log i, c WHERE i.company_id = c.cid
  ),
  f AS (
    SELECT * FROM todos
    WHERE (_modulo IS NULL OR modulo = _modulo) AND (_usuario IS NULL OR usuario_id = _usuario)
      AND (_de IS NULL OR created_at >= _de) AND (_ate IS NULL OR created_at < _ate)
  )
  SELECT f.id, f.fonte, f.modulo, f.tabela, f.acao, f.usuario_id, p.full_name, f.created_at, f.antes, f.depois, count(*) OVER ()
  FROM f LEFT JOIN profiles p ON p.id = f.usuario_id
  ORDER BY f.created_at DESC
  LIMIT least(greatest(_limite,1),200) OFFSET greatest(_offset,0)
$$;
REVOKE EXECUTE ON FUNCTION public.auditoria_lista(text, uuid, timestamptz, timestamptz, int, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.auditoria_lista(text, uuid, timestamptz, timestamptz, int, int) TO authenticated;