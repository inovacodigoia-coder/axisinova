import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { UnitSelector } from '@/components/queue/selector/UnitSelector'
import { DeviceSelector } from '@/components/queue/selector/DeviceSelector'

export default function TotemSelectorPage() {
  const navigate = useNavigate()
  const { state, getUnitTotems } = useQueueSystem()
  const [unitId, setUnitId] = useState('')
  const [totemId, setTotemId] = useState('')

  const totems = unitId ? getUnitTotems(unitId) : []

  const handleConfirm = () => {
    const unit = state.units.find(u => u.id === unitId)
    if (!unit) return
    sessionStorage.setItem('queue_totem_session', JSON.stringify({ unitId, unitName: unit.name, totemId }))
    navigate('/totem')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg space-y-6">
        <h2 className="text-xl font-bold text-foreground text-center">Selecione a unidade desejada</h2>
        <UnitSelector units={state.units} value={unitId} onChange={v => { setUnitId(v); setTotemId('') }} />
        <DeviceSelector
          items={totems}
          value={totemId}
          onChange={setTotemId}
          label="Totem"
          disabled={!unitId}
          placeholder={!unitId ? 'Selecione uma unidade primeiro' : 'Selecione o totem'}
        />
        <button
          onClick={handleConfirm}
          disabled={!unitId || !totemId}
          className="w-full rounded-lg bg-[hsl(222,70%,35%)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[hsl(222,70%,30%)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
