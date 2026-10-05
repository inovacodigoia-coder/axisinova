# Etapa 6A — Confirmação de agendamento entra na fila do WhatsApp

Nenhuma mensagem é enviada nesta etapa. As linhas ficam com status "agendada" até a Etapa 6B.

## O que já existe (conferido no banco)
- A fila já tem todas as colunas, menos `horas_antes`.
- O índice único parcial (agendamento_id, tipo) para status diferentes de cancelada/falha já existe — não será recriado.
- Pacientes com telefone de 10 dígitos (sem o 9): 4 de 707. Eles serão ignorados, como pedido (ponto 3).

## 1. Banco (migration)
- Coluna `horas_antes smallint` com check (24, 48), opcional.
- `whatsapp_enfileirar_confirmacao(p_agendamento_id, p_horas_antes, p_data_envio)`: SECURITY DEFINER, search_path fixo, EXECUTE só para authenticated. Segue os passos a–k do documento na ordem: liberação, número cadastrado, dados do agendamento, passado, primeiro telefone válido (regra 55/DDD/9), rodízio de modelo com FOR UPDATE pulando inativos, texto pronto via `whatsapp_render_modelo`, 09:00 America/Fortaleza (ou agora), insert, idempotência (JA_ENFILEIRADA sem avançar o ponteiro, protegida também pelo índice único), aviso NENHUM_NUMERO_CONECTADO. Retorna sempre o JSON padronizado, sem exceção para regras de negócio.
- `whatsapp_cancelar_envios_agendamento(p_agendamento_id)`: cancela só linhas "agendada"; retorna `{ ok, canceladas }`.
- Médico com título: vem do cadastro do médico (campo de tratamento/nome completo); se não houver título, usa o nome como está.

## 2. Tela Novo Agendamento (layout igual)
- Após salvar com sucesso e com a chave ligada, chama o enfileiramento com 24h/48h e a data "Envio" mostrada. Falha nunca desfaz o agendamento; toasts conforme os códigos do documento.
- Botão bloqueado durante o salvamento (evita clique duplo); a função também é idempotente.
- Balão cinza trocado por: "A mensagem segue os modelos configurados em Configurações > WhatsApp, alternando entre eles."

## 3. Cancelamento e remarcação
- Ponto único na função de alterar agendamento: quando o status vira cancelado, falta ou atendido/finalizado, chama o cancelamento da fila; quando muda data, hora ou médico, cancela e reenfileira usando o `horas_antes` da última linha cancelada (se não houver, não enfileira).
- Fluxos que passam por ela: tela de Agendamento e tela de Atendimento médico. No retorno vou listar todos os fluxos encontrados e os que ficarem de fora (ex.: se não houver tela de remarcação).

## 4. Testes
- Simulação no banco com dados de teste criados e apagados no fim: rodízio 1-2-3-1 e 1-3-1-3 com modelo 2 inativo, clique duplo, paciente sem celular, cancelamento, remarcação e bloqueio entre empresas.

## Pontos de validação (assumidos como no documento)
1. Disparo às 09:00 do dia de envio.
2. Agendamento em cima da hora: enfileira para agora.
3. Telefones de 10 dígitos ignorados (4 pacientes hoje).
