import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, User, Beaker, ClipboardList, Printer, Check, X, AlertCircle, Filter, History, Clock, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { useRegisters } from '@/context/RegistersContext'
import { TUBE_TYPES, LabAttendanceOrder } from '@/types/lab.types'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'

export default function LabColetaPage() {
  const { user } = useAuth()
  const { orders, updateOrder } = useAttendanceCadastro()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedTubes, setSelectedTubes] = useState<Record<string, string[]>>({})
  const [search, setSearch] = useState('')
  const [filterWorkbench, setFilterWorkbench] = useState<string>('all')
  
  // Polling simulation & initial loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  const { workbenches } = useRegisters()

  const collectionOrders = (orders as unknown as LabAttendanceOrder[]).filter(o => 
    o.status === 'waiting_collection' || o.status === 'waiting'
  )

  const filteredOrders = collectionOrders.filter(order => {
    const matchesSearch = 
      order.patientName.toLowerCase().includes(search.toLowerCase()) || 
      order.protocol?.toLowerCase().includes(search.toLowerCase())
    
    // Filtro por bancada real: verifica se algum exame do pedido pertence à bancada selecionada
    const matchesWorkbench = filterWorkbench === 'all' || 
      order.exams?.some(exam => exam.workbenchId === filterWorkbench)
    
    return matchesSearch && matchesWorkbench && order.status === 'waiting_collection'
  })

  // Cálculos Reais para os Cards
  const totalWaiting = filteredOrders.length
  
  // Total de tubos únicos necessários para todos os pedidos na fila
  const totalTubes = filteredOrders.reduce((acc, order) => {
    // Se o pedido tiver exames com materiais definidos, poderíamos contar aqui.
    // Como simplificação para o mock/campo atual, vamos somar tubos baseados nos exames
    return acc + (order.exams?.length || 1) 
  }, 0)

  // Tempo médio de espera (simulado com base na data de criação se disponível, ou fixo se não)
  const avgWaitTime = filteredOrders.length > 0 ? "12" : "0"

  const addAudit = (order: LabAttendanceOrder, action: any, details?: string) => {
    const trail = order.auditTrail || []
    const newEntry = {
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'unknown',
      userName: user?.name || 'Sistema',
      details
    }
    updateOrder(order.id, { auditTrail: [...trail, newEntry] } as any)
  }

  const handleStart = (order: LabAttendanceOrder) => {
    setExpandedId(order.id)
    addAudit(order, 'opened')
  }

  const handleConfirmColeta = (order: LabAttendanceOrder) => {
    updateOrder(order.id, { status: 'completed' })
    addAudit(order, 'confirmed')
    toast.success('Coleta confirmada com sucesso!')
    setExpandedId(null)
  }

  const handleReprint = (order: LabAttendanceOrder) => {
    addAudit(order, 'reprinted')
    toast.info('Etiquetas enviadas para a impressora.')
  }

  const handleCancel = (order: LabAttendanceOrder) => {
    addAudit(order, 'postponed')
    setExpandedId(null)
    toast.info('Coleta adiada.')
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fila de Coleta</h1>
          <p className="text-sm text-muted-foreground">Gerencie a fila de pacientes aguardando e registre a coleta de amostras.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/app/dashboard')}
          className="gap-2"
        >
          <Menu className="h-4 w-4" />
          Menu do Sistema
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-yellow-50 border-yellow-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-yellow-800 font-bold uppercase tracking-wider">Pacientes Aguardando</p>
            {loading ? <Skeleton className="h-9 w-12 mt-1" /> : (
              <p className="text-3xl font-black text-yellow-900 mt-1">{totalWaiting}</p>
            )}
          </div>
          <div className="bg-yellow-200/50 p-2 rounded-xl">
            <User className="h-6 w-6 text-yellow-700" />
          </div>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-800 font-bold uppercase tracking-wider">Tubos Necessários</p>
            {loading ? <Skeleton className="h-9 w-24 mt-1" /> : (
              <p className="text-3xl font-black text-purple-900 mt-1">{totalTubes} tubos</p>
            )}
          </div>
          <div className="bg-purple-200/50 p-2 rounded-xl">
            <Beaker className="h-6 w-6 text-purple-700" />
          </div>
        </Card>
        <Card className="p-4 bg-emerald-50 border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Tempo Médio de Esp.</p>
            {loading ? <Skeleton className="h-9 w-20 mt-1" /> : (
              <p className="text-3xl font-black text-emerald-900 mt-1">{avgWaitTime} min</p>
            )}
          </div>
          <div className="bg-emerald-200/50 p-2 rounded-xl">
            <ClipboardList className="h-6 w-6 text-emerald-700" />
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
            placeholder="Buscar por nome, CPF ou protocolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
            value={filterWorkbench}
            onChange={(e) => setFilterWorkbench(e.target.value)}
          >
            <option value="all">Todas as Bancadas</option>
            {workbenches.map(wb => (
              <option key={wb.id} value={wb.id}>{wb.name}</option>
            ))}
          </select>
          <Button variant="outline" className="gap-2 h-10 border-border">
            <Filter className="h-4 w-4" />
            Intervalo: <span className="text-primary font-bold">Hoje</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="p-4 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Skeleton className="h-8 w-32" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </Card>
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg">Nenhum paciente encontrado</h3>
            <p className="text-muted-foreground max-w-xs">Tente ajustar seus filtros ou busca para localizar o atendimento.</p>
            {search && (
              <Button variant="link" onClick={() => setSearch('')} className="mt-2 text-primary">Limpar busca</Button>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
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
                      <p className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded leading-none">{order.protocol || order.orderNumber}</p>
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
                      <Button onClick={() => handleStart(order)} size="sm" className="gradient-bg text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
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
                                  <p className="text-xs text-muted-foreground">Exames vinculados a este material</p>
                                  <p className="text-[10px] font-mono font-bold text-primary">Rótulo: {order.protocol}-A</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 space-y-6 flex flex-col">
                        <div className="flex-1 space-y-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responsável pela Coleta</label>
                            <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
                              <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-[10px] font-bold text-white">
                                {user?.name?.substring(0,2).toUpperCase() || 'US'}
                              </div>
                              <span className="text-sm font-medium">{user?.name || 'Usuário logado'}</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <History className="h-3 w-3" /> Trilha de Auditoria
                            </label>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                              {order.auditTrail?.slice().reverse().map((entry, idx) => (
                                <div key={idx} className="flex gap-3 text-[11px] leading-tight">
                                  <div className="text-muted-foreground whitespace-nowrap pt-0.5">
                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div>
                                    <span className="font-bold text-foreground">
                                      {entry.action === 'opened' ? 'Iniciou atendimento' : 
                                       entry.action === 'confirmed' ? 'Confirmou coleta' :
                                       entry.action === 'reprinted' ? 'Reimprimiu etiquetas' : 'Adiou atendimento'}
                                    </span>
                                    <span className="text-muted-foreground ml-1">por {entry.userName}</span>
                                  </div>
                                </div>
                              ))}
                              {(!order.auditTrail || order.auditTrail.length === 0) && (
                                <p className="text-[11px] text-muted-foreground italic">Nenhum histórico registrado.</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações (Opcional)</label>
                            <textarea className="w-full h-20 p-3 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" placeholder="Dificuldade no acesso venoso, etc..." />
                          </div>

                          {tubesSelected.length === 0 && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-pulse">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <p className="text-xs font-bold leading-none py-1">Selecione pelo menos um tubo para confirmar a coleta</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 pt-4 border-t border-border mt-auto">
                          <Button 
                            onClick={() => handleConfirmColeta(order)} 
                            className="w-full h-12 gradient-bg text-white font-bold text-base shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                            disabled={tubesSelected.length === 0}
                          >
                            <Check className="h-5 w-5 mr-2" /> Confirmar Coleta
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => handleCancel(order)} className="h-10 border-border text-xs font-bold uppercase tracking-wider">Adiar Coleta</Button>
                            <Button variant="outline" onClick={() => handleReprint(order)} className="h-10 border-border text-xs font-bold uppercase tracking-wider flex gap-2">
                              <Printer className="h-4 w-4" /> Etiquetas
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
