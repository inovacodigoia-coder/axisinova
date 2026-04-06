import { useState, useMemo } from 'react'
import { useScheduling } from '@/context/SchedulingContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import type { ConfirmationDispatch } from '@/types/scheduling.types'
import { toast } from 'sonner'
import { Check, Send, AlertTriangle } from 'lucide-react'
import { differenceInHours } from 'date-fns'

export default function ConfirmationsPage() {
  const { confirmations, updateConfirmation } = useScheduling()
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return confirmations
    return confirmations.filter(c => c.status === statusFilter)
  }, [confirmations, statusFilter])

  const { visibleItems, totalItems, hasMore, showMore, showAll, remainingCount } = usePaginatedList(filtered, 10)

  const counts = {
    pending: confirmations.filter(c => c.status === 'pending').length,
    confirmed: confirmations.filter(c => c.status === 'confirmed').length,
    failed: confirmations.filter(c => c.status === 'failed').length,
  }

  const handleUpdateStatus = (id: string, status: ConfirmationDispatch['status']) => {
    const updates: Partial<ConfirmationDispatch> = { status }
    if (status === 'sent') updates.sentAt = new Date().toISOString().split('T')[0]
    if (status === 'confirmed') updates.confirmedAt = new Date().toISOString().split('T')[0]
    updateConfirmation(id, updates)
    toast.success('Status atualizado!')
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const batchMarkSent = () => {
    selected.forEach(id => {
      updateConfirmation(id, { status: 'sent', sentAt: new Date().toISOString().split('T')[0] })
    })
    toast.success(`${selected.size} marcados como enviados`)
    setSelected(new Set())
  }

  if (confirmations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Confirmações</h1>
          <p className="text-sm text-muted-foreground">Gerencie os disparos de confirmação de agendamentos</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-4xl">📞</span>
          <h3 className="text-lg font-bold text-foreground">Nenhuma confirmação pendente</h3>
          <p className="text-sm text-muted-foreground">para o período selecionado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Confirmações</h1>
        <p className="text-sm text-muted-foreground">Gerencie os disparos de confirmação de agendamentos</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="sent">Enviados</option>
          <option value="confirmed">Confirmados</option>
          <option value="failed">Falharam</option>
        </select>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700 font-medium">{counts.pending} pendentes</span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 font-medium">{counts.confirmed} confirmados</span>
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 font-medium">{counts.failed} falharam</span>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="rounded-lg gradient-bg p-3 flex items-center justify-between">
          <span className="text-sm text-white font-medium">{selected.size} selecionados</span>
          <button onClick={batchMarkSent} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors">
            Marcar como Enviados
          </button>
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.map(conf => {
          const hoursUntil = differenceInHours(new Date(conf.appointmentDate + 'T' + conf.appointmentTime), new Date())
          const isUrgent = hoursUntil < 24 && hoursUntil > 0

          return (
            <div key={conf.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.has(conf.id)} onChange={() => toggleSelect(conf.id)}
                  className="mt-1 h-4 w-4 rounded border-input accent-primary" />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">📅 {conf.appointmentDate.split('-').reverse().join('/')} às {conf.appointmentTime}</span>
                    <span className="text-sm text-muted-foreground">{conf.doctorName}</span>
                    {isUrgent && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">URGENTE</span>}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground ml-auto">{conf.method}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1">👤 {conf.patientName}</p>
                  <p className="text-xs text-muted-foreground">📞 {conf.patientPhone1}{conf.patientPhone2 ? ` · ${conf.patientPhone2}` : ''}</p>

                  <div className="flex gap-2 mt-3">
                    {conf.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpdateStatus(conf.id, 'sent')}
                          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                          <Send className="h-3 w-3" /> Marcar como Enviado
                        </button>
                        <button onClick={() => handleUpdateStatus(conf.id, 'confirmed')}
                          className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                          <Check className="h-3 w-3" /> Paciente Confirmou
                        </button>
                      </>
                    )}
                    {conf.status === 'sent' && (
                      <button onClick={() => handleUpdateStatus(conf.id, 'confirmed')}
                        className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                        <Check className="h-3 w-3" /> Paciente Confirmou
                      </button>
                    )}
                    {conf.status === 'confirmed' && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Check className="h-3 w-3" /> Confirmado{conf.confirmedAt ? ` em ${conf.confirmedAt.split('-').reverse().join('/')}` : ''}</span>
                    )}
                    {conf.status === 'failed' && (
                      <span className="flex items-center gap-1 text-xs text-destructive font-medium"><AlertTriangle className="h-3 w-3" /> Falhou no envio</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">Exibindo {visibleItems.length} de {totalItems}</span>
          <div className="flex gap-2">
            <button onClick={showMore} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
              Mostrar mais {Math.min(10, remainingCount)}
            </button>
            {remainingCount > 10 && (
              <button onClick={showAll} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                Ver todos ({totalItems})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
