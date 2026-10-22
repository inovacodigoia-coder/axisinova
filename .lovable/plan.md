# Auditoria somente leitura — WhatsApp, InovaChat e CRM

Nada será alterado: sem migrations, sem edição de código, sem mudar interruptores, sem enviar mensagens. Só consultas de leitura, leitura de código e scanners.

## Entrega
Um relatório em `/mnt/documents/auditoria-whatsapp-inovachat-crm.md` (e resumo no chat) com tabela: Item | Status (OK/ATENÇÃO/RISCO) | O que encontrei | Recomendação — ordenada de RISCO para OK. Pendências antigas (a–h) com status feito/parcial/não feito.

## Parte 1 — Segurança (como será verificado)
1. Tabelas `whatsapp_*`, `crm_*`, `inovachat_*`: `pg_class.relrowsecurity`, `pg_policies` por papel, e `information_schema.column_privileges`/grants para anon e authenticated em colunas sensíveis (telefone, texto_final, tokens, comentários).
2. Views: `reloptions` (security_invoker) e definição — checar filtro por empresa (ex.: `whatsapp_fila_envios_v`).
3. Funções SECURITY DEFINER do bloco: `proconfig` (search_path), ACL de EXECUTE (PUBLIC/anon/authenticated), e leitura do corpo para checagem de empresa/permissão.
4. Edge Functions do bloco (whatsapp-*, inovachat-*, crm): `config.toml`, autenticação real no código, permissão, uso de service role e `console.log` com token/texto/telefone.
5. Storage: buckets (`storage.buckets`), políticas em `storage.objects`, prazo das URLs assinadas no código.
6. Segredos: nomes usados por função (sem valores); `rg` no `src/` por uazapi, admintoken, tokens.
7. pg_cron: `cron.job` (agenda, comando) e se há segredo em texto.
8. Realtime: `pg_publication_tables` de `supabase_realtime` e colunas das tabelas publicadas; canais no frontend.
9. Isolamento: análise das políticas/funções por `company_id` e simulação via `SET ROLE authenticated` + `request.jwt.claims` de usuários de duas empresas dentro de transação com ROLLBACK (somente se o acesso disponível permitir; caso contrário, análise estática, informada no relatório).
10. Scanners: security scan, linter do banco, achados pendentes do monitoramento e resultados antigos.
11. Retenção: comparar tabelas com dados pessoais versus as cobertas por `inovachat-retencao`/RPCs de retenção.

## Parte 2 — Pendências antigas
a) Origem do valor em "Solicitar novo número". b) Exclusão de número pelo admin com confirmação do apelido (UI + servidor). c) Título do InovaChat com paciente vinculado. d) Fundo neutro padrão. e) Tabela antiga do código do worker e referências. f) Defaults de `crm_config` e valores da labsaude. g) `whatsapp_config_global.retencao_modo` e última linha de `whatsapp_retencao_execucoes`. h) Formato da confirmação na labsaude.

## Detalhes técnicos
Ferramentas: consultas SELECT, leitura de arquivos, `rg`, scanners de segurança. Nenhum dado pessoal completo (telefone, texto) será copiado para o relatório — apenas contagens e nomes de colunas.
