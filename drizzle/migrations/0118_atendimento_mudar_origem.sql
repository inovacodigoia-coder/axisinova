CREATE OR REPLACE FUNCTION public.atendimento_mudar_origem(_order_id uuid, _origin_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ord record; v_org record; v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login obrigatório'; END IF;
  IF NOT public.has_role(auth.uid(), 'company_admin') THEN RAISE EXCEPTION 'Apenas administrador pode mudar a origem'; END IF;
  v_company := public.get_user_company_id(auth.uid());
  SELECT * INTO v_ord FROM attendance_orders WHERE id = _order_id AND company_id = v_company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atendimento não encontrado'; END IF;
  IF v_ord.status <> 'completed' THEN RAISE EXCEPTION 'Só é possível mudar a origem de atendimentos concluídos'; END IF;
  SELECT * INTO v_org FROM origins WHERE id = _origin_id AND company_id = v_company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Origem inválida'; END IF;
  IF v_ord.origin_id = _origin_id THEN RAISE EXCEPTION 'O atendimento já está nesta origem'; END IF;
  UPDATE attendance_orders SET origin_id = v_org.id,
    origin_code = COALESCE(NULLIF(regexp_replace(COALESCE(v_org.internal_code,''),'\D','','g'),'')::int, 0),
    origin_name = v_org.name, updated_at = now()
  WHERE id = _order_id;
  INSERT INTO apoio_auditoria (company_id, tabela, registro_id, acao, antes, depois, usuario_id)
  VALUES (v_company, 'attendance_orders', _order_id::text, 'mudar_origem',
    jsonb_build_object('origin_id', v_ord.origin_id, 'origin_name', v_ord.origin_name),
    jsonb_build_object('origin_id', v_org.id, 'origin_name', v_org.name), auth.uid());
  RETURN jsonb_build_object('origin_id', v_org.id, 'origin_name', v_org.name);
END $$;
REVOKE EXECUTE ON FUNCTION public.atendimento_mudar_origem(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atendimento_mudar_origem(uuid, uuid) TO authenticated;