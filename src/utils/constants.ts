export const SYSTEM_NAME = 'Axis Inova'
export const SUPPORT_EMAIL = 'suporte@axisinova.com.br'
export const SUPPORT_WHATSAPP = '55849999-0000'

export const SPECIALTIES = [
  'Cardiologia', 'Clínica Geral', 'Dermatologia', 'Endocrinologia',
  'Gastroenterologia', 'Ginecologia', 'Neurologia', 'Oftalmologia',
  'Ortopedia', 'Otorrinolaringologia', 'Pediatria', 'Psiquiatria',
  'Urologia', 'Pneumologia', 'Reumatologia',
]

export const PROFESSIONAL_CLASSES = ['CRM', 'CRO', 'COREN', 'CRF', 'CREFITO', 'CRP', 'CRN', 'CRMV']

export const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' }, { code: 'AL', name: 'Alagoas' }, { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' }, { code: 'BA', name: 'Bahia' }, { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' }, { code: 'ES', name: 'Espírito Santo' }, { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' }, { code: 'MT', name: 'Mato Grosso' }, { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' }, { code: 'PA', name: 'Pará' }, { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' }, { code: 'PE', name: 'Pernambuco' }, { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' }, { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' }, { code: 'RO', name: 'Rondônia' }, { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' }, { code: 'SP', name: 'São Paulo' }, { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
]

export const OCCUPATIONS = ['Médico', 'Dentista', 'Enfermeiro', 'Técnico de Enfermagem', 'Fisioterapeuta', 'Psicólogo', 'Nutricionista', 'Farmacêutico']

export const RELATIONSHIP_TYPES = ['Cônjuge', 'Filho(a)', 'Pai/Mãe', 'Irmão/Irmã', 'Representante Legal', 'Outro']

export const TICKET_CATEGORIES = { SP: 'Preferencial', SN: 'Normal', EX: 'Exame', PR: 'Procedimento', RE: 'Retorno' }

export const ATTENDANCE_DURATION_OPTIONS = [15, 20, 30, 45, 60]
export const RETURN_INTERVAL_OPTIONS = [0, 5, 10, 15]

export const MAX_FILE_SIZE_MB = 10
export const ACCEPTED_FILE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff']

export const SESSION_TIMEOUT_MINUTES = 480
export const AUTOSAVE_INTERVAL_MS = 30000
export const NOTIFICATION_INTERVAL_MS = 45000
export const QUEUE_UPDATE_INTERVAL_MS = 3000

export const ROUTE_LABELS: Record<string, string> = {
  '/app': 'Início',
  '/app/dashboard': 'Dashboard',
  '/app/agendamento': 'Agendamento',
  '/app/confirmacoes': 'Confirmações',
  '/app/faltosos': 'Faltosos',
  '/app/recepcao': 'Recepção',
  '/app/medico': 'Painel Médico',
  '/app/atendimento': 'Atendimento',
  '/app/prontuario': 'Prontuário',
  '/app/faturamento': 'Faturamento',
  '/app/faturamento/guias': 'Guias',
  '/app/faturamento/lotes': 'Lotes',
  '/app/faturamento/glosas': 'Glosas',
  '/app/faturamento/correcoes': 'Correções',
  '/app/resultados': 'Resultados',
  '/app/usuarios': 'Usuários',
  '/app/configuracoes': 'Configurações',
  '/app/configuracoes/perfis': 'Perfis',
  '/app/setores': 'Setores',
  '/app/cadastros': 'Cadastros',
  '/app/cadastros/medicos': 'Médicos',
  '/app/cadastros/convenios': 'Convênios',
  '/app/cadastros/exames': 'Exames',
  '/app/bi': 'Business Intelligence',
  '/app/bi/producao': 'Produção',
  '/app/bi/financeiro': 'Financeiro',
  '/app/bi/agendamentos': 'Agendamentos',
  '/app/bi/faltosos': 'Faltosos (BI)',
  '/app/bi/convenios': 'Convênios (BI)',
  '/app/bi/medicos': 'Performance Médica',
  '/app/notificacoes': 'Notificações',
}
