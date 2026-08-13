# Ajustes na Digitação de Resultados e Filtros de Análise

## O que foi verificado

- No banco, o pedido do protocolo `1-00` está com status `completed` (Concluído).
- A tela de Análise filtra por um status chamado `concluded`, que não existe no banco. Por isso pedidos concluídos nunca aparecem na lista, mesmo com o filtro "Concluído" marcado.
- O bloco "Resultados Anteriores" hoje é sempre exibido (mostrando "Paciente não tem exames anteriores") e a busca do histórico é feita pelo **nome** do paciente, não pelo ID.

## Mudanças propostas

### 1. Resultados Anteriores por ID do paciente

- Levar o `patientId` do pedido até cada exame na lista de análise e até o agrupamento por paciente dentro do modal.
- Buscar o histórico em `lab_exam_results` filtrando por `patient_id` (com o nome apenas como reserva para registros antigos sem ID), excluindo o pedido atual.
- Ocultar completamente o bloco "Resultados Anteriores" quando o paciente não tiver nenhum resultado anterior daquele exame — sem texto de aviso.

### 2. Status Concluído aparecendo no filtro

- Padronizar o valor de status "Concluído" para `completed` em toda a tela de Análise: opção do filtro, lista de status permitidos, seleção padrão, "Limpar filtros" e indicador de filtro ativo.
- Aceitar também o valor legado `concluded` na comparação, para não esconder registros antigos.
- Resultado: com o filtro "Concluído" marcado, pedidos como o `1-00` passam a ser listados e podem ser abertos para consulta/visualização do laudo.

### 3. Fluxo de liberação (confirmação do comportamento atual)

- Ao concluir a digitação e liberar cada exame, o pedido passa a "Liberado"; quando todos os exames estiverem liberados, passa a "Concluído" (`completed`). A regra já existe e será mantida, apenas alinhada ao mesmo valor de status usado nos filtros.

## Detalhes técnicos

- `src/pages/company/lab/analise/LabAnalisePage.tsx`: incluir `patientId` no objeto de exame; trocar `concluded` por `completed` em `selectedStatuses`, `allowedOrderStatuses`, `clearFilters`, `isFiltered` e nas opções do filtro; normalizar status na comparação.
- `src/components/lab/analise/ResultEntryModal.tsx`: propagar `patientId` no `groupedPatients`; refazer o `useEffect` de `prevResults` usando `patient_id`; chavear o mapa por `patientId|CODIGO`; renderizar o bloco de histórico somente quando houver itens.
