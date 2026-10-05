ALTER TABLE public.whatsapp_fila_envios ADD COLUMN IF NOT EXISTS horas_antes smallint;
ALTER TABLE public.whatsapp_fila_envios DROP CONSTRAINT IF EXISTS whatsapp_fila_horas_antes_chk;
ALTER TABLE public.whatsapp_fila_envios ADD CONSTRAINT whatsapp_fila_horas_antes_chk CHECK (horas_antes IS NULL OR horas_antes IN (24,48));
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_fila_sem_duplicar ON public.whatsapp_fila_envios (agendamento_id, tipo) WHERE status <> 'cancelada' AND status <> 'falha';

CREATE OR REPLACE FUNCTION public.whatsapp_normalizar_celular(p text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE d text := regexp_replace(coalesce(p,''),'\D','','g');
BEGIN
  IF length(d) IN (12,13) AND left(d,2)='55' THEN d := substr(d,3); END IF;
  IF length(d)=11 AND left(d,2)::int BETWEEN 11 AND 99 AND substr(d,3,1)='9' THEN RETURN '55'||d; END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_enfileirar_confirmacao(p_agendamento_id uuid, p_horas_antes smallint, p_data_envio date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  a record; v_comp uuid; v_hab boolean; v_tel text; v_t text; v_dh timestamptz;
  v_prox smallint; v_pos smallint; v_txt text; v_tipo text; v_pv boolean;
  v_quando timestamptz; v_id uuid; v_exist uuid; v_conectado boolean; i int;
BEGIN
  SELECT * INTO a FROM appointments WHERE id = p_agendamento_id;
  v_comp := get_user_company_id(auth.uid());
  IF a.id IS NULL OR v_comp IS NULL OR a.company_id <> v_comp THEN
    RETURN jsonb_build_object('ok',false,'codigo','AGENDAMENTO_NAO_ENCONTRADO','mensagem','Agendamento não encontrado.','fila_id',null,'agendada_para',null);
  END IF;
  IF p_horas_antes NOT IN (24,48) THEN
    RETURN jsonb_build_object('ok',false,'codigo','ANTECEDENCIA_INVALIDA','mensagem','Antecedência deve ser 24 ou 48 horas.','fila_id',null,'agendada_para',null);
  END IF;
  SELECT whatsapp_habilitado INTO v_hab FROM companies WHERE id = a.company_id;
  IF NOT coalesce(v_hab,false) THEN
    RETURN jsonb_build_object('ok',false,'codigo','WHATSAPP_NAO_LIBERADO','mensagem','WhatsApp não liberado para a empresa.','fila_id',null,'agendada_para',null);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM whatsapp_instancias WHERE company_id = a.company_id) THEN
    RETURN jsonb_build_object('ok',false,'codigo','SEM_NUMERO_CADASTRADO','mensagem','Nenhum número de WhatsApp cadastrado.','fila_id',null,'agendada_para',null);
  END IF;
  v_dh := (a.date + a.time) AT TIME ZONE 'America/Fortaleza';
  IF v_dh <= now() THEN
    RETURN jsonb_build_object('ok',false,'codigo','AGENDAMENTO_NO_PASSADO','mensagem','O agendamento já passou.','fila_id',null,'agendada_para',null);
  END IF;
  SELECT id INTO v_exist FROM whatsapp_fila_envios
   WHERE agendamento_id = a.id AND tipo='confirmacao_agendamento' AND status NOT IN ('cancelada','falha') LIMIT 1;
  IF v_exist IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'codigo','JA_ENFILEIRADA','mensagem','Confirmação já programada.','fila_id',v_exist,
      'agendada_para',(SELECT agendada_para FROM whatsapp_fila_envios WHERE id=v_exist));
  END IF;
  FOR v_t IN SELECT x FROM (
      SELECT 1 o, p.phone x FROM patients p WHERE p.id = a.patient_id
      UNION ALL SELECT 2, p.phone2 FROM patients p WHERE p.id = a.patient_id
      UNION ALL SELECT 3, a.patient_phone1 UNION ALL SELECT 4, a.patient_phone2) s ORDER BY o
  LOOP
    v_tel := whatsapp_normalizar_celular(v_t);
    EXIT WHEN v_tel IS NOT NULL;
  END LOOP;
  IF v_tel IS NULL THEN
    RETURN jsonb_build_object('ok',false,'codigo','PACIENTE_SEM_TELEFONE_VALIDO','mensagem','Paciente sem celular válido.','fila_id',null,'agendada_para',null);
  END IF;
  INSERT INTO whatsapp_config_empresa(company_id, proximo_modelo) VALUES (a.company_id, 1) ON CONFLICT DO NOTHING;
  SELECT proximo_modelo INTO v_prox FROM whatsapp_config_empresa WHERE company_id = a.company_id FOR UPDATE;
  v_prox := coalesce(v_prox,1);
  FOR i IN 0..2 LOOP
    SELECT posicao, texto INTO v_pos, v_txt FROM whatsapp_modelos_mensagem
     WHERE company_id = a.company_id AND posicao = ((v_prox - 1 + i) % 3) + 1 AND ativo LIMIT 1;
    EXIT WHEN v_pos IS NOT NULL;
  END LOOP;
  IF v_pos IS NULL THEN
    RETURN jsonb_build_object('ok',false,'codigo','SEM_MODELO_ATIVO','mensagem','Nenhum modelo de mensagem ativo.','fila_id',null,'agendada_para',null);
  END IF;
  v_tipo := CASE WHEN a.visit_type = 'return' THEN 'Retorno'
                 WHEN a.appointment_type = 'exam' THEN 'Exame'
                 WHEN a.appointment_type = 'procedure' THEN 'Procedimento'
                 ELSE 'Consulta' END;
  v_pv := a.visit_type = 'first_visit' AND coalesce(a.appointment_type,'consultation') = 'consultation';
  v_quando := (p_data_envio + time '09:00') AT TIME ZONE 'America/Fortaleza';
  IF v_quando < now() THEN v_quando := now(); END IF;
  BEGIN
    INSERT INTO whatsapp_fila_envios(company_id,tipo,agendamento_id,paciente_nome,telefone_destino,modelo_posicao,texto_final,status,agendada_para,horas_antes,criado_por)
    VALUES (a.company_id,'confirmacao_agendamento',a.id,a.patient_name,v_tel,v_pos,
      whatsapp_render_modelo(v_txt,a.patient_name,v_tipo,v_pv,a.doctor,v_dh),'agendada',v_quando,p_horas_antes,auth.uid())
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_exist FROM whatsapp_fila_envios WHERE agendamento_id=a.id AND tipo='confirmacao_agendamento' AND status NOT IN ('cancelada','falha') LIMIT 1;
    RETURN jsonb_build_object('ok',true,'codigo','JA_ENFILEIRADA','mensagem','Confirmação já programada.','fila_id',v_exist,'agendada_para',null);
  END;
  UPDATE whatsapp_config_empresa SET proximo_modelo = (v_pos % 3) + 1 WHERE company_id = a.company_id;
  v_conectado := EXISTS (SELECT 1 FROM whatsapp_instancias WHERE company_id=a.company_id AND status='connected');
  IF NOT v_conectado THEN
    RETURN jsonb_build_object('ok',true,'codigo','NENHUM_NUMERO_CONECTADO','mensagem','Programada, mas nenhum número conectado.','fila_id',v_id,'agendada_para',v_quando);
  END IF;
  RETURN jsonb_build_object('ok',true,'codigo','ENFILEIRADA','mensagem','Confirmação programada.','fila_id',v_id,'agendada_para',v_quando);
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_cancelar_envios_agendamento(p_agendamento_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_comp uuid; v_c uuid; n int;
BEGIN
  SELECT company_id INTO v_c FROM appointments WHERE id = p_agendamento_id;
  v_comp := get_user_company_id(auth.uid());
  IF v_c IS NULL OR v_comp IS NULL OR v_c <> v_comp THEN RETURN jsonb_build_object('ok',false,'canceladas',0); END IF;
  UPDATE whatsapp_fila_envios SET status='cancelada', atualizado_em=now()
   WHERE agendamento_id = p_agendamento_id AND status='agendada';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'canceladas',n);
END $$;

REVOKE ALL ON FUNCTION public.whatsapp_enfileirar_confirmacao(uuid,smallint,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.whatsapp_cancelar_envios_agendamento(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.whatsapp_normalizar_celular(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_enfileirar_confirmacao(uuid,smallint,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_cancelar_envios_agendamento(uuid) TO authenticated;