CREATE TABLE public.support_card_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  board_id UUID NOT NULL,
  card_id UUID NOT NULL,
  action TEXT NOT NULL,
  field_id UUID,
  field_label TEXT,
  old_value TEXT,
  new_value TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_card_audit_card ON public.support_card_audit (card_id, created_at DESC);
CREATE INDEX idx_support_card_audit_board ON public.support_card_audit (board_id, created_at DESC);

GRANT SELECT ON public.support_card_audit TO authenticated;
GRANT ALL ON public.support_card_audit TO service_role;

ALTER TABLE public.support_card_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View audit of visible boards"
ON public.support_card_audit FOR SELECT TO authenticated
USING (public.can_view_support_board(board_id));

CREATE OR REPLACE FUNCTION public.support_card_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k TEXT;
  old_v TEXT;
  new_v TEXT;
  lbl TEXT;
  old_stage TEXT;
  new_stage TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.support_card_audit (company_id, board_id, card_id, action, actor_id)
    VALUES (NEW.company_id, NEW.board_id, NEW.id, 'created', auth.uid());
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.support_card_audit (company_id, board_id, card_id, action, actor_id)
    VALUES (OLD.company_id, OLD.board_id, OLD.id, 'deleted', auth.uid());
    RETURN OLD;
  END IF;

  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    SELECT name INTO old_stage FROM public.support_board_stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage FROM public.support_board_stages WHERE id = NEW.stage_id;
    INSERT INTO public.support_card_audit (company_id, board_id, card_id, action, field_label, old_value, new_value, actor_id)
    VALUES (NEW.company_id, NEW.board_id, NEW.id, 'stage_changed', 'Etapa', old_stage, new_stage, auth.uid());
  END IF;

  IF NEW.values IS DISTINCT FROM OLD.values THEN
    FOR k IN
      SELECT DISTINCT key FROM (
        SELECT jsonb_object_keys(COALESCE(OLD.values, '{}'::jsonb)) AS key
        UNION
        SELECT jsonb_object_keys(COALESCE(NEW.values, '{}'::jsonb)) AS key
      ) keys
    LOOP
      old_v := COALESCE(OLD.values, '{}'::jsonb) ->> k;
      new_v := COALESCE(NEW.values, '{}'::jsonb) ->> k;
      IF COALESCE(old_v, '') IS DISTINCT FROM COALESCE(new_v, '') THEN
        lbl := NULL;
        BEGIN
          SELECT label INTO lbl FROM public.support_card_fields WHERE id = k::uuid;
        EXCEPTION WHEN others THEN
          lbl := NULL;
        END;
        INSERT INTO public.support_card_audit (company_id, board_id, card_id, action, field_id, field_label, old_value, new_value, actor_id)
        VALUES (NEW.company_id, NEW.board_id, NEW.id, 'field_changed',
                CASE WHEN k ~ '^[0-9a-fA-F-]{36}$' THEN k::uuid ELSE NULL END,
                COALESCE(lbl, 'Campo'), old_v, new_v, auth.uid());
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_card_audit
AFTER INSERT OR UPDATE OR DELETE ON public.support_cards
FOR EACH ROW EXECUTE FUNCTION public.support_card_audit_log();

CREATE OR REPLACE FUNCTION public.support_card_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Registros de auditoria sao imutaveis';
END;
$$;

CREATE TRIGGER trg_support_card_audit_immutable
BEFORE UPDATE OR DELETE ON public.support_card_audit
FOR EACH ROW EXECUTE FUNCTION public.support_card_audit_immutable();