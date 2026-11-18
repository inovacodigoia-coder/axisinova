ALTER TABLE public.integration_oauth_clients
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.api_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uso text NOT NULL DEFAULT 'instrumento';

ALTER TABLE public.integration_oauth_clients
  DROP CONSTRAINT IF EXISTS integration_oauth_clients_uso_check;
ALTER TABLE public.integration_oauth_clients
  ADD CONSTRAINT integration_oauth_clients_uso_check CHECK (uso IN ('instrumento', 'parceiro'));

CREATE INDEX IF NOT EXISTS integration_oauth_clients_partner_idx ON public.integration_oauth_clients(partner_id);

COMMENT ON COLUMN public.integration_oauth_clients.partner_id IS 'Parceiro dono da credencial (API de Parceiros). Nulo = credencial de equipamento.';
COMMENT ON COLUMN public.integration_oauth_clients.uso IS 'instrumento | parceiro. Credencial de parceiro só funciona com parceiro vinculado ativo, autorizado e módulo liberado.';

-- Backfill: vínculo pelo cadastro do parceiro (credentials JSON)
UPDATE public.integration_oauth_clients o
   SET partner_id = p.id, uso = 'parceiro'
  FROM public.api_partners p,
       jsonb_array_elements(CASE WHEN jsonb_typeof(p.credentials) = 'array' THEN p.credentials ELSE '[]'::jsonb END) cr
 WHERE cr->>'clientId' = o.client_id
   AND p.company_id = o.company_id
   AND o.partner_id IS NULL;

-- Credenciais de parceiro de cadastros não concluídos (sem parceiro): ficam como parceiro, sem acesso
UPDATE public.integration_oauth_clients
   SET uso = 'parceiro'
 WHERE partner_id IS NULL AND uso = 'instrumento' AND name LIKE '% — Parceiro API';

-- Revogadas no cadastro do parceiro, mas ainda ativas: inativa (não apaga)
UPDATE public.integration_oauth_clients o
   SET is_active = false, revoked_at = coalesce(o.revoked_at, now())
  FROM public.api_partners p,
       jsonb_array_elements(CASE WHEN jsonb_typeof(p.credentials) = 'array' THEN p.credentials ELSE '[]'::jsonb END) cr
 WHERE cr->>'clientId' = o.client_id
   AND p.company_id = o.company_id
   AND nullif(cr->>'revokedAt', '') IS NOT NULL
   AND (o.is_active OR o.revoked_at IS NULL);

-- Sincroniza credencial x cadastro do parceiro: vincula, inativa revogadas e inativa ao excluir o parceiro
CREATE OR REPLACE FUNCTION public.api_partners_credenciais_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.integration_oauth_clients
       SET is_active = false, revoked_at = coalesce(revoked_at, now())
     WHERE partner_id = OLD.id AND (is_active OR revoked_at IS NULL);
    RETURN OLD;
  END IF;

  UPDATE public.integration_oauth_clients o
     SET partner_id = NEW.id, uso = 'parceiro'
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.credentials) = 'array' THEN NEW.credentials ELSE '[]'::jsonb END) cr
   WHERE o.client_id = cr->>'clientId'
     AND o.company_id = NEW.company_id
     AND (o.partner_id IS NULL OR o.partner_id = NEW.id)
     AND (o.partner_id IS DISTINCT FROM NEW.id OR o.uso IS DISTINCT FROM 'parceiro');

  UPDATE public.integration_oauth_clients o
     SET is_active = false, revoked_at = coalesce(o.revoked_at, now())
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.credentials) = 'array' THEN NEW.credentials ELSE '[]'::jsonb END) cr
   WHERE o.client_id = cr->>'clientId'
     AND o.company_id = NEW.company_id
     AND o.partner_id = NEW.id
     AND nullif(cr->>'revokedAt', '') IS NOT NULL
     AND (o.is_active OR o.revoked_at IS NULL);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.api_partners_credenciais_sync() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS api_partners_credenciais_sync_trg ON public.api_partners;
CREATE TRIGGER api_partners_credenciais_sync_trg
  AFTER INSERT OR UPDATE OF credentials ON public.api_partners
  FOR EACH ROW EXECUTE FUNCTION public.api_partners_credenciais_sync();

DROP TRIGGER IF EXISTS api_partners_credenciais_revogar_trg ON public.api_partners;
CREATE TRIGGER api_partners_credenciais_revogar_trg
  BEFORE DELETE ON public.api_partners
  FOR EACH ROW EXECUTE FUNCTION public.api_partners_credenciais_sync();

-- Regenerar: inativa as anteriores e cria a nova na mesma transação (chamada só pela Edge Function)
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
  SELECT id, company_id, credentials INTO v_partner
    FROM public.api_partners WHERE id = _partner_id FOR UPDATE;
  IF v_partner.id IS NULL OR v_partner.company_id <> _company_id THEN
    RAISE EXCEPTION 'Parceiro não encontrado' USING ERRCODE = 'P0002';
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