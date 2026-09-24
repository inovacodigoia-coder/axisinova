# Etapa 2 — Postos de Coleta e Leitos

## O que será construído
1. **Cadastro de Postos** (Configurações): posto ligado a um hospital, com leitos de nome livre (sugestão automática "Leito 01, 02..."). Leitos podem ser inativados, nunca apagados.
2. **Mapa de Leitos** (`/app/postos-coleta`): grade por posto com cores: Livre (verde), Ocupado (nome do paciente + cor Manchester), Higienização (amarelo), e o selo "Fora do leito" quando o paciente está em outro setor. Atualiza em tempo real.
3. **Alocação manual**: lista de pacientes triados/chamados à esquerda; o profissional escolhe o paciente e um leito livre.
4. **Painel do leito**: dados do paciente, classificação, prescrições, doses aprazadas com alerta (próxima em até 15 min = amarelo; atrasada = vermelho), histórico de encaminhamentos e mudanças de status.
5. **Medicação ponta a ponta**: médico prescreve (medicamento, dose, via, intervalo, nº de doses) → gera solicitação na farmácia → a tela de Prescrições/Dispensação da farmácia (hoje fictícia) passa a usar dados reais e marca "Dispensado" → enfermagem registra cada dose (horário previsto x real). Sem prescrição dispensada não há registro de administração.
6. **Encaminhamento**: Laboratório, Raio-X e setores configuráveis por hospital (começando com ECG e Ultrassom). O leito continua ocupado; o paciente aparece na fila do setor e como "fora do leito". Ao concluir no setor, volta ao mesmo leito automaticamente.
7. **Liberar Leito**: motivo "Alta do posto" ou "Encaminhado para internação" → Higienização → botão "Marcar como Livre".

## Respostas assumidas para os pontos de validação
- Nomes dos leitos: livres, sugestão "Leito 01".
- Farmácia: a tela existe só com dados fictícios; será ligada ao banco nesta etapa.
- Outros setores: ECG e Ultrassom como padrão, editáveis.

## Detalhes técnicos
- Tabelas novas (company_id, RLS, GRANTs): `collection_posts`, `beds`, `bed_occupancies`, `bed_status_log`, `bed_referral_sectors`, `bed_referrals`, `prescriptions`, `prescription_items`, `pharmacy_dispensations`, `medication_doses`.
- RPCs transacionais: `bed_allocate` (bloqueia leito ocupado/higienização, 1 paciente por leito via índice único parcial), `bed_release`, `bed_mark_clean`, `bed_refer`, `bed_referral_return`, `prescription_create` (gera doses e solicitação), `pharmacy_dispense`, `dose_administer` (exige dispensação). Todas gravam `bed_status_log` com usuário e horário.
- Realtime nas tabelas `beds`, `bed_referrals`, `medication_doses`.
- Nada é apagado fisicamente (inativação/cancelamento).
- Menu: item "Postos de Coleta" com permissões `postos.ver/alocar/liberar/prescrever/administrar`.
