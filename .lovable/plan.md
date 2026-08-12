# Plano de Implementação: Sincronização de Perfis e Segurança nos Setores

Este plano visa garantir que a seleção de perfis na tela de **Setores da Empresa** reflita as permissões reais do sistema e que essas permissões sejam corretamente aplicadas durante a navegação e o carregamento do portal.

## Alterações Técnicas

### 1. Atualização do Módulo de Setores (`SectorsPage.tsx`)
- Garantir que a listagem de perfis permitidos dentro de um setor utilize os dados reais do `profilesStore`.
- Validar se a vinculação de usuários ao setor persiste corretamente no banco de dados.

### 2. Aprimoramento da Lógica de Acesso (`CompanyContext.tsx`)
- Refinar a função `getUserProfiles` para priorizar perfis obtidos via `sector_users` (vinculação Setor-Usuário).
- Garantir que `canAccess` verifique tanto as permissões do perfil ativo quanto as sobreposições manuais (`moduleOverrides`) definidas no setor ativo.

### 3. Sincronização do Menu Lateral (`CompanySidebar.tsx`)
- Ajustar a visibilidade dos itens do menu para respeitar as `moduleOverrides` do setor ativo, permitindo que administradores bloqueiem ou liberem rotas específicas para setores inteiros, independente dos perfis básicos.

### 4. Persistência de Dados (`sectorsStore.ts`)
- Verificar e corrigir a função `saveSectorUsers` para assegurar que os vínculos usuário-setor sejam persistidos na tabela `sector_users` do banco de dados.

## Segurança e RBAC
- Reforçar a regra de que o perfil ativo e o setor selecionado determinam o escopo de atuação do usuário na sessão atual.
- Assegurar que `moduleOverrides` de setor tenham precedência sobre as permissões padrão do perfil para controle granular do menu.

## Considerações do Usuário (Não Técnicas)
- Os administradores poderão definir exatamente quais perfis podem atuar em cada setor.
- Ao mudar de setor no topo da tela, o sistema recalculará imediatamente quais menus e ações estão disponíveis para o usuário.
- Correção no salvamento de usuários em setores para garantir que as configurações não sejam perdidas ao atualizar a página.
