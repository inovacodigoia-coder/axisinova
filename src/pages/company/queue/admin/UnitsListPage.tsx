import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Settings, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import type { Unit } from '@/types/queue-system.types'

const DEMO_COMPANY_ID = 'comp_001'

export default function UnitsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, dispatch, addUnitDB, updateUnitDB, removeUnitDB } = useQueueSystem()
  const [showModal, setShowModal] = useState(false)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const isDemoCompany = user?.companyId === DEMO_COMPANY_ID

  const openAdd = () => { setEditUnit(null); setName(''); setShowModal(true) }
  const openEdit = (u: Unit) => { setEditUnit(u); setName(u.name); setShowModal(true) }

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)

    if (isDemoCompany) {
      if (editUnit) {
        dispatch({ type: 'UPDATE_UNIT', payload: { ...editUnit, name: name.trim() } })
        toast.success('Unidade atualizada')
      } else {
        dispatch({ type: 'ADD_UNIT', payload: { id: `unit_${Date.now()}`, name: name.trim(), companyId: user?.companyId || '', isActive: true, createdAt: new Date().toISOString() } })
        toast.success('Unidade criada')
      }
    } else {
      if (!user?.companyId) {
        toast.error('Empresa não identificada. Faça login novamente.')
        setSaving(false)
        setShowModal(false)
        return
      }
      if (editUnit) {
        const ok = await updateUnitDB(editUnit.id, name.trim())
        if (ok) toast.success('Unidade atualizada')
      } else {
        const unit = await addUnitDB(name.trim(), user.companyId)
        if (unit) toast.success('Unidade criada')
      }
    }

    setSaving(false)
    setShowModal(false)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta unidade?')) return
    if (isDemoCompany) {
      dispatch({ type: 'REMOVE_UNIT', payload: id })
      toast.success('Unidade removida')
    } else {
      const ok = await removeUnitDB(id)
      if (ok) toast.success('Unidade removida')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Configurar Local / Unidade</h1>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground w-24">Configurar</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Editar</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Remover</th>
            </tr>
          </thead>
          <tbody>
            {state.units.map(u => (
              <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground">{u.name}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => navigate(`/app/filas/admin/unidades/${u.id}`)} className="text-muted-foreground hover:text-foreground" title="Configurar">
                    <Settings className="h-4 w-4 mx-auto" />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => openEdit(u)} className="text-muted-foreground hover:text-foreground" title="Editar">
                    <Pencil className="h-4 w-4 mx-auto" />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleRemove(u.id)} className="text-destructive hover:text-destructive/80" title="Remover">
                    <Trash2 className="h-4 w-4 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
            {!state.units.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhuma unidade cadastrada</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">{editUnit ? 'Editar Unidade' : 'Adicionar Unidade'}</h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nome da unidade *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
