import { useState, useEffect, useMemo } from 'react'
import { X, Search, Plus, Check } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'

export interface MedicalRecordFormData {
  date: string
  doctor: string
  type: string
  diagnosis: string
  notes: string
  prescription?: string
  exams?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: MedicalRecordFormData) => void
  patientName: string
}

const doctors = ['Dr. Carlos Mendes', 'Dra. Ana Paula', 'Dr. Roberto Lima', 'Dra. Maria Souza']
const recordTypes = ['Consulta', 'Retorno', 'Exame', 'Internação', 'Procedimento', 'Emergência']

interface CatalogItem {
  id: string
  name: string
  kind: 'exam' | 'procedure'
  code?: string | null
}

export function MedicalRecordModal({ open, onClose, onSave, patientName }: Props) {
  const { user } = useAuth()
  const [form, setForm] = useState<MedicalRecordFormData>({
    date: new Date().toISOString().split('T')[0], doctor: doctors[0],
    type: 'Consulta', diagnosis: '', notes: '', prescription: '', exams: '',
  })
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [selected, setSelected] = useState<CatalogItem[]>([])
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        date: new Date().toISOString().split('T')[0], doctor: doctors[0],
        type: 'Consulta', diagnosis: '', notes: '', prescription: '', exams: '',
      })
      setSelected([])
      setSearch('')
      setShowPicker(false)
    }
  }, [open])

  // Carrega exames + procedimentos da empresa
  useEffect(() => {
    if (!open) return
    const cid = resolveCompanyId(user?.companyId)
    if (!cid) return
    Promise.all([
      supabase.from('exams').select('id,name,tuss_code').eq('company_id', cid).eq('is_active', true).order('name'),
      supabase.from('procedures').select('id,name,tuss_code').eq('company_id', cid).eq('is_active', true).order('name'),
    ]).then(([ex, pr]) => {
      const items: CatalogItem[] = [
        ...(ex.data || []).map(e => ({ id: `exam_${e.id}`, name: e.name, code: e.tuss_code, kind: 'exam' as const })),
        ...(pr.data || []).map(p => ({ id: `proc_${p.id}`, name: p.name, code: p.tuss_code, kind: 'procedure' as const })),
      ]
      setCatalog(items)
    })
  }, [open, user?.companyId])

  // Sincroniza selecionados → string textual no form
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      exams: selected.map(s => `${s.kind === 'exam' ? '🧪' : '⚕️'} ${s.name}${s.code ? ` (${s.code})` : ''}`).join(' • '),
    }))
  }, [selected])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const available = catalog.filter(c => !selected.find(s => s.id === c.id))
    if (!q) return available
    return available.filter(c => c.name.toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q))
  }, [catalog, selected, search])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const set = (field: keyof MedicalRecordFormData, value: string) => setForm(prev => ({ ...prev, [field]: value }))
  const addItem = (item: CatalogItem) => setSelected(prev => [...prev, item])
  const removeItem = (id: string) => setSelected(prev => prev.filter(s => s.id !== id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Nova Entrada no Prontuário</h2>
            <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Data *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Médico</label>
              <select value={form.doctor} onChange={e => set('doctor', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {doctors.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                {recordTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Diagnóstico / CID *</label>
            <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" placeholder="Ex: Hipertensão arterial - I10" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Evolução / Anamnese *</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} required rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" placeholder="Descrição detalhada do atendimento..." />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Prescrição</label>
            <textarea value={form.prescription} onChange={e => set('prescription', e.target.value)} rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none" placeholder="Medicamentos, posologia..." />
          </div>

          {/* ─── Exames + Procedimentos solicitados ─── */}
          <div>
            <label className="text-sm font-medium text-foreground">Exames e Procedimentos Solicitados</label>
            <p className="text-xs text-muted-foreground mb-2">Selecione do catálogo cadastrado no sistema</p>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selected.map(s => (
                  <span key={s.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs text-foreground">
                    <span>{s.kind === 'exam' ? '🧪' : '⚕️'}</span>
                    <span className="font-medium">{s.name}</span>
                    {s.code && <span className="text-muted-foreground">({s.code})</span>}
                    <button type="button" onClick={() => removeItem(s.id)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setShowPicker(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
              <Plus className="h-3.5 w-3.5" />
              {showPicker ? 'Fechar catálogo' : 'Adicionar do catálogo'}
            </button>

            {showPicker && (
              <div className="mt-2 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
                    placeholder="Buscar exame ou procedimento..."
                    className="w-full bg-transparent text-sm focus:outline-none" />
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {filtered.length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      {catalog.length === 0
                        ? 'Nenhum exame ou procedimento cadastrado. Cadastre em Cadastros → Exames / Procedimentos.'
                        : 'Nenhum item encontrado.'}
                    </p>
                  )}
                  {filtered.map(item => (
                    <button key={item.id} type="button" onClick={() => addItem(item)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted">
                      <span className="flex items-center gap-2">
                        <span>{item.kind === 'exam' ? '🧪' : '⚕️'}</span>
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.code && <span className="text-xs text-muted-foreground">({item.code})</span>}
                        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {item.kind === 'exam' ? 'Exame' : 'Procedimento'}
                        </span>
                      </span>
                      <Check className="h-4 w-4 text-primary opacity-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <GradientButton type="submit">Salvar Registro</GradientButton>
          </div>
        </form>
      </div>
    </div>
  )
}
