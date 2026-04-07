import { useState } from 'react'
import { Plus, Edit, Trash2, DoorOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { Room } from '@/types/totem-tv.types'
import { useRegisters } from '@/context/RegistersContext'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'axis_rooms'
const ROOM_TYPES: { value: Room['type']; label: string }[] = [
  { value: 'consultation', label: 'Consultório' },
  { value: 'exam', label: 'Sala de Exame' },
  { value: 'procedure', label: 'Sala de Procedimento' },
  { value: 'mixed', label: 'Multiuso' },
]

function loadRooms(): Room[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return [
    { id: 'room_1', companyId: 'comp_001', name: 'Consultório 1', type: 'consultation', number: '101', floor: 'Térreo', isActive: true },
    { id: 'room_2', companyId: 'comp_001', name: 'Consultório 2', type: 'consultation', number: '102', floor: 'Térreo', isActive: true },
    { id: 'room_3', companyId: 'comp_001', name: 'Sala de Exames', type: 'exam', number: '201', floor: '1º Andar', isActive: true },
  ]
  return JSON.parse(raw)
}

export default function RoomsSettingsPage() {
  const [rooms, setRooms] = useState<Room[]>(loadRooms)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const { doctors } = useRegisters()

  const saveRooms = (r: Room[]) => { setRooms(r); localStorage.setItem(STORAGE_KEY, JSON.stringify(r)) }

  const handleSave = (room: Room) => {
    if (editing) {
      saveRooms(rooms.map(r => r.id === room.id ? room : r))
      toast.success('Sala atualizada')
    } else {
      saveRooms([...rooms, { ...room, id: `room_${Date.now()}` }])
      toast.success('Sala criada')
    }
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salas e Consultórios</h1>
          <p className="text-sm text-muted-foreground">Gerencie as salas de atendimento</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova Sala
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => (
          <div key={room.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-foreground">{room.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">Tipo: {ROOM_TYPES.find(t => t.value === room.type)?.label}</p>
            {room.doctorId && <p className="text-xs text-muted-foreground">{doctors.find(d => d.id === room.doctorId)?.fullName} (vinculado)</p>}
            {room.floor && <p className="text-xs text-muted-foreground">Andar: {room.floor}</p>}
            <div className="flex items-center gap-2 pt-2">
              <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5', room.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground')}>
                {room.isActive ? '● Ativo' : '○ Inativo'}
              </span>
              <button onClick={() => { setEditing(room); setShowForm(true) }} className="rounded-lg border border-input p-1.5 hover:bg-muted">
                <Edit className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => { saveRooms(rooms.filter(r => r.id !== room.id)); toast.success('Sala removida') }} className="rounded-lg border border-input p-1.5 hover:bg-muted">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Room Form Modal */}
      {showForm && (
        <RoomFormModal
          room={editing}
          doctors={doctors}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function RoomFormModal({ room, doctors, onClose, onSave }: { room: Room | null; doctors: any[]; onClose: () => void; onSave: (r: Room) => void }) {
  const [form, setForm] = useState<Room>(room || {
    id: '', companyId: 'comp_001', name: '', type: 'consultation', number: '', floor: '', isActive: true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">{room ? 'Editar Sala' : 'Nova Sala'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nome da sala *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Número</label>
            <input value={form.number || ''} onChange={e => setForm({ ...form, number: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo *</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Room['type'] })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Andar / Localização</label>
            <input value={form.floor || ''} onChange={e => setForm({ ...form, floor: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Médico vinculado</label>
            <select value={form.doctorId || ''} onChange={e => setForm({ ...form, doctorId: e.target.value || undefined })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Nenhum</option>
              {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.name} className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar</button>
        </div>
      </div>
    </div>
  )
}
