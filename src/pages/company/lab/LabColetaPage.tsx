import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Search, Filter, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LabColetaPageProps {}

export default function LabColetaPage() {
  const [activeTab, setActiveTab] = useState('pendentes')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fila de Coleta</h1>
          <p className="text-sm text-muted-foreground">Gerencie a fila de pacientes aguardando e registre a coleta de amostras.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-yellow-50 border-yellow-100">
          <p className="text-sm text-yellow-800 font-medium">Pacientes Aguardando</p>
          <p className="text-3xl font-bold text-yellow-900 mt-1">3</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-800 font-medium">Tubos Necessários</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">6 tubos</p>
        </Card>
        <Card className="p-4 bg-emerald-50 border-emerald-100">
          <p className="text-sm text-emerald-800 font-medium">Tempo Médio de Esp.</p>
          <p className="text-3xl font-bold text-emerald-900 mt-1">7 min</p>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background" placeholder="Buscar por nome, CPF ou protocolo..." />
        </div>
        <Button variant="outline" className="gap-2">Ordenar por: Tempo de Espera ▼</Button>
      </div>

      <div className="space-y-2">
        <Card className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-6">
            <div className="font-mono text-sm text-muted-foreground">20260716-360-80</div>
            <div>
              <p className="font-semibold">PACIENTE TESTE</p>
              <p className="text-xs text-muted-foreground">Masc, 37 anos • SUS</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              <span className="text-xs font-medium">Espera</span>
            </div>
            <div className="text-sm font-bold text-red-600">7 min</div>
            <Button size="sm" className="gradient-bg text-white">Iniciar →</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
