import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Calendar, FileText, Users, DollarSign, Stethoscope, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGlobalSearch } from '@/context/GlobalSearchContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useCompanyContext } from '@/context/CompanyContext'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchResult {
  id: string
  category: string
  label: string
  sublabel?: string
  route: string
  icon: React.ReactNode
}

interface QuickAction {
  id: string
  label: string
  shortcut?: string
  icon: React.ReactNode
  route: string
}

const MOCK_SEARCH_DATA: Omit<SearchResult, 'icon'>[] = [
  { id: 's1', category: 'PACIENTES', label: 'João da Silva', sublabel: '42 anos · Unimed', route: '/app/prontuario/p_001' },
  { id: 's2', category: 'PACIENTES', label: 'Maria Santos', sublabel: '35 anos · Hapvida', route: '/app/prontuario/p_002' },
  { id: 's3', category: 'PACIENTES', label: 'Ana Costa', sublabel: '28 anos · Bradesco', route: '/app/prontuario/p_003' },
  { id: 's4', category: 'PACIENTES', label: 'Pedro Oliveira', sublabel: '55 anos · SUS', route: '/app/prontuario/p_004' },
  { id: 's5', category: 'PACIENTES', label: 'Carlos Souza', sublabel: '67 anos · Particular', route: '/app/prontuario/p_005' },
  { id: 's6', category: 'MÉDICOS', label: 'Dr. Carlos Lima', sublabel: 'Cardiologia · CRM 12345', route: '/app/cadastros/medicos' },
  { id: 's7', category: 'MÉDICOS', label: 'Dra. Paula Mendes', sublabel: 'Clínica Geral · CRM 23456', route: '/app/cadastros/medicos' },
  { id: 's8', category: 'MÉDICOS', label: 'Dr. Roberto Melo', sublabel: 'Ortopedia · CRM 34567', route: '/app/cadastros/medicos' },
  { id: 's9', category: 'GUIAS', label: 'TISS-2025-00089', sublabel: 'João Silva · Unimed · R$ 450', route: '/app/faturamento/guias/g_001' },
  { id: 's10', category: 'GUIAS', label: 'TISS-2025-00090', sublabel: 'Maria Santos · Hapvida · R$ 280', route: '/app/faturamento/guias/g_002' },
  { id: 's11', category: 'AGENDAMENTOS', label: 'Consulta 09:00', sublabel: 'João Silva · Dr. Lima · Hoje', route: '/app/agendamento' },
  { id: 's12', category: 'AGENDAMENTOS', label: 'Exame 10:30', sublabel: 'Ana Costa · Hemograma · Hoje', route: '/app/agendamento' },
]

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  'PACIENTES': <Users className="h-4 w-4 text-primary" />,
  'MÉDICOS': <Stethoscope className="h-4 w-4 text-[hsl(var(--secondary))]" />,
  'GUIAS': <DollarSign className="h-4 w-4 text-[hsl(var(--success))]" />,
  'AGENDAMENTOS': <Calendar className="h-4 w-4 text-[hsl(var(--warning))]" />,
}

export function CommandPalette() {
  const { isOpen, query, setQuery, close } = useGlobalSearch()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { canAccess } = useCompanyContext()

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      { id: 'a1', label: 'Novo agendamento', shortcut: 'Ctrl+N', icon: <Calendar className="h-4 w-4" />, route: '/app/agendamento' },
      { id: 'a2', label: 'Check-in de paciente', shortcut: 'Ctrl+I', icon: <Users className="h-4 w-4" />, route: '/app/recepcao' },
      { id: 'a3', label: 'Ir para o Dashboard', shortcut: 'Ctrl+D', icon: <FileText className="h-4 w-4" />, route: '/app/dashboard' },
    ]
    if (canAccess('billing', 'view')) {
      actions.splice(2, 0, { id: 'a4', label: 'Nova guia de faturamento', shortcut: 'Ctrl+G', icon: <DollarSign className="h-4 w-4" />, route: '/app/faturamento/guias' })
    }
    return actions
  }, [canAccess])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return MOCK_SEARCH_DATA
      .filter(r => r.label.toLowerCase().includes(q) || (r.sublabel?.toLowerCase().includes(q)))
      .slice(0, 9)
      .map(r => ({ ...r, icon: CATEGORY_ICON[r.category] || <FileText className="h-4 w-4" /> }))
  }, [query])

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach(r => {
      if (!groups[r.category]) groups[r.category] = []
      groups[r.category].push(r)
    })
    return groups
  }, [results])

  const allItems = useMemo(() => {
    if (query.trim()) return results.map(r => r.route)
    return quickActions.map(a => a.route)
  }, [query, results, quickActions])

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSelect = (route: string) => {
    navigate(route)
    close()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, allItems.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && allItems[selectedIndex]) { handleSelect(allItems[selectedIndex]) }
    else if (e.key === 'Escape') { close() }
  }

  function highlightMatch(text: string, q: string) {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx < 0) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-[640px] -translate-x-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Command className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
                onKeyDown={handleKeyDown}
                placeholder="Digite um comando ou busque..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto p-2">
              {!query.trim() ? (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Ações Rápidas
                  </p>
                  {quickActions.map((action, idx) => (
                    <button
                      key={action.id}
                      onClick={() => handleSelect(action.route)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                        idx === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      <span className="flex-1 text-left text-foreground">{action.label}</span>
                      {action.shortcut && (
                        <kbd className="text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">
                          {action.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))}
                </>
              ) : results.length === 0 ? (
                <div className="p-6 text-center">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum resultado para "{query}"</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente buscar por nome, CPF ou código</p>
                </div>
              ) : (
                Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category}>
                    <p className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase mt-1">
                      {category}
                    </p>
                    {items.map((item, idx) => {
                      const globalIdx = results.indexOf(item)
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.route)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                            globalIdx === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                          )}
                        >
                          {item.icon}
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-foreground truncate">{highlightMatch(item.label, query)}</p>
                            {item.sublabel && <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span>↑↓ navegar</span>
              <span>↵ selecionar</span>
              <span>esc fechar</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
