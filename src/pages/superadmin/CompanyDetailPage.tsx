import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MOCK_COMPANIES, MOCK_COMPANY_USERS, MOCK_INVOICES } from '@/mocks/superadmin.mock'
import { CompanyStatusBadge } from '@/components/superadmin/CompanyStatusBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ArrowLeft, Users, Building2, ClipboardList, HardDrive, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { OutlineButton } from '@/components/ui/OutlineButton'

export default function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const { setImpersonation } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const company = MOCK_COMPANIES.find((c) => c.id === companyId)
  if (!company) return <div className="p-8 text-center text-muted-foreground">Empresa não encontrada</div>

  const users = MOCK_COMPANY_USERS.filter((u) => u.companyId === companyId)
  const invoices = MOCK_INVOICES.filter((i) => i.companyId === companyId)

  const tabs = [
    { id: 'overview', label: 'Visão Geral' },
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
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
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
              <p className="text-xs text-muted-foreground">Médicos</p>
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
                <div className="h-full gradient-bg rounded-full" style={{ width: `${Math.min(storagePct, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{storagePct.toFixed(0)}% de {company.armazenamentoLimiteGB} GB</p>
            </div>
          </div>
        </div>
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
      )}

      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Logs de acesso serão exibidos aqui quando conectados ao backend.
        </div>
      )}
    </div>
  )
}
