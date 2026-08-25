/**
 * Especificação da API do AxisInova.
 * Sempre que uma nova função, RPC ou tabela for criada, adicione aqui —
 * a página /docs é gerada automaticamente a partir deste arquivo.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Scope = 'company' | 'system'

export interface ApiParam {
  name: string
  in: 'path' | 'query' | 'header' | 'body'
  type: string
  required?: boolean
  description: string
}

export interface ApiEndpoint {
  id: string
  method: HttpMethod
  path: string
  summary: string
  description?: string
  scope: Scope
  auth: string
  params?: ApiParam[]
  requestExample?: string
  responseExample?: string
}

export interface ApiGroup {
  tag: string
  description: string
  endpoints: ApiEndpoint[]
}

export const API_INFO = {
  title: 'AxisInova API',
  version: '1.0.0',
  description:
    'API do sistema de gestão clínica e laboratorial AxisInova. Endpoints de plataforma (Edge Functions), procedures do banco (RPC) e acesso a dados via REST com RLS por empresa.',
  updatedAt: '2026-08-20',
}

// Domínio público oficial da API (custom domain). Não usar a URL interna do backend.
const API_ROOT = 'https://axisinova.inovacodigoia.com.br'

const FUNCTIONS_BASE = `${API_ROOT}/functions/v1`
const REST_BASE = `${API_ROOT}/rest/v1`

export const API_BASES = { functions: FUNCTIONS_BASE, rest: REST_BASE }

export const API_GROUPS: ApiGroup[] = [
  {
    tag: 'auth',
    description: 'Autenticação e sessão de usuários. Escopo de sistema.',
    endpoints: [
      {
        id: 'auth-login',
        method: 'POST',
        path: '/auth/v1/token?grant_type=password',
        summary: 'Login (e-mail e senha)',
        description: 'Retorna access_token (JWT) e refresh_token. No app é usado via supabase.auth.signInWithPassword().',
        scope: 'system',
        auth: 'apikey (publishable)',
        params: [
          { name: 'email', in: 'body', type: 'string', required: true, description: 'E-mail do usuário' },
          { name: 'password', in: 'body', type: 'string', required: true, description: 'Senha' },
        ],
        requestExample: `{
  "email": "usuario@clinica.com.br",
  "password": "••••••••"
}`,
        responseExample: `{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "v1.M2Rk...",
  "user": { "id": "uuid", "email": "usuario@clinica.com.br" }
}`,
      },
      {
        id: 'auth-logout',
        method: 'POST',
        path: '/auth/v1/logout',
        summary: 'Logout',
        scope: 'system',
        auth: 'Bearer JWT',
        responseExample: '204 No Content',
      },
      {
        id: 'auth-me',
        method: 'GET',
        path: '/auth/v1/user',
        summary: 'Usuário autenticado',
        description: 'Revalida o token no servidor de auth e retorna o usuário corrente.',
        scope: 'system',
        auth: 'Bearer JWT',
        responseExample: `{ "id": "uuid", "email": "usuario@clinica.com.br", "user_metadata": { "full_name": "Maria" } }`,
      },
      {
        id: 'auth-recover',
        method: 'POST',
        path: '/auth/v1/recover',
        summary: 'Recuperação de senha',
        scope: 'system',
        auth: 'apikey (publishable)',
        requestExample: `{ "email": "usuario@clinica.com.br" }`,
      },
    ],
  },
  {
    tag: 'users',
    description: 'Gestão de usuários e credenciais. Criação é feita por administradores da empresa.',
    endpoints: [
      {
        id: 'fn-create-user',
        method: 'POST',
        path: '/create-user',
        summary: 'Criar usuário da empresa',
        description: 'Cria o usuário no Auth e o registro em profiles vinculado à empresa do administrador.',
        scope: 'company',
        auth: 'Bearer JWT (admin da empresa)',
        params: [
          { name: 'email', in: 'body', type: 'string', required: true, description: 'E-mail de acesso' },
          { name: 'password', in: 'body', type: 'string', required: true, description: 'Senha inicial' },
          { name: 'full_name', in: 'body', type: 'string', required: true, description: 'Nome completo' },
          { name: 'role', in: 'body', type: 'string', required: false, description: 'Função (receptionist, doctor, billing, ...)' },
          { name: 'company_id', in: 'body', type: 'uuid', required: true, description: 'Empresa do usuário' },
        ],
        requestExample: `{
  "email": "recepcao@clinica.com.br",
  "password": "Senha@123",
  "full_name": "Ana Recepção",
  "role": "receptionist",
  "company_id": "uuid-da-empresa"
}`,
        responseExample: `{ "success": true, "user_id": "uuid" }`,
      },
      {
        id: 'fn-set-password',
        method: 'POST',
        path: '/set-user-password',
        summary: 'Redefinir senha manualmente',
        scope: 'company',
        auth: 'Bearer JWT (admin da empresa)',
        params: [
          { name: 'user_id', in: 'body', type: 'uuid', required: true, description: 'Usuário alvo' },
          { name: 'password', in: 'body', type: 'string', required: true, description: 'Nova senha' },
        ],
        requestExample: `{ "user_id": "uuid", "password": "NovaSenha@123" }`,
        responseExample: `{ "success": true }`,
      },
      {
        id: 'fn-get-user-email',
        method: 'POST',
        path: '/get-user-email',
        summary: 'Consultar e-mail de um usuário',
        description: 'Usado no modal Editar Usuário para exibir o e-mail de login.',
        scope: 'company',
        auth: 'Bearer JWT (admin da empresa)',
        requestExample: `{ "user_id": "uuid" }`,
        responseExample: `{ "email": "usuario@clinica.com.br" }`,
      },
    ],
  },
  {
    tag: 'empresas',
    description: 'Administração de empresas (tenant). Escopo de sistema — apenas Super Admin.',
    endpoints: [
      {
        id: 'fn-delete-company',
        method: 'POST',
        path: '/delete-company',
        summary: 'Excluir empresa e dados vinculados',
        scope: 'system',
        auth: 'Bearer JWT (super admin)',
        requestExample: `{ "company_id": "uuid" }`,
        responseExample: `{ "success": true, "deleted": { "users": 12, "orders": 340 } }`,
      },
      {
        id: 'rest-companies',
        method: 'GET',
        path: '/companies?select=*',
        summary: 'Listar empresas',
        description: 'REST com RLS: super admin vê todas; demais usuários apenas a própria empresa.',
        scope: 'system',
        auth: 'Bearer JWT',
        responseExample: `[{ "id": "uuid", "name": "Clínica X", "nome_fantasia": "Clínica X", "is_active": true }]`,
      },
      {
        id: 'rpc-company-id',
        method: 'POST',
        path: '/rpc/get_user_company_id',
        summary: 'Empresa do usuário (RPC)',
        scope: 'system',
        auth: 'Bearer JWT',
        requestExample: `{ "_user_id": "uuid" }`,
        responseExample: `"uuid-da-empresa"`,
      },
      {
        id: 'rpc-has-role',
        method: 'POST',
        path: '/rpc/has_role',
        summary: 'Verificar papel do usuário (RPC)',
        scope: 'system',
        auth: 'Bearer JWT',
        requestExample: `{ "_user_id": "uuid", "_role": "super_admin" }`,
        responseExample: `true`,
      },
    ],
  },
  {
    tag: 'atendimentos',
    description: 'Pedidos de atendimento, pacientes e guias. Todos os dados são isolados por empresa (RLS).',
    endpoints: [
      {
        id: 'rest-orders-list',
        method: 'GET',
        path: '/attendance_orders?select=*&order=created_at.desc',
        summary: 'Listar pedidos de atendimento',
        scope: 'company',
        auth: 'Bearer JWT',
        params: [
          { name: 'status', in: 'query', type: 'string', description: 'Filtro: eq.waiting | eq.collection_done | eq.open | eq.deleted' },
          { name: 'origin_id', in: 'query', type: 'uuid', description: 'Filtrar pela origem ativa' },
        ],
        responseExample: `[{
  "id": "uuid",
  "order_number": "128-00",
  "patient_id": "uuid",
  "status": "waiting",
  "origin_id": "uuid"
}]`,
      },
      {
        id: 'rest-orders-create',
        method: 'POST',
        path: '/attendance_orders',
        summary: 'Criar pedido de atendimento',
        description: 'O número do protocolo deve ser obtido via RPC next_attendance_order_number. Um trigger valida que a origem pertence à empresa.',
        scope: 'company',
        auth: 'Bearer JWT',
        requestExample: `{
  "company_id": "uuid",
  "origin_id": "uuid",
  "patient_id": "uuid",
  "order_number": "129-00",
  "status": "waiting"
}`,
      },
      {
        id: 'rpc-next-order',
        method: 'POST',
        path: '/rpc/next_attendance_order_number',
        summary: 'Gerar próximo protocolo (RPC atômica)',
        scope: 'company',
        auth: 'Bearer JWT',
        requestExample: `{ "_company_id": "uuid", "_origin_id": "uuid", "_origin_code": "00" }`,
        responseExample: `"129-00"`,
      },
      {
        id: 'rest-patients',
        method: 'GET',
        path: '/patients?select=*&or=(cpf.eq.000,full_name.ilike.*maria*)',
        summary: 'Buscar pacientes',
        scope: 'company',
        auth: 'Bearer JWT',
      },
    ],
  },
  {
    tag: 'laboratorio',
    description: 'Catálogo de exames, resultados, laudos e configurações do laboratório.',
    endpoints: [
      {
        id: 'rest-exams',
        method: 'GET',
        path: '/exams?select=*&is_active=eq.true',
        summary: 'Catálogo de exames',
        scope: 'company',
        auth: 'Bearer JWT',
      },
      {
        id: 'rest-results',
        method: 'GET',
        path: '/lab_exam_results?select=*,lab_result_values(*)',
        summary: 'Resultados por pedido',
        scope: 'company',
        auth: 'Bearer JWT',
        params: [{ name: 'order_id', in: 'query', type: 'uuid', description: 'eq.<uuid> do pedido' }],
      },
      {
        id: 'rest-results-save',
        method: 'PATCH',
        path: '/lab_result_values?id=eq.<uuid>',
        summary: 'Salvar/alterar valor digitado',
        scope: 'company',
        auth: 'Bearer JWT (permissão Digitar)',
        requestExample: `{ "value": "13.4", "status": "typed" }`,
      },
      {
        id: 'rest-methods',
        method: 'GET',
        path: '/lab_methods?select=*',
        summary: 'Metodologias analíticas',
        scope: 'company',
        auth: 'Bearer JWT',
      },
      {
        id: 'rest-templates',
        method: 'GET',
        path: '/lab_report_templates?select=*',
        summary: 'Templates de laudo',
        scope: 'company',
        auth: 'Bearer JWT',
      },
    ],
  },
  {
    tag: 'interfaceamento',
    description: 'Integração com analisadores laboratoriais (middleware local). Autenticação por API Key da empresa.',
    endpoints: [
      {
        id: 'fn-receive-result',
        method: 'POST',
        path: '/receive-instrument-result',
        summary: 'Receber resultado de equipamento',
        description: 'Endpoint público autenticado por X-API-Key. Vincula o resultado ao pedido pela amostra/protocolo.',
        scope: 'company',
        auth: 'Header X-API-Key',
        params: [
          { name: 'X-API-Key', in: 'header', type: 'string', required: true, description: 'Chave de integração da empresa' },
        ],
        requestExample: `{
  "equipment_id": "COBAS-01",
  "sample_code": "129-00",
  "results": [
    { "test_code": "HB", "value": "13.4", "unit": "g/dL" }
  ]
}`,
        responseExample: `{ "success": true, "matched": 1, "ignored": 0 }`,
      },
      {
        id: 'fn-list-exams',
        method: 'GET',
        path: '/list-exams-for-integration',
        summary: 'Catálogo de exames (sincronização do middleware)',
        description:
          'Lista os exames ativos da empresa da chave, para o middleware local puxar periodicamente (pull). Parâmetros do exame são retornados como itens filhos com parent_code.',
        scope: 'company',
        auth: 'Header X-API-Key',
        params: [
          { name: 'X-API-Key', in: 'header', type: 'string', required: true, description: 'Chave de integração da empresa' },
          { name: 'page', in: 'query', type: 'number', required: false, description: 'Página (opcional, padrão 1)' },
          { name: 'limit', in: 'query', type: 'number', required: false, description: 'Itens por página (opcional, padrão 2000)' },
        ],
        responseExample: `{
  "exams": [
    {
      "code": "HB",
      "name": "Hemoglobina",
      "material": "Sangue total",
      "sector": "Hematologia",
      "is_active": true,
      "parent_code": null,
      "parameter_order": null
    }
  ]
}`,
      },
      {

        id: 'fn-test-webhook',
        method: 'POST',
        path: '/test-instrument-webhook',
        summary: 'Testar webhook do equipamento',
        description: 'Envia um payload de teste com os dados do equipamento para a URL configurada.',
        scope: 'company',
        auth: 'Bearer JWT',
        requestExample: `{
  "url": "http://localhost:8000/api/v1/events",
  "method": "POST",
  "equipment": {
    "name": "Cobas c311",
    "interface_id": "COBAS-01",
    "type": "bioquimica",
    "brand_model": "Roche / c311"
  }
}`,
        responseExample: `{ "ok": true, "status": 200, "duration_ms": 143 }`,
      },
      {
        id: 'rest-instrument-events',
        method: 'GET',
        path: '/instrument_events?select=*&order=created_at.desc',
        summary: 'Histórico de eventos dos equipamentos',
        scope: 'company',
        auth: 'Bearer JWT',
      },
    ],
  },
  {
    tag: 'filas-e-paineis',
    description: 'Totem, painel de TV e senhas. RPCs públicas usadas pelos dispositivos (sem login de usuário).',
    endpoints: [
      {
        id: 'rpc-device-info',
        method: 'POST',
        path: '/rpc/device_public_info',
        summary: 'Dados públicos do dispositivo (totem/TV)',
        scope: 'company',
        auth: 'Público (apikey)',
        requestExample: `{ "_kind": "totem", "_slug": "recepcao-matriz" }`,
        responseExample: `{
  "id": "uuid", "name": "Totem Recepção", "requires_auth": false,
  "company_name": "Clínica X", "primary_color": "#00D4FF"
}`,
      },
      {
        id: 'rpc-device-verify',
        method: 'POST',
        path: '/rpc/device_verify_access',
        summary: 'Validar acesso do dispositivo',
        scope: 'company',
        auth: 'Público (apikey)',
        requestExample: `{ "_kind": "tv", "_slug": "tv-01", "_username": "tv", "_password": "••••" }`,
        responseExample: `true`,
      },
      {
        id: 'rpc-totem-lines',
        method: 'POST',
        path: '/rpc/totem_queue_lines',
        summary: 'Filas disponíveis no totem',
        scope: 'company',
        auth: 'Público (apikey)',
        requestExample: `{ "_slug": "recepcao-matriz" }`,
      },
      {
        id: 'rpc-totem-ticket',
        method: 'POST',
        path: '/rpc/totem_create_ticket',
        summary: 'Emitir senha no totem',
        scope: 'company',
        auth: 'Público (apikey)',
        requestExample: `{ "_slug": "recepcao-matriz", "_queue_line_id": "uuid", "_preferential": false }`,
        responseExample: `{ "display_code": "A012", "number": 12, "prefix": "A" }`,
      },
      {
        id: 'rpc-panel-tickets',
        method: 'POST',
        path: '/rpc/panel_tickets',
        summary: 'Senhas do dia para o painel de TV',
        scope: 'company',
        auth: 'Público (apikey)',
        requestExample: `{ "_slug": "tv-01" }`,
      },
    ],
  },
  {
    tag: 'faturamento',
    description: 'Guias TISS, convênios e tabelas de preço.',
    endpoints: [
      {
        id: 'rest-tiss',
        method: 'GET',
        path: '/tiss_guides?select=*',
        summary: 'Listar guias TISS',
        scope: 'company',
        auth: 'Bearer JWT',
      },
      {
        id: 'rest-convenios',
        method: 'GET',
        path: '/convenios?select=*',
        summary: 'Listar convênios',
        scope: 'company',
        auth: 'Bearer JWT',
      },
      {
        id: 'rest-plans',
        method: 'GET',
        path: '/pricing_plans?select=*',
        summary: 'Planos comerciais do SaaS',
        scope: 'system',
        auth: 'Bearer JWT (super admin para escrita)',
      },
    ],
  },
  {
    tag: 'sistema',
    description: 'Configurações globais, papéis e auditoria. Escopo de sistema.',
    endpoints: [
      {
        id: 'rest-system-settings',
        method: 'GET',
        path: '/system_settings?select=*',
        summary: 'Configurações globais (white-label, SMTP, manutenção)',
        scope: 'system',
        auth: 'Bearer JWT (super admin)',
      },
      {
        id: 'rest-user-roles',
        method: 'GET',
        path: '/user_roles?select=*',
        summary: 'Papéis atribuídos aos usuários',
        scope: 'system',
        auth: 'Bearer JWT',
      },
      {
        id: 'rest-branding',
        method: 'GET',
        path: '/company_branding?select=*',
        summary: 'Identidade visual da empresa',
        scope: 'company',
        auth: 'Bearer JWT',
      },
      {
        id: 'storage-upload',
        method: 'POST',
        path: '/storage/v1/object/company-assets/{path}',
        summary: 'Upload de arquivos (logos, anexos, mídia de TV)',
        scope: 'company',
        auth: 'Bearer JWT',
        params: [
          { name: 'path', in: 'path', type: 'string', required: true, description: 'Caminho no bucket, prefixado pelo company_id' },
        ],
      },
    ],
  },
]
