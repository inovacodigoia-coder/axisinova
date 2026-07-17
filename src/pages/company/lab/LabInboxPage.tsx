import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Inbox, Filter, ArrowRight, Beaker, ClipboardCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function LabInboxPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  const items = [
    { id: '1', patient: 'JOAO SILVA', protocol: '20260716-001', tests: 3, urgency: 'normal', time: '10m' },
    { id: '2', patient: 'MARIA SANTOS', protocol: '20260716-002', tests: 1, urgency: 'high', time: '5m' },
    { id: '3', patient: 'CARLOS OLIVEIRA', protocol: '20260716-003', tests: 5, urgency: 'normal', time: '15m' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caixa de Entrada</h1>
          <p className="text-sm text-muted-foreground">Amostras coletadas aguardando triagem e entrada técnica.</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 h-7 px-3 text-xs font-bold uppercase">
          {items.length} Pendentes
        </Badge>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar por protocolo ou paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filtros
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            </Card>
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-bold text-lg">Caixa de entrada vazia</h3>
            <p className="text-muted-foreground">Não há amostras pendentes de triagem.</p>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="p-4 hover:border-primary/30 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    <Beaker className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{item.patient}</p>
                      {item.urgency === 'high' && (
                        <Badge variant="destructive" className="h-5 text-[10px] px-1.5 uppercase font-black">Urgente</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{item.protocol}</span>
                      <span>•</span>
                      <span>{item.tests} exames</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {item.time} atrás
                      </span>
                    </div>
                  </div>
                </div>
                <Button size="sm" className="gradient-bg text-white gap-2">
                  Triagem <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
