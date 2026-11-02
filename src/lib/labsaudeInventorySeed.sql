-- Authorized operational test batch. Synthetic system actor, never a user's session.
-- Inactive medicines cannot be prescribed. Existing records are never updated.
BEGIN;
INSERT INTO public.farmacia_medicamentos(id,company_id,codigo,nome,apresentacao,unidade,ativo)
SELECT ('b2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '7858af33-878e-40c4-9305-e912cc6655c3',
 coalesce((SELECT max(codigo) FROM public.farmacia_medicamentos WHERE company_id='7858af33-878e-40c4-9305-e912cc6655c3'),0)+n,
 '[TESTE 02/11] Medicamento fictício '||n,'Não utilizar em pacientes','unidade',false
FROM generate_series(1,4) n ON CONFLICT(id) DO NOTHING;

INSERT INTO public.almox_itens(id,company_id,nome,categoria,unidade,medicamento_id,dados_medicamento)
SELECT ('a2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '7858af33-878e-40c4-9305-e912cc6655c3','[TESTE 02/11] '||nome,categoria,'unidade',
 CASE WHEN n<=4 THEN ('b2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid END,
 '{"lote_teste":"labsaude-20261102","uso":"Somente teste de estoque; não utilizar em pacientes"}'::jsonb
FROM (VALUES (1,'Medicamento fictício 1','medicamento'),(2,'Medicamento fictício 2','medicamento'),
 (3,'Medicamento fictício 3','medicamento'),(4,'Medicamento fictício 4','medicamento'),
 (5,'Luvas de procedimento','material'),(6,'Seringas descartáveis','material'),(7,'Gazes estéreis','material'),
 (8,'Termômetro digital','equipamento'),(9,'Suporte de soro','equipamento'),(10,'Bandeja de materiais','acessorio')) v(n,nome,categoria)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.almox_solicitacoes(id,company_id,setor_id,destino,status,observacao,solicitado_por,decidido_por,decidido_em,motivo)
SELECT ('c2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '7858af33-878e-40c4-9305-e912cc6655c3','43d71e18-2182-4c40-a640-7f3d6626d8cd',
 CASE WHEN n<=2 THEN 'farmacia' ELSE 'setor' END,CASE WHEN n<=3 THEN 'aprovada' ELSE 'recusada' END,
 '[TESTE 02/11] Carga operacional autorizada — '||descricao||'. Registro do sistema, não de um usuário.',
 'd2026110-0000-4000-8000-000000000001','d2026110-0000-4000-8000-000000000001',now(),
 CASE WHEN n<=3 THEN 'Transferência de teste autorizada' ELSE 'Recusa de teste: sem transferência de saldo' END
FROM (VALUES (1,'Farmácia: saldos baixos 2 e 3'),(2,'Farmácia: saldos normais 40 e 60'),
 (3,'Pronto Atendimento Adulto: materiais'),(4,'Equipamentos negados'),(5,'Acessório negado')) v(n,descricao)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.almox_solicitacao_itens(company_id,solicitacao_id,item_id,quantidade)
SELECT '7858af33-878e-40c4-9305-e912cc6655c3',
 ('c2026110-0000-4000-8000-'||lpad(r::text,12,'0'))::uuid,
 ('a2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,q
FROM (VALUES (1,1,2),(1,2,3),(2,3,40),(2,4,60),(3,5,10),(3,6,8),(3,7,5),(4,8,2),(4,9,2),(5,10,3)) v(r,n,q)
ON CONFLICT(solicitacao_id,item_id) DO NOTHING;

INSERT INTO public.almox_saldos(company_id,item_id,local,setor_id,quantidade)
SELECT '7858af33-878e-40c4-9305-e912cc6655c3',
 ('a2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'almoxarifado',NULL,100-q
FROM (VALUES (1,2),(2,3),(3,40),(4,60),(5,10),(6,8),(7,5),(8,0),(9,0),(10,0)) v(n,q)
ON CONFLICT(company_id,item_id,local) DO NOTHING;
INSERT INTO public.almox_saldos(company_id,item_id,local,setor_id,quantidade)
SELECT '7858af33-878e-40c4-9305-e912cc6655c3',
 ('a2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 CASE WHEN n<=4 THEN 'farmacia' ELSE 'setor:43d71e18-2182-4c40-a640-7f3d6626d8cd' END,
 '43d71e18-2182-4c40-a640-7f3d6626d8cd',q
FROM (VALUES (1,2),(2,3),(3,40),(4,60),(5,10),(6,8),(7,5)) v(n,q)
ON CONFLICT(company_id,item_id,local) DO NOTHING;

INSERT INTO public.almox_movimentos(id,company_id,item_id,origem,destino,quantidade,ator)
SELECT ('e2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '7858af33-878e-40c4-9305-e912cc6655c3',('a2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'entrada','almoxarifado',100,'d2026110-0000-4000-8000-000000000001'
FROM generate_series(1,10) n ON CONFLICT(id) DO NOTHING;
INSERT INTO public.almox_movimentos(id,company_id,item_id,solicitacao_id,origem,destino,setor_id,quantidade,ator)
SELECT ('f2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '7858af33-878e-40c4-9305-e912cc6655c3',('a2026110-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 ('c2026110-0000-4000-8000-'||lpad(r::text,12,'0'))::uuid,'almoxarifado',
 CASE WHEN n<=4 THEN 'farmacia' ELSE 'setor:43d71e18-2182-4c40-a640-7f3d6626d8cd' END,
 '43d71e18-2182-4c40-a640-7f3d6626d8cd',q,'d2026110-0000-4000-8000-000000000001'
FROM (VALUES (1,1,2),(1,2,3),(2,3,40),(2,4,60),(3,5,10),(3,6,8),(3,7,5)) v(r,n,q)
ON CONFLICT(id) DO NOTHING;
COMMIT;