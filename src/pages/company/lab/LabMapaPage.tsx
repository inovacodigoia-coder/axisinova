import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Filter, LayoutGrid, List, Beaker, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LabMapaPage() {
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const workbenches = [
    { name: 'Hematologia', pending: 12, processing: 5, completed: 45, color: 'border-l-purple-500' },
    { name: 'Bioquímica', pending: 8, processing: 12, completed: 30, color: 'border-l-blue-500' },
    { name: 'Imunologia', pending: 3, processing: 2, completed: 15, color: 'border-l-emerald-500' },
    { name: 'Urianálise', pending: 5, processing: 0, completed: 10, color: 'border-l-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mapa de Trabalho</h1>
        <p className="text-sm text-muted-foreground">Distribuição de carga por bancadas e monitoramento de processamento.</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex gap-2">
          <Button 
            variant={view === 'grid' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setView('grid')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" /> Grade
          </Button>
          <Button 
            variant={view === 'list' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setView('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" /> Lista
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filtrar Bancadas
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="p-4 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : workbenches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
          <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-bold text-lg">Sem bancadas ativas</h3>
          <p className="text-muted-foreground">Não há dados de processamento no momento.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          view === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"
        )}>
          {workbenches.map((bench) => (
            <Card key={bench.name} className={cn("p-4 border-l-4 transition-all hover:shadow-md", bench.color)}>
              <h3 className="font-bold text-lg mb-4">{bench.name}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">Pendente</span>
                  </div>
                  <span className="font-black text-yellow-900">{bench.pending}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">Em Processo</span>
                  </div>
                  <span className="font-black text-blue-900">{bench.processing}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">Concluído</span>
                  </div>
                  <span className="font-black text-emerald-900">{bench.completed}</span>
                </div>
              </div>
              <Button variant="ghost" className="w-full mt-4 text-xs font-bold uppercase tracking-wider h-8">Ver Detalhes</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
