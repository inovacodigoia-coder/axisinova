# Múltiplos laudos por exame + previsão de entrega por origem + integração

Hoje cada exame do Catálogo tem uma única configuração: um conjunto de parâmetros/máscara, uma metodologia e um conjunto de valores de referência. A mudança permite que o mesmo exame tenha vários laudos (um por equipamento), cada um com sua própria configuração, e que o equipamento diga em qual laudo o resultado entrou.

## Parte 1 — Laudos do exame

- Nova aba "Laudo do Exame" reformulada: lista de laudos com Código, Nome, Ordem, Ativo e ações Configurar / Duplicar / Excluir, mais o botão "Adicionar laudo".
- Cada laudo guarda a sua própria configuração de Parâmetros e Máscara, Metodologia Analítica e Valores de Referência. As abas de configuração passam a operar sempre sobre o laudo selecionado.
- Regras:
  - Exame novo nasce com 1 laudo (Ordem 1, Ativo) — nunca em branco.
  - Bloqueado desativar ou excluir o último laudo ativo.
  - Código do laudo único dentro do exame.
  - Criar laudo copiando de um existente traz parâmetros, metodologia e referências já preenchidos e editáveis (decisão confirmada).
- Migração de dados: todo exame existente ganha automaticamente um "Laudo Padrão" (Ordem 1, Ativo) com exatamente a configuração que já tinha — mesmos parâmetros, mesmos códigos de equipamento e mesmas faixas de referência. Nada muda visualmente para quem não mexer em nada. Conferência obrigatória com o exame `H` (Hemograma Completo): 23 parâmetros e 38 faixas preservados.
- Toggle "Laudo em folha exclusiva", "Observações do Laudo" e modelo de impressão continuam no mesmo lugar.

## Parte 2 — Previsão de entrega por origem

- No exame, além da Previsão de Entrega Geral (Dias / Horas / Minutos / Não prever entrega), passa a existir uma lista de previsões por origem.
- Pedido de origem cadastrada usa a previsão dela; origem não cadastrada usa a Previsão Geral.

## Parte 3 — Exportar / Importar Catálogo

- Exportação ganha a aba "Laudos do Exame" (Código do Exame, Código do Laudo, Nome, Ordem, Ativo), a coluna `Código do Laudo` nas abas de Parâmetros e de Faixas de referência, e a aba de previsão por origem (Origem vazia = previsão geral).
- Importar a planilha exportada não duplica nem perde laudos.
- Planilha no formato antigo (sem `Código do Laudo`) continua funcionando: tudo é aplicado no Laudo Padrão (Ordem 1) do exame.

## Parte 4 — Digitação de Resultados

- Seletor de laudo na tela do exame quando houver mais de um laudo ativo.
- Trocar de laudo preserva o valor dos parâmetros que existem nos dois laudos.
- Sem indicação externa, abre o laudo de Ordem 1 (ou o último escolhido manualmente naquele atendimento).

## Parte 5 — Integração com equipamentos

- `list-exams-for-integration` passa a devolver, em cada exame, a lista `laudos` com `code`, `name`, `order`, `is_active`. Exame com um laudo só continua respondendo como hoje, sem quebrar quem já integra.
- `receive-instrument-result` aceita o campo opcional `laudo_code`. Se vier preenchido e não corresponder a nenhum laudo daquele exame, o resultado é recusado com erro explícito informando qual laudo não foi encontrado — nunca aceito em silêncio.
- Resultado recebido com `laudo_code` válido faz a Digitação abrir aquele laudo para aquela amostra (decisão confirmada: vale para a amostra/pedido, não altera o padrão do exame).
- Resultado sem `laudo_code`: comportamento atual preservado.
- Documentação da API (`/docs`) atualizada com o novo campo e a nova lista.

## Detalhes técnicos

- Novas tabelas multi-tenant com RLS e grants por `company_id`:
  - `exam_laudos` (exam_id, company_id, code, name, sort_order, is_active, methodology, parameters JSONB, report config), único por (exam_id, code).
  - `exam_delivery_estimates` (exam_id, company_id, origin_id nulo = geral, days, hours, minutes, no_estimate).
  - `lab_exam_reference_values` e `lab_exam_parameters` ganham `laudo_id` nulo; backfill aponta tudo para o Laudo Padrão criado na mesma migração. Colunas antigas do exame (`parameters`, `methodology`, `reference_values`) ficam marcadas como DEPRECATED, sem remoção.
  - `lab_exam_results` / `lab_result_values` ganham `laudo_id` para registrar o laudo do resultado recebido.
- Frontend: `LabCatalogFormPage.tsx` passa a ter estado de laudo selecionado; `LabCatalogPage.tsx` (exportação), `ImportarPlanilhaModal.tsx` e `importReferenceAge.ts` tratam `Código do Laudo`; `ResultEntryModal.tsx` resolve parâmetros e referências pelo laudo ativo.
- Edge Functions `list-exams-for-integration` e `receive-instrument-result` atualizadas e publicadas; validação de `laudo_code` por código dentro do exame da empresa autenticada.

## Ordem de execução

1. Migração + backfill do Laudo Padrão e conferência do exame `H`.
2. Aba Laudo do Exame e configuração por laudo.
3. Previsão de entrega por origem.
4. Exportar/Importar com compatibilidade retroativa.
5. Digitação de Resultados com seletor de laudo.
6. Edge Functions + documentação.
