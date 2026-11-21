-- Etapa 4 — parceiros: pedidos imutáveis, segredo oculto e edição só por quem tem permissão.
-- Permissão usada: módulo "Portais Externos" (portals) via perm_modulo, que já inclui o gestor da empresa.
-- Nenhum pedido ou parceiro existente é alterado; só colunas novas (vazias) e regras de acesso.
-- Reversão: /mnt/documents/etapa-4-reversao.sql (aplicar como nova migração).

-- ===== 1. partner_orders =====
ALTER TABLE public.partner_orders
  ADD COLUMN IF NOT EXISTS processado_por uuid,
  ADD COLUMN IF NOT EXISTS processado_em timestamptz,
  ADD COLUMN IF NOT EXISTS situacao_alterada_por uuid,
  ADD COLUMN IF NOT EXISTS situacao_alterada_em timestamptz;
COMMENT ON COLUMN public.partner_orders.processado_por IS 'Quem criou o atendimento a partir do pedido (gravado pelo gatilho partner_orders_guarda).';
COMMENT ON COLUMN public.partner_orders.situacao_alterada_por IS 'Quem fez a última mudança de situação (gravado pelo gatilho partner_orders_guarda).';

CREATE OR REPLACE FUNCTION public.partner_orders_guarda()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_servidor boolean := auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role';
  v_de text := coalesce(OLD.status, 'received');
  v_para text := coalesce(NEW.status, 'received');
BEGIN
  -- Dados recebidos do parceiro nunca mudam, para ninguém.
  IF NEW.payload IS DISTINCT FROM OLD.payload
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.protocolo_parceiro IS DISTINCT FROM OLD.protocolo_parceiro
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Os dados recebidos do parceiro não podem ser alterados' USING ERRCODE = '42501';
  END IF;

  IF NOT v_servidor THEN
    IF v_de <> v_para AND NOT (
         (v_de = 'received'   AND v_para IN ('processing', 'processed', 'error'))
      OR (v_de = 'processing' AND v_para IN ('processed', 'error', 'received'))
      OR (v_de = 'error'      AND v_para = 'received')) THEN
      RAISE EXCEPTION 'Mudança de situação do pedido não permitida: de % para %', v_de, v_para USING ERRCODE = '42501';
    END IF;
    IF v_para NOT IN ('received', 'processing', 'processed', 'error') THEN
      RAISE EXCEPTION 'Situação de pedido inválida: %', v_para USING ERRCODE = '22023';
    END IF;
    IF NEW.attendance_order_id IS DISTINCT FROM OLD.attendance_order_id THEN
      IF NOT (v_para = 'processed' AND v_de <> 'processed' AND OLD.attendance_order_id IS NULL AND NEW.attendance_order_id IS NOT NULL) THEN
        RAISE EXCEPTION 'O atendimento só é vinculado ao processar o pedido' USING ERRCODE = '42501';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.attendance_orders ao WHERE ao.id = NEW.attendance_order_id AND ao.company_id = OLD.company_id) THEN
        RAISE EXCEPTION 'Atendimento não encontrado nesta empresa' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF v_de <> v_para THEN
    NEW.situacao_alterada_por := auth.uid();
    NEW.situacao_alterada_em := now();
    IF v_para = 'processed' THEN
      NEW.processado_por := auth.uid();
      NEW.processado_em := now();
    END IF;
  ELSE
    NEW.situacao_alterada_por := OLD.situacao_alterada_por;
    NEW.situacao_alterada_em := OLD.situacao_alterada_em;
  END IF;
  IF NOT (v_de <> v_para AND v_para = 'processed') THEN
    NEW.processado_por := OLD.processado_por;
    NEW.processado_em := OLD.processado_em;
  END IF;
  RETURN NEW;
END $function$;
REVOKE EXECUTE ON FUNCTION public.partner_orders_guarda() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS partner_orders_guarda_trg ON public.partner_orders;
CREATE TRIGGER partner_orders_guarda_trg BEFORE UPDATE ON public.partner_orders
  FOR EACH ROW EXECUTE FUNCTION public.partner_orders_guarda();

REVOKE ALL ON public.partner_orders FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.partner_orders FROM authenticated;
GRANT SELECT ON public.partner_orders TO authenticated;
GRANT UPDATE (status, error, attendance_order_id) ON public.partner_orders TO authenticated;
GRANT ALL ON public.partner_orders TO service_role;

DROP POLICY IF EXISTS "Company members update their partner orders" ON public.partner_orders;
DROP POLICY IF EXISTS "Gestão de parceiros atualiza pedidos" ON public.partner_orders;
CREATE POLICY "Gestão de parceiros atualiza pedidos" ON public.partner_orders FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.perm_modulo('portals', 'edit'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.perm_modulo('portals', 'edit'));

-- ===== 2. integration_oauth_clients: secret_hash fora do alcance do navegador =====
REVOKE ALL ON public.integration_oauth_clients FROM anon;
REVOKE ALL ON public.integration_oauth_clients FROM authenticated;
GRANT SELECT (id, company_id, name, client_id, scopes, is_active, created_by, created_at, last_used_at, revoked_at, partner_id, uso)
  ON public.integration_oauth_clients TO authenticated;
GRANT UPDATE (is_active, revoked_at) ON public.integration_oauth_clients TO authenticated;
GRANT DELETE ON public.integration_oauth_clients TO authenticated;
GRANT ALL ON public.integration_oauth_clients TO service_role;

DROP POLICY IF EXISTS "oauth_clients_select_own_company" ON public.integration_oauth_clients;
DROP POLICY IF EXISTS "oauth_clients_select_permitidos" ON public.integration_oauth_clients;
CREATE POLICY "oauth_clients_select_permitidos" ON public.integration_oauth_clients FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
         AND (public.perm_modulo('portals', 'view')
              OR (coalesce(uso, 'instrumento') <> 'parceiro' AND public.perm_modulo('lab_registers', 'view'))));

-- ===== 3. api_partners: cadastro e edição só com permissão; credenciais e arquivamento só pelo servidor =====
CREATE OR REPLACE FUNCTION public.api_partners_insercao_guarda()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lista jsonb := CASE WHEN jsonb_typeof(NEW.credentials) = 'array' THEN NEW.credentials ELSE '[]'::jsonb END;
  v_cid text;
  v_cli record;
BEGIN
  IF auth.jwt() IS NULL OR (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.archived_at := NULL; NEW.archived_by := NULL; NEW.restored_at := NULL; NEW.restored_by := NULL;
  IF jsonb_array_length(v_lista) > 1 THEN
    RAISE EXCEPTION 'Cadastre o parceiro com uma única credencial' USING ERRCODE = '42501';
  END IF;
  IF jsonb_array_length(v_lista) = 0 THEN
    NEW.credentials := '[]'::jsonb;
    RETURN NEW;
  END IF;
  -- A credencial precisa ter acabado de ser gerada pelo servidor para esta empresa, por este usuário, e ainda sem parceiro.
  v_cid := v_lista -> 0 ->> 'clientId';
  SELECT o.client_id, o.created_at INTO v_cli
    FROM public.integration_oauth_clients o
   WHERE o.client_id = v_cid AND o.company_id = NEW.company_id AND o.partner_id IS NULL
     AND o.uso = 'parceiro' AND o.is_active AND o.revoked_at IS NULL AND o.created_by = auth.uid();
  IF v_cli.client_id IS NULL THEN
    RAISE EXCEPTION 'Credencial inválida para este cadastro: gere uma nova credencial' USING ERRCODE = '42501';
  END IF;
  NEW.credentials := jsonb_build_array(jsonb_build_object(
    'method', 'oauth2',
    'masked', left(v_cli.client_id, 8) || '••••••' || right(v_cli.client_id, 4),
    'clientId', v_cli.client_id,
    'createdAt', v_cli.created_at,
    'revokedAt', NULL));
  RETURN NEW;
END $function$;
REVOKE EXECUTE ON FUNCTION public.api_partners_insercao_guarda() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS api_partners_insercao_guarda_trg ON public.api_partners;
CREATE TRIGGER api_partners_insercao_guarda_trg BEFORE INSERT ON public.api_partners
  FOR EACH ROW EXECUTE FUNCTION public.api_partners_insercao_guarda();

REVOKE ALL ON public.api_partners FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.api_partners FROM authenticated;
GRANT SELECT ON public.api_partners TO authenticated;
GRANT INSERT (company_id, type, name, document, contact_name, contact_email, contact_phone, notes, auth_method, api_authorized, status, credentials)
  ON public.api_partners TO authenticated;
GRANT UPDATE (type, name, document, contact_name, contact_email, contact_phone, notes, auth_method, api_authorized, status)
  ON public.api_partners TO authenticated;
GRANT ALL ON public.api_partners TO service_role;

DROP POLICY IF EXISTS "Company members insert their api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Company members update their api partners" ON public.api_partners;
DROP POLICY IF EXISTS "Gestão de parceiros cadastra parceiros" ON public.api_partners;
DROP POLICY IF EXISTS "Gestão de parceiros edita parceiros" ON public.api_partners;
CREATE POLICY "Gestão de parceiros cadastra parceiros" ON public.api_partners FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.perm_modulo('portals', 'create'));
CREATE POLICY "Gestão de parceiros edita parceiros" ON public.api_partners FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.perm_modulo('portals', 'edit'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.perm_modulo('portals', 'edit'));
