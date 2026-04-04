import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface GlobalSearchContextValue {
  isOpen: boolean
  query: string
  setQuery: (q: string) => void
  open: () => void
  close: () => void
  toggle: () => void
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const open = useCallback(() => { setIsOpen(true); setQuery('') }, [])
  const close = useCallback(() => { setIsOpen(false); setQuery('') }, [])
  const toggle = useCallback(() => { setIsOpen(v => { if (v) setQuery(''); return !v }) }, [])

  return (
    <GlobalSearchContext.Provider value={{ isOpen, query, setQuery, open, close, toggle }}>
      {children}
    </GlobalSearchContext.Provider>
  )
}

export function useGlobalSearch() {
  const ctx = useContext(GlobalSearchContext)
  if (!ctx) throw new Error('useGlobalSearch must be used within GlobalSearchProvider')
  return ctx
}
