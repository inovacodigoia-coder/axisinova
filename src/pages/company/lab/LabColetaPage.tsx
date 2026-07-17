import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, ChevronUp, User, Beaker, ClipboardList, Printer, Check, X, AlertCircle, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { TUBE_TYPES } from '@/types/lab.types'
import { toast } from 'sonner'

export default function LabColetaPage() {
  const { orders, updateOrder } = useAttendanceCadastro()
  const collectionOrders = orders.filter(o => o.status === 'waiting_collection' || o.status === 'completed' && o.serviceType === 'exam')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedTubes, setSelectedTubes] = useState<Record<string, string[]>>({})

  const handleConfirmColeta = (orderId: string) => {
    updateOrder(orderId, { status: 'completed' })
    toast.success('Coleta confirmada com sucesso!')
    setExpandedId(null)
  }

  const toggleTube = (orderId: string, tubeType: string) => {
    setSelectedTubes(prev => {
      const current = prev[orderId] || []
      const next = current.includes(tubeType) ? current.filter(t => t !== tubeType) : [...current, tubeType]
      return { ...prev, [orderId]: next }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fila de Coleta</h1>
        <p className="text-sm text-muted-foreground">Gerencie a fila de pacientes aguardando e registre a coleta de amostras.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-yellow-50 border-yellow-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-yellow-800 font-bold uppercase tracking-wider">Pacientes Aguardando</p>
            <p className="text-3xl font-black text-yellow-900 mt-1">{collectionOrders.filter(o => o.status === 'waiting_collection').length}</p>
          </div>
          <div className="bg-yellow-200/50 p-2 rounded-xl">
            <User className="h-6 w-6 text-yellow-700" />
          </div>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-800 font-bold uppercase tracking-wider">Tubos Necessários</p>
            <p className="text-3xl font-black text-purple-900 mt-1">6 tubos</p>
          </div>
          <div className="bg-purple-200/50 p-2 rounded-xl">
            <Beaker className="h-6 w-6 text-purple-700" />
          </div>
        </Card>
        <Card className="p-4 bg-emerald-50 border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Tempo Médio de Esp.</p>
            <p className="text-3xl font-black text-emerald-900 mt-1">7 min</p>
          </div>
          <div className="bg-emerald-200/50 p-2 rounded-xl">
            <ClipboardList className="h-6 w-6 text-emerald-700" />
          </div>
        </Card>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Buscar por nome, CPF ou protocolo..." />
        </div>
        <Button variant="outline" className="gap-2 h-10 border-border">
          <Filter className="h-4 w-4" />
          Ordenar por: Tempo de Espera
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {collectionOrders.filter(o => o.status === 'waiting_collection').map((order) => {
          const isExpanded = expandedId === order.id
          const tubesSelected = selectedTubes[order.id] || []

          return (
            <Card key={order.id} className={cn(
              "overflow-hidden border-border transition-all duration-300",
              isExpanded ? "ring-2 ring-primary/20 shadow-xl" : "hover:border-primary/30"
            )}>
              <div className="p-4 flex items-center justify-between bg-card">
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Protocolo</p>
                    <p className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded leading-none">{(order as any).protocol || order.orderNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-foreground leading-none">{order.patientName}</p>
                    <p className="text-xs text-muted-foreground">Masc, 37 anos • {order.convenioName || 'Particular'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex gap-1.5">
                    {TUBE_TYPES.map(t => (
                      <div key={t.type} className={cn("w-3 h-3 rounded-full", t.color)} title={t.label}></div>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Espera</p>
                    <p className="text-sm font-black text-red-600">7 min</p>
                  </div>
                  {isExpanded ? (
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)} className="rounded-full h-8 w-8 p-0 hover:bg-muted">
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={() => setExpandedId(order.id)} size="sm" className="gradient-bg text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                      Iniciar →
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/20 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <div className="p-6 border-r border-border space-y-4">
                      <div className="flex items-center gap-2">
                        <Beaker className="h-5 w-5 text-primary" />
                        <h3 className="font-bold">Materiais para Coleta</h3>
                      </div>
                      <div className="space-y-3">
                        {TUBE_TYPES.map(tube => (
                          <div key={tube.type} className={cn(
                            "p-4 rounded-xl border border-border transition-all cursor-pointer group",
                            tubesSelected.includes(tube.type) ? "bg-emerald-50 border-emerald-200" : "bg-card hover:border-primary/30"
                          )} onClick={() => toggleTube(order.id, tube.type)}>
                            <div className="flex items-start gap-3">
                              <div className={cn("mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all", 
                                tubesSelected.includes(tube.type) ? "bg-emerald-500 border-emerald-500 text-white" : "bg-background border-input"
                              )}>
                                {tubesSelected.includes(tube.type) && <Check className="h-3.5 w-3.5 font-bold" />}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-3 h-3 rounded-full", tube.color)}></div>
                                  <p className="text-sm font-bold text-foreground">{tube.label} ({tube.volume})</p>
                                </div>
                                <p className="text-xs text-muted-foreground">Glicose, Hemograma, Creatinina</p>
                                <p className="text-[10px] font-mono font-bold text-primary">Rótulo: {(order as any).protocol}-A</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 space-y-6 flex flex-col">
                      <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responsável pela Coleta</label>
                          <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
                            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-[10px] font-bold text-white">AS</div>
                            <span className="text-sm font-medium">Alexsandro Silva</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações (Opcional)</label>
                          <textarea className="w-full h-24 p-3 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" placeholder="Dificuldade no acesso venoso, etc..." />
                        </div>

                        {tubesSelected.length === 0 && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-pulse">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p className="text-xs font-bold leading-none py-1">Selecione pelo menos um tubo para confirmar a coleta</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-4 border-t border-border">
                        <Button 
                          onClick={() => handleConfirmColeta(order.id)} 
                          className="w-full h-12 gradient-bg text-white font-bold text-base shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                          disabled={tubesSelected.length === 0}
                        >
                          <Check className="h-5 w-5 mr-2" /> Confirmar Coleta
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="h-10 border-border text-xs font-bold uppercase tracking-wider">Cancelar / Adiar</Button>
                          <Button variant="outline" className="h-10 border-border text-xs font-bold uppercase tracking-wider flex gap-2">
                            <Printer className="h-4 w-4" /> Reimprimir Etiquetas
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
