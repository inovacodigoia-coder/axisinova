# Hardening de Segurança — Axis Inova

Camada transversal de segurança de backend. Nenhuma tela existente muda de layout; só surgem mensagens de bloqueio no login e uma nova área de auditoria no Super Admin.

## Situação atual (verificada)

- Supabase Auth já é a única fonte de credenciais de usuário. Não existe tabela própria com senha ou hash de usuário — nada a migrar aqui.
- RLS já está habilitada em todas as tabelas do schema público, incluindo todas as que têm `company_id`.
- Senhas em texto plano existem apenas para dispositivos (`queue_totems.access_password`, `queue_tvs.access_password`), usadas pelo login de totem/TV.
- As Edge Functions administrativas (`create-user`, `get-user-email`, `set-user-password`, `test-instrument-webhook`) já validam JWT e papel do chamador. As de integração usam API Key própria.

O trabalho, portanto, concentra-se em: controle de tentativas de login, auditoria, revisão fina das policies de RLS, proteção de dados sensíveis e senha de dispositivo.

## 1. Controle de tentativas e bloqueio

Novas tabelas:

- `login_attempts` — identificador usado, IP, user agent, sucesso/falha, empresa quando identificável, data/hora.
- `auth_lockouts` — bloqueios ativos por identificador de usuário e por IP, com prazo de expiração e motivo.
- `ip_allowlist` — IPs de unidades físicas liberados do bloqueio por IP, gerenciados pelo Super Admin.

Regras (todas validadas no servidor):

- 5 falhas em 15 minutos para o mesmo identificador → bloqueio de 15 minutos, mesmo com senha correta.
- 10 falhas em 5 minutos vindas do mesmo IP contra identificadores diferentes → bloqueio do IP por 15 minutos, exceto se estiver na allowlist.
- Login bem-sucedido zera o contador.
- Mensagem genérica "Usuário ou senha inválidos" em qualquer falha; quando bloqueado, "Muitas tentativas. Tente novamente em X minutos". Nunca revela se o e-mail existe.
- Desbloqueio manual pelo Super Admin.

O login passa a chamar uma Edge Function `auth-guard` antes e depois da autenticação: ela verifica bloqueio, registra a tentativa e devolve o tempo restante. O IP vem do cabeçalho da requisição, nunca do cliente.

## 2. Painel de auditoria (Super Admin)

Nova rota no Super Admin com três abas:

- Últimas tentativas de login, filtráveis por empresa, identificador e resultado.
- Usuários bloqueados no momento, com botão Desbloquear.
- IPs suspeitos/bloqueados, com botão Desbloquear e gestão da allowlist.

## 3. Rotas e Edge Functions

- Revisão de todas as Edge Functions: JWT obrigatório → 401 sem token, 403 sem permissão RBAC.
- `company_id` sempre derivado do perfil do usuário autenticado; valor enviado pelo cliente é ignorado (exceto Super Admin agindo em outra empresa).
- Endpoints de integração por API Key permanecem, com verificação de chave ativa e escopo de empresa.
- Nenhuma resposta ou log expõe senha, hash ou fragmento.

## 4. RLS — revisão e teste

- Auditoria policy a policy nas tabelas com `company_id`, padronizando o isolamento por `get_user_company_id(auth.uid())` e removendo qualquer condição frouxa remanescente.
- Operações de escrita/exclusão passam a respeitar o RBAC de perfil + setor já existente onde hoje só há checagem de empresa.
- Super Admin com policy própria, restrita a funções administrativas.
- Teste cruzado explícito: usuário da Empresa A tentando ler e gravar registros da Empresa B por requisição direta deve falhar em todas as tabelas.

## 5. Dados sensíveis

Abordagem escolhida: valor cifrado + hash determinístico de busca.

- Campos protegidos: CPF, RG, telefone(s) do paciente e número do cartão de convênio (`patients`, `attendance_orders`).
- Cada campo ganha uma coluna cifrada (pgcrypto, chave em secret do Supabase) e, para CPF, uma coluna de hash usada por busca exata e checagem de duplicidade — mantendo o fluxo atual de recepção e laboratório funcionando.
- Migração converte os registros existentes no lugar, sem duplicar dados.
- Leitura/escrita via funções server-side; nada em texto plano em cache ou log.
- Máscara (***.***.123-45) para perfis sem permissão de visualização completa, usando o RBAC atual.

Observação: busca parcial por CPF (fragmento) deixa de existir; busca exata e por nome/protocolo continuam.

## 6. Senha de dispositivo (totem/TV)

`access_password` passa a ser armazenada com hash; a verificação continua pela função `device_verify_access`, agora comparando hash. Telas de acesso ao totem/TV não mudam.

## 7. Ordem de execução

1. Tabelas de tentativas/bloqueio/allowlist + funções e Edge Function `auth-guard`.
2. Integração no fluxo de login e mensagens genéricas.
3. Painel de auditoria no Super Admin.
4. Revisão de RLS e teste cruzado entre empresas.
5. Migração de criptografia dos campos sensíveis + máscaras.
6. Hash das senhas de dispositivo.

Cada etapa é aplicada e verificada antes da seguinte, para evitar interromper operações em uso.
