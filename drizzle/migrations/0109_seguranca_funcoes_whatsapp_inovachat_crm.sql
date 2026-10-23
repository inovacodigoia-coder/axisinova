-- Seguranca do bloco WhatsApp/InovaChat/CRM: fecha EXECUTE para PUBLIC/anon e endurece
-- funcoes que recebem empresa ou usuario como parametro.
-- Guarda padrao: passa sem JWT (chamada interna/cron), com service_role (Edge Functions),
-- ou quando a empresa/usuario do parametro e o mesmo de quem chama (auth.uid()).

-- ============ 1) Funcoes endurecidas (empresa ou usuario como parametro) ============

CREATE OR REPLACE FUNCTION public.inovachat_ativo(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR _company = public.get_user_company_id(auth.uid()))
    AND coalesce((SELECT inovachat_habilitado AND whatsapp_habilitado FROM companies WHERE id = _company), false)
$function$;

CREATE OR REPLACE FUNCTION public.crm_ativo(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR _company = public.get_user_company_id(auth.uid()))
    AND coalesce((SELECT crm_habilitado FROM companies WHERE id = _company), false) AND public.inovachat_ativo(_company)
$function$;

CREATE OR REPLACE FUNCTION public.inovachat_horario_vigente(_company uuid, _setor text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE WHEN auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR _company = public.get_user_company_id(auth.uid()) THEN coalesce(
    (SELECT jsonb_build_object('dias', dias, 'feriados', feriados) FROM inovachat_horario WHERE company_id = _company AND _setor IS NOT NULL AND setor_id = _setor AND ativo),
    (SELECT jsonb_build_object('dias', dias, 'feriados', feriados) FROM inovachat_horario WHERE company_id = _company AND setor_id IS NULL),
    jsonb_build_object('dias', '[{"d":1,"a":true,"i":"08:00","f":"18:00"},{"d":2,"a":true,"i":"08:00","f":"18:00"},{"d":3,"a":true,"i":"08:00","f":"18:00"},{"d":4,"a":true,"i":"08:00","f":"18:00"},{"d":5,"a":true,"i":"08:00","f":"18:00"},{"d":6,"a":false,"i":"08:00","f":"12:00"},{"d":0,"a":false,"i":"08:00","f":"12:00"}]'::jsonb, 'feriados', '[]'::jsonb)) END
$function$;

CREATE OR REPLACE FUNCTION public.inovachat_horario_aberto(_company uuid, _setor text, _ts timestamp with time zone)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE h jsonb; v_local timestamp := _ts AT TIME ZONE 'America/Fortaleza'; e jsonb;
BEGIN
  IF NOT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR _company = public.get_user_company_id(auth.uid())) THEN RETURN false; END IF;
  h := inovachat_horario_vigente(_company, _setor);
  IF h IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(h->'feriados') f WHERE f->>'data' = to_char(v_local::date, 'YYYY-MM-DD')) THEN RETURN false; END IF;
  SELECT x INTO e FROM jsonb_array_elements(h->'dias') x WHERE (x->>'d')::int = extract(dow FROM v_local)::int LIMIT 1;
  IF e IS NULL OR NOT coalesce((e->>'a')::boolean, false) THEN RETURN false; END IF;
  RETURN v_local::time >= (e->>'i')::time AND v_local::time < (e->>'f')::time;
END $function$;

CREATE OR REPLACE FUNCTION public.whatsapp_render_links(p_texto text, p_company uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE c record; v_emp text; r text := coalesce(p_texto,''); k text; v text;
BEGIN
  IF NOT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR p_company = public.get_user_company_id(auth.uid())) THEN RETURN r; END IF;
  SELECT * INTO c FROM whatsapp_config_empresa WHERE company_id = p_company;
  SELECT coalesce(nullif(btrim(nome_fantasia),''), name) INTO v_emp FROM companies WHERE id = p_company;
  r := replace(r, '{empresa}', coalesce(v_emp,''));
  FOREACH k IN ARRAY ARRAY['link_google','link_indicacao','link_cadastro','link_questionario'] LOOP
    v := CASE k WHEN 'link_google' THEN c.link_google WHEN 'link_indicacao' THEN c.link_indicacao
                WHEN 'link_cadastro' THEN c.link_cadastro ELSE c.link_questionario END;
    IF coalesce(btrim(v),'') = '' THEN
      r := regexp_replace(r, '\s*[^.!?]*\{' || k || '\}[^.!?]*[.!?]?', '', 'g');
    ELSE
      r := replace(r, '{' || k || '}', btrim(v));
    END IF;
  END LOOP;
  RETURN r;
END $function$;

CREATE OR REPLACE FUNCTION public.whatsapp_automacao_link_faltando(p_company uuid, p_texto text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
  SELECT CASE WHEN NOT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR p_company = public.get_user_company_id(auth.uid())) THEN NULL
    ELSE CASE
      WHEN position('{link_google}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_google),'') = '' THEN 'link_google'
      WHEN position('{link_indicacao}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_indicacao),'') = '' THEN 'link_indicacao'
      WHEN position('{link_cadastro}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_cadastro),'') = '' THEN 'link_cadastro'
      WHEN position('{link_questionario}' in coalesce(p_texto,'')) > 0 AND coalesce(btrim(c.link_questionario),'') = '' THEN 'link_questionario'
    END END
  FROM (SELECT 1) x LEFT JOIN whatsapp_config_empresa c ON c.company_id = p_company
$function$;

CREATE OR REPLACE FUNCTION public.inovachat_nome_usuario(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT CASE WHEN auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR _user = auth.uid()
    OR (SELECT p2.company_id FROM public.profiles p2 WHERE p2.id = _user) = public.get_user_company_id(auth.uid())
    THEN coalesce(nullif(trim(full_name),''), 'Usuário') END
  FROM public.profiles WHERE id = _user
$function$;

CREATE OR REPLACE FUNCTION public.inovachat_usuario_tem(_user uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT _user IS NOT NULL
    AND (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR _user = auth.uid()
         OR public.get_user_company_id(_user) = public.get_user_company_id(auth.uid()))
    AND (public.is_company_manager(_user) OR EXISTS (
      SELECT 1 FROM public.sector_users su
      JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
      JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
      WHERE su.user_id = _user
        AND ap.company_id = public.get_user_company_id(_user)
        AND coalesce(ap.permissions->'inovachat','[]'::jsonb) ? _perm))
$function$;

CREATE OR REPLACE FUNCTION public.inovachat_pode_ver_u(_user uuid, _company uuid, _status text, _resp uuid, _setor text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT (auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' OR _user = auth.uid()
          OR public.get_user_company_id(_user) = public.get_user_company_id(auth.uid()))
    AND _company = public.get_user_company_id(_user)
    AND public.inovachat_ativo(_company)
    AND public.inovachat_usuario_tem(_user, 'inovachat.visualizar')
    AND (public.inovachat_usuario_tem(_user, 'inovachat.gerenciar')
         OR _resp = _user
         OR (_status = 'na_fila' AND (_setor IS NULL OR EXISTS (
              SELECT 1 FROM public.sector_users su WHERE su.user_id = _user AND su.sector_id = _setor))))
$function$;

-- ============ 2) Funcoes de gatilho: sem EXECUTE para ninguem via API ============

REVOKE EXECUTE ON FUNCTION public.inovachat_ligado_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacoes_aud_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacoes_liberacao_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacoes_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.whatsapp_solicitacao_forcar() FROM PUBLIC, anon, authenticated;

-- ============ 3) Demais funcoes do bloco: so authenticated e service_role ============

REVOKE EXECUTE ON FUNCTION public.crm_ativo(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_normalizar(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_palavra_quente(text, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_pode_ver(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_tem_permissao(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_assumir(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_atendentes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_ativo(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_finalizar(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_fora_horario_padrao() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_horario_aberto(uuid, text, timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_horario_texto(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_horario_vigente(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_nome_usuario(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_nomes(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_optout_definir(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_optout_estado(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_pode_ver(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_pode_ver(uuid, text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_pode_ver_u(uuid, uuid, text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_reabrir(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_tem_permissao(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_transferir(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.inovachat_usuario_tem(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacao_link_faltando(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacao_padrao(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacao_prioridade(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_automacao_restaurar(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_cabecalho(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_ciclo_config(boolean, smallint, smallint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_limpar_nome(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_modelo_padrao(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_render_links(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_render_modelo(text, text, text, boolean, text, timestamp with time zone) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_render_modelo(text, text, text, boolean, text, timestamp with time zone, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_resposta_padrao(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_tel_canonico(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_tem_permissao(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.whatsapp_valor_numero() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.crm_ativo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_normalizar(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_palavra_quente(text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_pode_ver(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_tem_permissao(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_assumir(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_atendentes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_ativo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_finalizar(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_fora_horario_padrao() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_horario_aberto(uuid, text, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_horario_texto(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_horario_vigente(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_nome_usuario(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_nomes(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_optout_definir(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_optout_estado(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_pode_ver(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_pode_ver(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_pode_ver_u(uuid, uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_reabrir(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_tem_permissao(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_transferir(uuid, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inovachat_usuario_tem(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_automacao_link_faltando(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_automacao_padrao(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_automacao_prioridade(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_automacao_restaurar(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_cabecalho(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_ciclo_config(boolean, smallint, smallint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_limpar_nome(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_modelo_padrao(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_render_links(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_render_modelo(text, text, text, boolean, text, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_render_modelo(text, text, text, boolean, text, timestamp with time zone, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_resposta_padrao(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_tel_canonico(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_tem_permissao(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.whatsapp_valor_numero() TO authenticated, service_role;