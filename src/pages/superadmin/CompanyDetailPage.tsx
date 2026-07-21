import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { MOCK_COMPANY_USERS, MOCK_INVOICES, MOCK_PLANS } from '@/mocks/superadmin.mock'
import { CompanyStatusBadge } from '@/components/superadmin/CompanyStatusBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ArrowLeft, Users, Building2, ClipboardList, HardDrive, ExternalLink, Stethoscope, Plus, Minus, UserPlus, Database } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { OutlineButton } from '@/components/ui/OutlineButton'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import type { Company, PlanType, CompanyStatus } from '@/types/company.types'

const ADDON_PRICE_DOCTOR = 79
const ADDON_PRICE_PATIENT_PACK = 49 // per 500 patients
const ADDON_PRICE_STORAGE = 29 // per 50 GB

export default function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const { setImpersonation } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCompany() {
      if (!companyId) return
      setLoading(true)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error) {
        console.error('Error fetching company:', error)
        setLoading(false)
        return
      }

      if (data) {
        const mapped: Company = {
          id: data.id,
          razaoSocial: data.name || '',
          nomeFantasia: data.nome_fantasia || data.name || '',
          cnpj: data.cnpj || '',
          segmento: data.segmento || 'Outro',
          telefone: data.telefone || '',
          email: data.email || '',
          website: data.website || '',
          endereco: {
            cep: data.cep || '',
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            bairro: data.bairro || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
          },
          plano: (data.plano || 'Pro') as PlanType,
          status: (data.status || 'active') as CompanyStatus,
          medicosAtivos: data.medicos_ativos || 0,
          medicosLimite: data.medicos_limite || 15,
          usuariosAtivos: data.usuarios_ativos || 0,
          usuariosLimite: data.usuarios_limite || 999,
          armazenamentoUsadoGB: Number(data.armazenamento_usado_gb) || 0,
          armazenamentoLimiteGB: Number(data.armazenamento_limite_gb) || 100,
          valorMensal: Number(data.valor_mensal) || 0,
          criadoEm: data.created_at,
          ultimoAcesso: data.updated_at,
        }
        setCompany(mapped)
      }
      setLoading(false)
    }

    fetchCompany()
  }, [companyId])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando detalhes da empresa...</div>
  if (!company) return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="bg-muted p-4 rounded-full">
        <Building2 className="h-12 w-12 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">Empresa não encontrada</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A empresa que você está tentando acessar pode ter sido excluída ou o ID é inválido.
        </p>
      </div>
      <OutlineButton onClick={() => navigate('/superadmin/empresas')}>
        Voltar para listagem
      </OutlineButton>
    </div>
  )

  const plan = MOCK_PLANS.find(p => p.name === company.plano)
  const users = MOCK_COMPANY_USERS.filter((u) => u.companyId === companyId)
  const invoices = MOCK_INVOICES.filter((i) => i.companyId === companyId)

  const tabs = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'resources', label: 'Recursos e Limites' },
    { id: 'users', label: 'Usuários' },
    { id: 'billing', label: 'Plano e Faturamento' },
    { id: 'settings', label: 'Configurações' },
    { id: 'logs', label: 'Logs de Acesso' },
  ]

  const storagePct = (company.armazenamentoUsadoGB / company.armazenamentoLimiteGB) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/superadmin/empresas')} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{company.nomeFantasia}</h1>
              <CompanyStatusBadge status={company.status} trialDaysLeft={company.trialDaysLeft} />
            </div>
            <p className="text-sm text-muted-foreground">{company.cnpj} · {company.segmento}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <OutlineButton variant="gray">Suspender</OutlineButton>
          <OutlineButton variant="gray">Trocar Plano</OutlineButton>
          <button
            onClick={() => setImpersonation({ companyId: company.id, companyName: company.nomeFantasia })}
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(33,100%,50%)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all active:scale-[0.97]"
          >
            <ExternalLink className="h-4 w-4" /> Acessar como Admin
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Dados Cadastrais</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Razão Social</dt><dd className="font-medium">{company.razaoSocial}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">E-mail</dt><dd>{company.email}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Telefone</dt><dd>{company.telefone}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Endereço</dt><dd className="text-right">{company.endereco.logradouro}, {company.endereco.numero} — {company.endereco.cidade}/{company.endereco.estado}</dd></div>
              </dl>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Contrato</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Plano</dt><dd><StatusBadge variant="info">{company.plano}</StatusBadge></dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Valor mensal</dt><dd className="font-bold">R$ {company.valorMensal.toLocaleString('pt-BR')}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Data início</dt><dd>{new Date(company.criadoEm).toLocaleDateString('pt-BR')}</dd></div>
              </dl>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Building2 className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-bold">{company.medicosAtivos}</p>
              <p className="text-xs text-muted-foreground">Médicos ({company.medicosLimite === 999 ? '∞' : company.medicosLimite} max)</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Users className="mx-auto h-5 w-5 text-secondary mb-1" />
              <p className="text-2xl font-bold">{company.usuariosAtivos}</p>
              <p className="text-xs text-muted-foreground">Usuários</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <ClipboardList className="mx-auto h-5 w-5 text-[hsl(33,100%,50%)] mb-1" />
              <p className="text-2xl font-bold">342</p>
              <p className="text-xs text-muted-foreground">Atend. este mês</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <HardDrive className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{company.armazenamentoUsadoGB.toFixed(0)} GB</p>
              <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div className={`h-full rounded-full transition-all ${storagePct > 90 ? 'bg-destructive' : storagePct > 75 ? 'bg-[hsl(33,100%,50%)]' : 'bg-primary'}`} style={{ width: `${Math.min(storagePct, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{storagePct.toFixed(0)}% de {company.armazenamentoLimiteGB} GB</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <ResourcesTab company={company} plan={plan || null} />
      )}

      {activeTab === 'users' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Função</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge variant="neutral">{u.role}</StatusBadge></td>
                  <td className="px-4 py-3"><StatusBadge variant={u.isActive ? 'success' : 'neutral'}>{u.isActive ? 'Ativo' : 'Inativo'}</StatusBadge></td>
                  <td className="px-4 py-3 text-muted-foreground">{u.lastAccess}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <h3 className="mb-4 text-sm font-semibold">Plano Atual: <span className="text-primary">{company.plano}</span></h3>
            <p className="text-3xl font-bold">R$ {company.valorMensal.toLocaleString('pt-BR')}<span className="text-base font-normal text-muted-foreground">/mês</span></p>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referência</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pago em</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{inv.reference}</td>
                    <td className="px-4 py-3">R$ {inv.amount.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : 'warning'}>
                        {inv.status === 'paid' ? 'Pago' : inv.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] space-y-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Módulos do Sistema (Ativação)</h3>
            <div className="space-y-4 divide-y divide-border">
              <div className="pt-0 flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2 text-primary">🏥 Soft Clínica</p>
                  <p className="text-xs text-muted-foreground">Gestão ambulatorial: Agenda, Recepção, Prontuário e Faturamento TISS</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full accent-primary cursor-pointer" />
              </div>
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2 text-[hsl(262,80%,50%)]">🔬 Soft Laboratório</p>
                  <p className="text-xs text-muted-foreground">Módulo LIS: Cadastro de exames, Coleta, Setor técnico, Interfaceamento e Laudos</p>
                </div>
                <input type="checkbox" className="h-5 w-10 rounded-full accent-primary cursor-pointer" />
              </div>
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2 text-emerald-600">🏨 Soft Hospital</p>
                  <p className="text-xs text-muted-foreground">Gestão hospitalar: Internação, Gestão de Leitos, Centro Cirúrgico e UTI</p>
                </div>
                <input type="checkbox" className="h-5 w-10 rounded-full accent-primary cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] space-y-6">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Sistema de Origens / Unidades</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">📍 Habilitar Multi-unidades</p>
                  <p className="text-xs text-muted-foreground">Permite que a empresa gerencie múltiplas origens de atendimento com protocolos distintos</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full accent-primary cursor-pointer" />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-medium flex items-center gap-2">🔄 Exigir Seleção de Origem no Login</p>
                  <p className="text-xs text-muted-foreground">Força o usuário a escolher uma unidade de trabalho logo após o acesso</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-10 rounded-full accent-primary cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] space-y-6">
            <h3 className="text-sm font-semibold text-foreground">Configurações da Empresa</h3>
          {[
            { label: 'Ativar acesso ao sistema', defaultChecked: company.status === 'active' },
            { label: 'Modo manutenção', defaultChecked: false },
          ].map((t) => (
            <label key={t.label} className="flex items-center justify-between">
              <span className="text-sm">{t.label}</span>
              <input type="checkbox" defaultChecked={t.defaultChecked} className="h-5 w-10 rounded-full accent-[hsl(var(--primary))]" />
            </label>
          ))}
          <div>
            <label className="text-sm font-medium">Limite de usuários</label>
            <input type="number" defaultValue={company.usuariosLimite} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Observações internas</label>
            <textarea rows={3} className="mt-1 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Notas visíveis apenas para o super admin..." />
          </div>
        </div>
      </div>
    )}

      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Logs de acesso serão exibidos aqui quando conectados ao backend.
        </div>
      )}
    </div>
  )
}

// ─── Resources Tab ─────────────────────────────────────────
function ResourcesTab({ company, plan }: { company: any; plan: any }) {
  const [addDoctors, setAddDoctors] = useState(0)
  const [addPatientPacks, setAddPatientPacks] = useState(0)
  const [addStoragePacks, setAddStoragePacks] = useState(0)

  const doctorLimit = plan?.maxDoctors ?? company.medicosLimite ?? 15
  const isUnlimitedDoctors = doctorLimit === null || doctorLimit >= 999
  const storageLimitGB = company.armazenamentoLimiteGB ?? 100
  const storageUsedGB = company.armazenamentoUsadoGB ?? 0
  const storagePct = (storageUsedGB / storageLimitGB) * 100

  const newDoctorLimit = doctorLimit + addDoctors
  const newStorageLimit = storageLimitGB + (addStoragePacks * 50)
  const monthlyCost = (addDoctors * ADDON_PRICE_DOCTOR) + (addPatientPacks * ADDON_PRICE_PATIENT_PACK) + (addStoragePacks * ADDON_PRICE_STORAGE)

  const handleSave = () => {
    if (monthlyCost === 0) {
      toast.info('Nenhuma alteração para salvar.')
      return
    }
    toast.success(`Recursos atualizados! Custo adicional: R$ ${monthlyCost}/mês adicionado ao plano da empresa.`)
    setAddDoctors(0)
    setAddPatientPacks(0)
    setAddStoragePacks(0)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Doctors */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-2"><Stethoscope className="h-5 w-5 text-primary" /></div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Médicos</h3>
              <p className="text-xs text-muted-foreground">{isUnlimitedDoctors ? 'Ilimitado' : `${company.medicosAtivos} de ${doctorLimit} ativos`}</p>
            </div>
          </div>
          {!isUnlimitedDoctors && (
            <>
              <div className="h-2 rounded-full bg-border overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all ${company.medicosAtivos >= doctorLimit ? 'bg-destructive' : company.medicosAtivos >= doctorLimit - 2 ? 'bg-[hsl(33,100%,50%)]' : 'bg-primary'}`}
                  style={{ width: `${Math.min((company.medicosAtivos / doctorLimit) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Adicionar médicos</p>
                  <p className="text-[10px] text-muted-foreground">R$ {ADDON_PRICE_DOCTOR}/mês cada</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddDoctors(Math.max(0, addDoctors - 1))} disabled={addDoctors === 0} className="rounded-md border border-input p-1 hover:bg-muted disabled:opacity-30">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{addDoctors}</span>
                  <button onClick={() => setAddDoctors(addDoctors + 1)} className="rounded-md border border-input p-1 hover:bg-muted">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {addDoctors > 0 && (
                <p className="text-xs text-primary mt-2">Novo limite: {newDoctorLimit} médicos (+R$ {addDoctors * ADDON_PRICE_DOCTOR}/mês)</p>
              )}
            </>
          )}
          {isUnlimitedDoctors && (
            <p className="text-sm text-muted-foreground">O plano Enterprise inclui médicos ilimitados.</p>
          )}
        </div>

        {/* Patients */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-secondary/10 p-2"><UserPlus className="h-5 w-5 text-secondary" /></div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pacientes</h3>
              <p className="text-xs text-muted-foreground">Pacotes adicionais de cadastro</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Incluso no plano: ilimitado. Pacotes adicionais garantem armazenamento e performance otimizada para grandes volumes.
          </p>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-xs font-medium text-foreground">Pacote +500 pacientes</p>
              <p className="text-[10px] text-muted-foreground">R$ {ADDON_PRICE_PATIENT_PACK}/mês cada pacote</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAddPatientPacks(Math.max(0, addPatientPacks - 1))} disabled={addPatientPacks === 0} className="rounded-md border border-input p-1 hover:bg-muted disabled:opacity-30">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{addPatientPacks}</span>
              <button onClick={() => setAddPatientPacks(addPatientPacks + 1)} className="rounded-md border border-input p-1 hover:bg-muted">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {addPatientPacks > 0 && (
            <p className="text-xs text-secondary mt-2">+{addPatientPacks * 500} pacientes (+R$ {addPatientPacks * ADDON_PRICE_PATIENT_PACK}/mês)</p>
          )}
        </div>

        {/* Storage */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-muted p-2"><Database className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Armazenamento</h3>
              <p className="text-xs text-muted-foreground">{storageUsedGB.toFixed(1)} GB de {storageLimitGB} GB</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden mb-1">
            <div
              className={`h-full rounded-full transition-all ${storagePct > 90 ? 'bg-destructive' : storagePct > 75 ? 'bg-[hsl(33,100%,50%)]' : 'bg-primary'}`}
              style={{ width: `${Math.min(storagePct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">{storagePct.toFixed(0)}% utilizado</p>
          {storagePct > 75 && (
            <div className={`rounded-lg p-2 mb-3 text-xs font-medium ${storagePct > 90 ? 'bg-destructive/10 text-destructive' : 'bg-[hsl(33,100%,50%)]/10 text-[hsl(33,100%,50%)]'}`}>
              {storagePct > 90 ? '⚠️ Armazenamento crítico! Expanda para evitar interrupções.' : '⚠️ Armazenamento acima de 75%. Considere expandir.'}
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-xs font-medium text-foreground">Pacote +50 GB</p>
              <p className="text-[10px] text-muted-foreground">R$ {ADDON_PRICE_STORAGE}/mês cada pacote</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAddStoragePacks(Math.max(0, addStoragePacks - 1))} disabled={addStoragePacks === 0} className="rounded-md border border-input p-1 hover:bg-muted disabled:opacity-30">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{addStoragePacks}</span>
              <button onClick={() => setAddStoragePacks(addStoragePacks + 1)} className="rounded-md border border-input p-1 hover:bg-muted">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {addStoragePacks > 0 && (
            <p className="text-xs text-primary mt-2">Novo limite: {newStorageLimit} GB (+R$ {addStoragePacks * ADDON_PRICE_STORAGE}/mês)</p>
          )}
        </div>
      </div>

      {/* Summary & Save */}
      {monthlyCost > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Resumo dos recursos adicionais</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {addDoctors > 0 && <span>+{addDoctors} médico(s): R$ {addDoctors * ADDON_PRICE_DOCTOR}/mês</span>}
              {addPatientPacks > 0 && <span>+{addPatientPacks * 500} pacientes: R$ {addPatientPacks * ADDON_PRICE_PATIENT_PACK}/mês</span>}
              {addStoragePacks > 0 && <span>+{addStoragePacks * 50} GB: R$ {addStoragePacks * ADDON_PRICE_STORAGE}/mês</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">+R$ {monthlyCost}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            <button onClick={handleSave} className="mt-2 gradient-bg rounded-xl px-6 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90">
              Aplicar alterações
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
