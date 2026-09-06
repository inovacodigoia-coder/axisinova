ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS partner_api_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_api_max_partners integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS partner_api_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_api_released_by text,
  ADD COLUMN IF NOT EXISTS partner_api_note text;

ALTER TABLE public.api_partners ALTER COLUMN api_authorized SET DEFAULT false;

CREATE POLICY "Super admins manage all api partners"
ON public.api_partners
FOR ALL
TO authenticated
USING (private.is_super_admin())
WITH CHECK (private.is_super_admin());