# Cadastro rápido com Enter (Guias e Procedimentos) — opcional por empresa

## O que o usuário vai ver
- **Padrão (desligado em todas as empresas):** a etapa "Guias e Procedimentos" continua exatamente como hoje.
- **Ligado:** na etapa 3 do Cadastro de Atendimento:
  - `Enter` (ou `Insert`) abre a busca de exames, com o cursor já no campo.
  - Digita sigla/código/nome; setas para cima/baixo escolhem; `Enter` inclui o exame na guia com o material padrão.
  - A janela não fecha: o campo limpa e já espera o próximo exame. Exame repetido mostra aviso e não entra de novo.
  - `Esc` fecha a busca; um pequeno texto de ajuda mostra os atalhos.
- **Configurações da empresa:** novo cartão "Cadastro rápido de exames" com um botão Ligar/Desligar. Qualquer administrador da empresa pode mudar.
- **Super Admin:** na página de cada empresa (Gestão de Clientes), um botão Ligar/Desligar para esse mesmo recurso, junto aos módulos já existentes.

## Regras
- Começa desligado em todas as empresas, inclusive as novas.
- Desligar volta imediatamente ao fluxo normal; nada dos atendimentos já feitos é alterado.
- Só o administrador da própria empresa ou o Super Admin pode mudar; a conferência é feita no servidor.

## Detalhes técnicos
- Migration: coluna `companies.cadastro_rapido_exames boolean not null default false` (ou tabela de configuração por empresa), RPCs `cadastro_rapido_situacao(p_company)` e `cadastro_rapido_definir(p_company, p_ativo)` (security definer; permite company_admin da mesma empresa ou super admin; REVOKE de PUBLIC/anon).
- Hook `useCadastroRapidoExames()` lido pelo `LabStep3GuidesProcedures.tsx`; o comportamento de teclado fica atrás dessa flag, sem mudar o fluxo atual quando desligado.
- Novo cartão em `CompanySettingsPage` (visível para admin) + página simples com o interruptor; linha nova em `CompanyLabModulosPanel` do Super Admin.
- Teste: padrão desligado e regra de quem pode ativar (SQL), e teste da lógica de teclado (Enter inclui, não duplica, campo limpa).
- Registrar regra no AGENTS.md.
