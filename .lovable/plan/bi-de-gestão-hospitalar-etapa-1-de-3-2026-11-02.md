# BI de Gestão Hospitalar — Etapa 1 de 3

Base de eventos da jornada do paciente + habilitação do módulo + permissões. Sem relatórios nem gráficos nesta etapa.

## Decisões confirmadas
- **Atendimento único**: estender `hospital_episode_id` (já usado em Triagem/Postos/Internação) para a senha do totem (`queue_tickets`) e o pedido da recepção (`attendance_orders`).
- **Evasão**: ação manual "Registrar evasão" (recepção/internação) gera evento de saída com motivo.
- **Chegada sem totem**: o primeiro que ocorrer entre cadastro na recepção e entrada na triagem.
- **Custo de medicação**: ver alerta abaixo — não existe custo real hoje.

## Alerta importante (regra "avisar, não inventar")
Os 3 medicamentos da Farmácia e os 2 do Estoque que aparecem na tela são **dados de demonstração (fictícios)** — não existem tabelas de medicamentos/estoque no banco. Portanto:
- Nesta etapa, medicações consumidas são gravadas com valor nulo e marca **"sem valor cadastrado"**, como previsto no pedido.
- Para ter custo real, é preciso criar o cadastro real de medicamentos com custo (tarefa separada, fora desta etapa). Posso fazer em seguida se desejar.

## 1. Habilitação do módulo por empresa
- Nova coluna `companies.bi_hospitalar_habilitado boolean not null default false` (padrão dos módulos existentes: `crm_habilitado`, `inovachat_habilitado` etc.).
- Toggle "BI de Gestão Hospitalar" na tela do Super Admin (CompanyDetailPage), seguindo o padrão dos painéis existentes.
- Novas empresas e existentes nascem **desabilitadas**.
- Módulo desabilitado = sem menu, rota bloqueada e banco recusa leitura (função de permissão checa a flag da empresa).

## 2. Setores
- "BI Gestão Hospitalar" aparece em Setores como liga/desliga por setor via `module_overrides` (padrão existente por rota), desabilitado por padrão.

## 3. Perfis de Acesso
- Novo grupo `permissions.bi_hospitalar` com ações `view` / `export` / `config`, desmarcado por padrão em perfis novos e existentes.
- Só aparece para configuração quando o módulo está habilitado na empresa.
- Trava no banco: função `bi_hospitalar_tem_permissao(acao)` (SECURITY DEFINER, REVOKE PUBLIC/anon) checando flag da empresa + permissão do perfil; usada nas policies RLS.

## 4. Menu e tela-base
- Item "BI Gestão Hospitalar" no menu lateral, visível só se módulo habilitado + permissão `view` + setor.
- Rota `/app/bi-hospitalar` com guarda; tela simples: título + "Relatórios disponíveis nas próximas etapas".

## 5. Tabela de eventos da jornada
Nova tabela `bi_jornada_eventos` (RLS por `company_id`, GRANTs, somente inserção):
- `id`, `company_id`, `hospital_episode_id`, `patient_id`, `attendance_order_id` (nulos quando não houver)
- `tipo_evento` (chegada, chamada_recepcao, inicio_recepcao, fim_recepcao, triagem_inicio, triagem_classificacao, triagem_envio_medico, medico_entrada_fila, medico_chamada, consulta_inicio, consulta_fim, leito_alocacao, leito_liberacao, saida_setor, retorno_leito, medicacao_prescricao, medicacao_dispensacao, medicacao_administracao, exame_solicitacao, exame_coleta, exame_liberacao, internacao_solicitacao, internacao_aprovacao, internacao_recusa, internacao_chegada, internacao_transferencia, saida_alta, saida_transferencia_externa, saida_evasao, saida_obito, ajuste)
- `fase`, `setor`/`local`, `ocorrido_em timestamptz default now()` (horário do servidor), `usuario_id`, `origem_tabela`, `origem_id`, `detalhes jsonb`, `ajuste_de uuid`, `justificativa text`
- Imutável: trigger bloqueia UPDATE/DELETE; correção = evento `ajuste` com justificativa.
- Gravação por **gatilhos no banco** nas tabelas de origem (não depende de telas):
  - `queue_tickets`: senha criada (chegada), called, in_attendance, finalized
  - `attendance_orders`: criação (chegada, se for o primeiro), solicitação de exames
  - `triage_entries`: waiting, classified (cor Manchester), in_doctor, in_attendance, done
  - `bed_occupancies`: alocação/liberação; `bed_referrals`: saída/retorno de setor
  - `prescriptions` / `pharmacy_dispensations` / `medication_doses`: prescrição/dispensação/administração
  - `lab_exam_results`: coleta e liberação de resultado
  - `admission_requests`: solicitação, aprovação, recusa, chegada, transferência, alta
- Falha ao gravar evento **não bloqueia** a operação clínica: trigger com `EXCEPTION WHEN OTHERS` que registra em log (`bi_jornada_erros`) e segue.
- Estender episódio: `queue_tickets.hospital_episode_id` e `attendance_orders.hospital_episode_id`, propagados quando a senha/pedido entra na triagem; triggers de guarda impedem troca de episódio.
- Evasão: ação manual "Registrar evasão" na recepção e na internação (RPC `bi_registrar_evasao` com permissão), gera `saida_evasao`.

## 6. Itens consumidos com valor congelado
Nova tabela `bi_consumo_itens` (RLS, GRANTs):
- Medicação: medicamento, quantidade, dose/horário, `valor_unitario` congelado no momento — como não há custo real, grava nulo + `sem_valor_cadastrado=true`.
- Exame: sempre pelo **código interno do Catálogo de Exames** (nunca TUSS/ANS); valor = preço do convênio do paciente (`convenios.exam_prices`) congelado no consumo; sem preço → nulo + `sem_valor_cadastrado=true`.
- Alimentada por gatilhos em `medication_doses` (administração) e `lab_exam_results`/coleta.

## 7. View de tempo por setor
- View `bi_jornada_segmentos`: por atendimento, transforma eventos em segmentos (setor, início, fim, duração em minutos); segmento aberto usa `now()` e `em_andamento=true`. Base das Etapas 2 e 3.

## 8. Auditoria LGPD
- Tabela `bi_acesso_log`: quem acessou o BI e quando (registrada ao abrir a tela-base e nas leituras via função).

## Arquivos (previsão)
- Migrations: `bi_hospitalar_etapa1` (flag empresa, episódio estendido, tabelas, funções, triggers, view) — possivelmente dividida em 2.
- `src/types/permissions.types.ts` — grupo `bi_hospitalar`.
- `src/pages/superadmin/CompanyDetailPage.tsx` — toggle do módulo.
- `src/components/company/CompanySidebar.tsx` — item de menu com trava módulo+permissão+setor.
- `src/App.tsx` — rota `/app/bi-hospitalar` com guarda.
- `src/pages/company/bi/BiHospitalarPage.tsx` — tela-base.
- Recepção/Internação — botão "Registrar evasão".
- Testes PGlite (`src/lib/biHospitalarSql.test.ts`): isolamento por empresa, imutabilidade, ordem dos eventos, valor congelado/sem valor, segmentos, permissões, módulo desabilitado.

## Fora de escopo (Etapas 2 e 3)
Relatório por paciente, dashboards, KPIs, metas, gargalos, dicas de IA, retroativo.

## Validação
- Testes SQL isolados com fixtures removidas ao final; typecheck `npx tsgo --noEmit -p tsconfig.app.json`; build.
- Fluxo ponta a ponta com paciente de teste descartável (totem→recepção→triagem→médico→leito→medicação→exame→alta), removido depois.
