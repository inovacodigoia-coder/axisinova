import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import type { AttachmentRule, AppointmentType } from '@/types/registers.types'
import { toast } from 'sonner'

interface AttachmentsModalProps {
  title: string
  entityId: string
  rules: AttachmentRule[]
  onClose: () => void
  onSave: (rules: AttachmentRule[]) => void
}

export function AttachmentsModal({ title, entityId, rules: initialRules, onClose, onSave }: AttachmentsModalProps) {
  const [rules, setRules] = useState<AttachmentRule[]>([...initialRules])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRequired, setNewRequired] = useState(true)
  const [newTypes, setNewTypes] = useState<Set<AppointmentType>>(new Set(['consulta', 'exame', 'procedimento']))
  const [newObs, setNewObs] = useState('')

  const addRule = () => {
    if (!newName.trim()) { toast.error('Nome é obrigatório'); return }
    setRules(prev => [...prev, {
      id: `ar_${Date.now()}`, convenioId: entityId, attachmentName: newName.trim(),
      isRequired: newRequired, appliesToTypes: Array.from(newTypes), order: prev.length + 1, observations: newObs || undefined,
    }])
    setNewName(''); setNewRequired(true); setNewTypes(new Set(['consulta', 'exame', 'procedimento'])); setNewObs(''); setShowAdd(false)
  }

  const removeRule = (id: string) => setRules(prev => prev.filter(r => r.id !== id))

  const toggleType = (type: AppointmentType) => {
    const next = new Set(newTypes)
    next.has(type) ? next.delete(type) : next.add(type)
    setNewTypes(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[650px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">Regras de Anexos — {title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            ℹ️ Configure os documentos que a recepcionista deve solicitar e validar quando um paciente chegar para atendimento. Regras obrigatórias impedem o check-in de ser concluído sem o documento.
          </div>

          {rules.length === 0 && !showAdd && (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhuma regra de anexo configurada.</p>
          )}

          {rules.map(rule => (
            <div key={rule.id} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm flex items-center gap-2"><Paperclip className="h-4 w-4" /> {rule.attachmentName}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rule.isRequired ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                  {rule.isRequired ? 'Obrigatório' : 'Opcional'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Aplica-se a: {rule.appliesToTypes.map(t => t === 'consulta' ? 'Consulta' : t === 'exame' ? 'Exame' : 'Procedimento').join(', ')}</p>
              {rule.observations && <p className="text-xs text-muted-foreground italic">"{rule.observations}"</p>}
              <button onClick={() => removeRule(rule.id)} className="text-xs text-destructive hover:underline">🗑️ Remover esta regra</button>
            </div>
          ))}

          {showAdd ? (
            <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
              <div><label className="text-sm font-medium">Nome do anexo *</label><input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="flex items-center gap-4 text-sm">
                <span>Obrigatório:</span>
                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={newRequired} onChange={() => setNewRequired(true)} className="accent-primary" /> Sim</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={!newRequired} onChange={() => setNewRequired(false)} className="accent-primary" /> Não</label>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>Aplica-se a:</span>
                {(['consulta', 'exame', 'procedimento'] as AppointmentType[]).map(t => (
                  <label key={t} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={newTypes.has(t)} onChange={() => toggleType(t)} className="accent-primary" />
                    {t === 'consulta' ? 'Consulta' : t === 'exame' ? 'Exame' : 'Procedimento'}
                  </label>
                ))}
              </div>
              <div><label className="text-sm font-medium">Observações</label><input value={newObs} onChange={e => setNewObs(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="flex gap-2">
                <button onClick={addRule} className="gradient-bg rounded-lg px-4 py-1.5 text-sm font-semibold text-white">Adicionar</button>
                <button onClick={() => setShowAdd(false)} className="rounded-lg border border-input px-4 py-1.5 text-sm hover:bg-muted">Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="w-full rounded-lg border border-dashed border-primary/40 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
              + Adicionar regra de anexo
            </button>
          )}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={() => onSave(rules)} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar Regras</button>
        </div>
      </div>
    </div>
  )
}
