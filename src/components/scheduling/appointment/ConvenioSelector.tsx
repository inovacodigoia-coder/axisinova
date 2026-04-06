import { MOCK_DOCTORS, MOCK_CONVENIOS } from '@/mocks/company.mock'

interface Props {
  doctorId: string
  value: string
  onChange: (id: string) => void
}

export function ConvenioSelector({ doctorId, value, onChange }: Props) {
  const doctor = MOCK_DOCTORS.find(d => d.id === doctorId)
  const convenios = doctor
    ? MOCK_CONVENIOS.filter(c => c.isActive && doctor.enabledConvenios?.includes(c.id))
    : MOCK_CONVENIOS.filter(c => c.isActive)

  return (
    <div>
      <label className="text-sm font-medium text-foreground">Convênio *</label>
      {!doctorId && (
        <p className="text-xs text-yellow-600 mb-1">⚠️ Selecione um médico para filtrar convênios</p>
      )}
      {doctorId && convenios.length === 0 && (
        <p className="text-xs text-destructive mb-1">Este médico não possui convênios habilitados. Configure em Cadastros → Médicos.</p>
      )}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
        <option value="">Selecione...</option>
        {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  )
}
