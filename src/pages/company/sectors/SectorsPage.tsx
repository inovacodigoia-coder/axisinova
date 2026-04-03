import { useState } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { MOCK_SECTORS } from '@/mocks/company.mock'
import { Plus, Edit, Users, ShieldCheck } from 'lucide-react'
import type { Sector } from '@/types/permissions.types'
import { toast } from 'sonner'

export default function SectorsPage() {
  const { canAccess, allProfiles } = useCompanyContext()
  const [sectors, setSectors] = useState(MOCK_SECTORS)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Sector | null>(null)

  const handleSave = (s: Sector) => {
    if (editing) {
      setSectors(prev => prev.map(x => x.id === s.id ? s : x))
      toast.success('Setor atualizado')
    } else {
      setSectors(prev => [...prev, s])
      toast.success('Setor criado')
    }
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setores da Empresa</h1>
          <p className="text-sm text-muted-foreground">Gerencie os setores e suas vinculações</p>
        </div>
        {canAccess('settings', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Setor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.filter(s => s.isActive).map(s => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(123,47,247,0.1)] hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-foreground">{s.name}</h3>
              <button onClick={() => { setEditing(s); setShowForm(true) }} className="rounded p-1 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {s.allowedProfiles.length} perfis</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {Math.floor(Math.random() * 8 + 1)} usuários</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">{editing ? 'Editar Setor' : 'Novo Setor'}</h2>
            <SectorForm sector={editing} profiles={allProfiles} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function SectorForm({ sector, profiles, onSave, onCancel }: { sector: Sector | null; profiles: any[]; onSave: (s: Sector) => void; onCancel: () => void }) {
  const [name, setName] = useState(sector?.name || '')
  const [desc, setDesc] = useState(sector?.description || '')
  const [allowed, setAllowed] = useState<Set<string>>(new Set(sector?.allowedProfiles || []))
  const [active, setActive] = useState(sector?.isActive ?? true)

  const toggle = (id: string) => {
    const next = new Set(allowed)
    next.has(id) ? next.delete(id) : next.add(id)
    setAllowed(next)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium">Descrição</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Perfis permitidos</label>
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {profiles.filter(p => p.isActive).map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1">
              <input type="checkbox" checked={allowed.has(p.id)} onChange={() => toggle(p.id)} className="accent-primary" />
              {p.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-primary" /> Ativo
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
        <button onClick={() => {
          if (!name.trim()) { toast.error('Nome é obrigatório'); return }
          onSave({ id: sector?.id || `sec_${Date.now()}`, name, description: desc, companyId: 'comp_001', isActive: active, allowedProfiles: Array.from(allowed) })
        }} className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white">Salvar</button>
      </div>
    </div>
  )
}
