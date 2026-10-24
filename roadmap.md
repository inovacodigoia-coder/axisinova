# Verificação dos alertas

# Pacote de ajustes WhatsApp / InovaChat / CRM
- [ ] Exclusão de número com permissão e empresa verificadas, apelido obrigatório, sucesso remoto antes da exclusão local e auditoria mascarada.
- [ ] Preço da solicitação lido da configuração do Super Admin.
- [ ] Nome do paciente prioritário no InovaChat e notificações, perfil WhatsApp secundário.
- [ ] Evolução automática ligada apenas para empresas novas; configurações existentes preservadas.
- [ ] Testes isolados e verificação das telas sem envios nem exclusões reais.

# Exames adicionados ao editar guia
- [x] Corrigir bancada ausente em exames adicionados à guia: usar catálogo como reserva e filtro compartilhado, preservando coleta e resultados existentes.
- [x] 11 testes passaram; Ácido Úrico do pedido 8-00 confirmado recebido no banco, sem alterações nos registros reais.
- [ ] Validar a digitação na tela logada: sessão disponível redirecionou para /login; depende de novo login do usuário.

# Cadastro /cadastro
- [x] Corrigir origem MATRIZ duplicada na criação da empresa e restringir aviso de CNPJ duplicado à chave correta; falha na consulta não libera cadastro.
- [x] Preservar campos ao voltar entre etapas; telefone e e-mail comerciais opcionais (ausentes como null).
- [x] 8 testes passaram; navegação Empresa → Endereço → Administrador → voltar e avançar preservou os dados, com contatos comerciais vazios. Nenhuma empresa real criada.

# Etapa 12B — CRM
- [x] Configuração Manual/Automático, temperatura com trava e alertas, evolução apenas para frente (desligada por padrão).
- [x] Lembretes e ações de retorno; Resultados agregados e etiqueta atualizada no InovaChat.
- [x] Testes isolados de regras, permissões, idempotência e falhas sem bloquear os fluxos originais: 67 testes SQL e 4 de telefone/prazos passaram; preview sem erros.
- [ ] Validar tela logada: tentativa em /app/crm redirecionou ao login; depende de sessão autorizada. Nenhuma mensagem enviada ou configuração de envio alterada.

# Respostas automáticas à nota
- [x] Corrigir agradecimento no teste NPS sem registrar nota real; correlação, repetição e isolamento verificados (42 testes passaram, sem envio real).
- [ ] Confirmar chegada no celular com um novo teste iniciado pelo usuário; nenhum envio real autorizado nesta correção.

# Frequência e SAIR por categoria WhatsApp
- [x] Derivar categoria e aplicar frequência/SAIR somente a relacionamento, inclusive ação manual.
- [x] Atualizar selo e indicação dos limites; testar dois serviços no mesmo dia e adiamento do segundo pós-atendimento para 09:00 (15 testes SQL + 23 regressões passaram, sem envio real).

- [x] Verificar permissões atuais da numeração: authenticated e service_role autorizados; alerta registrado como falso positivo, sem ampliar acesso.
- [x] Verificar impressão: documento real com 140 resultados e 80 observações preservou todos os marcadores no PDF; alerta de corte registrado como falso positivo, sem alterar impressão.

# Dados atuais do paciente nos atendimentos

- [x] Fazer Detalhes Atendimento consultar sempre o cadastro atual do paciente.
- [x] Atualizar a listagem após editar Informações do Cliente.
- [x] Exibir sexo em português, nascimento em dia/mês/ano e máscaras de CPF, RG, telefone e endereço.
- [x] T01 Triagem Lab: cadastros e permissões
- [ ] T02 malote / T03 tela de triagem (próximos prompts)

# Botão de saída nas automações WhatsApp
- [x] Substituir aviso por botão na prévia, envio automático e teste da regra.
- [x] Processar o botão pela mesma regra SAIR e validar sem envio real (23 testes passaram).
- [ ] Validar na tela logada e no celular: sessão disponível redirecionou ao login; envio real depende de autorização.

# Etapa 11B — automações de relacionamento
- [x] Links, 6 tipos novos (desligados), validade/"Prazo vencido", prioridade, aniversário diário, NPS com respostas/comentário/sino, aba Satisfação, última nota no InovaChat, respostas rápidas.
- [x] 11 testes SQL + 4 de texto (sem envio real).
- [x] Integrar anonimização NPS à retenção antes de limpar fila, contar simulação/execução e apagar NPS na exclusão LGPD com auditoria (lotes de 500 e estatísticas preservadas).
- [x] Abrir conversa específica na Satisfação e sino com resolução segura no servidor e aviso sem conversa; 37 testes SQL passaram, função de retenção publicada.
- [ ] Validar na tela logada e no celular: sem sessão disponível; gerar sessão exige autorização, envio real não autorizado.
- [x] Etapa 12A CRM: funil, leads, configuração, integração InovaChat, exclusão LGPD; 8 testes SQL do CRM passaram.
- [ ] CRM: "Cadastrar paciente" pré-preenchido — o cadastro atual não aceita dados de entrada; hoje abre o cadastro vazio e depois vincula.
