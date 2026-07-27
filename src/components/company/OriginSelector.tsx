import { useState, useEffect } from 'react'
import { Building2, Heart, Star, Search, X } from 'lucide-react'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function OriginSelector() {
  const { activeOrigin, availableOrigins, selectOrigin, refreshOrigins } = useCompanyContext()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [defaultOriginId, setDefaultOriginId] = useState<string | null>(null)
  const [onlyFavorites, setOnlyFavorites] = useState(false)

  useEffect(() => {
    if (user && isOpen) {
      loadPreferences()
    }
  }, [user, isOpen])

  const loadPreferences = async () => {
    const { data, error } = await (supabase as any)
      .from('user_origin_preferences')
      .select('origin_id, is_favorite, is_default')
      .eq('user_id', user?.id)
    
    if (error) {
      console.error('Error loading preferences:', error)
      return
    }

    setFavorites(data.filter((p: any) => p.is_favorite).map((p: any) => p.origin_id))
    setDefaultOriginId(data.find((p: any) => p.is_default)?.origin_id || null)
  }

  const toggleFavorite = async (e: React.MouseEvent, originId: string) => {
    e.stopPropagation()
    const isFavorite = favorites.includes(originId)
    
    const { error } = await (supabase as any)
      .from('user_origin_preferences')
      .upsert({
        user_id: user?.id,
        company_id: user?.companyId,
        origin_id: originId,
        is_favorite: !isFavorite
      }, { onConflict: 'user_id,company_id,origin_id' })

    if (error) {
      toast.error('Erro ao atualizar favoritos')
      return
    }

    setFavorites(prev => isFavorite ? prev.filter(id => id !== originId) : [...prev, originId])
    toast.success(isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos')
  }

  const setAsDefault = async (e: React.MouseEvent, originId: string) => {
    e.stopPropagation()
    
    // First, clear existing default
    await (supabase as any)
      .from('user_origin_preferences')
      .update({ is_default: false })
      .eq('user_id', user?.id)
      .eq('company_id', user?.companyId)

    // Set new default
    const { error } = await (supabase as any)
      .from('user_origin_preferences')
      .upsert({
        user_id: user?.id,
        company_id: user?.companyId,
        origin_id: originId,
        is_default: true
      }, { onConflict: 'user_id,company_id,origin_id' })

    if (error) {
      toast.error('Erro ao definir padrão')
      return
    }

    setDefaultOriginId(originId)
    toast.success('Origem definida como padrão para login')
  }

  const filteredOrigins = availableOrigins.filter(o => {
    const searchLower = search.toLowerCase()
    const matchesSearch = o.name.toLowerCase().includes(searchLower) || 
                         (o.internal_code && o.internal_code.toLowerCase().includes(searchLower))
    const matchesFavorites = onlyFavorites ? favorites.includes(o.id) : true
    return matchesSearch && matchesFavorites
  })

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-muted transition-colors border border-border bg-background"
      >
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground uppercase truncate max-w-[120px]">
          {activeOrigin?.name || 'Selecionar Origem'}
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center justify-between">
              <div className="flex items-center justify-between w-full pr-6">
                <span>Seleção de Origem</span>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setOnlyFavorites(!onlyFavorites)
                    }}
                    className={`p-2 rounded-lg transition-colors border ${onlyFavorites ? 'bg-rose-50 border-rose-200 text-rose-500' : 'hover:bg-muted text-muted-foreground border-transparent'}`}
                    title={onlyFavorites ? "Mostrar todas" : "Mostrar apenas favoritas"}
                  >
                    <Heart className={`h-4 w-4 ${onlyFavorites ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Busque a origem desejada..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredOrigins.length === 0 ? (
                <div className="py-10 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma origem encontrada.</p>
                </div>
              ) : (
                filteredOrigins.map(origin => (
                  <div
                    key={origin.id}
                    onClick={() => {
                      selectOrigin(origin)
                      setIsOpen(false)
                    }}
                    className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                      activeOrigin?.id === origin.id 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : favorites.includes(origin.id)
                          ? 'border-rose-100 bg-rose-50/30 hover:border-rose-300'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${activeOrigin?.id === origin.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground uppercase">{origin.name}</p>
                        <div className="flex items-center gap-2">
                          {origin.internal_code && (
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">Código: {origin.internal_code}</p>
                          )}
                          {(origin as any).establishments?.name && (
                            <p className="text-[10px] text-primary/60 font-medium uppercase truncate max-w-[150px]">
                              • {(origin as any).establishments.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => toggleFavorite(e, origin.id)}
                        className={`p-2 rounded-md hover:bg-background transition-colors ${favorites.includes(origin.id) ? 'text-rose-500' : 'text-muted-foreground'}`}
                        title="Favoritar"
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(origin.id) ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => setAsDefault(e, origin.id)}
                        className={`p-2 rounded-md hover:bg-background transition-colors ${defaultOriginId === origin.id ? 'text-amber-500' : 'text-muted-foreground'}`}
                        title="Marcar como padrão ao logar"
                      >
                        <Star className={`h-4 w-4 ${defaultOriginId === origin.id ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {activeOrigin?.id === origin.id && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
