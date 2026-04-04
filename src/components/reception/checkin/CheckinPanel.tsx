import { useState } from 'react'
import { useQueue } from '@/context/QueueContext'
import { TicketBadge } from '../queue/TicketBadge'
import { useCepLookup } from '@/hooks/useCepLookup'
import { Star, Calendar, Stethoscope, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface CheckinPanelProps {
  selectedQueueId: string | null
}

export function CheckinPanel({ selectedQueueId }: CheckinPanelProps) {
  const { state, updateStatus } = useQueue()
  const entry = state.entries.find(e => e.id === selectedQueueId)
  const { lookup, loading: cepLoading } = useCepLookup()
  const [step, setStep] = useState(0) // 0=dados, 1=convenio, 2=docs

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <Calendar className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm text-center">Selecione um paciente na fila para iniciar o check-in</p>
      </div>
    )
  }

  const steps = ['Dados Pessoais', 'Convênio', 'Documentos']
  const progress = ((step + 1) / steps.length) * 100

  const handleStartCheckin = () => {
    updateStatus(entry.id, 'in_reception')
    toast.info('Check-in iniciado para ' + entry.patientName)
  }

  const handleCompleteCheckin = () => {
    updateStatus(entry.id, 'documents_ok')
    toast.success('Check-in concluído! Paciente aguardando chamada do médico.')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-3">
          <TicketBadge category={entry.ticketCategory} number={entry.ticketNumber} size="md" />
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">{entry.patientName}</h2>
            <p className="text-xs text-muted-foreground">{entry.patientAge} anos · {entry.doctorName}</p>
          </div>
          {entry.isPreferential && (
            <span className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full">
              <Star className="h-3 w-3 fill-amber-500" /> {entry.preferentialReason}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                i <= step ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground'
              )}>{i + 1}</div>
              <span className={cn('text-[10px]', i <= step ? 'text-foreground font-medium' : 'text-muted-foreground')}>{s}</span>
              {i < steps.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {entry.status === 'waiting' || entry.status === 'called' ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm text-muted-foreground text-center">Paciente ainda não fez check-in na recepção</p>
            <button onClick={handleStartCheckin} className="gradient-bg text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:brightness-110 transition-all">
              Iniciar Check-in
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dados Pessoais */}
            {step === 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Dados Pessoais</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Nome Completo</label>
                    <input defaultValue={entry.patientName} className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Idade</label>
                    <input defaultValue={`${entry.patientAge} anos`} disabled className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-muted" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">CPF</label>
                    <input placeholder="000.000.000-00" className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Gênero</label>
                    <select className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background">
                      <option>Masculino</option><option>Feminino</option><option>Outro</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Nome da Mãe *</label>
                    <input className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" placeholder="Nome completo da mãe" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">E-mail</label>
                    <input type="email" className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Telefone</label>
                    <input defaultValue="(84) 99999-0001" className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Dados do Convênio</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Convênio</label>
                    <input defaultValue={entry.convenioName} disabled className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-muted" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Nº Carteirinha</label>
                    <input placeholder="0000000000" className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Validade</label>
                    <input type="date" className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Nome do Titular</label>
                    <input placeholder="Se diferente do paciente" className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-lg bg-background" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">Verifique os documentos no painel lateral →</p>
                <button onClick={handleCompleteCheckin} className="gradient-bg text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:brightness-110 transition-all">
                  Concluir Check-in
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      {entry.status !== 'waiting' && entry.status !== 'called' && (
        <div className="p-4 border-t border-border flex justify-between">
          <button
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
            className="text-sm px-4 py-2 rounded-lg border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            ← Anterior
          </button>
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} className="text-sm px-4 py-2 rounded-lg gradient-bg text-white font-semibold hover:brightness-110 transition-all">
              Próximo →
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
