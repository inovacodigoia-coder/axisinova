# BI Hospitalar — Etapa 1.1: cadastro real de medicamentos com custo

## Decisões já tomadas
- Cadastro fica em **Farmácia → Medicamentos** (substitui a lista de demonstração).
- Quantidade vem da **dispensação**: na tela Dispensar, a Farmácia informa a quantidade entregue de cada item, quem solicitou (técnico/profissional) e quem retirou o material, junto com paciente e setor solicitante.
- Prescrição no Painel do Leito aceita **só medicamentos cadastrados e ativos**.
- Prescrição do atendimento médico (hoje salva só no navegador) passa a **entrar na fila da Farmácia**.

## O que será feito
1. **Cadastro de medicamentos** por empresa: código interno automático, nome, princípio ativo, apresentação, forma, unidade, custo (opcional), ativo/inativo. Toda mudança de custo gera histórico. Medicamento já usado não pode ser excluído, só inativado.
2. **Estoque** da Farmácia deixa de mostrar itens fictícios e passa a listar os medicamentos cadastrados (sem lote/validade nesta etapa).
3. **Prescrição no leito**: busca no cadastro, só ativos; item guarda o vínculo com o medicamento (o nome continua salvo para histórico).
4. **Painel Médico**: a prescrição é gravada no sistema e aparece na fila da Farmácia, usando o mesmo cadastro.
5. **Dispensar**: por item, quantidade entregue; mais solicitante e quem retirou (obrigatórios). Ao confirmar, o valor é congelado no BI: custo vigente × quantidade. Sem custo → "sem valor cadastrado".
6. **Permissões** novas em Perfis: Medicamentos ver / criar / editar / inativar, todas desmarcadas por padrão e checadas no banco.
7. Correção do gatilho do BI que lia um campo inexistente da prescrição.

## Técnico
- Tabelas `farmacia_medicamentos` e `farmacia_medicamento_custos` (RLS por empresa, GRANTs, gravação só por RPCs `farmacia_*` com `farmacia_tem_permissao`); `prescription_items.medicamento_id` nullable (dados antigos preservados).
- Dispensação por RPC com itens/quantidades, `solicitante` e `retirado_por`; grava `bi_consumo_itens` com valor congelado; idempotente.
- Prescrição médica migrada para o mesmo `prescription_create`.
- Testes SQL PGlite isolados (cadastro, permissões, histórico de custo, bloqueio de exclusão, valor congelado, sem custo, isolamento por empresa); typecheck e build.
- Validação na tela depende de login ativo.
