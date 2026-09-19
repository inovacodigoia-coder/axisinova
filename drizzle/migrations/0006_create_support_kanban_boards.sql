CREATE TABLE public.support_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  sector_id text REFERENCES public.company_sectors(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  board_id uuid NOT NULL REFERENCES public.support_boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_move boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, user_id)
);

CREATE TABLE public.support_board_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  board_id uuid NOT NULL REFERENCES public.support_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#00D4FF',
  position integer NOT NULL DEFAULT 0,
  is_start boolean NOT NULL DEFAULT false,
  is_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_boards_company ON public.support_boards(company_id);
CREATE INDEX idx_support_board_members_board ON public.support_board_members(board_id);
CREATE INDEX idx_support_board_stages_board ON public.support_board_stages(board_id, position);
CREATE UNIQUE INDEX uq_support_stage_start ON public.support_board_stages(board_id) WHERE is_start;
CREATE UNIQUE INDEX uq_support_stage_end ON public.support_board_stages(board_id) WHERE is_end;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_board_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_board_stages TO authenticated;
GRANT ALL ON public.support_boards TO service_role;
GRANT ALL ON public.support_board_members TO service_role;
GRANT ALL ON public.support_board_stages TO service_role;

CREATE OR REPLACE FUNCTION public.can_view_support_board(_board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_boards b
    WHERE b.id = _board_id
      AND b.company_id = public.get_user_company_id(auth.uid())
      AND (
        b.visibility = 'public'
        OR b.created_by = auth.uid()
        OR public.is_company_manager(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.support_board_members m
          WHERE m.board_id = b.id AND m.user_id = auth.uid() AND m.can_view
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_support_board(_board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_boards b
    WHERE b.id = _board_id
      AND b.company_id = public.get_user_company_id(auth.uid())
      AND (
        b.created_by = auth.uid()
        OR public.is_company_manager(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.support_board_members m
          WHERE m.board_id = b.id AND m.user_id = auth.uid() AND m.can_edit
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.support_stage_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT count(*) INTO v_count FROM public.support_board_stages WHERE board_id = OLD.board_id;
    IF v_count <= 2 THEN
      RAISE EXCEPTION 'O quadro precisa ter no mínimo 2 etapas';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.is_start THEN
    UPDATE public.support_board_stages SET is_start = false
      WHERE board_id = NEW.board_id AND id <> NEW.id AND is_start;
  END IF;
  IF NEW.is_end THEN
    UPDATE public.support_board_stages SET is_end = false
      WHERE board_id = NEW.board_id AND id <> NEW.id AND is_end;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_stage_guard_biud
BEFORE INSERT OR UPDATE OR DELETE ON public.support_board_stages
FOR EACH ROW EXECUTE FUNCTION public.support_stage_guard();

CREATE TRIGGER support_boards_updated_at
BEFORE UPDATE ON public.support_boards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.support_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_board_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_boards_select" ON public.support_boards
FOR SELECT TO authenticated USING (public.can_view_support_board(id));
CREATE POLICY "support_boards_insert" ON public.support_boards
FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "support_boards_update" ON public.support_boards
FOR UPDATE TO authenticated USING (public.can_edit_support_board(id))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "support_boards_delete" ON public.support_boards
FOR DELETE TO authenticated USING (public.can_edit_support_board(id));

CREATE POLICY "support_members_select" ON public.support_board_members
FOR SELECT TO authenticated USING (public.can_view_support_board(board_id));
CREATE POLICY "support_members_write" ON public.support_board_members
FOR ALL TO authenticated USING (public.can_edit_support_board(board_id))
WITH CHECK (public.can_edit_support_board(board_id) AND company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "support_stages_select" ON public.support_board_stages
FOR SELECT TO authenticated USING (public.can_view_support_board(board_id));
CREATE POLICY "support_stages_write" ON public.support_board_stages
FOR ALL TO authenticated USING (public.can_edit_support_board(board_id))
WITH CHECK (public.can_edit_support_board(board_id) AND company_id = public.get_user_company_id(auth.uid()));