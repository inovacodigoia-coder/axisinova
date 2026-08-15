import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, RefreshCw, LayoutGrid, List } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import type { Company, PlanType, CompanyStatus } from '@/types/company.types'
import { CompanyStatusBadge } from '@/components/superadmin/CompanyStatusBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import CompaniesTablePage from './CompaniesTablePage'

export default function CompaniesManagementPage() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [dbCompanies, setDbCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    setLoading(true)
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    if (error) {
      toast.error('Erro ao carregar empresas')
      setLoading(false)
      return
    }
    
    const mapped: Company[] = data.map((c: any) => ({
      id: c.id,
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
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return dbCompanies.filter(c => 
      c.nomeFantasia.toLowerCase().includes(search.toLowerCase()) || 
      c.cnpj.includes(search)
    )
  }, [dbCompanies, search])

  if (viewMode === 'table') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestão de Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie todas as organizações cadastradas no ecossistema.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
              title="Visualizar em Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={fetchCompanies}
              disabled={loading}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
              title="Recarregar"
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </div>
        </div>
        
        <CompaniesTablePage />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestão de Clientes</h1>
          <p className="text-sm text-muted-foreground">Visualização rápida de status e métricas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode('table')}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            title="Visualizar em Tabela"
          >
            <List className="h-4 w-4" />
          </button>
          <button 
            onClick={fetchCompanies}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            title="Recarregar"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
          <p className="text-muted-foreground">Nenhuma empresa encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(company => (
            <div key={company.id} className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {company.nomeFantasia.charAt(0)}
                </div>
                <CompanyStatusBadge status={company.status} />
              </div>

              <div>
                <h3 className="font-bold text-foreground truncate">{company.nomeFantasia}</h3>
                <p className="text-xs text-muted-foreground mb-4">{company.cnpj}</p>
                
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/70">Plano</p>
                    <p className="text-xs font-semibold">{company.plano}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/70">Usuários</p>
                    <p className="text-xs font-semibold">{company.medicosAtivos}/{company.medicosLimite}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => window.location.href = `/superadmin/empresas/${company.id}`}
                  className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors"
                >
                  Gerenciar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
