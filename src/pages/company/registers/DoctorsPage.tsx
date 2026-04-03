import { useState } from 'react'
import { MOCK_DOCTORS, MOCK_CONVENIOS } from '@/mocks/company.mock'
import { useCompanyContext } from '@/context/CompanyContext'
import { DataTable } from '@/components/ui/DataTable'
import { Plus, Search, Edit } from 'lucide-react'
import type { Doctor } from '@/types/registers.types'
import { SPECIALTIES } from '@/types/registers.types'
import { toast } from 'sonner'

export default function DoctorsPage() {
  const { canAccess } = useCompanyContext()
  const [doctors, setDoctors] = useState(MOCK_DOCTORS)
  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)

  const filtered = doctors.filter(d => {
    if (search && !d.fullName.toLowerCase().includes(search.toLowerCase()) && !d.crm.includes(search)) return false
    if (specFilter && d.mainSpecialty !== specFilter) return false
    return true
  })

  const columns = [
    { key: 'fullName', label: 'Nome', sortable: true, render: (d: Doctor) => <span className="font-medium text-foreground">{d.fullName}</span> },
    { key: 'crm', label: 'CRM', render: (d: Doctor) => <span className="font-mono text-sm">{d.crm}/{d.crmState}</span> },
    { key: 'mainSpecialty', label: 'Especialidade', sortable: true, render: (d: Doctor) => <span>{d.mainSpecialty}</span> },
    { key: 'enabledConvenios', label: 'Convênios', render: (d: Doctor) => <span className="text-sm text-muted-foreground">{d.enabledConvenios.length} habilitados</span> },
    { key: 'isActive', label: 'Status', render: (d: Doctor) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${d.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
        {d.isActive ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'actions', label: '', render: (d: Doctor) => (
      <button onClick={() => { setEditing(d); setShowForm(true) }} className="rounded p-1 hover:bg-muted"><Edit className="h-4 w-4 text-muted-foreground" /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médicos Cadastrados</h1>
          <p className="text-sm text-muted-foreground">Gestão de profissionais médicos</p>
        </div>
        {canAccess('registers', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Médico
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CRM..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={specFilter} onChange={e => setSpecFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todas especialidades</option>
          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable data={filtered} columns={columns} />

      {showForm && (
        <DoctorFormModal doctor={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSave={(d) => {
          if (editing) {
            setDoctors(prev => prev.map(x => x.id === d.id ? d : x))
          } else {
            setDoctors(prev => [...prev, d])
          }
          setShowForm(false)
          setEditing(null)
          toast.success(editing ? 'Médico atualizado' : 'Médico cadastrado')
        }} />
      )}
    </div>
  )
}

function DoctorFormModal({ doctor, onClose, onSave }: { doctor: Doctor | null; onClose: () => void; onSave: (d: Doctor) => void }) {
  const [name, setName] = useState(doctor?.fullName || '')
  const [crm, setCrm] = useState(doctor?.crm || '')
  const [crmState, setCrmState] = useState(doctor?.crmState || 'SP')
  const [specialty, setSpecialty] = useState(doctor?.mainSpecialty || '')
  const [enabledConvenios, setEnabledConvenios] = useState<Set<string>>(new Set(doctor?.enabledConvenios || []))
  const [duration, setDuration] = useState(doctor?.consultDuration || 30)
  const [interval, setIntervalMin] = useState(doctor?.consultInterval || 10)
  const [activeTab, setActiveTab] = useState('dados')

  const toggleConv = (id: string) => {
    const next = new Set(enabledConvenios)
    next.has(id) ? next.delete(id) : next.add(id)
    setEnabledConvenios(next)
  }

  const handleSave = () => {
    if (!name || !crm || !specialty) { toast.error('Preencha os campos obrigatórios'); return }
    onSave({
      id: doctor?.id || `doc_${Date.now()}`,
      fullName: name, crm, crmState, mainSpecialty: specialty,
      enabledConvenios: Array.from(enabledConvenios),
      isActive: true, companyId: 'comp_001', consultDuration: duration, consultInterval: interval,
      schedule: doctor?.schedule || [],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[700px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">{doctor ? 'Editar Médico' : 'Novo Médico'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-1 px-6">
            {[{ key: 'dados', label: 'Dados Profissionais' }, { key: 'convenios', label: 'Convênios' }, { key: 'agenda', label: 'Agenda' }].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {activeTab === 'dados' && (
            <>
              <div><label className="text-sm font-medium">Nome completo *</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">CRM *</label><input value={crm} onChange={e => setCrm(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">Estado *</label><input value={crmState} onChange={e => setCrmState(e.target.value)} maxLength={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              </div>
              <div>
                <label className="text-sm font-medium">Especialidade principal *</label>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}
          {activeTab === 'convenios' && (
            <>
              <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-lg p-3 text-xs text-[hsl(var(--warning))]">
                ⚠️ Apenas os convênios selecionados serão exibidos ao agendar para este médico
              </div>
              <div className="space-y-1">
                {MOCK_CONVENIOS.map(c => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted cursor-pointer">
                    <input type="checkbox" checked={enabledConvenios.has(c.id)} onChange={() => toggleConv(c.id)} className="accent-primary" />
                    {c.name}
                    <span className="text-xs text-muted-foreground ml-auto">{c.type === 'health_plan' ? 'Plano' : c.type === 'private' ? 'Particular' : 'SUS'}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Duração da consulta</label>
                  <select value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Intervalo entre consultas</label>
                  <select value={interval} onChange={e => setIntervalMin(+e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    {[0, 5, 10, 15].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Configuração de dias e horários disponível em breve.</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={handleSave} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
