import { useState } from 'react'
import { MOCK_CONVENIOS } from '@/mocks/company.mock'
import { useCompanyContext } from '@/context/CompanyContext'
import { DataTable } from '@/components/ui/DataTable'
import { Plus, Edit } from 'lucide-react'
import type { Convenio, DocumentRequirement } from '@/types/registers.types'
import { DOCUMENT_COLUMNS, ATTENDANCE_TYPES } from '@/types/registers.types'
import { toast } from 'sonner'

const TYPE_LABELS: Record<string, string> = { health_plan: 'Plano de Saúde', private: 'Particular', sus: 'SUS' }
const REQ_COLORS: Record<DocumentRequirement, string> = { none: 'bg-muted text-muted-foreground', optional: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]', required: 'bg-destructive/10 text-destructive' }
const REQ_LABELS: Record<DocumentRequirement, string> = { none: 'Não exigir', optional: 'Opcional', required: 'Obrigatório' }

export default function ConveniosPage() {
  const { canAccess } = useCompanyContext()
  const [convenios, setConvenios] = useState(MOCK_CONVENIOS)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Convenio | null>(null)

  const columns = [
    { key: 'name', label: 'Convênio', sortable: true, render: (c: Convenio) => <span className="font-medium text-foreground">{c.name}</span> },
    { key: 'ansCode', label: 'Código ANS', render: (c: Convenio) => <span className="font-mono text-sm">{c.ansCode || '—'}</span> },
    { key: 'type', label: 'Tipo', render: (c: Convenio) => <span className="text-sm">{TYPE_LABELS[c.type]}</span> },
    { key: 'isActive', label: 'Status', render: (c: Convenio) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${c.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
        {c.isActive ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'actions', label: '', render: (c: Convenio) => (
      <button onClick={() => { setEditing(c); setShowForm(true) }} className="rounded p-1 hover:bg-muted"><Edit className="h-4 w-4 text-muted-foreground" /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convênios</h1>
          <p className="text-sm text-muted-foreground">Cadastro e regras de documentos por convênio</p>
        </div>
        {canAccess('registers', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Convênio
          </button>
        )}
      </div>
      <DataTable data={convenios} columns={columns} />

      {showForm && (
        <ConvenioFormModal convenio={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSave={(c) => {
          if (editing) setConvenios(prev => prev.map(x => x.id === c.id ? c : x))
          else setConvenios(prev => [...prev, c])
          setShowForm(false); setEditing(null)
          toast.success(editing ? 'Convênio atualizado' : 'Convênio cadastrado')
        }} />
      )}
    </div>
  )
}

function ConvenioFormModal({ convenio, onClose, onSave }: { convenio: Convenio | null; onClose: () => void; onSave: (c: Convenio) => void }) {
  const [name, setName] = useState(convenio?.name || '')
  const [ansCode, setAnsCode] = useState(convenio?.ansCode || '')
  const [type, setType] = useState<Convenio['type']>(convenio?.type || 'health_plan')
  const [cnpj, setCnpj] = useState(convenio?.cnpj || '')
  const [activeTab, setActiveTab] = useState('dados')

  const defaultRules = { Carteirinha: 'none' as DocumentRequirement, 'Pedido Médico': 'none' as DocumentRequirement, 'RG/CPF': 'none' as DocumentRequirement, Autorização: 'none' as DocumentRequirement, 'Guia SADT': 'none' as DocumentRequirement, Laudo: 'none' as DocumentRequirement }
  const [rules, setRules] = useState(convenio?.documentRules || { consulta: { ...defaultRules }, exame: { ...defaultRules }, procedimento: { ...defaultRules } })

  const updateRule = (att: string, doc: string, val: DocumentRequirement) => {
    setRules(prev => ({ ...prev, [att]: { ...prev[att as keyof typeof prev], [doc]: val } }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[800px] max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold">{convenio ? 'Editar Convênio' : 'Novo Convênio'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-1 px-6">
            {[{ key: 'dados', label: 'Dados Gerais' }, { key: 'docs', label: 'Regras de Documentos' }].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {activeTab === 'dados' && (
            <>
              <div><label className="text-sm font-medium">Nome *</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Código ANS</label><input value={ansCode} onChange={e => setAnsCode(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <select value={type} onChange={e => setType(e.target.value as Convenio['type'])} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="health_plan">Plano de Saúde</option>
                    <option value="private">Particular</option>
                    <option value="sus">SUS</option>
                  </select>
                </div>
              </div>
              <div><label className="text-sm font-medium">CNPJ</label><input value={cnpj} onChange={e => setCnpj(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
            </>
          )}
          {activeTab === 'docs' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Atendimento</th>
                    {DOCUMENT_COLUMNS.map(d => <th key={d} className="text-center py-2 px-1 font-medium text-muted-foreground text-xs">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ATTENDANCE_TYPES.map(att => (
                    <tr key={att} className="border-b border-border">
                      <td className="py-2 px-2 font-medium capitalize">{att}</td>
                      {DOCUMENT_COLUMNS.map(doc => {
                        const val = (rules[att] as any)?.[doc] || 'none'
                        return (
                          <td key={doc} className="py-2 px-1 text-center">
                            <select value={val} onChange={e => updateRule(att, doc, e.target.value as DocumentRequirement)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold border-0 ${REQ_COLORS[val as DocumentRequirement]}`}>
                              <option value="none">Não exigir</option>
                              <option value="optional">Opcional</option>
                              <option value="required">Obrigatório</option>
                            </select>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button onClick={() => {
            if (!name) { toast.error('Nome é obrigatório'); return }
            onSave({ id: convenio?.id || `conv_${Date.now()}`, name, ansCode, type, cnpj, isActive: true, companyId: 'comp_001', documentRules: rules })
          }} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
