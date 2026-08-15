# Novo padrão de código de amostra + ID sequencial da empresa

## Objetivo

Mudar o código das amostras de `16-00-1` para `16-00-1-1`, onde o último número é o ID sequencial da empresa. E passar o hash alfanumérico a ser gerado por tubo (amostra), não mais por pedido.

## 1. ID sequencial da empresa

- Adicionar um campo de ID numérico sequencial na tabela de empresas, atribuído por ordem de criação (as duas empresas existentes recebem 1 e 2, seguindo `created_at`).
- Novas empresas recebem o próximo número automaticamente.
- Em Super Admin > Empresas Cadastradas: nova coluna "ID" (primeira coluna da tabela), exibindo esse número.

## 2. Código da amostra: `1-00-1-1`

Composição:

```text
16   -  00   -   1    -   1
ordem   origem   tubo    ID empresa
```

- Todos os pontos que hoje montam `pedido-tubo` passam a montar `pedido-tubo-idEmpresa`:
  - aba AMOSTRAS do modal Detalhes Atendimento (coluna CÓDIGO e seleção de tubos)
  - etiqueta térmica (texto e código de barras CODE128)
  - impressão em lote de etiquetas
- Pedidos já cadastrados passam a exibir o novo formato automaticamente, pois o código é derivado do protocolo + índice do tubo + ID da empresa (não é armazenado por amostra).

## 3. Hash alfanumérico por tubo

- Hoje o hash (9 caracteres) é gerado uma vez por pedido e repetido em todas as etiquetas.
- Passa a ser derivado de forma determinística do código completo da amostra (`16-00-1-1`), gerando um hash diferente por tubo e sempre o mesmo para a mesma amostra.
- Como é determinístico, todos os pedidos já existentes passam a ter hash por tubo sem precisar de reprocessamento de dados; o hash antigo do pedido continua salvo, mas deixa de ser usado nas etiquetas.
- Esse hash por tubo é o que será usado futuramente no interfaceamento com equipamentos.

## Detalhes técnicos

- Migração: `ALTER TABLE public.companies ADD COLUMN sequence_id int`; preencher via `row_number() over (order by created_at)`; sequência dedicada + default para novas empresas; `UNIQUE NOT NULL`.
- `src/utils/orderHash.ts`: novo `buildSampleCode(protocol, tubeIndex, companySequenceId)` e `generateSampleHash(sampleCode)` (hash determinístico base36, 9 chars maiúsculos). `normalizeHash` mantido.
- Expor `sequence_id` no contexto da empresa (`CompanyContext`/`AuthContext`) para o front montar o código sem consulta extra.
- Atualizar `SampleLabel.tsx`, `SampleLabelsPrintModal.tsx` e `AttendanceDetailsModal.tsx` (linhas que usam `${order.orderNumber}-${idx + 1}`).
- Super Admin: `CompaniesTablePage.tsx` (coluna ID) e mapeamento em `CompaniesManagementPage.tsx`.
