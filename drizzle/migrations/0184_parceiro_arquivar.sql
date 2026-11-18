-- API de Parceiros: excluir vira arquivar (retenção de 5 anos). Nada é apagado.
ALTER TABLE public.api_partners
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS restored_by uuid;
COMMENT ON COLUMN public.api_partners.archived_at IS 'Parceiro arquivado (substitui a exclusão). Arquivado nunca acessa a API. Só muda via parceiro_arquivar / parceiro_restaurar.';
COMMENT ON COLUMN public.api_partners.restored_at IS 'Última restauração (Super Admin). Restaurar volta como Pendente e sem credencial ativa.';

-- Pedidos e credenciais nunca perdem o vínculo com o parceiro: restrição, não SET NULL/cascade
ALTER TABLE public.partner_orders DROP CONSTRAINT IF EXISTS partner_orders_partner_id_fkey;
ALTER TABLE public.partner_orders
  ADD CONSTRAINT partner_orders_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.api_partners(id) ON DELETE NO ACTION;
ALTER TABLE public.integration_oauth_clients DROP CONSTRAINT IF EXISTS integration_oauth_clients_partner_id_fkey;
ALTER TABLE public.integration_oauth_clients
  ADD CONSTRAINT integration_oauth_clients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.api_partners(id) ON DELETE NO ACTION;

-- Sem DELETE físico pelo navegador: políticas sem DELETE e privilégio revogado
DROP POLICY IF EXISTS "Company members manage their api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Super admins manage all api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Company members read their api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Company members insert their api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Company members update their api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Super admins read all api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Super admins insert api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Super admins update all api partners" ON public.api_partners;
CREATE POLICY "Company members read their api partners" ON public.api_partners
  FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company members insert their api partners" ON public.api_partners
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company members update their api partners" ON public.api_partners
  FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Super admins read all api partners" ON public.api_partners
  FOR SELECT TO authenticated USING (private.is_super_admin());
CREATE POLICY "Super admins insert api partners" ON public.api_partners
  FOR INSERT TO authenticated WITH CHECK (private.is_super_admin());
CREATE POLICY "Super admins update all api partners" ON public.api_partners
  FOR UPDATE TO authenticated USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

REVOKE DELETE, TRUNCATE ON public.api_partners FROM PUBLIC, anon, authenticated;
REVOKE DELETE, TRUNCATE ON public.partner_orders FROM PUBLIC, anon, authenticated;

-- Arquivamento/restauração só pelas funções abaixo; parceiro arquivado não é editado por fora
CREATE OR REPLACE FUNCTION public.api_partners_arquivo_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.parceiro_arquivo', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.archived_by IS DISTINCT FROM OLD.archived_by
     OR NEW.restored_at IS DISTINCT FROM OLD.restored_at
     OR NEW.restored_by IS DISTINCT FROM OLD.restored_by THEN
    RAISE EXCEPTION 'Use Arquivar/Restaurar para mudar o arquivamento do parceiro' USING ERRCODE = '42501';
  END IF;
  IF OLD.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Parceiro arquivado: restaure antes de alterar' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.api_partners_arquivo_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS api_partners_arquivo_guard_trg ON public.api_partners;
CREATE TRIGGER api_partners_arquivo_guard_trg
  BEFORE UPDATE ON public.api_partners
  FOR EACH ROW EXECUTE FUNCTION public.api_partners_arquivo_guard();

-- Arquivar: some da lista, perde a autorização e todas as credenciais são desligadas (sem apagar)
CREATE OR REPLACE FUNCTION public.parceiro_arquivar(_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_partner record;
  v_now timestamptz := now();
  v_lista jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida' USING ERRCODE = '42501';
  END IF;
  SELECT id, company_id, credentials, archived_at INTO v_partner
    FROM public.api_partners WHERE id = _partner_id FOR UPDATE;
  IF v_partner.id IS NULL
     OR NOT (private.is_super_admin()
             OR (v_partner.company_id = public.get_user_company_id(v_uid) AND public.is_company_manager(v_uid))) THEN
    RAISE EXCEPTION 'Parceiro não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_partner.archived_at IS NOT NULL THEN
    RETURN;
  END IF;
  v_lista := CASE WHEN jsonb_typeof(v_partner.credentials) = 'array' THEN v_partner.credentials ELSE '[]'::jsonb END;

  UPDATE public.integration_oauth_clients o
     SET is_active = false, revoked_at = coalesce(o.revoked_at, v_now)
   WHERE o.company_id = v_partner.company_id
     AND (o.partner_id = _partner_id
          OR o.client_id IN (SELECT cr->>'clientId' FROM jsonb_array_elements(v_lista) cr))
     AND (o.is_active OR o.revoked_at IS NULL);

  PERFORM set_config('app.parceiro_arquivo', 'on', true);
  UPDATE public.api_partners
     SET archived_at = v_now,
         archived_by = v_uid,
         api_authorized = false,
         updated_at = v_now,
         credentials = (
           SELECT coalesce(jsonb_agg(
                    CASE WHEN nullif(x.cr->>'revokedAt', '') IS NULL THEN x.cr || jsonb_build_object('revokedAt', v_now) ELSE x.cr END
                    ORDER BY x.ord), '[]'::jsonb)
             FROM jsonb_array_elements(v_lista) WITH ORDINALITY AS x(cr, ord))
   WHERE id = _partner_id;
  PERFORM set_config('app.parceiro_arquivo', '', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.parceiro_arquivar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parceiro_arquivar(uuid) TO authenticated, service_role;

-- Restaurar: só Super Admin; volta Pendente e SEM credencial ativa (as antigas nunca voltam)
CREATE OR REPLACE FUNCTION public.parceiro_restaurar(_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_partner record;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL OR NOT private.is_super_admin() THEN
    RAISE EXCEPTION 'Somente o Super Admin pode restaurar parceiros' USING ERRCODE = '42501';
  END IF;
  SELECT id, company_id, archived_at INTO v_partner
    FROM public.api_partners WHERE id = _partner_id FOR UPDATE;
  IF v_partner.id IS NULL THEN
    RAISE EXCEPTION 'Parceiro não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_partner.archived_at IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.integration_oauth_clients o
     SET is_active = false, revoked_at = coalesce(o.revoked_at, v_now)
   WHERE o.partner_id = _partner_id AND (o.is_active OR o.revoked_at IS NULL);

  PERFORM set_config('app.parceiro_arquivo', 'on', true);
  UPDATE public.api_partners
     SET archived_at = NULL,
         archived_by = NULL,
         restored_at = v_now,
         restored_by = v_uid,
         api_authorized = false,
         status = 'active',
         updated_at = v_now
   WHERE id = _partner_id;
  PERFORM set_config('app.parceiro_arquivo', '', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.parceiro_restaurar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parceiro_restaurar(uuid) TO authenticated, service_role;

-- Regenerar recusa parceiro arquivado (restaurar antes)
CREATE OR REPLACE FUNCTION public.parceiro_credencial_regenerar(
  _partner_id uuid,
  _company_id uuid,
  _client_id text,
  _secret_hash text,
  _name text,
  _scopes text[],
  _created_by uuid,
  _method text DEFAULT 'oauth2'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner record;
  v_id uuid;
  v_now timestamptz := now();
  v_creds jsonb;
  v_lista jsonb;
BEGIN
  SELECT id, company_id, credentials, archived_at INTO v_partner
    FROM public.api_partners WHERE id = _partner_id FOR UPDATE;
  IF v_partner.id IS NULL OR v_partner.company_id <> _company_id THEN
    RAISE EXCEPTION 'Parceiro não encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_partner.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Parceiro arquivado' USING ERRCODE = 'P0003';
  END IF;
  v_lista := CASE WHEN jsonb_typeof(v_partner.credentials) = 'array' THEN v_partner.credentials ELSE '[]'::jsonb END;

  UPDATE public.integration_oauth_clients o
     SET is_active = false, revoked_at = coalesce(o.revoked_at, v_now)
   WHERE o.company_id = _company_id
     AND (o.partner_id = _partner_id
          OR o.client_id IN (SELECT cr->>'clientId' FROM jsonb_array_elements(v_lista) cr))
     AND (o.is_active OR o.revoked_at IS NULL);

  INSERT INTO public.integration_oauth_clients
    (company_id, name, client_id, secret_hash, scopes, created_by, is_active, partner_id, uso)
  VALUES
    (_company_id, _name, _client_id, _secret_hash, _scopes, _created_by, true, _partner_id, 'parceiro')
  RETURNING id INTO v_id;

  SELECT coalesce(jsonb_agg(
           CASE WHEN nullif(x.cr->>'revokedAt', '') IS NULL THEN x.cr || jsonb_build_object('revokedAt', v_now) ELSE x.cr END
           ORDER BY x.ord), '[]'::jsonb)
    INTO v_creds
    FROM jsonb_array_elements(v_lista) WITH ORDINALITY AS x(cr, ord);

  UPDATE public.api_partners
     SET auth_method = coalesce(nullif(_method, ''), 'oauth2'),
         credentials = jsonb_build_array(jsonb_build_object(
           'method', coalesce(nullif(_method, ''), 'oauth2'),
           'masked', left(_client_id, 8) || '••••••' || right(_client_id, 4),
           'clientId', _client_id,
           'createdAt', v_now,
           'revokedAt', NULL
         )) || v_creds
   WHERE id = _partner_id;

  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.parceiro_credencial_regenerar(uuid, uuid, text, text, text, text[], uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.parceiro_credencial_regenerar(uuid, uuid, text, text, text, text[], uuid, text) TO service_role;