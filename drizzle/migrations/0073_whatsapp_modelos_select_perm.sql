DROP POLICY IF EXISTS wa_mod_select ON public.whatsapp_modelos_mensagem;
CREATE POLICY wa_mod_select ON public.whatsapp_modelos_mensagem FOR SELECT TO authenticated
USING ((company_id = public.get_user_company_id(auth.uid()) AND public.whatsapp_tem_permissao('configuracoes.whatsapp')) OR private.is_super_admin());