CREATE OR REPLACE FUNCTION public.support_stage_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Skip the minimum-stage rule when the whole board is being removed (cascade)
    IF NOT EXISTS (SELECT 1 FROM public.support_boards b WHERE b.id = OLD.board_id) THEN
      RETURN OLD;
    END IF;
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