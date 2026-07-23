import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, LogOut, User, Building, Settings, HelpCircle, Shield, CreditCard, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { SYSTEM_VERSION } from '@/utils/version'

interface UserSystemModalsProps {
  open: boolean
  onClose: () => void
  type?: 'about' | 'shortcuts'
}

export function UserSystemModals({ open, onClose, type }: UserSystemModalsProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    onClose()
  }

  const menuItems = [
    { 
      label: 'Meu Perfil', 
      icon: User, 
      description: 'Dados pessoais e senha',
      onClick: () => { navigate('/perfil'); onClose() }
    },
    { 
      label: 'Empresa', 
      icon: Building, 
      description: 'Configurações da unidade',
      onClick: () => { navigate('/configuracoes/unidade'); onClose() }
    },
    { 
      label: 'Faturamento', 
      icon: CreditCard, 
      description: 'Planos e assinaturas',
      onClick: () => { navigate('/faturamento'); onClose() }
    },
    { 
      label: 'Segurança', 
      icon: Shield, 
      description: 'Acessos e permissões',
      onClick: () => { navigate('/configuracoes/seguranca'); onClose() }
    },
    { 
      label: 'Configurações', 
      icon: Settings, 
      description: 'Preferências do sistema',
      onClick: () => { navigate('/configuracoes'); onClose() }
    },
    { 
      label: 'Suporte', 
      icon: HelpCircle, 
      description: 'Central de ajuda',
      onClick: () => { navigate('/suporte'); onClose() }
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[450px] p-0 overflow-hidden border-none bg-background shadow-2xl">
        {/* Header com Gradiente */}
        <div className="gradient-bg p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">{user?.name || 'Usuário'}</h2>
              <p className="text-white/70 text-sm font-medium">{user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                <Shield className="h-3 w-3" />
                {user?.role === 'admin' ? 'Administrador' : 'Usuário Padrão'}
              </div>
            </div>
          </div>
        </div>

        {/* Menu de Opções */}
        <div className="p-4 bg-muted/30">
          <div className="grid grid-cols-1 gap-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-background hover:shadow-sm border border-transparent hover:border-border transition-all group text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex items-center justify-between">
          <div className="flex flex-col">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Versão</p>
            <p className="text-xs font-mono text-foreground">{SYSTEM_VERSION.formatted}</p>
          </div>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleSignOut}
            className="rounded-full px-6 font-bold flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
