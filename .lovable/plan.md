# Resposta CONFIRMAR sem efeito: diagnóstico e ajuste

## O que a conversa mostra

As duas mensagens na imagem estão em balões verdes, e a citação do CONFIRMAR traz "Você" como autor. No WhatsApp isso só acontece quando as duas foram enviadas pelo próprio aparelho em que você está. Ou seja, o botão foi tocado no WhatsApp da clínica (número "Teste axis inova", final 5482), e não no celular do paciente (final 1607).

Para o sistema, esse toque é uma mensagem enviada pela clínica para o paciente, não uma resposta do paciente. Por isso ela é descartada de propósito, nos dois lugares:
- no filtro do WhatsApp, que não repassa mensagens enviadas pelo próprio número;
- no receptor, que ignora mensagens marcadas como enviadas por mim.

Esse bloqueio existe para que a clínica nunca "confirme" um agendamento no lugar do paciente, nem gere respostas automáticas em loop.

Não foi encontrado erro no recebimento. A mensagem de confirmação passou de "enviada" para "entregue" sozinha, o que comprova que o canal de atualizações está funcionando.

## Como testar corretamente

1. Envie uma nova confirmação para o paciente de teste.
2. Toque CONFIRMAR **no celular do paciente** (final 1607), não no WhatsApp da clínica.
3. Em poucos segundos: o agendamento muda para Confirmado, o paciente recebe o agradecimento e a Central de Confirmações mostra a resposta.

## Ajuste proposto (para não ficar no escuro de novo)

Hoje, quando uma mensagem é descartada, nada fica registrado. Isso tornou este caso difícil de enxergar. O ajuste:

- Registrar no diagnóstico do Super Admin, por até 7 dias, **o motivo** de cada mensagem descartada que pareça resposta de confirmação. Os motivos: enviada pela própria clínica, grupo, sem código reconhecido ou formato desconhecido.
- Não guardar texto nem telefone, apenas motivo, tipo e horário.
- Em "Verificar webhook", mostrar esses motivos em linguagem simples, por exemplo: "Toque feito no WhatsApp da clínica — ignorado".
- Ampliar a leitura do toque no botão para formatos alternativos que o WhatsApp pode enviar (identificador do botão em outro campo). Assim um toque legítimo do paciente não se perde por diferença de formato.

Nada muda no envio e nenhuma mensagem é enviada durante o ajuste.

## Detalhes técnicos

- `whatsapp-webhook/processarRecebida`: antes de cada `return` de descarte, chamar `diagnosticar` com um `motivo` (`proprio_numero`, `grupo`, `sem_acao`, `formato_desconhecido`). Só faz isso quando o texto tem até 30 caracteres ou há um id de botão, para não registrar conversas comuns.
- Ler o id do botão também de `m.content?.selectedButtonId`, `m.content?.buttonId` e `m.vote`, além de `m.buttonOrListid`; o texto também de `m.content?.text`.
- Adicionar a coluna `motivo` em `whatsapp_webhook_diagnostico` (migration) e incluí-la no retorno de `verificar_webhook` e em `WhatsappWebhookCheck.tsx`.
- Manter `fromMeYes`/`wasSentByApi` excluídos e o descarte de `fromMe`: essa regra de segurança não muda.
