# Portais Externos — Etapa 1: Acesso por Link + Senha e Vínculo de Escopo

Cada acesso cadastrado em `/app/portais` (Parceiro, Local, Médico, Paciente) passa a ter Código de Acesso (5 dígitos), Senha (4 dígitos) e URL própria (`/portal/:codigo`), salvos no banco e vinculados obrigatoriamente a um registro real do sistema. A tela do portal em si fica para a Etapa 2.

## Decisões confirmadas

- Persistência real no banco (não mock).
- Parceiro = conjunto de Origens (nenhum campo novo em pedidos).
- Código sem expiração — vale enquanto o status for Ativo.
- Bloqueio tolerante no portal: 10 tentativas erradas em 5 minutos.

## O que muda para o usuário

1. **Novo Acesso** — o modal passa a exigir a seleção do vínculo conforme a aba:
   - Médico: busca por nome/CRM nos médicos já cadastrados.
   - Paciente: busca por nome/CPF nos pacientes já cadastrados (o CPF é o identificador; quando houver homônimos, a busca mostra CPF mascarado + nascimento para escolher o cadastro certo).
   - Local: seleção de uma origem/unidade existente.
   - Parceiro: seleção de uma ou mais origens que compõem o parceiro.
   Sem vínculo, o botão salvar fica bloqueado.
2. **Tela de confirmação pós-cadastro** — no mesmo padrão visual do comprovante de atendimento: QR Code, URL completa, Código e Senha, com botão copiar em cada campo e "Copiar tudo".
3. **Coluna "Acesso"** nas 4 abas — mostra `••• 300` com botão de olho para revelar e ícone de copiar link.
4. **Ação "Ver Acesso"** no menu `...` — reabre a tela de confirmação. Dentro dela, "Gerar Novo Código" pede confirmação ("o link atual deixará de funcionar") e substitui código e senha.
5. **Acesso Inativo** — em vez do link, mostra o aviso "Acesso inativo — reative para gerar link".
6. A aba Pacientes deixa de ser um placeholder e passa a listar os acessos de paciente com as mesmas colunas e ações.

## Detalhes técnicos

**Banco (migração)**

- Nova tabela `public.external_accesses`:
  `company_id`, `type` (parceiro | local | medico | paciente), `name`, `email`, `status` (active/inactive),
  `access_code` (5 dígitos, único global), `access_password` (4 dígitos),
  vínculos: `patient_id`, `doctor_id`, `origin_id`, `partner_origin_ids uuid[]`,
  campos descritivos já usados na UI (`partner_type`, `cnpj`, `responsible_name`, `crm`, `specialty`, `permissions`),
  `last_access_at`, `created_at`, `updated_at`.
- GRANTs para `authenticated` e `service_role`; RLS com escopo por `company_id` (mesmo padrão das demais tabelas). Sem acesso `anon` — a validação do login do portal (Etapa 2) usará função `security definer`.
- Constraint/trigger garantindo que o vínculo obrigatório do tipo esteja preenchido e unicidade do `access_code`.
- Nova tabela `public.external_access_logs` (código, tipo, ação, sucesso/falha, data) já criada aqui para alimentar a aba Logs e o lockout tolerante da Etapa 2.
- Função `generate_external_access_code()` para sortear código único e senha.

**Frontend**

- `src/hooks/useExternalAccesses.ts`: CRUD + `regenerateCredentials`, substituindo o `MOCK_ACCESS` de `ExternalPortalsPage.tsx`.
- `src/components/lab/portals/NewAccessModal.tsx` com os seletores de vínculo por tipo (reaproveitando as buscas já existentes de paciente e médico).
- `src/components/lab/portals/AccessCredentialsModal.tsx` (confirmação / "Ver Acesso" / gerar novo código), usando QR Code no mesmo padrão do comprovante.
- `ExternalPortalsPage.tsx`: coluna "Acesso", ação "Ver Acesso", aba Pacientes funcional e listagem vinda do banco.

Observação: a senha de 4 dígitos fica legível apenas para usuários internos da própria empresa (via RLS), pois o administrador precisa reexibi-la; a verificação no portal será feita por função no servidor na Etapa 2.

## Critérios de aceite

- Criar acesso em qualquer aba gera Código + Senha e abre a confirmação com URL/código/senha copiáveis.
- Coluna "Acesso" e ação "Ver Acesso" presentes nas 4 abas.
- "Gerar Novo Código" pede confirmação e invalida o anterior.
- Não é possível salvar sem vínculo.
- Acesso Inativo não exibe link funcional.
