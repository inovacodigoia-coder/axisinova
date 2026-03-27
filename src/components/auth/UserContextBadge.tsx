import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, User, KeyRound, LogOut, Building2, Shield, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUserSession } from '@/context/UserSessionContext'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { UserProfile, Sector } from '@/types/profile.types'

export function UserContextBadge() {
  const { user, logout } = useAuth()
  const { session, selectSector, clearSession } = useUserSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showProfiles, setShowProfiles] = useState(false)
  const [showSectors, setShowSectors] = useState(false)
  const [confirmSwitch, setConfirmSwitch] = useState<UserProfile | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowProfiles(false)
        setShowSectors(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const handleSectorSwitch = (sector: Sector) => {
    selectSector(sector)
    toast.success(`Setor alterado para ${sector.name}`)
    setOpen(false)
    setShowSectors(false)
  }

  const handleProfileSwitch = (profile: UserProfile) => {
    setConfirmSwitch(profile)
    setOpen(false)
  }

  const confirmProfileSwitch = () => {
    clearSession()
    setConfirmSwitch(null)
    navigate('/selecionar-perfil')
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="hidden sm:block text-left min-w-0">
            <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{user.name}</p>
            {session.selectedProfile && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{session.selectedProfile.name}</p>
            )}
          </div>
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform hidden sm:block', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg text-sm font-bold text-white">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Context info */}
            <div className="border-b border-border p-3 space-y-1.5">
              {user.companyName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{user.companyName}</span>
                </div>
              )}

              {/* Profile submenu */}
              {session.availableProfiles.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => { setShowProfiles(!showProfiles); setShowSectors(false) }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Perfil: <span className="font-medium text-foreground">{session.selectedProfile?.name}</span></span>
                    </span>
                    <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', showProfiles && 'rotate-90')} />
                  </button>
                  {showProfiles && (
                    <div className="mt-1 ml-6 space-y-0.5">
                      {session.availableProfiles.map(p => (
                        <button
                          key={p.id}
                          onClick={() => p.id !== session.selectedProfile?.id && handleProfileSwitch(p)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                            p.id === session.selectedProfile?.id ? 'text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {p.id === session.selectedProfile?.id && <Check className="h-3 w-3" />}
                          <span className={p.id === session.selectedProfile?.id ? 'gradient-text' : ''}>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sector submenu */}
              {session.selectedProfile && session.selectedProfile.sectors.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => { setShowSectors(!showSectors); setShowProfiles(false) }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Setor: <span className="font-medium text-foreground">{session.selectedSector?.name}</span></span>
                    </span>
                    <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', showSectors && 'rotate-90')} />
                  </button>
                  {showSectors && (
                    <div className="mt-1 ml-6 space-y-0.5">
                      {session.selectedProfile.sectors.map(s => (
                        <button
                          key={s.id}
                          onClick={() => s.id !== session.selectedSector?.id && handleSectorSwitch(s)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                            s.id === session.selectedSector?.id ? 'text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {s.id === session.selectedSector?.id && <Check className="h-3 w-3" />}
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-2 space-y-0.5">
              <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <User className="h-4 w-4" />
                Meu Cadastro
              </button>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <KeyRound className="h-4 w-4" />
                Alterar Senha
              </button>
            </div>

            <div className="border-t border-border p-2">
              <button
                onClick={() => { setOpen(false); logout() }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmSwitch}
        onClose={() => setConfirmSwitch(null)}
        onConfirm={confirmProfileSwitch}
        title="Trocar perfil de acesso?"
        description={`Deseja trocar para o perfil "${confirmSwitch?.name}"? Você será redirecionado para seleção de setor.`}
        confirmLabel="Trocar Perfil"
        variant="warning"
      />
    </>
  )
}
