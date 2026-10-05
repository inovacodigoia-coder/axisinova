CREATE OR REPLACE FUNCTION public.whatsapp_janela_salvar(p_inicio time, p_fim time)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_c uuid := get_user_company_id(auth.uid());
BEGIN
  IF v_c IS NULL OR NOT whatsapp_tem_permissao('configuracoes.whatsapp') THEN
    RETURN jsonb_build_object('ok',false,'mensagem','Sem permissão.'); END IF;
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim <= p_inicio THEN
    RETURN jsonb_build_object('ok',false,'mensagem','O fim da janela deve ser depois do início.'); END IF;
  INSERT INTO whatsapp_config_empresa (company_id, janela_inicio, janela_fim) VALUES (v_c, p_inicio, p_fim)
  ON CONFLICT (company_id) DO UPDATE SET janela_inicio=excluded.janela_inicio, janela_fim=excluded.janela_fim;
  RETURN jsonb_build_object('ok',true);
END $$;