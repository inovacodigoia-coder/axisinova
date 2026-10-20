# Etapa 12B — Temperatura, automações, retornos e resultados do CRM

## Decisões confirmadas
- Temperatura começa em **Manual**, com opção de mudar para **Automático** por empresa, sem recalcular o passado.
- Silêncio superior a **5 dias** esfria o lead; ajuste manual protege a temperatura por **7 dias**. Ambos os prazos são editáveis.
- Manter a lista inicial de palavras quentes e permitir **criar, editar, acrescentar e remover** palavras ou expressões.
- Evolução automática começa **desligada**; cada empresa pode ativá-la.
- Sem exclusão automática de leads, notas ou eventos nesta etapa. A exclusão solicitada pelo titular permanece disponível.

## O que será construído
### 1. Temperatura e automações
Adicionar à engrenagem do CRM uma aba disponível apenas para quem gerencia o CRM:
- Controle Manual / Automático, prazos, lista editável de palavras quentes e opções de evolução e alerta de lead quente.
- No editor de etapas, escolher um único destino por evento: primeira resposta do atendente, agendamento criado ou atendimento finalizado.
- Associar os eventos às etapas padrão Em conversa, Agendado e Compareceu, sem ligar a evolução automática.

### 2. Temperatura automática
- Mensagem recebida com palavra ou expressão quente inteira deixa o lead quente; normalização ignora maiúsculas e acentos.
- Lead frio que volta a escrever fica morno, ou quente se encontrar uma palavra quente.
- Rotina diária às **07:00, America/Fortaleza**, esfria leads abertos sem mensagem recebida há mais do que o prazo configurado; sem mensagem, conta desde a criação do lead.
- Entrada na etapa de agendamento ou ganho aquece; entrada em perda esfria. As regras de etapa são aplicadas na transição, antes do fechamento; leads já fechados não são reavaliados.
- Em modo Manual, nenhuma regra automática muda a temperatura. Em Automático, respeitar a trava manual, exceto na entrada em perda.
- Detalhe mostra a validade do ajuste e **Voltar ao automático**. Cartão e detalhe mostram selo **auto**, com a regra responsável.
- Alerta de lead quente ao responsável, no máximo um por lead por dia, sem telefone e com abertura do cartão pelo sino.

### 3. Evolução do cartão
Quando a empresa ativar a opção:
- Primeira mensagem bem-sucedida de um atendente avança para a etapa configurada; mensagens automáticas, eventos internos e envios com falha não contam.
- Agendamento criado avança o lead do paciente vinculado. Se não estiver vinculado, conferir o telefone no servidor e vincular apenas quando a correspondência for inequívoca, registrando a conversão.
- Atendimento marcado como concluído na Agenda avança para a etapa configurada; ganho preenche a data de fechamento. Não confundir a criação de um atendimento na recepção com conclusão clínica.
- Só avançar para etapas posteriores e só em leads abertos. Repetições não duplicam mudanças ou eventos; falhas do CRM não impedem responder, agendar ou concluir atendimento.

### 4. Retornos
- Rotina diária às **08:00, America/Fortaleza**, avisa sobre retornos vencidos ou até o fim do dia: responsável do lead ou gestores quando não houver responsável, no máximo um aviso por lead por dia para cada destinatário.
- Resumo **Retornos hoje** e filtro **Retorno vencido ou hoje**, apenas para leads abertos.
- No detalhe: **Concluir retorno**, **Adiar 1 dia**, **Adiar 3 dias**, **Adiar 7 dias** e **Escolher data**, respeitando a autorização de edição e registrando o histórico.

### 5. Resultados
Aba disponível a quem visualiza o CRM, com período de 30, 90, 365 dias ou personalizado, responsável e origem:
- Leads criados, convertidos, taxa de conversão, perdidos, tempo médio até o primeiro agendamento e valor estimado dos convertidos.
- Funil por etapas atingidas, ranking de motivos de perda e tabelas por origem e responsável.
- Usar a mesma população de leads criados no período para criados, convertidos e taxa; conversões contam vínculos efetivamente realizados até o fim do período. Exibir a definição do período junto aos filtros, sem dados individuais.
- Usar identificadores estáveis para novas entradas em etapas e data de conversão. Para eventos antigos, reconstruir apenas correspondências inequívocas; não inventar dados históricos indisponíveis.

### 6. InovaChat e segurança
- Etiqueta do lead acompanha a etapa e temperatura atuais, inclusive para usuários autorizados a criar leads pelo InovaChat.
- Mensagens são avaliadas no servidor e nunca copiadas para o CRM. Avisos ao vivo continuam sem conteúdo nem telefone.
- Preservar todas as regras atuais do InovaChat, automações WhatsApp e fila. **Nenhuma mensagem real será enviada**, nem serão alterados os interruptores de envio.

## Detalhes técnicos
- Criar `crm_config` com acesso de leitura restrito e escrita por RPC de gestão, GRANTs e RLS; inicializar também as empresas que já têm CRM ligado, sem recalcular leads existentes.
- Acrescentar automação única por empresa às etapas; acrescentar trava, regra de temperatura e data de conversão aos leads, e identificadores de etapa/regra aos eventos.
- Hooks protegidos no banco cobrem mensagens recebidas, envios bem-sucedidos e tentativas manuais que atualizam a mesma mensagem, criação de agendamento e transição de `appointments.sched_status` para `completed`. Cada hook isola falhas do CRM da ação original.
- Reutilizar notificações existentes com deduplicação atômica por lead, tipo, dia e destinatário; abrir `/app/crm?lead=<id>`.
- Resultados calculados em RPCs com empresa e permissão verificadas no servidor, retornando somente agregados.
- Configurar as duas rotinas diárias verificando o fuso do agendador; não modificar os jobs WhatsApp.

## Validação
- Testes PostgreSQL isolados: modo Manual, palavras inteiras e acentos, retomada, silêncio acima de 5 dias, trava de 7 dias e liberação, perda, avanço sem regressão, mensagens do sistema/falhas ignoradas e repetição idempotente.
- Testar vínculo de paciente sem ambiguidades, isolamento entre empresas, visualizador sem edição, notificações diárias sem duplicação, conclusão/adiamento de retornos e métricas com números concretos.
- Simular falha do CRM e verificar que o fluxo original continua. Rodar regressões CRM 12A e testes afetados.
- Verificar telas com a sessão já disponível, sem gerar sessão em nome de outro usuário. Testes operacionais somente com dados descartáveis, removidos ao final; sem envios reais.

## Fora de escopo
IA, campanhas, anúncios, múltiplos funis, previsão de receita, importação, SLA, tarefas complexas, retenção automática e movimento automático para trás. O cadastro de paciente pré-preenchido pendente da 12A não faz parte desta etapa.