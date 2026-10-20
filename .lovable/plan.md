# Etapa 12A — CRM (funil de leads ligado ao InovaChat)

## Decisões confirmadas
- Quem tem "crm.visualizar" vê todos os leads da empresa; só o responsável ou quem tem "crm.gerenciar" edita.
- Criar lead: "crm.operar" OU quem pode responder no InovaChat ("inovachat.responder", dentro da visibilidade da conversa).
- Valor estimado mantido (cartão e soma por coluna).
- "Cadastrar paciente" pré-preenchido (nome + telefone) se o cadastro atual permitir; senão, só "Vincular a paciente existente", e isso será informado.

## O que será construído
1. **Liberação e menu**: chave "CRM" por empresa no Super Admin (só liga com InovaChat ligado, com auditoria); permissões crm.visualizar / crm.operar / crm.gerenciar (administrador recebe as três); item "CRM" abaixo de InovaChat, rota /app/crm.
2. **Dados**: etapas, leads, tags, motivos de perda e histórico de eventos, todos por empresa; padrões criados ao ligar (Novo, Em conversa, Agendado, Compareceu, Perdido; 5 tags; 5 motivos). Um só lead aberto por contato.
3. **Configuração do funil**: abas Etapas (criar, renomear, cor, arrastar ordem, desativar com assistente de migração, restaurar padrão sem leads), Tags e Motivos de perda.
4. **Criar lead**: botão no cabeçalho e painel do contato do InovaChat (aviso se já é paciente; etiqueta "Lead · Etapa · Temperatura" + "Ver no CRM" quando houver); "Novo lead" no CRM com +55 fixo e 11 dígitos, criando contato e vinculando paciente quando o telefone casar com um só.
5. **Quadro**: colunas por etapa com contagem e soma de valor, cartões com temperatura, tags, responsável, dias na etapa, próximo contato e ponto de não lida; arrastar no computador, "Mover para..." no celular; motivo obrigatório para Perdido; filtros, busca, Kanban/Lista e faixa de resumo.
6. **Detalhe do lead**: abas Resumo (edição, mover, perder, reabrir, excluir), Conversa (só leitura, respeita visibilidade, registra acesso, "Abrir no InovaChat") e Histórico (linha do tempo + notas internas até 1000 caracteres); conversão em paciente.
7. **Exclusão LGPD**: "Excluir dados deste contato" apaga também leads, tags, notas e eventos, registrando só as quantidades.
8. **Ao vivo**: quadro atualiza por aviso sem conteúdo nem telefone, como no InovaChat.

Nada no InovaChat, automações ou fila muda de comportamento. Nenhuma mensagem é enviada.

## Detalhes técnicos
- Migration: `companies.crm_habilitado`; tabelas `crm_etapas`, `crm_leads` (índice único parcial em contato_id where fechado_em is null), `crm_tags`, `crm_lead_tags`, `crm_motivos_perda`, `crm_lead_eventos`, `crm_sinais`; GRANTs + RLS só leitura por empresa/permissão; escrita apenas por RPCs SECURITY DEFINER (`crm_tem_permissao`, `crm_lead_criar`, `crm_lead_mover`, `crm_lead_editar`, `crm_lead_nota`, `crm_lead_excluir`, `crm_etapas_salvar`, `crm_etapa_desativar`, `crm_funil_restaurar`, `crm_conversa_ler`, `crm_lead_converter`, Super Admin `crm_empresa_definir`) com company_id derivado no servidor e validações de etapa/motivo/fechado_em.
- Estender `inovachat_excluir_contato` / Edge `inovachat-excluir-contato` para apagar dados CRM.
- Frontend: `src/pages/company/crm/*`, componentes em `src/components/crm/*`, hook `useCrmAcesso`, integração em `CompanySidebar.tsx`, `InovachatPage.tsx`, `CompanyInovachatPanel.tsx`.
- Testes SQL PGlite para: lead único aberto, motivo obrigatório, reabrir limpa motivo, edição por visualizador negada, isolamento entre empresas, regra de etapas, exclusão LGPD.
- Registrar regra no AGENTS.md e memória das decisões.
