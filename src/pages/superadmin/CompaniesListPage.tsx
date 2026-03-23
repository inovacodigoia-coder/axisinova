import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_COMPANIES } from '@/mocks/superadmin.mock'
import { CompanyStatusBadge } from '@/components/superadmin/CompanyStatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Eye, MoreHorizontal } from 'lucide-react'
import type { Company, CompanyStatus, PlanType } from '@/types/company.types'

const PLAN_VARIANT: Record<PlanType, 'info' | 'success' | 'warning'> = { Starter: 'info', Pro: 'warning', Enterprise: 'success' }

export default function CompaniesListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return MOCK_COMPANIES.filter((c) => {
      const matchSearch = !search || c.nomeFantasia.toLowerCase().includes(search.toLowerCase()) || c.cnpj.includes(search) || c.email.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      const matchPlan = planFilter === 'all' || c.plano === planFilter
      return matchSearch && matchStatus && matchPlan
    })
  }, [search, statusFilter, planFilter])

  const hasFilters = search || statusFilter !== 'all' || planFilter !== 'all'

  const columns = [
    {
      key: 'nomeFantasia',
      label: 'Empresa',
      sortable: true,
      render: (c: Company) => (
        <div>
          <p className="text-sm font-medium text-foreground">{c.nomeFantasia}</p>
          <p className="text-xs text-muted-foreground">{c.cnpj}</p>
        </div>
      ),
    },
    {
      key: 'segmento',
      label: 'Segmento',
      render: (c: Company) => <StatusBadge variant="neutral">{c.segmento}</StatusBadge>,
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: true,
      render: (c: Company) => <StatusBadge variant={PLAN_VARIANT[c.plano]}>{c.plano}</StatusBadge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (c: Company) => <CompanyStatusBadge status={c.status} trialDaysLeft={c.trialDaysLeft} />,
    },
    {
      key: 'medicos',
      label: 'Médicos / Usuários',
      render: (c: Company) => (
        <span className="text-sm text-foreground">
          {c.medicosAtivos} / {c.medicosLimite === 999 ? '∞' : c.medicosLimite}
        </span>
      ),
    },
    {
      key: 'criadoEm',
      label: 'Criada em',
      sortable: true,
      render: (c: Company) => <span className="text-sm text-muted-foreground">{new Date(c.criadoEm).toLocaleDateString('pt-BR')}</span>,
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (c: Company) => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/superadmin/empresas/${c.id}`)} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Ver detalhes">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Mais ações">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Empresas Cadastradas</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, CNPJ ou e-mail..." className="w-72" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os status</option>
          <option value="active">Ativa</option>
          <option value="trial">Trial</option>
          <option value="overdue">Inadimplente</option>
          <option value="suspended">Suspensa</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os planos</option>
          <option value="Starter">Starter</option>
          <option value="Pro">Pro</option>
          <option value="Enterprise">Enterprise</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setPlanFilter('all') }} className="text-sm text-primary hover:underline">
            Limpar filtros
          </button>
        )}
      </div>

      <DataTable data={filtered} columns={columns} />
    </div>
  )
}
