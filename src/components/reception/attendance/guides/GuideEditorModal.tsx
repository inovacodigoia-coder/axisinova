import { useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Search, FileText } from 'lucide-react'
import { useRegisters } from '@/context/RegistersContext'
import { cn } from '@/lib/utils'

export interface GuideDraft {
  convenioId?: string
  convenioName?: string
  doctorId?: string
  doctorName?: string
  doctorCRM?: string
  exams: any[]
}

interface GuideEditorModalProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  guide?: GuideDraft
  onSave: (guide: GuideDraft) => void
}

export function GuideEditorModal({ open, onClose, mode, guide, onSave }: GuideEditorModalProps) {
  const { convenios, doctors, exams: catalog } = useRegisters()
  const [convenioId, setConvenioId] = useState(guide?.convenioId || '')
  const [convenioName, setConvenioName] = useState(guide?.convenioName || '')
  const [doctorId, setDoctorId] = useState(guide?.doctorId || '')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any[]>(guide?.exams ? [...guide.exams] : [])

  const activeConvenios = useMemo(() => convenios.filter(c => c.isActive !== false), [convenios])
  const activeDoctors = useMemo(() => doctors.filter(d => d.isActive !== false), [doctors])

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase()
    return catalog
      .filter(e => e.isActive !== false)
      .filter(e => !term || e.name.toLowerCase().includes(term) || (e.internalCode || '').toLowerCase().includes(term))
      .slice(0, 200)
  }, [catalog, search])

  const isSelected = (id: string) => selected.some(e => (e.examId || e.id) === id)

  const toggleExam = (e: any) => {
    const id = e.id
    if (isSelected(id)) {
      setSelected(prev => prev.filter(x => (x.examId || x.id) !== id))
    } else {
      setSelected(prev => [...prev, {
        examId: e.id,
        code: e.internalCode || e.tussCode || '',
        name: e.name,
        material: e.defaultMaterial || 'Soro',
        methodology: e.methodology || '',
        isCobrado: true,
        isColeta: false,
        status: 'pending',
      }])
    }
  }

  const handleSave = () => {
    const doctor = activeDoctors.find(d => d.id === doctorId)
    const convenio = activeConvenios.find(c => c.id === convenioId)
    onSave({
      convenioId: convenio?.id,
      convenioName: convenio?.name || convenioName || 'Particular',
      doctorId: doctor?.id,
      doctorName: doctor?.fullName || doctor?.name,
      doctorCRM: doctor?.crm,
      exams: selected,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[860px] w-[95vw] p-0 gap-0 [&>button]:hidden overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase">
              {mode === 'create' ? 'Nova Guia' : 'Editar Guia'}
            </h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-4 bg-[#F8FAFC]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Convênio / Plano</label>
              <select
                value={convenioId}
                onChange={e => { setConvenioId(e.target.value); setConvenioName(activeConvenios.find(c => c.id === e.target.value)?.name || '') }}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Particular</option>
                {activeConvenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Médico Solicitante</label>
              <select
                value={doctorId}
                onChange={e => setDoctorId(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">Sem médico informado</option>
                {activeDoctors.map(d => <option key={d.id} value={d.id}>{d.fullName || d.name} — {d.crm}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar exame por nome ou código..."
                className="w-full rounded-md border border-input bg-white pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <ScrollArea className="h-[280px] rounded-md border border-border bg-white">
              <div className="divide-y divide-border">
                {filteredCatalog.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground">Nenhum exame encontrado.</div>
                )}
                {filteredCatalog.map(e => (
                  <label key={e.id} className={cn("flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/30", isSelected(e.id) && "bg-primary/5")}>
                    <Checkbox className="h-3.5 w-3.5" checked={isSelected(e.id)} onCheckedChange={() => toggleExam(e)} />
                    <span className="text-xs font-medium text-foreground uppercase flex-1">{e.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{e.internalCode || e.tussCode || '—'}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">{selected.length} exame(s) na guia</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-white">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={selected.length === 0}>Salvar Guia</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
