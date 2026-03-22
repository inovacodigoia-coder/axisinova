

# Axis Inova — Landing Page + Onboarding de Empresa

## Visão Geral
Plataforma premium de gestão clínica com landing page de alta conversão e fluxo de cadastro de empresa em 3 etapas. Design system próprio com gradientes cyan→roxo, animações suaves e UX world-class.

## Página 1 — Landing Page (`/`)

### Navbar
- Header sticky com blur backdrop, logo "Axis Inova" (gradiente no "Inova"), links de navegação central, botões "Entrar" (outline) e "Teste Grátis 14 dias" (gradiente). Menu hambúrguer no mobile.

### Hero Section
- Layout 60/40 em desktop. Badge "🚀 Novo · Plataforma 2025", título com palavra "clínica" em gradiente, subtítulo, dois CTAs, micro-badges de confiança. Coluna direita com mockup de dashboard estilizado (cards de métricas, mini gráfico, lista de agendamentos — tudo em CSS/SVG). Formas decorativas blurred no fundo.

### Features Section
- 6 cards em grid responsivo (3x2 → 1x6): Agendamento, Totem/Recepção, Prontuário, Faturamento TISS, Digitalização de Guias, BI Estratégico. Hover com elevação e sombra roxa.

### Pricing Section
- Toggle Mensal/Anual (20% desconto). 3 planos: Starter (R$490), Pro (R$990, destacado com escala e borda roxa), Enterprise (R$2.490). Lista de features com ✅, botões de ação.

### Testimonials Section
- 3 cards com avatar de iniciais em gradiente, nome, especialidade, depoimento com aspas decorativas, 5 estrelas.

### CTA Banner
- Fundo gradiente full-width, título branco, botão branco com texto roxo, 3 números de impacto (+500 Clínicas, +2M Atendimentos, 99.9% Uptime).

### Footer
- Fundo escuro, 4 colunas de links (Produto, Empresa, Legal, Contato), copyright.

## Página 2 — Cadastro de Empresa (`/cadastro`)

### Layout
- Desktop: sidebar fixa (40%) com gradiente + formulário (60%). Mobile: apenas formulário.

### Barra de Progresso
- 3 etapas com círculos conectados, preenchimento gradiente animado.

### Passo 1 — Dados da Empresa
- Razão Social, Nome Fantasia, CNPJ (com máscara e validação de dígitos), Segmento (select), Telefone, E-mail, Website. Grid 2 colunas em desktop.

### Passo 2 — Endereço
- CEP com busca automática via ViaCEP (hook `useCepLookup`), preenchimento animado dos campos. Logradouro, Número, Complemento, Bairro, Cidade (readonly após busca), Estado.

### Passo 3 — Administrador
- Nome, CPF (com validação), E-mail, Senha (com barra de força e checklist de requisitos), Confirmar Senha. Seleção de plano com cards compactos (Pro pré-selecionado). Checkbox de termos. Botão com loading simulado.

### Tela de Sucesso
- Check animado em SVG, mensagem de confirmação, resumo dos dados, botões "Acessar o Sistema" e "Reenviar E-mail".

## Aspectos Técnicos
- Design system centralizado em `designSystem.ts` com todas as cores, tipografia, sombras e espaçamentos
- Validação com `react-hook-form` + `zod`, máscaras de input, shake animation em erros
- Transições entre passos com `framer-motion` (slide horizontal)
- Componentes UI reutilizáveis: GradientButton, OutlineButton, InputField, SelectField, PlanCard
- Totalmente responsivo (mobile/tablet/desktop)
- Sem backend real — fluxo simulado no frontend

