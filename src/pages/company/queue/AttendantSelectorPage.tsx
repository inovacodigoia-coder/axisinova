import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { UnitSelector } from '@/components/queue/selector/UnitSelector'

export default function AttendantSelectorPage() {
  const navigate = useNavigate()
  const { state, dispatch } = useQueueSystem()
  const [unitId, setUnitId] = useState('')

  const handleConfirm = () => {
    const unit = state.units.find(u => u.id === unitId)
    if (!unit) return
    const session = { unitId, unitName: unit.name, selectedQueueLineIds: [] as string[], showFinalized: false }
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: session })
    sessionStorage.setItem('attendant_session', JSON.stringify(session))
    navigate('/app/filas/atendente/painel')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg space-y-6">
        <h2 className="text-xl font-bold text-foreground text-center">Selecione o atendimento desejado</h2>
        <UnitSelector units={state.units} value={unitId} onChange={setUnitId} />
        <button
          onClick={handleConfirm}
          disabled={!unitId}
          className="w-full rounded-lg bg-[hsl(222,70%,35%)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[hsl(222,70%,30%)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirmar
        </button>
        <button
          onClick={() => navigate('/app/filas')}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-input px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      </div>
    </div>
  )
}
