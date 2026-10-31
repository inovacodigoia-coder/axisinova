# Declarações e Termos configuráveis

## Resultado
Adicionar **Declarações e Termos** às Configurações gerais da empresa e usar seus modelos na impressão do atendimento, seguindo a declaração enviada como referência.

## 1. Cadastro de modelos
- Listar nome, tipo, formato A4/A5, status e selo **Padrão**.
- Oferecer Novo modelo, Editar, Duplicar, Pré-visualizar, Ativar/Inativar, Excluir e Restaurar modelo original.
- Disponibilizar às empresas atuais e novas os dois padrões: **Declaração de Comparecimento** e **Termo de Consentimento para Coleta e Tratamento de Dados**.
- Manter originais globais somente leitura. Editar um padrão cria uma personalização da empresa; restaurar volta ao original sem duplicar opções na impressão.
- Manter logs de impressão mesmo quando um modelo personalizado for excluído, sem excluir registros clínicos.
- Gestão dos modelos restrita aos administradores da empresa; impressão disponível a quem já pode imprimir o atendimento, com validação no servidor.

## 2. Editor e pré-visualização
- Nome, tipo, formato padrão, ativo e escolha de assinaturas: paciente, responsável legal, responsável da empresa ou combinações de duas linhas.
- Editor rico com negrito, itálico, sublinhado, alinhamento, listas e tamanho de fonte.
- Painel lateral com todas as variáveis do documento enviado; clicar insere o campo no cursor e o destaca no editor.
- Validar variáveis desconhecidas ao salvar e sanitizar o texto antes de salvar e exibir.
- Prévia com dados fictícios identificados como exemplo, no mesmo formato e apresentação da impressão.
- Declaração com título **DECLARAÇÃO** centralizado, corpo justificado, local/data e assinatura conforme a foto.
- Termo com identificação, autorização de coleta, exames do atendimento e ciência sobre a LGPD. Mostrar o aviso **“Revise o texto com o responsável jurídico antes de usar.”**

## 3. Preenchimento e apresentação
- Preencher exclusivamente com o pedido aberto, cadastro atual do paciente e dados da empresa.
- Implementar todas as variáveis de Paciente, Atendimento, Empresa e Emissão especificadas no arquivo.
- Campos ausentes, incluindo horários de início/fim quando não registrados, saem como **______**; não inventar horários nem solicitar digitação na impressão.
- Lista de exames usa nome e código interno do catálogo, nunca TUSS/ANS.
- Datas e horários no fuso de São Paulo, com dia da semana e mês em português; cidade vem do cadastro da empresa.
- Extrair o cabeçalho atual do laudo para uso compartilhado, preservando sua apresentação e configuração. Alterações posteriores no cabeçalho refletem nos documentos.
- Usar o mesmo renderizador para prévia e impressão, com assinatura configurável e quebra de página adequada a A4/A5.

## 4. Integração com a impressão
- Substituir o termo fixo atual pelos modelos ativos da empresa nos fluxos de **Cadastro de Atendimento** e **Detalhes do Atendimento**.
- Nenhum ativo: aviso **“Nenhum modelo cadastrado”** e acesso às Configurações, respeitando a permissão do usuário.
- Um ativo: seguir direto com esse documento, sem seleção adicional.
- Dois ou mais ativos: segundo passo **“Escolha o documento”**, com seleção múltipla e formato por documento, iniciado no padrão de cada modelo e alterável para A4/A5.
- Integrar os documentos à fila existente, sem alterar comprovantes, controle interno, etiquetas ou confirmação de coleta. Preservar comprovante e controle juntos na mesma folha.
- Enviar pelo servidor local quando disponível e oferecer impressão pelo navegador como alternativa.
- Registrar usuário, data/hora, modelo, atendimento e formato após o envio aceito pelo servidor local ou a conclusão do diálogo do navegador. Não apresentar esse registro como prova de saída física do papel.
- Configurar margens e papel; cabeçalhos/rodapés automáticos do navegador dependem de sua configuração e não podem ser desativados obrigatoriamente pelo site.

## Detalhes técnicos
- Criar `document_templates` e `document_print_logs` no Lovable Cloud, com os campos do pedido, concessões explícitas e isolamento por empresa.
- Resolver padrões globais e personalizações sem criar cadastros operacionais fictícios. Inserção dos dois padrões separada das alterações de estrutura.
- Escritas e registro de impressão por funções autenticadas, verificando empresa, permissão e vínculo do atendimento; logs não editáveis pelo navegador. Não criar novos perfis de usuário.
- Usar editor rico consolidado com nós de variável e sanitização por lista permitida. Validar nomes, tamanhos, formatos, assinatura, variáveis e conteúdo também no servidor.
- Criar registro central de variáveis e renderização compartilhada; dados interpolados são escapados antes de entrar no HTML.
- Reutilizar a geração de PDF e comunicação com impressora existentes; não alterar integrações do Apoio ou envio de mensagens.
- Registrar as decisões estruturais em AGENTS.md e acompanhar as etapas no roadmap.

## Verificação
- Testes isolados para padrões/personalizações, restauração, ativos, decisões de seleção 0/1/2+, formatos, variáveis ausentes/inválidas, sanitização e fuso.
- Testes de permissões, isolamento entre empresas, atendimento de outra empresa e preservação de logs após exclusão de modelo.
- Testar regressão da fila e do comprovante/controle na mesma folha.
- Conferir editor, prévia e seleção na tela com sessão autorizada, sem gerar sessão em nome de terceiros.
- Gerar PDFs com dados fictícios em A4/A5 e inspecionar todas as páginas para cortes, sobreposição e assinatura. Não enviar impressão real nem criar pedidos clínicos reais durante os testes.
- Impressão física final depende da impressora local e de um teste autorizado pelo usuário.

## Fora do escopo
Assinaturas digitais ou em tablet, WhatsApp/e-mail, histórico de versões, anexação do documento assinado e mudanças na configuração do cabeçalho do laudo.