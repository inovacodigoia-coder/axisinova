# Etapa 11A — Automações de ciclo do paciente (WhatsApp)

Três mensagens automáticas ligadas à agenda: inclusão na agenda, pré-atendimento e pós-atendimento. Todas começam desligadas, e a clínica liga cada uma quando quiser.

## Decisões confirmadas
- Pós-atendimento: 2 horas depois de finalizar, por padrão. A empresa pode mudar o prazo.
- Pré-atendimento: por padrão às 18:00 do dia anterior (fuso de Fortaleza), só para Exame e Procedimento. A empresa pode mudar o horário, o prazo e os filtros.
  - Se o agendamento for criado depois desse horário e ainda faltarem mais de 2 h para o atendimento, a mensagem sai na hora (dentro da janela de envio). Se faltarem menos de 2 h, não sai.
  - O lembrete não pode sair no mesmo momento que a confirmação de 24 h/48 h. Se cair no mesmo horário, passa para 30 min depois da confirmação.
- "SAIR" bloqueia só as mensagens automáticas. As confirmações de agendamento continuam.
- Limite por paciente: 1 mensagem automática por dia e 3 por semana, por padrão. A empresa pode ajustar na tela Automações.

## O que será feito
1. **Regras por empresa**
   - Cada empresa liberada recebe 3 regras padrão, todas desligadas.
   - Uma regra pode ter filtro de tipo de atendimento e de médico. Quando mais de uma regra serve para o mesmo agendamento, vale a mais específica.
   - Cada agendamento recebe no máximo 1 mensagem de cada tipo.
   - Uma regra cujo texto ainda contém "[escreva aqui" não pode ser ligada.
   - Toda alteração numa regra fica registrada.
2. **Pausa geral e limites**
   - Chave "Pausar todas as automações de ciclo".
   - Limite diário e semanal por paciente, com valores editáveis.
3. **SAIR / VOLTAR**
   - Quando o paciente responde exatamente "sair" ou "parar", ele deixa de receber as mensagens automáticas e recebe uma resposta única. "Voltar" desfaz isso.
   - No InovaChat, o contato mostra o selo "Não quer receber mensagens automáticas". Quem tem permissão de gerenciar pode Reativar ou "Marcar para não receber".
4. **Quando cada mensagem entra na fila**
   - Inclusão na agenda: quando o agendamento é criado.
   - Pré-atendimento: quando o agendamento é criado ou remarcado.
   - Pós-atendimento: quando o atendimento é finalizado.
   - Cancelar, faltar ou remarcar cancela as mensagens que ainda não saíram.
   - Se a fila falhar, o agendamento é salvo mesmo assim e só aparece um aviso discreto.
5. **Envio**
   - Usa o mesmo processo de envio que já existe: intervalo de 2 a 5 min, rodízio de números, janela de horário e limite diário.
   - Confirmações de agendamento têm prioridade.
   - Antes de cada envio, o sistema confere de novo o opt-out e se o agendamento continua válido.
   - Se o limite por paciente for estourar, a mensagem passa para as 09:00 do próximo dia permitido. Depois de 3 adiamentos, é cancelada.
6. **Aba "Automações"** em Configurações > WhatsApp
   - Cartões por tipo, com descrição de quando envia, filtros e botão de ligar/desligar.
   - Editor lateral com prazo, horário fixo, filtros, texto com variáveis, aviso "responda SAIR", pré-visualização, Restaurar padrão, Excluir e "Enviar teste desta regra".
7. **Fila de envios**
   - Nomes amigáveis para os três tipos e para os motivos de cancelamento.
   - As mensagens automáticas também aparecem no InovaChat como mensagem do sistema.

## Fora de escopo
- NPS, avaliação do Google, aniversário, indicação, atualização cadastral e questionário (ficam para a 11B).
- Campanhas e mensagem nova quando o agendamento é remarcado.
- Nada do que já existe muda de comportamento.

## Testes
- Testes automáticos de texto (lado do banco e lado da tela), com 2 casos novos de pós-atendimento com aviso de saída.
- Simulações com dados temporários, apagados no fim, cobrindo:
  - criar um agendamento e conferir o que entra na fila;
  - tentar ligar uma regra com "[escreva aqui";
  - finalizar, cancelar e faltar;
  - SAIR e VOLTAR;
  - estouro do limite por paciente;
  - pausa geral;
  - isolamento entre empresas.
- Nenhum envio real e nenhuma chave alterada sem você pedir.

## Detalhes técnicos
- Novas tabelas `whatsapp_automacoes` (+ auditoria) e `whatsapp_optout` (+ view mascarada). Em `whatsapp_config_empresa` entram as colunas `ciclo_pausado`, `ciclo_limite_dia` (padrão 1) e `ciclo_limite_semana` (padrão 3).
- Nova RPC `whatsapp_enfileirar_ciclo(agendamento, evento)`, SECURITY DEFINER, com a empresa derivada do agendamento, chamada pelo SchedulingContext e pela finalização no Painel Médico/Agenda.
- `whatsapp_reservar_envios` passa a ter prioridade por tipo e checagens de ciclo. `whatsapp_cancelar_envios_agendamento` não muda.
- Opt-out tratado em `whatsapp_resposta_processar`, chamado pelo `whatsapp-webhook`.
- Teste de envio de regra pela Edge Function de teste que já existe, com tipo 'teste'.
