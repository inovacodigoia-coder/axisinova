# Triagem — impressão de identificação e acompanhantes

## Decisões confirmadas
- Sem leito alocado, **Leito** mostrará o **local de atendimento**, não “Triagem” nem um leito fictício.
- Etiqueta do paciente: nome completo, nascimento e idade, sexo, número interno do atendimento, setor, cor do risco em texto, data/hora de emissão e código de barras interno.
- Acompanhantes: **uma etiqueta por vez**; nome é o único dado obrigatório.

## O que será entregue
1. Ao clicar em Imprimir na Triagem, abrir **Escolha o tipo de impressão** com três opções de seleção única: pulseira do paciente, etiqueta do paciente e etiqueta de acompanhante. Sem seleção, Imprimir fica desabilitado. Preservar o layout, tamanhos e motivo de reimpressão da pulseira atual.
2. Acrescentar **etiqueta_paciente** e **etiqueta_acompanhante** em Configurações do Laboratório → Impressora/Etiqueta, seguindo o padrão de **etiqueta_nutricao**: tamanho, margem, fonte, negrito e código de barras opcional.
3. Etiqueta de acompanhante conforme a foto: ACOMPANHANTE, nome, Leito/Setor, PAC: nome do paciente, emissão e código de barras; preto sobre papel laranja, sem imprimir fundo. Quebrar linhas e ajustar fonte para preservar nomes e setores completos.
4. Ao selecionar acompanhante, listar os já cadastrados para o atendimento ou permitir adicionar somente o nome. Falha no cadastro impede impressão. Reimprimir sem limite; bloquear novos cadastros quando atingir a quantidade permitida.
5. Acrescentar **Quantidade máxima de acompanhantes por paciente** em Dados da Empresa: inteiro a partir de 1, padrão 1, aplicado ao atendimento em Triagem e Internação.
6. Disponibilizar **Imprimir etiqueta de acompanhante** no painel do leito dos Postos de Coleta e na Internação, usando o mesmo cadastro e o local atual.
7. Registrar tipo, paciente/atendimento, acompanhante quando houver, usuário, emissão e reimpressão. Registrar falha de envio de forma distinta de impressão confirmada, sem apresentar sucesso falso.

## Fontes de dados e vínculo compartilhado
- A Triagem possui seu próprio registro interno; atualmente ele não está ligado diretamente ao pedido laboratorial. Não usar protocolo digitado, senha de fila ou código de faturamento como código de barras. Usar o identificador interno do episódio hospitalar; preservar integralmente a identificação da pulseira existente.
- Vincular o cadastro do acompanhante ao episódio hospitalar iniciado na Triagem. A relação já existente **Triagem → ocupação do posto → solicitação de internação** permite conservar o mesmo episódio durante a transferência; internações sem passagem pela Triagem também terão seu próprio episódio. Nunca unir atendimentos só por nome ou paciente.
- Local atual: leito e posto pela ocupação ativa; na Internação, leito ocupado e sua unidade. Antes da alocação, usar o local/setor cadastrado do atendimento. Como a Triagem atual não guarda um local de origem, acrescentar seleção de local cadastrado para registros que ainda não o tenham, sem inventar um valor.
- Nascimento e sexo: cadastro do paciente vinculado. Dados ausentes serão sinalizados na preparação da etiqueta, sem inventar idade, sexo ou nascimento.

## Detalhes técnicos
- Estender o seletor existente de impressão com opções de seleção única reutilizáveis, sem criar um modal concorrente; impressão das Declarações e Termos continua intacta.
- Cadastro compartilhado em `public.hospital_acompanhantes`, relacionado ao episódio por empresa e identificador interno; relação estável dos registros de Triagem/ocupação/internação com esse episódio. Nome gravado sem parentesco/documento. Essa relação ficará documentada para futura integração com Nutrição, sem alterá-la agora.
- Operações de cadastro e log por funções autenticadas com validação de empresa e permissões existentes. Limite validado no servidor com bloqueio concorrente para não permitir dois cadastros ultrapassarem a cota.
- Novas tabelas com privilégios explícitos e RLS; nenhuma exclusão de histórico clínico, nenhuma credencial de impressão exposta.
- Usar a mesma engine local existente, aguardando confirmação. Abrir impressão do navegador somente quando o tipo não estiver configurado; indisponibilidade ou falha do servidor não deve disparar impressão duplicada automaticamente.

## Validação
- Testes isolados: padrão 1, mínimo 1, limite maior, concorrência, reimpressões, bloqueio sem permissão, isolamento por empresa e acompanhante compartilhado em transferência.
- Testar seleção obrigatória, salvamento com falha, envio confirmado e fallback por tipo ausente; conferir etiquetas com nomes/setores longos e pulseira sem regressão.
- Conferir o fluxo na tela com sessão autorizada e dados descartáveis, sem alterar registros reais nem gerar sessão em nome de usuário sem pedir.
- **Limitação:** não há acesso à Zebra ou ao servidor local da máquina do cliente neste ambiente. Impressão física e cadastro dos tipos por máquina dependerão de validação no equipamento; testes locais não serão apresentados como impressão física verificada.

## Fora de escopo
Nutrição, entrada/saída de visitantes, validade, documento, parentesco, foto, pulseira de acompanhante e mudanças no layout da pulseira atual.
