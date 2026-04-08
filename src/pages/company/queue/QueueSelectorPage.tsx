import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Headphones, MonitorSmartphone, Settings } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ModeCard } from '@/components/queue/selector/ModeCard'

export default function QueueSelectorPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.name || 'Usuário'}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ModeCard icon={Monitor} label="TV" onClick={() => navigate('/app/filas/tv')} />
          <ModeCard icon={Headphones} label="Atendente" onClick={() => navigate('/app/filas/atendente')} />
          <ModeCard icon={MonitorSmartphone} label="Totem" onClick={() => navigate('/app/filas/totem')} />
          <ModeCard icon={Settings} label="Painel Administrativo" onClick={() => navigate('/app/filas/admin')} />
        </div>

        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>
    </div>
  )
}
