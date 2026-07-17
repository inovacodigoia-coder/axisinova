import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { ChevronDown, ChevronRight, Check, User, Key, LogOut, Building2, ShieldCheck, MapPin } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { UserSystemModals } from './UserSystemModals'

export function UserMenuDropdown() {
  const { user, logout } = useAuth()
  const { activeProfile, activeSector, profiles, availableSectors, switchProfile, switchSector, clearSession } = useCompanyContext()
  const navigate = useNavigate()
  const [modalType, setModalType] = useState<'about' | 'shortcuts' | null>(null)

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const handleSwitchProfile = (profileId: string) => {
    switchProfile(profileId)
    const profile = profiles.find(p => p.id === profileId)
    toast.success(`Perfil alterado para ${profile?.name}`)
  }

  const handleSwitchSector = (sectorId: string) => {
    switchSector(sectorId)
    const sector = availableSectors.find(s => s.id === sectorId)
    toast.success(`Setor alterado para ${sector?.name}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{activeProfile?.name}</p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <div className="px-3 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" /> {user?.companyName}</div>
        </div>

        {/* Profile submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">
            <ShieldCheck className="h-3.5 w-3.5 mr-2" />
            Perfil: {activeProfile?.name || '—'}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {profiles.map(p => (
              <DropdownMenuItem key={p.id} onClick={() => handleSwitchProfile(p.id)} className="text-xs">
                {p.id === activeProfile?.id && <Check className="h-3 w-3 mr-1.5 text-primary" />}
                <span className={p.id === activeProfile?.id ? 'font-semibold gradient-text' : ''}>{p.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Sector submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">
            <MapPin className="h-3.5 w-3.5 mr-2" />
            Setor: {activeSector?.name || '—'}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {availableSectors.map(s => (
              <DropdownMenuItem key={s.id} onClick={() => handleSwitchSector(s.id)} className="text-xs">
                {s.id === activeSector?.id && <Check className="h-3 w-3 mr-1.5 text-primary" />}
                <span className={s.id === activeSector?.id ? 'font-semibold gradient-text' : ''}>{s.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs"><User className="h-3.5 w-3.5 mr-2" /> Meu cadastro</DropdownMenuItem>
        <DropdownMenuItem className="text-xs"><Key className="h-3.5 w-3.5 mr-2" /> Alterar senha</DropdownMenuItem>
        <DropdownMenuItem className="text-xs" onClick={() => setModalType('about')}><div className="h-3.5 w-3.5 mr-2" /> ℹ Sobre</DropdownMenuItem>
        <DropdownMenuItem className="text-xs" onClick={() => setModalType('shortcuts')}><div className="h-3.5 w-3.5 mr-2" /> ⌨️ Atalhos</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-xs text-destructive"><LogOut className="h-3.5 w-3.5 mr-2" /> Sair</DropdownMenuItem>
      </DropdownMenuContent>
      <UserSystemModals type={modalType} onClose={() => setModalType(null)} />
    </DropdownMenu>
  )
}
