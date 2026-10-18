# Axis Inova

PROMPT 1 — VERSÃO EXTRAORDINÁRIA

Axis Inova · Landing Page + Onboarding de Empresa

Você é um engenheiro frontend sênior especializado em SaaS B2B para saúde. Seu trabalho é construir a vitrine pública e o fluxo de aquisição de clientes do Axis Inova, uma plataforma premium de gestão clínica. Cada decisão de código deve refletir qualidade de produto world-class — animações suaves, hierarquia visual impecável, conversão otimizada e zero ambiguidade no fluxo do usuário.

🎨 Design System — Lei Suprema do Projeto

Crie um arquivo src/styles/designSystem.ts com todos os tokens abaixo. Nenhum componente deve hardcodar cores ou tipografia — tudo deve referenciar este arquivo.

ts

export const colors = {
  primary: '#00D4FF',
  secondary: '#7B2FF7',
  gradient: 'linear-gradient(135deg, #00D4FF 0%, #7B2FF7 100%)',
  gradientSubtle: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(123,47,247,0.08) 100%)',
  white: '#FFFFFF',
  bgLight: '#F5F7FA',
  bgCard: '#FFFFFF',
  textBody: '#2D3748',
  textTitle: '#1A202C',
  textMuted: '#718096',
  border: '#E2E8F0',
  success: '#38A169',
  error: '#E53E3E',
  warning: '#D69E2E',
}

export const typography = {
  fontFamily: "'Inter', 'Poppins', sans-serif",
  heroTitle: { size: '56px', weight: 800, lineHeight: '1.1' },
  sectionTitle: { size: '36px', weight: 700, lineHeight: '1.2' },
  cardTitle: { size: '20px', weight: 600 },
  body: { size: '16px', weight: 400, lineHeight: '1.7' },
  small: { size: '14px', weight: 400 },
  label: { size: '13px', weight: 600, letterSpacing: '0.05em' },
}

export const spacing = {
  sectionY: '96px',
  cardPadding: '32px',
  containerMax: '1200px',
}

export const shadows = {
  card: '0 4px 24px rgba(0,0,0,0.06)',
  cardHover: '0 12px 40px rgba(123,47,247,0.15)',
  button: '0 4px 20px rgba(0,212,255,0.35)',
}

export const radius = {
  card: '16px',
  button: '10px',
  input: '8px',
  badge: '100px',
}
```

---

## 📁 Estrutura de Arquivos Obrigatória
```
src/
├── styles/
│   └── designSystem.ts
├── components/
│   ├── landing/
│   │   ├── Navbar.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── CtaBanner.tsx
│   │   └── Footer.tsx
│   ├── register/
│   │   ├── ProgressBar.tsx
│   │   ├── StepCompanyData.tsx
│   │   ├── StepAddress.tsx
│   │   ├── StepAdminUser.tsx
│   │   └── SuccessScreen.tsx
│   └── ui/
│       ├── GradientButton.tsx
│       ├── OutlineButton.tsx
│       ├── InputField.tsx
│       ├── SelectField.tsx
│       └── PlanCard.tsx
├── pages/
│   ├── LandingPage.tsx
│   └── RegisterPage.tsx
└── hooks/
    └── useCepLookup.ts

🌐 PÁGINA 1 — Landing Page (/)

Componente: Navbar.tsx

Header fixo com position: sticky, top: 0, z-index: 100. Fundo branco com backdrop-filter: blur(12px) e background: rgba(255,255,255,0.92). Sombra sutil 0 1px 0 #E2E8F0 apenas quando o scroll passa de 10px (adicionar listener de scroll que alterna uma classe).

Estrutura interna:

Lado esquerdo: Logotipo "Axis Inova" — a palavra "Axis" em #1A202C bold e "Inova" com o gradiente aplicado via background-clip: text

Centro: Links de navegação Funcionalidades, Planos, Depoimentos, Contato — fonte 14px, peso 500, cor #2D3748. Ao hover, cor muda para #7B2FF7 com transição 200ms

Lado direito: Botão "Entrar" (outline roxo, sem fundo) + Botão "Teste Grátis 14 dias" com gradiente e sombra shadows.button. No mobile (< 768px), colapsa em menu hambúrguer com drawer lateral

Componente: HeroSection.tsx

Layout de duas colunas em desktop (60% texto / 40% visual), uma coluna empilhada em mobile.

Coluna esquerda:

Badge superior: pílula com gradiente sutil de fundo, borda 1px gradiente, texto "🚀 Novo · Plataforma 2025" em 13px

Título H1 em 56px, peso 800, cor #1A202C, com a palavra "clínica" trocada por um span com gradiente: background: linear-gradient(135deg, #00D4FF, #7B2FF7); -webkit-background-clip: text; color: transparent

Texto: "Do agendamento ao faturamento TISS, da recepção ao BI estratégico. Tudo integrado, tudo em tempo real."

Dois botões lado a lado: "Começar Grátis por 14 Dias" (gradiente + sombra) e "▶ Ver Demo de 2 min" (outline cinza com ícone play)

Abaixo dos botões: linha com 3 micro-badges: ✅ Sem cartão de crédito · ✅ Configuração em 10 min · ✅ Suporte incluso

Coluna direita:

Container com border-radius: 20px, gradiente sutil de fundo, borda 1px solid rgba(123,47,247,0.2), sombra 0 24px 80px rgba(123,47,247,0.12)

Dentro: Mockup estilizado de um dashboard — crie com divs e SVGs representando cards de métricas, uma mini barra de gráfico e uma lista de agendamentos. Use as cores do design system. Não use imagem externa

Fundo geral da seção: branco com duas formas circulares blurred no canto superior direito (#00D4FF com 8% opacity) e inferior esquerdo (#7B2FF7 com 6% opacity) para profundidade

Componente: FeaturesSection.tsx

Fundo #F5F7FA. Título centralizado: "Tudo que sua operação precisa" com subtítulo em #718096.

Grid de 6 cards (3x2 desktop, 2x3 tablet, 1x6 mobile). Cada card:

Fundo branco, border-radius: 16px, padding 32px, sombra shadows.card

Ícone em container 48x48px com gradientSubtle de fundo e border-radius: 12px, ícone em 24px na cor primária ou secundária alternando

Título 20px bold, descrição 15px cor #718096

Ao hover: transform: translateY(-4px), sombra shadows.cardHover, transição 300ms

Os 6 cards com descrições completas:

ÍconeTítuloDescrição📅Agendamento InteligenteAgenda multi-profissional com detecção automática de primeira vez ou retorno, confirmação por WhatsApp/SMS e controle de faltosos🖥️Totem e Recepção DigitalCheck-in autônomo pelo totem, fila digital com painel de chamada para TV e painel exclusivo do médico📋Prontuário EletrônicoLinha do tempo completa do paciente, inserção de dados clínicos, histórico de exames e prescrições integradas💳Faturamento TISS/TUSSGestão completa de guias, controle de glosas, ciclo de correção recepção↔faturamento e lotes de cobrança📄Digitalização de GuiasUpload e indexação de documentos por atendimento, com regras configuráveis por convênio para reduzir erros📊BI Estratégico em Tempo RealDashboard executivo com indicadores de produção, faturamento, faltosos, convênios e performance por médico

Componente: PricingSection.tsx

Fundo branco. Título: "Invista na eficiência da sua operação" — subtítulo: "Planos desenhados para cada porte de clínica. Sem surpresas, sem letras miúdas."

Toggle no topo: Mensal / Anual — ao selecionar Anual, aplicar desconto de 20% e exibir badge verde "Economize 20%".

3 cards de planos — renderizados pelo componente PlanCard.tsx:

⚠️ Precificação estratégica: os valores refletem a infraestrutura cloud, atualizações contínuas, suporte, conformidade LGPD/ANS e o valor gerado (redução de glosas, eficiência operacional). Posicionar como investimento, não custo.

Plano Starter — R$ 490/mês (anual: R$ 392/mês)

Até 3 usuários simultâneos

1 médico cadastrado

Agendamento e recepção

Prontuário básico

Relatórios essenciais

Suporte via chat (horário comercial)

Armazenamento: 10 GB

Plano Pro — R$ 990/mês (anual: R$ 792/mês) 🔥 MAIS POPULAR

Usuários ilimitados

Até 15 médicos

Todos os módulos (agendamento, recepção, totem, prontuário, faturamento TISS/TUSS)

BI com dashboards em tempo real

Digitalização de guias ilimitada

Integração com convênios

Suporte prioritário (chat + WhatsApp)

Armazenamento: 100 GB

Plano Enterprise — R$ 2.490/mês (anual: R$ 1.992/mês)

Médicos ilimitados

Multi-unidades (até 5 CNPJs)

Tudo do Pro +

API de integração

Onboarding dedicado com consultor

SLA de uptime 99,9% garantido

Treinamento presencial ou remoto incluso

Armazenamento: 1 TB

Suporte 24/7 com gerente de conta

Visual dos cards:

Todos com fundo branco, borda 1px solid #E2E8F0

Card Pro: fundo gradiente sutil, borda 2px solid #7B2FF7, escala transform: scale(1.05), badge "Mais Popular" com gradiente no topo

Preço em 40px bold, "/mês" em 16px muted

Lista de features com ícone ✅ verde

Botão "Assinar Agora" — Pro tem gradiente, outros têm outline

Componente: TestimonialsSection.tsx

Fundo #F5F7FA. 3 cards com:

Avatar circular 56px com iniciais em gradiente

Nome, especialidade e cidade

Texto de depoimento entre aspas estilizadas (aspas grandes em gradiente, opacity 20%)

5 estrelas em amarelo #F6AD55

Borda sutil, sombra card, hover com elevação

Componente: CtaBanner.tsx

Fundo com gradiente principal 100%. Padding vertical 80px. Centralizado:

Título branco 40px: "Sua clínica merece uma gestão à altura"

Subtítulo branco 70% opacity: "Junte-se a centenas de profissionais que já transformaram sua operação"

Botão branco com texto #7B2FF7 bold: "Cadastrar Minha Empresa Agora →"

Abaixo: 3 números de impacto em branco — +500 Clínicas, +2M Atendimentos, 99.9% Uptime

Componente: Footer.tsx

Fundo #1A202C. Texto branco.

Linha 1: Logo + tagline curta em #718096

4 colunas: Produto (links âncora), Empresa (Sobre, Blog, Carreiras), Legal (Privacidade, Termos, LGPD), Contato (e-mail, WhatsApp fictício)

Linha final: copyright + "Feito com ❤️ para a saúde brasileira"

📝 PÁGINA 2 — Cadastro de Empresa (/cadastro)

Layout geral:

Tela dividida em duas colunas em desktop:

Coluna esquerda (40%): Painel fixo com gradiente principal, logo Axis Inova branca, título motivacional, lista de 4 benefícios com ícones brancos e ao fundo o número do passo atual em fonte gigante (opacity 10%) como elemento decorativo

Coluna direita (60%): Formulário com fundo branco, scroll independente

Em mobile: apenas a coluna do formulário, header compacto com logo

Componente: ProgressBar.tsx

Barra de 3 etapas no topo da coluna direita:

Cada etapa: círculo numerado + label abaixo ("Empresa", "Endereço", "Administrador")

Etapa concluída: círculo com gradiente + ícone de check branco

Etapa atual: círculo com borda gradiente 2px + número na cor primária

Etapa futura: círculo cinza

Linha conectora entre círculos que preenche com gradiente conforme avança

Animação suave de 400ms na transição

Componente: StepCompanyData.tsx — Passo 1

Título: "Dados da Empresa" · Subtítulo muted: "Informações do estabelecimento de saúde"

Campos (todos com label flutuante — floating label behavior):

Razão Social * — input text, placeholder "Nome jurídico completo"

Nome Fantasia * — input text, placeholder "Como é conhecida no mercado"

CNPJ * — máscara XX.XXX.XXX/XXXX-XX, validação de dígitos verificadores em tempo real, feedback visual ✅/❌ inline

Segmento * — select estilizado com ícone chevron: Clínica Médica, Laboratório, Clínica Odontológica, Consultório Particular, Hospital/UPA, Clínica de Imagem, Outro

Telefone Comercial * — máscara (XX) XXXXX-XXXX

E-mail Comercial * — validação de formato em tempo real

Website — opcional, placeholder "https://suaclinica.com.br", label com badge "Opcional"

Layout: grid 2 colunas no desktop para campos menores (CNPJ + Segmento, Telefone + Email). Razão Social e Nome Fantasia em largura total.

Componente: StepAddress.tsx — Passo 2

Título: "Localização" · Subtítulo: "Endereço principal da empresa"

CEP * — máscara XXXXX-XXX + botão ícone de busca. Ao completar 8 dígitos, disparar automaticamente fetch para https://viacep.com.br/ws/{cep}/json/. Exibir spinner loading dentro do campo durante a busca. Ao retornar, preencher os campos abaixo com animação de fade-in suave

Logradouro * — preenchido pelo CEP, editável

Número * — input pequeno, não preenchido pelo CEP

Complemento — opcional

Bairro * — preenchido pelo CEP

Cidade * — preenchido pelo CEP, somente leitura após busca (com ícone de cadeado)

Estado * — select com todos os 27 estados, pré-selecionado pelo CEP

Criar o hook useCepLookup.ts que encapsula: estado de loading, erro (CEP não encontrado), e os dados retornados. Exibir mensagem de erro amigável se o CEP for inválido.

Componente: StepAdminUser.tsx — Passo 3

Título: "Conta do Administrador" · Subtítulo: "Será o responsável principal pelo sistema"

Nome Completo * — input text

CPF * — máscara XXX.XXX.XXX-XX, validação de dígitos verificadores

E-mail * — confirmar que é diferente do e-mail comercial ou igual — ambos são válidos

Senha * — input com toggle show/hide (ícone olho). Abaixo: barra de força com 4 níveis (Fraca · Média · Forte · Muito Forte) em cores (vermelho → laranja → amarelo → verde). Requisitos exibidos como checklist dinâmico: ✅ 8+ caracteres, ✅ Letra maiúscula, ✅ Número, ✅ Caractere especial

Confirmar Senha * — validação em tempo real comparando com campo acima, feedback ✅/❌

Seleção de Plano (dentro do passo 3): Exibir 3 cards horizontais compactos (versão reduzida do PlanCard), clicáveis, com borda que acende no gradiente ao selecionar. Mostrar nome, preço e 3 principais features. O plano Pro vem pré-selecionado.

Checkbox de aceite — "Li e concordo com os [Termos de Uso] e [Política de Privacidade]" — links abrem modal ou nova aba

Botão "Criar Minha Conta" — largura total, gradiente, desabilitado até todos os campos válidos e checkbox marcado. Ao clicar: exibir spinner dentro do botão + texto "Criando sua conta..." + desabilitar durante 2 segundos (simular chamada API)

Componente: SuccessScreen.tsx

Substituir o formulário após conclusão:

Ícone de check animado (círculo que se desenha com stroke-dashoffset em SVG + checkmark aparecendo) na cor gradiente

Título: "Conta criada com sucesso! 🎉"

Subtítulo: "Enviamos um e-mail de ativação para [email inserido]. Verifique sua caixa de entrada."

Card cinza claro com os dados resumidos: Nome da empresa, CNPJ, Plano selecionado

Dois botões: "Acessar o Sistema" (gradiente) e "Reenviar E-mail" (outline texto link)

⚙️ Regras Técnicas Absolutas

Validação:

Usar biblioteca react-hook-form com zod para schema validation

Todos os erros exibidos abaixo do campo com ícone ⚠️ e texto vermelho #E53E3E

O botão "Próximo" permanece desabilitado com opacity 0.5 até o schema do passo atual ser válido

Ao tentar avançar com campos inválidos, aplicar shake animation (keyframe CSS) nos campos com erro

Máscaras:

Usar biblioteca react-input-mask ou implementar manualmente com onChange

CNPJ: validar algoritmo dos dois dígitos verificadores

CPF: validar algoritmo dos dois dígitos verificadores

Animações e Transições:

Transição entre passos: slide horizontal suave com framer-motion — passo atual sai para esquerda, novo entra da direita

Todos os cards com transition: all 300ms ease

Botões com transform: scale(0.98) no active state

Responsividade:

Breakpoints: mobile < 768px, tablet 768-1024px, desktop > 1024px

Em mobile, o wizard ocupa tela inteira sem a sidebar esquerda

Navbar colapsa em hambúrguer abaixo de 768px

Performance:

Lazy load dos componentes da landing page abaixo do fold

Nenhum console.error ou warning no ambiente de desenvolvimento

Não criar rotas de backend, autenticação real ou chamadas a banco de dados neste prompt

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://axisinova.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4497fddf-2275-4a82-85fd-74856f0ded26).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
