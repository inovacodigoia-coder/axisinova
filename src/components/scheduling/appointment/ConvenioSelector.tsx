import { useMemo } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import { DependencyAlert } from '@/components/scheduling/empty-states/DependencyAlert'

interface Props {
  doctorId: string
  value: string
  onChange: (id: string) => void
}

export function ConvenioSelector({ doctorId, value, onChange }: Props) {
  const { doctors, convenios } = useRegisters()

  const doctor = doctors.find(d => d.id === doctorId)

  const availableConvenios = useMemo(() => {
    if (!doctorId) return convenios.filter(c => c.isActive)
    if (!doctor) return []
    return convenios.filter(c => c.isActive && doctor.enabledConvenioIds.includes(c.id))
  }, [doctorId, doctor, convenios])

  const allConveniosFallback = useMemo(() => convenios.filter(c => c.isActive), [convenios])
  const showFallback = doctorId && doctor && availableConvenios.length === 0 && allConveniosFallback.length > 0
  const displayConvenios = showFallback ? allConveniosFallback : availableConvenios

  return (
    <div>
      <label className="text-sm font-medium text-foreground">Convênio *</label>
      {!doctorId && (
        <p className="text-xs text-muted-foreground mb-1">ℹ️ Selecione um médico para filtrar os convênios disponíveis.</p>
      )}
      {showFallback && (
        <DependencyAlert
          icon="⚠️"
          message={`${doctor?.fullName} não possui convênios habilitados. Configure em Cadastros → Médicos.`}
          actionLabel="Configurar agora"
          actionRoute="/app/cadastros/medicos"
          variant="warning"
        />
      )}
      {convenios.filter(c => c.isActive).length === 0 && (
        <DependencyAlert
          icon="⚠️"
          message="Nenhum convênio cadastrado."
          actionLabel="Cadastrar Convênio"
          actionRoute="/app/cadastros/convenios"
          variant="warning"
        />
      )}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
        <option value="">Selecione...</option>
        {displayConvenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  )
}
