# Verificação dos alertas

# Declaração — assinatura em branco
- [x] Rodapé sem o nome, o cargo e o registro do responsável técnico pré-impressos: só a linha de assinatura, para o profissional do plantão assinar e carimbar; nome do paciente e do responsável legal continuam saindo.
- [x] Dois testes novos e quatro já existentes de impressão passaram; typecheck e build OK.
- [ ] Conferir a impressão real na Labsaude e publicar para chegar ao endereço oficial: nenhuma impressão executada aqui.

# BI Hospitalar — Etapa 2A: materiais por paciente
- [x] Base inspecionada e plano aprovado: custo novo, saldos/BI reutilizados; frações configuradas por material e atendimento exclusivo de teste autorizado.
- [x] Custo/histórico (0136), permissões materiais.registrar/estornar, consumo congelado e estorno negativo/idempotente com saldo e evento em transação; funções e campos confirmados no banco.
- [x] Formulário compartilhado nos Postos, Internação e atendimento médico; edição de custo/fração no Almoxarifado e novas permissões na matriz.
- [x] 38 testes SQL + 1 de aprazamento passaram; contextos ativos, frações, custo ausente/congelado, saldo, estorno, idempotência e segurança; build OK.
- [ ] Teste autenticado e visual dos três painéis na Labsaude: sessão injetada redireciona ao login; depende de login válido/autorizado. Authenticated path: UNVERIFIED. Nenhum paciente ou saldo real alterado. Sem sessão/anon bloqueados em testes isolados; convidados não são permitidos.

# Ativação restrita — Financeiro, Caixa e solicitações
- [x] Financeiro/Caixa e Almoxarifado ativos somente na Labsaude; novas empresas inativas, navegação oculta nas demais.
- [x] Solicitações desmarcadas em todos os setores, exceto TI – Administração; demais opções preservadas e padrão aplicado a novos setores.
- [x] Quatro testes passaram; nove empresas conferidas, apenas Labsaude ativa e zero setores com marcação incorreta; build OK.
- [ ] Conferir navegação autenticada: depende de sessão válida, a disponível redireciona ao login. Restrição por setor é de navegação/configuração, mantendo RPCs com autorização por empresa e usuário.

# Labsaude — teste operacional de almoxarifado e farmácia
- [x] Gravados e relidos na Labsaude: 10 itens TESTE, 5 solicitações (3 aprovadas e 2 recusadas), Farmácia com saldos 2/3/40/60; medicamentos fictícios inativos, sem alterar registros existentes. Solicitante/decisor sintético do sistema, sem sessão em nome de usuário.
- [x] 24 testes SQL isolados passaram: carga idempotente, aprovação, recusa, transferência, saldos, isolamento e proteção clínica; saldo total 1000 e zero movimentos nas recusas confirmados no banco.
- [ ] Conferir telas e ações com sessão autorizada: sessão injetada redireciona ao login; nenhum login gerado em nome de usuário.

# Almoxarifado — solicitações e transferência por setor
- [x] Cadastro e saldo do almoxarifado, solicitações de todos os setores e decisão atômica com histórico e permissões no banco (0134).
- [x] Acesso compartilhado por setor; medicamentos aprovados ligados ao cadastro e ao saldo da Farmácia.
- [x] Demonstração separada e interativa em /demonstracao/almoxarifado com 5–10 materiais por setor, aprovados/recusados e 10 medicamentos aprovados na Farmácia; nada fictício no cadastro clínico real.
- [x] 9 testes SQL + 6 testes de demonstração; fluxo na tela: solicitar, aprovar, recusar, conferir 10 medicamentos; sem erros e sem excesso de largura no celular.
- [ ] Conferir fluxo operacional autenticado: sessão injetada redireciona a /login; depende de login ativo/autorizado. Nenhum estoque real alterado.

# BI Gestão Hospitalar — Etapa 1.1: cadastro real de medicamentos com custo
- [x] Investigar onde a lista demo de medicamentos é usada (prescrição no leito, painel médico, fila da Farmácia, aprazamento) e responder os 4 pontos de validação do pedido.
- [x] Cadastro de medicamentos por empresa (código interno automático, nome, princípio ativo, apresentação, forma, unidade, custo opcional, ativo/inativo) com histórico de custo.
- [x] Substituir lista demo pelo cadastro real na prescrição e na fila da Farmácia; só ativos em nova prescrição.
- [x] Valor congelado na dispensação (custo vigente × quantidade) em bi_consumo_itens; medicação sem custo segue "sem valor cadastrado".
- [x] Permissões farmacia.medicamentos (ver/criar/editar/inativar) desmarcadas por padrão, com trava no banco; medicamento usado não pode ser excluído, só inativado.
- [x] 9 testes SQL isolados + typecheck.
- [ ] Validar na tela autenticada: depende de login ativo no preview.

# Correção da identificação hospitalar
- [x] Failed to fetch identificado no POST local /print (preparo no banco respondeu 200); verificar conexão antes do trabalho, orientar abertura do AisAxius e permitir nova verificação sem reenvio. 11 testes passaram, build OK; conexão física continua dependente do computador do cliente.
- [x] Corrigir incompatibilidade entre local textual e UUID (0126); 23 testes SQL no esquema compatível com produção e 8 testes de fluxo/envio aprovados, sem impressões reais.
- [x] Expor pulseira e etiquetas em Configuração de Impressora; etiquetas também na Configuração da Triagem, preservando os ajustes atuais da pulseira e o vínculo físico no AisAxius.
- [ ] Conferir seleção na tela autenticada sem enviar impressão real: sessão disponível redirecionou para /login; depende de login ativo/autorizado. Impressora física indisponível.

# Triagem — etiquetas do paciente e acompanhante
- [x] Confirmar fontes do atendimento/local e apresentar plano conforme decisões: local de atendimento, campos aprovados, uma etiqueta por vez.
- [x] Reutilizar seleção de impressão e preservar pulseira; etiquetas configuráveis no padrão Nutrição; PDFs fictícios conferidos com nomes e setores completos.
- [x] Cadastro compartilhado por episódio hospitalar, limite por empresa e registros de impressão com permissões no servidor; banco confirmado (0124–0125).
- [x] Integrar Triagem, painel dos Postos de Coleta e Internação; testes isolados de regras, permissões, fluxo e envio sem impressões reais.
- [ ] Conferir fluxo autenticado completo: sessão disponível redirecionou a /login; depende de login ativo/autorizado. Nenhuma sessão gerada ou cadastro real alterado pela validação.
- [ ] Validar impressora Zebra do cliente: equipamento e servidor local indisponíveis neste ambiente.

# Declarações e Termos
- [x] Criar modelos configuráveis, padrões, variáveis e impressão conforme o pedido.
- [x] Criar cadastro seguro por empresa, editor rico e pré-visualização com cabeçalho compartilhado do laudo; CRUD validado com modelo descartável removido.
- [x] Integrar seleção de modelos ativos, formatos A4/A5 e registro de impressão aos fluxos de atendimento; confirmação do servidor antes de registrar/avançar.
- [x] 37 testes de regras, seleção, falhas e isolamento passaram; PDFs fictícios A4/A5 conferidos e cabeçalho A5 corrigido.
- [ ] Validar impressão física e confirmação do servidor local do cliente: indisponível no ambiente de testes; nenhum documento real enviado. Horários de início/fim não existem no cadastro atual e saem como linhas em branco.

# Filtro de data no Mapa de Trabalho
- [x] Acrescentar "Coleta de" e "Coleta até" na área de Filtros, combináveis com os demais campos; dia comparado no fuso de São Paulo e geração do mapa limpa exame, seleção e datas.
- [x] Cinco testes do utilitário de período (fuso, pontas inclusivas, item sem data) e conferência logado: 71 → 39 só 31/10, bancada 44, bancada + data 28, de=31/12/2026 → 0.

# Edição de Portais Externos
- [x] Incluir edição do nome do acesso e botão com lista de todos os portais e origens, permitindo editar nome/código da origem somente para administradores; unidade vinculada sincronizada de forma atômica.
- [x] Seis testes verificam salvamento, preservação de vínculos, código duplicado, bloqueio sem login e isolamento por empresa; nenhuma alteração em cadastros reais.
- [ ] Verificar apresentação e salvamento na tela autenticada: sessão injetada redirecionou ao login, depende de login ativo no preview; nenhuma sessão gerada.

# Impressão após criar pedido
- [x] Enviar automaticamente todos os documentos selecionados pelo servidor ativo, incluindo termo e etiquetas; preservar confirmação da coleta. 12 testes passaram sem impressões reais.
- [x] Juntar Comprovante e Controle Interno em duas metades de uma folha com linha tracejada; PDF fictício inspecionado nas duas páginas, sem cortes; reforçada a linha divisória pouco visível.
- [ ] Validar após criar pedido na tela autenticada e na impressora física: sessão disponível redirecionou para /login; servidor local do cliente indisponível no ambiente de testes. Termo usa texto padrão e aguarda modelo oficial da clínica.

# Código de barras por tubo
- [x] Enviar codigoAlfanumerico da prévia por tubo nos fluxos existentes (pedido e etiqueta de teste), preservando codigoAmostra e codigoExterno; interface comum aceita cliente/lote/colhedor, sem fluxos próprios de lote/colhedor no projeto.
- [x] Cinco testes verificam os três tipos, códigos distintos do pedido 296-00, clique Imprimir do modal e compatibilidade sem o campo; sem impressão real. Impressão física depende do AisAxius 1.0.27+ no computador do cliente.

# Caixa do operador — Financeiro Etapa 2
- [x] Levantar pagamentos/recibos existentes e integrar sessões, movimentos e transferências sem alterar TISS/guias/orçamentos (0116–0117).
- [x] Implementar Caixa, recibos e fechamento imprimíveis, histórico/CSV e permissões independentes sob a chave Financeiro.
- [x] Testar segurança, idempotência, saldos, numeração e fechamento: 130 testes SQL + 3 unitários; empresas atuais desligadas; relatório criado.
- [ ] Validar fluxo autenticado em dados descartáveis: sessão injetada redirecionou para /login; depende de login autorizado e empresa de teste com Financeiro ativo. Não ativar empresas existentes nem gerar sessão sem autorização.

# Financeiro — Etapa 1
- [x] Levantamento: telas AP/AR/resumo mock; reaproveitadas rotas /app/financeiro e auditoria; TISS/guias/orçamentos/pagamentos intactos.
- [x] Contas, categorias, lançamentos, parcelas/recorrência, baixas/estorno/cancelamento, saldo/fluxo, RLS e comprovantes privados; migrations 0112–0114.
- [x] Abas, filtros, CSV, perfis e ativação pelo Super Admin; 8 empresas atuais desligadas, labsaude FALSE, nenhum lançamento operacional criado.
- [x] 17 testes financeiros SQL isolados; suíte SQL anterior completa 105/105 antes dos 2 testes adicionais; guarda fiscal fora da retenção e desvinculação LGPD (RPC + trigger defensivo).
- [ ] Validar fluxo completo na tela com login autorizado e empresa de teste com Financeiro ativo: navegador disponível está sem sessão e redireciona para /login; não gerar sessão nem ativar empresa existente sem autorização.

# Chat Interno entre Equipe — Etapa 1
- [x] Banco: conversas (direta única por par, grupo, canal por setor sincronizado), participantes, mensagens (texto 4000, anexo 10 MB, resposta, exclusão lógica, sistema), RLS por participante+empresa, funções SECURITY DEFINER com REVOKE/GRANT, módulo chat_interno ligado por padrão, retenção 24 meses no job existente (Simulação).
- [x] Bucket privado chat-interno-anexos com políticas por participante.
- [x] Tela /app/chat-interno (duas colunas, busca, nova conversa, painel de grupo), item no menu com badge, tempo real + digitando + presença, som/toast com silenciar.
- [x] Painel do Super Admin para ligar/desligar por empresa; contagens do chat na tela de retenção.
- [x] 10 testes SQL isolados passaram (suíte completa 90/90); typecheck e build OK.
- [ ] Validar a tela logada (conversa, anexo, tempo real): depende de login ativo do usuário no preview.

# Retenção completa WhatsApp / InovaChat / CRM
- [ ] Ampliar job existente: anonimização de leads fechados, respostas antes da fila, ignoradas e auditoria; preservar leads abertos e opt-out. Bloqueio: crm_leads.contato_id obrigatório precisa aceitar NULL; ferramenta proíbe DROP NOT NULL com permissões atuais. Não substituir por contato fictício ou deixar vínculo identificável.
- [ ] Excluir respostas na exclusão do titular, registrar e mostrar novas contagens.
- [ ] Testar isoladamente e verificar modo Simulação preservado, sem exclusões reais.

# Pacote de ajustes WhatsApp / InovaChat / CRM
- [x] Exclusão de número com permissão e empresa verificadas, apelido obrigatório, sucesso remoto antes da exclusão local e auditoria mascarada.
- [x] Preço da solicitação lido da configuração do Super Admin.
- [x] Nome do paciente prioritário no InovaChat e notificações, perfil WhatsApp secundário.
- [x] Evolução automática ligada apenas para empresas novas; labsaude confirmada FALSE antes/depois e demais configurações existentes preservadas.
- [x] 45 testes isolados passaram sem envios nem exclusões reais; preview sem erros.
- [ ] Conferir telas com login ativo: sessão disponível redirecionou para /login; depende de novo login do usuário.

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

# Gráficos do equipamento na digitação de resultados
- [x] Clique na miniatura abre o gráfico quase em tela cheia, com botão Fechar, zoom (100%–400%) e data de recebimento; antes o preview abria atrás da tela de digitação.
- [ ] Validar na tela logada: sem sessão autorizada, o preview redireciona ao login.

# BI de Gestão Hospitalar — Etapa 1 de 3
- [x] Investigação e 6 pontos de validação respondidos; decisões: episódio estendido ao totem/recepção, evasão manual com motivo, chegada = primeiro que ocorrer. Farmácia/estoque são fictícios: medicação gravada "sem valor cadastrado".
- [x] Habilitação por empresa (bi_hospitalar_habilitado, desabilitado por padrão; painel Super Admin), Setores via module_overrides, Perfis com bi_hospitalar.ver/exportar/configurar e trava no banco (0127, 0129).
- [x] bi_jornada_eventos imutável + gatilhos em senha, pedido, triagem, leitos, encaminhamentos, medicação, exames e internação; falha de evento registrada em bi_jornada_erros sem bloquear a operação (0128, 0130-0132).
- [x] bi_consumo_itens com valor congelado (exame pelo código interno + preço do convênio; medicação sem valor) e view bi_jornada_segmentos com segmento em andamento.
- [x] Menu "BI Gestão Hospitalar", rota /app/bi-hospitalar com tela-base, auditoria bi_acesso_log e botão "Registrar evasão" na Recepção e na Internação.
- [x] 16 testes SQL isolados passaram (módulo, permissões, jornada completa, valor congelado, segmentos, isolamento, evasão); typecheck e build OK.
- [ ] Validar na tela autenticada com paciente de teste descartável: depende de login ativo/autorizado no preview.
- [ ] Etapa 2 (Relatório por Paciente) e Etapa 3 (dashboards, metas, gargalos, IA): aguardando os próximos pedidos.

# Sumário de Urina — grafia no Mapa de Trabalho
- [x] Conferidos os 3 pontos: UROBILINOGÊNIO:, LEUCÓCITOS: e Biurato de amônia já saem assim na folha (o PDF modelo traz UROBINOGÊNIO, LEUCÓCITOS sem dois-pontos e "amonia").
- [x] Folha movida para src/components/lab/MapaSumarioUrina.tsx com teste que trava a grafia; typecheck e build OK.
- [ ] Conferir na tela a folha impressa do mapa 1005: o acesso de teste disponível não passa do login.

# Resultado novo do aparelho — sobrescrever/reteste (pedido Inova CodigoIA)
- [x] Banco: histórico de valores substituídos, estado de reteste no exame, RPCs solicitar/cancelar reteste.
- [x] receive-instrument-result: sobrescreve não liberado; 409 exame_liberado sem reteste; reteste reabre; ignored_older por result_datetime; idempotência mantida.
- [x] list-orders-for-integration: expor status retest_requested.
- [x] Tela de digitação: botão Solicitar reteste (aparelho) em exame liberado + indicador "atualizado pelo aparelho às HH:MM" com valor anterior.
- [x] Testes: decisão pura (7 casos de aceite) + SQL PGlite dos RPCs; typecheck e build.
- [x] Atualizar /docs (apiDocs.ts) com o novo contrato.
