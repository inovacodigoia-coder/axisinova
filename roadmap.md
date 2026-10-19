# Verificação dos alertas

# Frequência e SAIR por categoria WhatsApp
- [ ] Derivar categoria e aplicar frequência/SAIR somente a relacionamento, inclusive ação manual.
- [ ] Atualizar selo e indicação dos limites; testar dois serviços no mesmo dia e adiamento do segundo pós-atendimento para 09:00.

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
