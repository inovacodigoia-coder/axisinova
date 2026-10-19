ALTER TABLE public.whatsapp_fila_envios ADD COLUMN IF NOT EXISTS nps_teste_respostas jsonb;
COMMENT ON COLUMN public.whatsapp_fila_envios.nps_teste_respostas IS 'Snapshot dos agradecimentos de teste NPS; nunca registra nota nas estatísticas.';
CREATE OR REPLACE FUNCTION public.whatsapp_nps_teste_processar(p_instancia uuid, p_telefone text, p_texto text, p_quoted text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE i record; f record; m text[]; nota int; categoria text; corpo text; empresa text; resposta_id uuid;
BEGIN
 SELECT id,company_id,status INTO i FROM whatsapp_instancias WHERE id=p_instancia;
 IF i.id IS NULL THEN RETURN jsonb_build_object('tratada',false); END IF;
 m:=regexp_match(p_texto,'^\s*([0-9]{1,2})\s*[!.]*\s*$');
 IF m IS NULL THEN RETURN jsonb_build_object('tratada',false); END IF;
 nota:=m[1]::int;
 IF nota>10 THEN RETURN jsonb_build_object('tratada',false); END IF;
 SELECT * INTO f FROM whatsapp_fila_envios WHERE false;
 IF coalesce(p_quoted,'')<>'' THEN
  SELECT * INTO f FROM whatsapp_fila_envios WHERE instancia_id=p_instancia AND company_id=i.company_id
   AND message_id_uazapi=ANY(ARRAY[p_quoted,split_part(p_quoted,':',2)])
   AND whatsapp_tel_canonico(telefone_destino)=whatsapp_tel_canonico(p_telefone) LIMIT 1 FOR UPDATE;
 END IF;
 IF f.id IS NULL THEN
  SELECT * INTO f FROM whatsapp_fila_envios x WHERE x.instancia_id=p_instancia AND x.company_id=i.company_id
   AND whatsapp_tel_canonico(x.telefone_destino)=whatsapp_tel_canonico(p_telefone)
   AND x.status IN ('enviada','entregue','lida')
   AND ((x.tipo='teste' AND x.nps_teste_respostas IS NOT NULL AND x.enviada_em>now()-interval '72 hours')
     OR (x.tipo='ciclo_nps' AND x.enviada_em>now()-interval '72 hours')
     OR (x.tipo='confirmacao_agendamento' AND x.enviada_em>now()-interval '7 days'))
   ORDER BY x.enviada_em DESC LIMIT 1 FOR UPDATE;
 END IF;
 IF f.id IS NULL OR f.tipo<>'teste' OR f.nps_teste_respostas IS NULL OR f.enviada_em IS NULL
  OR f.enviada_em<now()-interval '72 hours' OR f.status NOT IN ('enviada','entregue','lida') THEN
  RETURN jsonb_build_object('tratada',false);
 END IF;
 IF f.respondida_em IS NOT NULL THEN RETURN jsonb_build_object('tratada',true,'enviar',false); END IF;
 IF i.status<>'connected' THEN RETURN jsonb_build_object('tratada',true,'enviar',false); END IF;
 categoria:=CASE WHEN nota>=9 THEN 'promotor' WHEN nota>=7 THEN 'neutro' ELSE 'detrator' END;
 SELECT coalesce(nullif(btrim(nome_fantasia),''),name) INTO empresa FROM companies WHERE id=i.company_id;
 corpo:=coalesce(nullif(btrim(f.nps_teste_respostas->>categoria),''),whatsapp_automacao_padrao('nps')->>categoria);
 corpo:=whatsapp_cabecalho(empresa,whatsapp_render_modelo(whatsapp_render_links(corpo,i.company_id),'Maria Exemplo',NULL,false,NULL,NULL,empresa));
 UPDATE whatsapp_fila_envios SET respondida_em=now(),atualizado_em=now() WHERE id=f.id;
 INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,texto_final,instancia_id,status,agendada_para,responsavel_nome,formato_envio)
 VALUES(i.company_id,'resposta_automatica',f.telefone_destino,corpo,p_instancia,'enviando',now(),empresa,'texto') RETURNING id INTO resposta_id;
 RETURN jsonb_build_object('tratada',true,'enviar',true,'fila_id',resposta_id,'telefone',f.telefone_destino,'texto',corpo);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_nps_teste_processar(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_nps_teste_processar(uuid,text,text,text) TO service_role;