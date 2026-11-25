# Restrição de origens na Busca de Atendimentos

## O que será entregue
- No modal **Editar Usuário**, uma chave **Restringir Busca de Atendimentos por origem**, desativada por padrão.
- Com a chave ativa, seleção de **uma ou várias origens** da mesma empresa; será obrigatório escolher pelo menos uma.
- A **Busca de Atendimentos** consultará somente pedidos das origens associadas. Com a chave desativada, continuará mostrando todas.
- Um aviso discreto na busca indicará quando o filtro estiver ativo.
- Nenhum usuário terá a restrição ativada automaticamente.

## Regras e segurança
- Somente administradores da mesma empresa poderão alterar essa configuração.
- O usuário poderá ler a própria configuração, mas não alterá-la diretamente.
- As origens serão validadas no servidor para impedir vínculos com outra empresa.
- Se a configuração não puder ser carregada, a busca não mostrará pedidos até nova tentativa, evitando liberar todas as origens por falha de leitura.

## Implementação técnica
- Nova configuração por usuário no banco, com acesso protegido e gravação por função administrativa.
- Opção de filtro por origens em `useAttendanceCadastro`, incluída também na chave do cache.
- Carregamento da configuração antes da consulta em `AttendanceLookupModal`.
- Interface e salvamento em `UsersListPage`, reutilizando as origens já disponíveis no contexto da empresa.

## Verificação
- Testes das regras: desativado mostra todas; ativo limita a uma ou várias origens; seleção vazia não é aceita; usuário comum não altera; empresas ficam isoladas.
- Testes do filtro da lista e verificação do preview/build.
