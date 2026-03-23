import { useState, useMemo } from 'react'
import { MOCK_AUDIT_LOG } from '@/mocks/superadmin.mock'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SearchInput } from '@/components/ui/SearchInput'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'

export default function AuditLogPage() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState('all')

  const filtered = useMemo(() => {
    return MOCK_AUDIT_LOG.filter((e) => {
      const matchSearch = !search || e.action.toLowerCase().includes(search.toLowerCase()) || e.userName.toLowerCase().includes(search.toLowerCase())
      const matchSeverity = severityFilter === 'all' || e.severity === severityFilter
      return matchSearch && matchSeverity
    })
  }, [search, severityFilter])

  const severityVariant = (s: string) => s === 'critical' ? 'error' as const : s === 'warning' ? 'warning' as const : 'info' as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Log de Auditoria</h1>
        <button className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar ação ou usuário..." className="w-72" />
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todas as severidades</option>
          <option value="info">Info</option>
          <option value="warning">Aviso</option>
          <option value="critical">Crítico</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data/Hora</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severidade</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <>
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{entry.timestamp}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{entry.userName}</p>
                    <p className="text-xs text-muted-foreground">{entry.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.companyName || 'Sistema'}</td>
                  <td className="px-4 py-3">{entry.action}</td>
                  <td className="px-4 py-3"><StatusBadge variant={severityVariant(entry.severity)}>{entry.severity === 'critical' ? 'Crítico' : entry.severity === 'warning' ? 'Aviso' : 'Info'}</StatusBadge></td>
                  <td className="px-4 py-3">
                    {entry.payload && (
                      <button onClick={() => setExpanded(expanded === entry.id ? null : entry.id)} className="text-muted-foreground hover:text-foreground">
                        {expanded === entry.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === entry.id && entry.payload && (
                  <tr key={`${entry.id}_detail`}>
                    <td colSpan={6} className="bg-muted/30 px-4 py-3">
                      <pre className="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(entry.payload, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
