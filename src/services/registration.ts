import { supabase } from '@/integrations/supabase/client'

interface RegistrationData {
  // Company
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  segmento: string
  telefone: string
  emailComercial: string
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
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('cnpj', cnpj)
    .maybeSingle()

  if (error) {
    console.error('CNPJ check error:', error)
    return false
  }
  return !!data
}

export async function registerCompany(data: RegistrationData) {
  // 0. Sign out any leftover session from previous attempts
  await supabase.auth.signOut()

  // 1. Check for duplicate CNPJ
  const cnpjExists = await checkCnpjExists(data.cnpj)
  if (cnpjExists) {
    throw new Error('Este CNPJ já está cadastrado no sistema. Caso precise de ajuda, entre em contato com o suporte.')
  }

  // 2. Create the company first
  // We use .select() to get the ID, but we handle the case where it might fail due to RLS or unique constraint
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: data.razaoSocial,
      cnpj: data.cnpj,
      nome_fantasia: data.nomeFantasia,
      segmento: data.segmento,
      telefone: data.telefone,
      email: data.emailComercial,
      website: data.website || null,
      plano: data.plano || 'Pro',
      status: 'active',
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento || null,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      valor_mensal: data.plano === 'Starter' ? 490 : data.plano === 'Enterprise' ? 2490 : 990,
    })
    .select('id')
    .maybeSingle()

  if (companyError) {
    console.error('Company creation error:', companyError)
    if (companyError.code === '23505' || companyError.message?.includes('unique') || companyError.message?.includes('cnpj')) {
      throw new Error('Este CNPJ já está cadastrado no sistema.')
    }
    throw new Error('Erro ao criar empresa: ' + companyError.message)
  }

  if (!company) {
    // If insert succeeded but select returned nothing (unlikely with RLS 'true' for insert, but safe to check)
    // We try to fetch it again just in case it was created but RLS blocked the returning select
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', data.cnpj)
      .maybeSingle()
    
    if (!existingCompany) {
      throw new Error('Erro ao processar criação da empresa. Por favor, tente novamente.')
    }
    company = existingCompany;
  }


  // 2. Sign up the admin user with metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.emailAdmin,
    password: data.senha,
    options: {
      data: {
        full_name: data.nomeCompleto,
        cpf: data.cpf,
        role: 'company_admin',
        company_id: company.id,
      },
    },
  })

  if (authError) {
    console.error('Auth signup error:', authError)
    throw new Error('Erro ao criar usuário: ' + authError.message)
  }

  // 3. Sign out immediately so the user logs in explicitly
  await supabase.auth.signOut()

  return {
    companyId: company.id,
    userId: authData.user?.id,
  }
}
