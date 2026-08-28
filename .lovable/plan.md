# Dashboard Laboratorial com dados reais

Reformular `/app/lab/dashboard` para trabalhar apenas com dados reais dos pedidos (`attendance_orders` filtrados por `exam_mode = lab`), removendo as variações fixas ("+5%", "+8%", "+15%") que hoje aparecem nos cards.

## 1. Cards por Status

Uma faixa de cards compactos, um para cada status do pedido, com a contagem real no período selecionado:

AGUARDANDO, COLETA REALIZADA, ABERTO, Em Análise, Validação, Liberado, Cancelado, Autorizado, Concluído.

- Mesmas cores/rótulos já usados no filtro de Status da tela de Análise.
- Clique no card leva à fila correspondente (Coleta / Análise / Validação / Laudos) já filtrada.
- Status com zero pedidos aparecem esmaecidos, não somem (evita layout instável).

## 2. Amostras por material e por setor

Dois painéis lado a lado, alimentados pelos exames dentro das guias de cada pedido:

- **Por material**: barras horizontais com a contagem de amostras por material (Soro, EDTA/Sangue total, Urina, Citrato/Plasma, Fezes, etc.), usando o mesmo agrupamento de materiais já aplicado na tela de Coleta.
- **Por setor (bancada)**: contagem de exames agrupados pela bancada do catálogo (`lab_workbenches`); exames sem bancada entram como "Sem setor".
- Cada linha mostra quantidade e percentual do total.

## 3. Mapa de calor de atendimentos

Grade de calor com intensidade proporcional ao volume de pedidos criados:

- **Dia**: 24 colunas (00h–23h) em uma única linha.
- **Semana**: linhas = dias da semana, colunas = faixas de horário (06h–20h).
- **Mês**: linhas = semanas do mês, colunas = dias da semana.
- Alternância Dia / Semana / Mês por botões no cabeçalho do card.
- Tooltip com data/hora e total de atendimentos; destaque do pico ("Pico: quinta 09h — 14 atendimentos").

## 4. Ranking de exames mais realizados

Lista ordenada dos exames mais realizados no período, com:

- Posição, nome do exame, código interno, setor e quantidade + barra de proporção.
- Seletor de quantidade: **5 / 10 / 20 / 30**.
- Contagem baseada nos exames das guias dos pedidos do período (exclui pedidos cancelados/excluídos).

## 5. Filtro de período

Um seletor único no topo (Hoje, 7 dias, 30 dias, Este mês) que alimenta todos os blocos acima, mantendo o mapa de calor com seu próprio nível de zoom (dia/semana/mês).

## Detalhes técnicos

- Novo hook `useLabDashboardMetrics` derivando tudo de `useAttendanceCadastro()` (já com RLS por empresa e exclusão de `deleted` para não-ADM) + `useRegisters()` para catálogo/bancadas — sem consultas novas ao banco e sem mocks.
- `useLabDashboardData` continua servindo os cards financeiros/semana existentes; a receita mensal passa a somar apenas pedidos não cancelados.
- Novos componentes em `src/components/lab/dashboard/`: `StatusCardsRow`, `SamplesBreakdownPanel`, `AttendanceHeatmap`, `TopExamsList`.
- Estilo seguindo os cards atuais (`rounded-2xl border bg-card`), tokens semânticos e gradiente da marca para a escala do heatmap (ciano → roxo).
- Estados vazios explícitos quando não houver pedidos no período.
