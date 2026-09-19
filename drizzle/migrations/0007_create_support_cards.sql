CREATE TABLE public.support_card_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  board_id uuid NOT NULL REFERENCES public.support_boards(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'short_text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  show_on_card boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  board_id uuid NOT NULL REFERENCES public.support_boards(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.support_board_stages(id) ON DELETE RESTRICT,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_card_fields_board ON public.support_card_fields(board_id, position);
CREATE INDEX idx_support_cards_board ON public.support_cards(board_id);
CREATE INDEX idx_support_cards_stage ON public.support_cards(stage_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_card_fields TO authenticated;
GRANT ALL ON public.support_card_fields TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_cards TO authenticated;
GRANT ALL ON public.support_cards TO service_role;

ALTER TABLE public.support_card_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_card_fields_select" ON public.support_card_fields
  FOR SELECT TO authenticated USING (public.can_view_support_board(board_id));
CREATE POLICY "support_card_fields_insert" ON public.support_card_fields
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_support_board(board_id));
CREATE POLICY "support_card_fields_update" ON public.support_card_fields
  FOR UPDATE TO authenticated USING (public.can_edit_support_board(board_id)) WITH CHECK (public.can_edit_support_board(board_id));
CREATE POLICY "support_card_fields_delete" ON public.support_card_fields
  FOR DELETE TO authenticated USING (public.can_edit_support_board(board_id));

CREATE POLICY "support_cards_select" ON public.support_cards
  FOR SELECT TO authenticated USING (public.can_view_support_board(board_id));
CREATE POLICY "support_cards_insert" ON public.support_cards
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_support_board(board_id));
CREATE POLICY "support_cards_update" ON public.support_cards
  FOR UPDATE TO authenticated USING (public.can_edit_support_board(board_id)) WITH CHECK (public.can_edit_support_board(board_id));
CREATE POLICY "support_cards_delete" ON public.support_cards
  FOR DELETE TO authenticated USING (public.can_edit_support_board(board_id));

CREATE OR REPLACE FUNCTION public.support_card_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_cards_touch BEFORE UPDATE ON public.support_cards
  FOR EACH ROW EXECUTE FUNCTION public.support_card_touch();
CREATE TRIGGER support_card_fields_touch BEFORE UPDATE ON public.support_card_fields
  FOR EACH ROW EXECUTE FUNCTION public.support_card_touch();

CREATE OR REPLACE FUNCTION public.support_stage_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.support_cards WHERE stage_id = OLD.id) THEN
    RAISE EXCEPTION 'Não é possível excluir uma etapa que possui cards';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER support_stage_delete_guard BEFORE DELETE ON public.support_board_stages
  FOR EACH ROW EXECUTE FUNCTION public.support_stage_delete_guard();