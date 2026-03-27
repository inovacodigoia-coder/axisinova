import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useUserSession } from '@/context/UserSessionContext'
import { FunctionCard } from './FunctionCard'
import { cn } from '@/lib/utils'

export function FunctionsMenu() {
  const { getFunctions, getUtilities } = useUserSession()
  const [tab, setTab] = useState<'functions' | 'utilities'>('functions')
  const [search, setSearch] = useState('')

  const functions = getFunctions()
  const utilities = getUtilities()

  const filtered = useMemo(() => {
    const items = tab === 'functions' ? functions : utilities
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(i => i.label.toLowerCase().includes(q))
  }, [tab, search, functions, utilities])

  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar função..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 mb-6">
        <button
          onClick={() => setTab('functions')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
            tab === 'functions'
              ? 'gradient-bg text-white shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Funções ({functions.length})
        </button>
        <button
          onClick={() => setTab('utilities')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
            tab === 'utilities'
              ? 'gradient-bg text-white shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Utilitários ({utilities.length})
        </button>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <FunctionCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma função encontrada</p>
        </div>
      )}
    </div>
  )
}
