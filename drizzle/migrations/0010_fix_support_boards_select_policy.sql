DROP POLICY IF EXISTS support_boards_select ON public.support_boards;

CREATE POLICY support_boards_select ON public.support_boards
FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    visibility = 'public'
    OR created_by = auth.uid()
    OR public.is_company_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_board_members m
      WHERE m.board_id = support_boards.id
        AND m.user_id = auth.uid()
        AND m.can_view
    )
  )
);