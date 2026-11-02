# Etapa 2A — Materiais usados por paciente

## Base conferida e decisões
- O Almoxarifado ainda não possui custo unitário de material. O saldo já é separado por setor e será reutilizado.
- O BI já possui a base de consumo com quantidade, custo congelado, atendimento e episódio hospitalar; não haverá base de consumo paralela.
- Postos e Internação possuem vínculo com episódio hospitalar. No Painel Médico, o agendamento precisa ser ligado ao atendimento hospitalar ativo pelo servidor; quando não houver vínculo válido, a ação ficará desabilitada.
- Autorizado testar com materiais de teste da Labsaude em atendimento exclusivo de teste, nunca em pacientes/atendimentos reais.
- Quantidade fracionada será uma opção por material, desmarcada por padrão.

## O que será entregue
1. **Cadastro de materiais:** custo unitário opcional em R$, opção de permitir quantidade fracionada e histórico de alteração de custo com responsável, horário e valores anterior/novo.
2. **Registrar material usado:** um único formulário compartilhado pelo Painel do Leito dos Postos, leito da Internação e Painel Médico. Busca de materiais com saldo no setor, saldo/unidade visíveis, quantidade e observação opcional.
3. **Baixa segura:** atendimento ativo e setor do profissional verificados no servidor; saldo insuficiente, quantidade inválida e fração não permitida bloqueiam o registro. Medicamentos continuam no fluxo próprio de dispensação, sem dupla contagem.
4. **Consumo e jornada:** registrar material na base existente do BI, congelando custo unitário e quantidade. Custo vazio permanece “sem valor cadastrado”. Registrar evento de uso com setor e horário do servidor.
5. **Estorno:** listar os usos do atendimento e permitir estorno com justificativa obrigatória; devolver saldo e acrescentar consumo compensatório negativo e evento, preservando o original. Bloquear estorno repetido.
6. **Permissões:** acrescentar Materiais › Registrar uso no paciente e Estornar, desmarcadas por padrão, com administrador da empresa autorizado e checagem no banco. Manter a ativação atual por empresa e as configurações das solicitações.

## Segurança e detalhes técnicos
- Reutilizar `almox_itens`, `almox_saldos`, `almox_movimentos`, `bi_consumo_itens` e eventos existentes. Acrescentar apenas histórico de custo e vínculos necessários para uso/estorno e idempotência.
- Gravações por funções autenticadas: empresa e responsável derivados da sessão, nunca enviados como autoridade pelo navegador. RLS e concessões explícitas para novas tabelas.
- Bloquear o saldo durante uso/estorno e executar baixa, movimento, consumo e evento em transação única. Impedir duplicação por cliques ou reenvios.
- Resolver o atendimento atual a partir da ocupação dos Postos, solicitação atual do leito de Internação ou vínculo clínico do atendimento médico; não tratar agendamento ou leito como episódio.
- Registrar histórico de custo sem permitir edição/exclusão de consumo e sem modificar aprovações ou transferências existentes.

## Verificação
- Testes isolados para baixa, insuficiência, frações, custo ausente, congelamento após alteração, estorno negativo, devolução, repetição, atendimento encerrado, permissões e isolamento entre empresas.
- Reexecutar testes do Almoxarifado e do BI para detectar regressões.
- Conferir os três pontos de entrada e registrar/estornar somente em atendimento exclusivo de teste autorizado da Labsaude, preservando saldos finais. Nenhum envio WhatsApp, Pardini ou impressão.
- A conferência autenticada depende de sessão válida. A autorização do atendimento de teste não autoriza gerar sessão em nome de outra pessoa; se necessário, solicitar autorização específica ou login válido.

## Fora desta etapa
Triagem, Nutrição, lotes/validade/inventário, kits, códigos de barras, Relatório por Paciente e dashboards.