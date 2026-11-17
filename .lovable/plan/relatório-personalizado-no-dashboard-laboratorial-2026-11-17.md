# Relatório Personalizado no Dashboard Laboratorial

## O que muda no "Tipo de relatório"
A lista passa a ter 3 opções:
- **Relatório com gráficos** — é o atual "Personalizado", só muda o nome. Nada mais muda nele.
- **Relatório simples** — continua igual.
- **Relatório personalizado** (novo) — você monta o relatório escolhendo o que sai nele e como aparece.

## Como o novo relatório funciona
Ele usa os mesmos filtros do Relatório simples: período, origem, bancada e convênio.

**Passo 1: o que sai no relatório (caixas de marcar)**
- Dados da empresa no cabeçalho: nome, CNPJ, endereço e logo
- Exame: nome, sigla e código do exame (o código TUSS/SIGTAP só aparece se estiver cadastrado)
- Bancada
- Pacientes que fizeram o exame: nome, data e número do pedido
- Convênio
- Quantidade por exame
- Quantidade por bancada
- Valor (o preço do exame no pedido) e o total em R$
- Totais gerais no fim: exames, pacientes e valor

**Passo 2: como as informações aparecem (4 formas)**
1. **Por exame com pacientes (a sua ideia):** cada exame vira um bloco. No topo do bloco ficam a quantidade, a bancada e o valor. Logo abaixo vem a lista dos pacientes que fizeram aquele exame no período.
2. **Por bancada:** cada bancada vira um bloco com o total dela. Dentro, aparecem os exames dela com quantidade e valor. Os pacientes de cada exame podem ser mostrados ou não.
3. **Por paciente:** cada paciente vira um bloco com a lista de exames que ele fez no período, com data, bancada e valor, e o total do paciente.
4. **Tabela corrida:** uma linha por exame feito (data, pedido, paciente, exame, código, bancada, convênio, valor). Pode ser ordenada por data, paciente ou exame. Boa para conferir ou para abrir no Excel.

Se algum item do Passo 1 estiver desmarcado, ele também não aparece nas 4 formas. Por exemplo, sem "Valor" nenhuma coluna de R$ aparece.

**Prévia, impressão e exportação**
- A prévia ao lado atualiza na hora, como já acontece hoje.
- A impressão sai em A4 com o cabeçalho do laboratório.
- O Excel/CSV segue a forma escolhida. Na forma "por exame", cada paciente vai numa linha com o exame ao lado.

## Regras
- O relatório conta só exames reais dos pedidos no período, pelo horário de São Paulo. Exames cancelados ficam de fora, como no Relatório simples.
- Não há limite escondido de 1.000 linhas. Se o período for grande demais, aparece um aviso.
- Os nomes dos pacientes só aparecem para quem já tem acesso aos relatórios do laboratório.

## Detalhes técnicos
- `LabReportModal`: o modo vira `'charts' | 'simple' | 'custom'`. "Relatório com gráficos" mantém todo o comportamento atual.
- Novo `src/lib/labCustomReport.ts`: monta os dados a partir dos mesmos pedidos/guias e da mesma identidade de catálogo usados por `buildSimpleExamReport`. Ele agrupa por exame, por bancada, por paciente ou em lista corrida, e o valor vem do preço do item no pedido.
- Novo `LabCustomReportDocument.tsx`: um único documento serve para a prévia e para a impressão, com as 4 formas.
- A exportação para Excel/CSV reaproveita as mesmas linhas.
- Testes em `labCustomReport.test.ts`: agrupamento por exame e lista de pacientes, total por bancada, exclusão de cancelados, valores somados e itens desmarcados que não aparecem.
- Atualizar `src/components/lab/dashboard/AGENTS.md` e a memória do relatório.
