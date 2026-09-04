/**
 * Especificação da API do AxisInova.
 * Sempre que uma nova função, RPC ou tabela for criada, adicione aqui —
 * a página /docs é gerada automaticamente a partir deste arquivo.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Scope = 'company' | 'system' | 'partner'

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
  updatedAt: '2026-09-01',
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
    description:
      'Integração com analisadores laboratoriais (middleware local). Autenticação recomendada: OAuth2 client credentials (Authorization: Bearer). A API Key fixa (X-API-Key) segue aceita como legado em todos os endpoints deste grupo.',
    endpoints: [
      {
        id: 'fn-oauth-token',
        method: 'POST',
        path: '/oauth-token',
        summary: 'Obter token de acesso (OAuth2 client credentials)',
        description:
          'Fluxo client_credentials (RFC 6749 §4.4). Troca client_id + client_secret por um access_token JWT de curta duração (3600s). Aceita corpo application/x-www-form-urlencoded ou JSON, e também client_secret_basic (Authorization: Basic base64(client_id:client_secret)). Escopos disponíveis: exams:read, orders:read, results:write. Não há refresh token — solicite outro token quando expirar.',
        scope: 'company',
        auth: 'Público (credenciais no corpo ou Basic)',
        params: [
          { name: 'grant_type', in: 'body', type: 'string', required: true, description: 'Deve ser "client_credentials"' },
          { name: 'client_id', in: 'body', type: 'string', required: true, description: 'Client ID gerado no painel de Integração de Equipamentos' },
          { name: 'client_secret', in: 'body', type: 'string', required: true, description: 'Client Secret exibido apenas na criação' },
          { name: 'scope', in: 'body', type: 'string', required: false, description: 'Escopos separados por espaço. Omitido = todos os escopos do client' },
        ],
        requestExample: `grant_type=client_credentials&client_id=axis_cid_...&client_secret=axis_sec_...&scope=exams:read orders:read results:write`,
        responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "exams:read orders:read results:write"
}

// erro
{ "error": "invalid_client", "error_description": "Credenciais inválidas ou revogadas" }`,
      },
      {
        id: 'fn-receive-result',
        method: 'POST',
        path: '/receive-instrument-result',
        summary: 'Receber resultado de equipamento',
        description:
          'Endpoint autenticado por X-API-Key. Um parâmetro por chamada. O result_id identifica o exame no pedido e é compartilhado pelos parâmetros do mesmo painel; parameter_result_id identifica a gravação individual do parâmetro. A amostra é identificada pelo mesmo "sample_barcode" devolvido em /list-orders-for-integration. Toda rejeição vem com { success: false, error } e status 4xx — nunca 200 silencioso.',
        scope: 'company',
        auth: 'Authorization: Bearer <access_token> (OAuth2) ou X-API-Key (legado)',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: false, description: 'Bearer <access_token> obtido em /oauth-token (recomendado)' },
          { name: 'X-API-Key', in: 'header', type: 'string', required: false, description: 'Chave de integração fixa da empresa (legado, alternativa ao Bearer)' },
          { name: 'idempotency_key', in: 'body', type: 'string', required: true, description: 'String única por evento. Reenvio da mesma chave devolve success: true com duplicate: true' },
          { name: 'sample_barcode', in: 'body', type: 'string', required: true, description: 'Código de barras da amostra (samples[].sample_barcode). Também aceita o sample_code ou o número do pedido' },
          { name: 'equipment_id', in: 'body', type: 'string', required: true, description: 'Identificador de interface do equipamento (serial cadastrado)' },
          { name: 'test_code', in: 'body', type: 'string', required: true, description: 'Código do exame/parâmetro no equipamento' },
          { name: 'value', in: 'body', type: 'string', required: true, description: 'Valor do resultado' },
          { name: 'unit', in: 'body', type: 'string', required: false, description: 'Unidade de medida' },
          { name: 'flag', in: 'body', type: 'string', required: false, description: 'N (normal), L (baixo) ou H (alto)' },
          { name: 'reference_range', in: 'body', type: 'string', required: false, description: 'Faixa de referência do equipamento' },
          { name: 'result_datetime', in: 'body', type: 'string', required: false, description: 'ISO 8601 do horário do resultado' },
        ],
        requestExample: `{
  "idempotency_key": "cobas-2026-08-25-000123",
  "sample_barcode": "17RGQ3RM6",
  "equipment_id": "COBAS-01",
  "test_code": "HB",
  "value": "13.4",
  "unit": "g/dL",
  "flag": null,
  "reference_range": null,
  "result_datetime": "2026-08-25T00:16:29-03:00"
}`,
        responseExample: `// 200 sucesso
{ "success": true, "result_id": "...", "parameter_result_id": "...", "parameter_key": "2", "protocol": "129-00", "exam": "Hemograma", "parameter": "Hemoglobina" }

// 200 evento repetido (não duplica o resultado)
{ "success": true, "duplicate": true, "message": "Evento já processado anteriormente" }

// 422 rejeição com motivo explícito
{ "success": false, "error": "Nenhum pedido encontrado com sample_barcode=17RGQ3RM6" }`,
      },

      {
        id: 'fn-receive-graphic',
        method: 'POST',
        path: '/receive-instrument-graphic',
        summary: 'Receber gráfico do equipamento (histograma/scattergram)',
        description:
          'Endpoint autenticado por X-API-Key para envio de imagens geradas pelo analisador (histogramas WBC/RBC/PLT, scattergramas). Um gráfico por chamada. A amostra é identificada pelo mesmo "sample_barcode" devolvido em /list-orders-for-integration. Toda rejeição vem com { success: false, error } e status 4xx — nunca 200 silencioso.',
        scope: 'company',
        auth: 'Authorization: Bearer <access_token> (OAuth2) ou X-API-Key (legado)',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: false, description: 'Bearer <access_token> obtido em /oauth-token (recomendado)' },
          { name: 'X-API-Key', in: 'header', type: 'string', required: false, description: 'Chave de integração fixa da empresa (legado, alternativa ao Bearer)' },
          { name: 'idempotency_key', in: 'body', type: 'string', required: true, description: 'String única por evento. Reenvio da mesma chave devolve success: true com duplicate: true' },
          { name: 'sample_barcode', in: 'body', type: 'string', required: true, description: 'Código de barras da amostra (samples[].sample_barcode)' },
          { name: 'equipment_id', in: 'body', type: 'string', required: true, description: 'Identificador de interface do equipamento (serial cadastrado)' },
          { name: 'item_code', in: 'body', type: 'string', required: true, description: 'Código do gráfico no equipamento (ex.: "12003"). Não precisa existir no Catálogo de Exames' },
          { name: 'label', in: 'body', type: 'string', required: false, description: 'Nome legível do gráfico (ex.: "Histograma WBC")' },
          { name: 'image_format', in: 'body', type: 'string', required: true, description: 'Formato da imagem: BMP, PNG, JPEG, GIF ou WEBP' },
          { name: 'image_base64', in: 'body', type: 'string', required: true, description: 'Conteúdo binário da imagem em base64 (máx. 2MB decodificados)' },
        ],
        requestExample: `{
  "idempotency_key": "cellagon-2026-08-28-000456",
  "sample_barcode": "17RGQ3RM6",
  "equipment_id": "CELLAGON-01",
  "item_code": "12003",
  "label": "Histograma WBC",
  "image_format": "BMP",
  "image_base64": "Qk0..."
}`,
        responseExample: `// 200 sucesso
{ "success": true, "graphic_id": "...", "protocol": "129-00", "item_code": "12003" }

// 200 evento repetido (não duplica o gráfico)
{ "success": true, "duplicate": true, "message": "Evento já processado anteriormente" }

// 422 rejeição com motivo explícito
{ "success": false, "error": "Nenhum pedido encontrado com sample_barcode=17RGQ3RM6" }
{ "success": false, "error": "image_base64 inválido, vazio ou maior que 2MB decodificados" }`,
      },

      {
        id: 'fn-list-exams',
        method: 'GET',
        path: '/list-exams-for-integration',
        summary: 'Catálogo de exames (sincronização do middleware)',
        description:
          'Lista os exames ativos da empresa da chave, para o middleware local puxar periodicamente (pull). Parâmetros do exame são retornados como itens filhos com parent_code. Apenas exames do Tipo "Laboratório" são devolvidos — exames do tipo "Clínica" nunca aparecem na resposta.',
        scope: 'company',
        auth: 'Authorization: Bearer <access_token> (OAuth2) ou X-API-Key (legado)',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: false, description: 'Bearer <access_token> obtido em /oauth-token (recomendado)' },
          { name: 'X-API-Key', in: 'header', type: 'string', required: false, description: 'Chave de integração fixa da empresa (legado, alternativa ao Bearer)' },
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
        id: 'fn-list-orders',
        method: 'GET',
        path: '/list-orders-for-integration',
        summary: 'Pedidos coletados/cancelados (pull do middleware)',
        description:
          'Lista pedidos cuja amostra foi coletada (ou que foram cancelados) após o horário informado em "since". Pedidos ainda não coletados não aparecem. Recomendado chamar a cada 1-2 minutos.',
        scope: 'company',
        auth: 'Authorization: Bearer <access_token> (OAuth2) ou X-API-Key (legado)',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: false, description: 'Bearer <access_token> obtido em /oauth-token (recomendado)' },
          { name: 'X-API-Key', in: 'header', type: 'string', required: false, description: 'Chave de integração fixa da empresa (legado, alternativa ao Bearer)' },
          { name: 'since', in: 'query', type: 'string', required: false, description: 'ISO 8601 da última busca bem-sucedida. Vazio = últimas 24h' },
          { name: 'limit', in: 'query', type: 'number', required: false, description: 'Máximo de pedidos por chamada (padrão 500)' },
        ],
        responseExample: `{
  "orders": [
    {
      "order_label": "109-00-1-2",
      "status": "collected",
      "patient_ref": "12345",
      "patient_name": "Vera Lucia da Silva Nunes",
      "patient_birth_date": "1973-09-19",
      "patient_sex": "F",
      "samples": [
        {
          "sample_barcode": "17RGQ3RM6",
          "sample_code": "109-00-1-2",
          "collected_at": "2026-08-24T21:36:00.000Z",
          "material": "Soro (gel separador)",
          "exams": [{ "code": "URE" }, { "code": "CREA" }]
        }
      ]
    },
    {
      "order_label": "120-00",
      "status": "cancelled",
      "samples": []
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
    tag: 'parceiros',
    description:
      'Integração para parceiros externos (laboratórios, clínicas, convênios, médicos solicitantes) enviarem pedidos de atendimento com paciente e exames. Autenticação recomendada: OAuth2 client credentials.',
    endpoints: [
      {
        id: 'fn-oauth-token-partner',
        method: 'POST',
        path: '/oauth-token',
        summary: 'Obter token de acesso (OAuth2 client credentials)',
        description:
          'Fluxo client_credentials (RFC 6749 §4.4). Troca client_id + client_secret por um access_token JWT de curta duração (3600s). Mesmo endpoint usado por equipamentos de laboratório; o escopo do token varia conforme o tipo de credencial (parceiro vs. instrumento). Não há refresh token — solicite outro token quando expirar.',
        scope: 'company',
        auth: 'Público (credenciais no corpo ou Basic)',
        params: [
          { name: 'grant_type', in: 'body', type: 'string', required: true, description: 'Deve ser "client_credentials"' },
          { name: 'client_id', in: 'body', type: 'string', required: true, description: 'Client ID gerado no cadastro do parceiro' },
          { name: 'client_secret', in: 'body', type: 'string', required: true, description: 'Client Secret exibido apenas na criação' },
        ],
        requestExample: `{
  "grant_type": "client_credentials",
  "client_id": "axis_cid_...",
  "client_secret": "••••••••••••••••"
}`,
        responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}

// erro
{ "error": "invalid_client", "error_description": "Credenciais inválidas ou revogadas" }`,
      },
      {
        id: 'fn-partner-orders-create',
        method: 'POST',
        path: '/partner/orders',
        summary: 'Criar pedido de atendimento (paciente + exames)',
        description:
          'Endpoint principal da integração de parceiros. Valida CPF e códigos de exame, cria o paciente quando não existe e gera automaticamente o atendimento com protocolo interno. Se qualquer código de exame não for reconhecido, o pedido inteiro é rejeitado. O parceiro precisa estar com "Autorizado a criar pedidos via API" ativo e o módulo liberado para a empresa.',
        scope: 'partner',
        auth: 'Authorization: Bearer <access_token> (OAuth2)',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer <access_token> obtido em /oauth-token' },
          { name: 'protocolo_parceiro', in: 'body', type: 'string', required: false, description: 'Identificador do pedido no sistema do parceiro (deve ser único)' },
          { name: 'paciente', in: 'body', type: 'object', required: true, description: 'nome, cpf, data_nascimento, sexo, telefone' },
          { name: 'exames', in: 'body', type: 'array', required: true, description: 'Lista de { codigo } usando o Código do Catálogo de Exames' },
          { name: 'medico_solicitante', in: 'body', type: 'object', required: false, description: 'nome, conselho, numero, uf' },
          { name: 'convenio', in: 'body', type: 'object', required: false, description: 'nome, numero_carteira, numero_guia' },
        ],
        requestExample: `{
  "protocolo_parceiro": "PED-2026-00871",
  "paciente": {
    "nome": "Maria Aparecida Souza",
    "cpf": "123.456.789-09",
    "data_nascimento": "1985-04-17",
    "sexo": "F",
    "telefone": "(84) 99999-1234"
  },
  "exames": [
    { "codigo": "40301010" },
    { "codigo": "40302040" }
  ],
  "medico_solicitante": {
    "nome": "Dr. Rafael Andrade",
    "conselho": "CRM",
    "numero": "12345",
    "uf": "RN"
  },
  "convenio": {
    "nome": "Unimed",
    "numero_carteira": "0123456789",
    "numero_guia": "987654"
  }
}`,
        responseExample: `// 201 sucesso
{
  "success": true,
  "protocolo": "192-00",
  "status": "AGUARDANDO",
  "paciente_id": "pat_8f21c4",
  "exames": [
    { "codigo": "40301010", "nome": "Hemograma Completo", "status": "AGUARDANDO" },
    { "codigo": "40302040", "nome": "Glicemia de Jejum", "status": "AGUARDANDO" }
  ]
}

// 422 erro
{
  "success": false,
  "error": "EXAM_CODE_NOT_FOUND",
  "message": "Código de exame não reconhecido: 99999999",
  "protocolo_parceiro": "PED-2026-00871"
}

// demais erros: UNAUTHORIZED, PARTNER_NOT_AUTHORIZED, INVALID_CPF, MISSING_FIELD, DUPLICATE_ORDER, RATE_LIMITED`,
      },
      {
        id: 'fn-partner-orders-status',
        method: 'GET',
        path: '/partner/orders/{protocolo}',
        summary: 'Consultar status de um pedido enviado',
        description:
          'Retorna a situação atual de um pedido criado via POST /partner/orders, usando o protocolo interno retornado na criação (ou o protocolo_parceiro enviado). Útil para o sistema do parceiro acompanhar o andamento (aguardando, coletado, em análise, liberado).',
        scope: 'partner',
        auth: 'Authorization: Bearer <access_token> (OAuth2)',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer <access_token> obtido em /oauth-token' },
          { name: 'protocolo', in: 'path', type: 'string', required: true, description: 'Protocolo interno (ex.: "192-00") ou o protocolo_parceiro enviado na criação' },
        ],
        responseExample: `// 200 sucesso
{
  "success": true,
  "protocolo": "192-00",
  "protocolo_parceiro": "PED-2026-00871",
  "status": "LIBERADO",
  "paciente": { "nome": "Maria Aparecida Souza" },
  "exames": [
    { "codigo": "40301010", "nome": "Hemograma Completo", "status": "LIBERADO" },
    { "codigo": "40302040", "nome": "Glicemia de Jejum", "status": "LIBERADO" }
  ]
}

// 404 erro
{
  "success": false,
  "error": "ORDER_NOT_FOUND",
  "message": "Nenhum pedido encontrado com o protocolo informado"
}`,
      },
      {
        id: 'fn-list-exams-partner',
        method: 'GET',
        path: '/list-exams-for-integration',
        summary: 'Catálogo de exames para montagem de pedidos',
        description:
          'Lista os exames ativos da empresa com seus códigos. Mesmo endpoint já usado por equipamentos (grupo Interfaceamento), reaproveitável para parceiros sincronizarem o catálogo antes de montar cada pedido. Apenas exames do Tipo "Laboratório" são devolvidos.',
        scope: 'company',
        auth: 'Authorization: Bearer <access_token> (OAuth2)',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer <access_token> obtido em /oauth-token' },
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
