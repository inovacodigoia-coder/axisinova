import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_COMPANIES } from '@/mocks/superadmin.mock'
import { CompanyStatusBadge } from '@/components/superadmin/CompanyStatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Eye, MoreHorizontal, Trash2, Edit, Ban } from 'lucide-react'
import type { Company, CompanyStatus, PlanType } from '@/types/company.types'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const PLAN_VARIANT: Record<PlanType, 'info' | 'success' | 'warning'> = { Starter: 'info', Pro: 'warning', Enterprise: 'success' }

function ActionsDropdown({ company, onDelete, onView }: { company: Company; onDelete: (c: Company) => void; onView: (c: Company) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="rounded-lg p-1.5 hover:bg-muted transition-colors"
        title="Mais ações"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => { onView(company); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors rounded-t-lg"
          >
            <Eye className="h-4 w-4" /> Ver detalhes
          </button>
          <button
            onClick={() => { onDelete(company); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-b-lg"
          >
            <Trash2 className="h-4 w-4" /> Excluir empresa
          </button>
        </div>
      )}
    </div>
  )
}

export default function CompaniesListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [dbCompanies, setDbCompanies] = useState<Company[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch real companies from database
  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    const { data, error } = await supabase.from('companies').select('*').order('sequence_id', { ascending: true })
    if (error) {
      console.error('Error fetching companies:', error)
      return
    }
    if (data) {
      const mapped: Company[] = data.map((c: any) => ({
        id: c.id,
        sequenceId: c.sequence_id ?? undefined,
      sequenceId: c.sequence_id ?? undefined,
        razaoSocial: c.name || '',
        nomeFantasia: c.nome_fantasia || c.name || '',
        cnpj: c.cnpj || '',
        segmento: c.segmento || 'Outro',
        telefone: c.telefone || '',
        email: c.email || '',
        website: c.website || '',
        endereco: {
          cep: c.cep || '',
          logradouro: c.logradouro || '',
          numero: c.numero || '',
          bairro: c.bairro || '',
          cidade: c.cidade || '',
          estado: c.estado || '',
        },
        plano: (c.plano || 'Pro') as PlanType,
        status: (c.status || 'active') as CompanyStatus,
        medicosAtivos: c.medicos_ativos || 0,
        medicosLimite: c.medicos_limite || 15,
        usuariosAtivos: c.usuarios_ativos || 0,
        usuariosLimite: c.usuarios_limite || 999,
        armazenamentoUsadoGB: Number(c.armazenamento_usado_gb) || 0,
        armazenamentoLimiteGB: Number(c.armazenamento_limite_gb) || 100,
        valorMensal: Number(c.valor_mensal) || 0,
        criadoEm: c.created_at,
        ultimoAcesso: c.updated_at,
      }))
      setDbCompanies(mapped)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      let currentUser = session?.user
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        const { data: { user } } = await supabase.auth.getUser()
        currentUser = user || undefined
        if (!user) {
          toast.error('Sessão expirada ou inválida. Por favor, faça login novamente.')
          setIsDeleting(false)
          return
        }
      }

      console.log('Iniciando exclusão da empresa:', deleteTarget.id);
      
      const { data, error } = await supabase.functions.invoke('delete-company', {
        body: { companyId: deleteTarget.id },
      })

      if (error) {
        console.error('Invoke error:', error);
        toast.error(`Erro ao invocar função: ${error.message || 'Erro desconhecido'}`)
        return
      }

      if (data?.error) {
        console.error('Function internal error:', data.error);
        if (data.error.includes('not found') || data.error.includes('não encontrada')) {
          toast.error(`Esta empresa já foi removida do sistema.`)
          setDeleteTarget(null)
          fetchCompanies()
        } else {
          toast.error(`Erro no processamento: ${data.error}`)
        }
        return
      }

      // Registro de auditoria - Using plain supabase insert without strict typing for non-generated table
      try {
        await (supabase as any).from('audit_logs').insert({
          action: 'DELETE_COMPANY',
          entity_type: 'company',
          entity_id: deleteTarget.id,
          user_id: currentUser?.id,
          details: {
            nome: deleteTarget.nomeFantasia,
            cnpj: deleteTarget.cnpj,
            reason: 'Exclusão solicitada via Super Admin'
          }
        })
      } catch (auditErr) {
        console.warn('Falha ao registrar auditoria:', auditErr)
      }

      toast.success(`Empresa "${deleteTarget.nomeFantasia}" excluída com sucesso.`)
      setDeleteTarget(null)
      fetchCompanies()
    } catch (err: any) {
      console.error('Catch error:', err);
      toast.error(`Erro inesperado: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Show real DB companies if they exist
  const allCompanies = useMemo(() => {
    return dbCompanies;
  }, [dbCompanies])

  const filtered = useMemo(() => {
    return allCompanies.filter((c) => {
      const matchSearch = !search || c.nomeFantasia.toLowerCase().includes(search.toLowerCase()) || c.cnpj.includes(search) || c.email.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      const matchPlan = planFilter === 'all' || c.plano === planFilter
      return matchSearch && matchStatus && matchPlan
    })
  }, [search, statusFilter, planFilter, allCompanies])

  const hasFilters = search || statusFilter !== 'all' || planFilter !== 'all'

  const columns = [
    {
      key: 'sequenceId',
      label: 'ID',
      sortable: true,
      render: (c: Company) => (
        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md bg-muted text-xs font-bold text-foreground">
          {c.sequenceId ?? '—'}
        </span>
      ),
    },
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
          <ActionsDropdown
            company={c}
            onView={(c) => navigate(`/superadmin/empresas/${c.id}`)}
            onDelete={(c) => setDeleteTarget(c)}
          />
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

      <DataTable 
        data={filtered} 
        columns={columns} 
        emptyMessage={hasFilters ? "Nenhuma empresa encontrada para os filtros aplicados." : "Nenhuma empresa cadastrada no sistema."}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Empresa"
        description={`Você está prestes a excluir permanentemente a empresa ${deleteTarget?.nomeFantasia} (CNPJ: ${deleteTarget?.cnpj}). Esta ação é IRREVERSÍVEL e removerá todos os usuários, perfis, prontuários, agendamentos, dados financeiros e registros vinculados.`}
        confirmLabel="Excluir permanentemente"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
