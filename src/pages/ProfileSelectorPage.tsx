import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Check, Building2, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import type { Profile, Sector } from '@/types/permissions.types'
import { cn } from '@/lib/utils'
import { SYSTEM_VERSION } from '@/utils/version'
import { getLandingRoute } from '@/utils/landingRoute'

export default function ProfileSelectorPage() {
  const { user, logout } = useAuth()
  const { profiles, selectProfile, selectSector, confirmSession, isSessionReady, activeProfile, activeSector, availableSectors, canAccess } = useCompanyContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isSessionReady) {
      navigate(getLandingRoute(canAccess, activeSector), { replace: true })
    }
  }, [isSessionReady, navigate, canAccess, activeSector])

  // Auto-select sector if profile has only 1
  useEffect(() => {
    if (activeProfile && availableSectors.length === 1 && !activeSector) {
      selectSector(availableSectors[0])
    }
  }, [activeProfile, availableSectors, activeSector, selectSector])

  const handleConfirm = () => {
    setLoading(true)
    setTimeout(() => {
      confirmSession()
    }, 800)
  }

  if (!user) return null

  const canConfirm = activeProfile && activeSector && !loading

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg-subtle">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[680px] rounded-[20px] bg-card shadow-xl border border-border overflow-hidden"
      >
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">
              <span className="gradient-text">Axis</span>
              <span className="text-foreground">Inova</span>
            </h1>
          </div>

          {/* User info */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-bg text-lg font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">
                Olá, <span className="gradient-text">{user.name}</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Selecione o perfil e setor para continuar</p>
            </div>
            {user.companyName && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Building2 className="h-3.5 w-3.5" />
                {user.companyName}
              </span>
            )}
          </div>

          {/* Step 1: Profile */}
          <div className="mb-6">
            <label className="text-sm font-bold text-foreground mb-3 block">Perfil de Acesso</label>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  selected={activeProfile?.id === profile.id}
                  onClick={() => selectProfile(profile)}
                />
              ))}
              {profiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum perfil disponível para este usuário.</p>
              )}
            </div>
          </div>

          {/* Step 2: Sector */}
          <AnimatePresence>
            {activeProfile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-6 overflow-hidden"
              >
                <label className="text-sm font-bold text-foreground mb-3 block">Setor de Atendimento</label>
                {availableSectors.length === 1 ? (
                  <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                    Setor selecionado automaticamente
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableSectors.map((sector) => (
                    <SectorChip
                      key={sector.id}
                      sector={sector}
                      selected={activeSector?.id === sector.id}
                      onClick={() => selectSector(sector)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200',
              canConfirm
                ? 'gradient-bg shadow-lg hover:shadow-xl active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Entrando...
              </span>
            ) : (
              'Entrar no Sistema'
            )}
          </button>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <button onClick={logout} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
              <LogOut className="h-3.5 w-3.5" />
              Trocar de conta
            </button>
            <span className="text-xs text-muted-foreground/50">v{SYSTEM_VERSION.formatted}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ProfileCard({ profile, selected, onClick }: { profile: Profile; selected: boolean; onClick: () => void }) {
  const permCount = Object.values(profile.permissions).reduce((sum, acts) => sum + (acts?.length || 0), 0)
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all duration-200',
        selected
          ? 'border-transparent gradient-bg-subtle shadow-md'
          : 'border-border hover:border-primary/30 hover:shadow-sm'
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full gradient-bg">
            <Check className="h-3 w-3 text-white" />
          </div>
        </div>
      )}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-bg-subtle">
        <Shield className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">#{profile.code}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground truncate">{profile.name}</span>
        </div>
        {profile.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile.description}</p>
        )}
      </div>
      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
        {permCount} perm.
      </span>
    </button>
  )
}

function SectorChip({ sector, selected, onClick }: { sector: Sector; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200',
        selected
          ? 'gradient-bg text-white shadow-md'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      <Building2 className="h-3.5 w-3.5" />
      {sector.name}
    </button>
  )
}
