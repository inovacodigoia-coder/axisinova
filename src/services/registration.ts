import { supabase } from '@/integrations/supabase/client'

interface RegistrationData {
  // Company
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  segmento: string
  telefone?: string
  emailComercial?: string
  website?: string
  // Address
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  // Admin user
  nomeCompleto: string
  cpf: string
  emailAdmin: string
  senha: string
  plano: string
}

export async function checkCnpjExists(cnpj: string): Promise<boolean> {
  // Uses a narrow RPC: company rows are not publicly readable.
  const { data, error } = await supabase.rpc('company_cnpj_exists', { _cnpj: cnpj })

  if (error) {
    console.error('CNPJ check error:', error)
    throw new Error('Não foi possível verificar o CNPJ agora. Tente novamente.')
  }
  return data === true
}

export async function registerCompany(data: RegistrationData) {
  // 0. Sign out any leftover session from previous attempts
  await supabase.auth.signOut()

  // 1. Check for duplicate CNPJ before attempting insert
  const cnpjExists = await checkCnpjExists(data.cnpj)
  if (cnpjExists) {
    throw new Error('Este CNPJ já está cadastrado no sistema. Caso precise de ajuda, entre em contato com o suporte.')
  }

  // 2. Create the company through the validated signup function (direct inserts are blocked;
  //    plan, status, price and enabled modules are decided on the server)
  const { data: newCompanyId, error: companyError } = await supabase.rpc('empresa_cadastro_publico', {
    _razao_social: data.razaoSocial,
    _cnpj: data.cnpj,
    _nome_fantasia: data.nomeFantasia,
    _segmento: data.segmento,
    _telefone: data.telefone?.trim() || null,
    _email: data.emailComercial?.trim() || null,
    _website: data.website || null,
    _plano: data.plano || 'Pro',
    _cep: data.cep,
    _logradouro: data.logradouro,
    _numero: data.numero,
    _complemento: data.complemento || null,
    _bairro: data.bairro,
    _cidade: data.cidade,
    _estado: data.estado,
  } as any)

  if (companyError) {
    console.error('Company creation error:', companyError)
    // Common duplicate key code is 23505
    if (companyError.code === '23505' && companyError.message?.includes('companies_cnpj_unique')) {
      throw new Error('Este CNPJ já está cadastrado no sistema.')
    }
    throw new Error('Erro ao criar empresa: ' + companyError.message)
  }

  const companyId = newCompanyId as string | null

  if (!companyId) {
    throw new Error('Erro ao processar criação da empresa. Por favor, tente novamente.')
  }

  // 3. Sign up the admin user with metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.emailAdmin,
    password: data.senha,
    options: {
      data: {
        full_name: data.nomeCompleto,
        cpf: data.cpf,
        role: 'company_admin',
        company_id: companyId,
      },
    },
  })

  if (authError) {
    console.error('Auth signup error:', authError)
    throw new Error('Erro ao criar usuário: ' + authError.message)
  }

  // 4. Sign out immediately so the user logs in explicitly
  await supabase.auth.signOut()

  return {
    companyId: companyId,
    userId: authData.user?.id,
  }
}