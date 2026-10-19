# Etapa 11B — Seis novas automações de relacionamento (WhatsApp)

Seis mensagens novas: NPS, Avaliação no Google, Aniversário, Indicação, Atualização cadastral e Questionário. Todas começam desligadas e seguem as regras de relacionamento da 11A: botão "NÃO QUERO MAIS RECEBER", opt-out, pausa geral e limite de 1 por dia e 3 em 7 dias.

## Decisões confirmadas
- NPS 24 h depois de finalizar o atendimento, no máximo 1 a cada 90 dias por paciente.
- Aniversário às 09:00, só para maiores de 18 anos atendidos nos últimos 24 meses, uma vez por ano.
- Convite ao Google só para quem der nota 9 ou 10, dentro da resposta ao NPS. A regra avulsa do Google não sai quando há NPS ativo para aquele atendimento.
- Links de Google, indicação, cadastro e questionário são campos livres preenchidos por cada clínica.

## O que será feito
1. **Links da empresa**: seção "Links" na aba Automações, com "Testar link". O link precisa começar com https://. Se o link do Google não for de um domínio do Google, aparece só um aviso. Uma regra que usa link só pode ser ligada se o link estiver preenchido. Também entram as variáveis {link_google}, {link_indicacao}, {link_cadastro} e {link_questionario}.
2. **Validade**: cada mensagem tem prazo. Aniversário vale até 23:59 do mesmo dia, NPS e Google 72 h, as demais 7 dias. Mensagem vencida é cancelada como "Prazo vencido", inclusive quando um adiamento passaria do prazo.
3. **Prioridade**: confirmações e serviço vêm primeiro. Depois, nesta ordem: aniversário, pós-atendimento, NPS, Google, cadastro, questionário, indicação.
4. **Gatilhos**: NPS, Google e Indicação (2 dias) contam a partir de finalizar o atendimento. Cadastro e Questionário saem 1 h depois; o Cadastro, por padrão, só para a 1ª vez. Para o Aniversário, uma rotina diária às 06:00 (Fortaleza) programa as mensagens do dia; quem nasceu em 29/02 recebe em 28/02 nos anos não bissextos.
5. **Respostas do NPS**: a nota de 0 a 10 é lida em até 72 h. A resposta pertence à mensagem citada ou, sem citação, à mensagem mais recente do sistema. Se essa for uma confirmação, "1", "2" e "3" continuam confirmando. A primeira nota vale. Cada faixa recebe um agradecimento automático editável (promotor, neutro, detrator), que não conta nos limites. Após nota de detrator, a próxima mensagem em 48 h vira comentário (até 500 caracteres), confirmado uma única vez. O sino avisa os gestores sem mostrar o telefone e avisa de novo quando chega o comentário.
6. **Aba "Satisfação"**:
   - Filtros de período, médico e tipo.
   - NPS de -100 a 100, total de respostas, taxa de resposta e a distribuição entre promotores, neutros e detratores.
   - Lista das respostas recentes, com detratores em destaque e o atalho "Abrir conversa".
   - No InovaChat, o painel do contato mostra "Última nota de satisfação".
7. **Aba Automações**:
   - "Nova regra" oferece os 6 tipos novos, cada um com os campos que lhe cabem.
   - Pré-visualização com o botão e "Enviar teste". No NPS, o teste não registra nota.
   - Os cartões avisam quando falta um link e mostram a precedência entre Google e NPS.
8. **Respostas rápidas**: /indicacao, /cadastro e /questionario são criadas no InovaChat quando o link correspondente estiver preenchido.
9. Fila de envios com nomes amigáveis para os novos tipos e para "Prazo vencido".

## Fora de escopo
Campanhas, cobrança, CRM, IA nos comentários, links por paciente, exportar a Satisfação, NPS por e-mail ou SMS. A 9B, a 10A a 10C e a 11A não mudam.

## Testes
- Testes automáticos de texto e de regras do banco (dados isolados):
  - ativação bloqueada sem link;
  - NPS 24 h depois e bloqueio por 90 dias;
  - notas 10 e 5, com o comentário;
  - "1" com uma confirmação mais recente continua confirmando;
  - aniversário: maior e menor de idade, sem atendimento recente, repetição no ano, prazo vencido;
  - Google avulso bloqueado quando há NPS;
  - opt-out;
  - isolamento entre empresas.
- Nenhum envio real e nenhuma chave alterada.

## Detalhes técnicos
- Uma migration aditiva:
  - colunas de link em whatsapp_config_empresa;
  - colunas novas em whatsapp_automacoes (expira_apos_horas, filtro_primeira_vez, filtro_apenas_adultos, meses_sem_atendimento_max, intervalo_minimo_dias, prioridade e os 3 modelos de resposta do NPS);
  - expira_em em whatsapp_fila_envios;
  - nova tabela whatsapp_nps_respostas com GRANT, RLS por empresa e leitura com configuracoes.whatsapp ou inovachat.gerenciar.
- whatsapp_automacao_categoria passa a classificar os 6 tipos novos como relacionamento.
- whatsapp_render_modelo e src/lib/whatsappModelo.ts ganham as variáveis de link.
- whatsapp_enfileirar_ciclo ganha os novos gatilhos, a validade, o intervalo do NPS e a precedência do Google. As regras padrão são criadas desligadas.
- whatsapp_reservar_envios passa a cancelar mensagens com prazo vencido e a ordenar por tipo.
- Nova função de aniversário, rodada pelo pg_cron às 09:00 UTC (06:00 em Fortaleza).
- whatsapp_resposta_processar decide entre nota e confirmação e cuida do comentário e das notificações. As respostas são gravadas na fila com atraso de 3 a 8 s.
- Arquivos novos: SatisfacaoTab.tsx e edições em AutomacoesTab, FilaEnviosTab, InovachatPage e no webhook. Os testes ficam em vitest.sql.config.ts.
