import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { SearchInput } from '@/components/ui/SearchInput'
import { AppointmentModal, type AppointmentFormData } from '@/components/company/AppointmentModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useNotifications } from '@/components/company/NotificationPanel'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

const doctors = ['Todos', 'Dr. Carlos Mendes', 'Dra. Ana Paula', 'Dr. Roberto Lima', 'Dra. Maria Souza']
const timeSlots = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00']

const weekDays = [
  { label: 'Seg', date: '24', full: '2026-03-24' },
  { label: 'Ter', date: '25', full: '2026-03-25' },
  { label: 'Qua', date: '26', full: '2026-03-26' },
  { label: 'Qui', date: '27', full: '2026-03-27' },
  { label: 'Sex', date: '28', full: '2026-03-28' },
  { label: 'Sáb', date: '29', full: '2026-03-29' },
]

interface Appointment {
  id: string; time: string; dayIndex: number; patient: string; doctor: string
  type: string; duration: number; status: 'confirmed' | 'waiting' | 'cancelled'; date: string; notes?: string
}

const statusColors: Record<string, string> = {
  confirmed: 'border-l-[hsl(var(--success))] bg-[hsl(var(--success))]/5',
  waiting: 'border-l-[hsl(var(--warning))] bg-[hsl(var(--warning))]/5',
  cancelled: 'border-l-destructive bg-destructive/5 opacity-50',
}

export default function SchedulePage() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''
  const [search, setSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('Todos')
  const [view, setView] = useState<'week' | 'day'>('week')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<AppointmentFormData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const { addNotification } = useNotifications()

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: true })
    if (error) { toast.error('Erro ao carregar agendamentos'); return }
    const mapped: Appointment[] = (data || []).map(a => ({
      id: a.id, time: a.time.slice(0, 5), patient: a.patient_name, doctor: a.doctor,
      type: a.type, duration: a.duration, status: a.status,
      date: a.date, notes: a.notes || undefined,
      dayIndex: weekDays.findIndex(d => d.full === a.date),
    }))
    setAppointments(mapped)
    setLoading(false)
  }

  useEffect(() => { fetchAppointments() }, [])

  const filtered = appointments.filter((a) => {
    if (selectedDoctor !== 'Todos' && a.doctor !== selectedDoctor) return false
    if (search && !a.patient.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleSave = async (data: AppointmentFormData) => {
    if (data.id) {
      const { error } = await supabase.from('appointments').update({
        patient_name: data.patient, doctor: data.doctor, date: data.date,
        time: data.time, type: data.type, duration: data.duration,
        status: data.status, notes: data.notes || null,
      }).eq('id', data.id)
      if (error) { toast.error('Erro ao atualizar'); return }
      toast.success('Agendamento atualizado com sucesso!')
    } else {
      const { error } = await supabase.from('appointments').insert({
        company_id: companyId, patient_name: data.patient, doctor: data.doctor,
        date: data.date, time: data.time, type: data.type, duration: data.duration,
        status: data.status, notes: data.notes || null,
      })
      if (error) { toast.error('Erro ao criar agendamento'); return }
      toast.success('Agendamento criado com sucesso!')
      addNotification({ type: 'appointment', title: 'Novo agendamento', message: `${data.patient} agendado para ${data.date} às ${data.time}` })
    }
    setModalOpen(false)
    setEditingAppointment(null)
    fetchAppointments()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('appointments').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Erro ao remover'); return }
    toast.success('Agendamento removido com sucesso!')
    setDeleteTarget(null)
    fetchAppointments()
  }

  const openEdit = (apt: Appointment) => {
    setEditingAppointment({ id: apt.id, patient: apt.patient, doctor: apt.doctor, date: apt.date, time: apt.time, type: apt.type, duration: apt.duration, status: apt.status, notes: apt.notes })
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie a agenda da clínica</p>
        </div>
        <GradientButton onClick={() => { setEditingAppointment(null); setModalOpen(true) }}><Plus className="h-4 w-4 mr-2" /> Novo Agendamento</GradientButton>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente..." />
        </div>
        <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          {doctors.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex rounded-lg border border-input overflow-hidden">
          <button onClick={() => setView('week')} className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'week' ? 'gradient-bg text-white' : 'bg-background text-foreground hover:bg-muted'}`}>Semana</button>
          <button onClick={() => setView('day')} className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'day' ? 'gradient-bg text-white' : 'bg-background text-foreground hover:bg-muted'}`}>Dia</button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button className="p-1 hover:bg-muted rounded-lg transition-colors"><ChevronLeft className="h-5 w-5 text-muted-foreground" /></button>
          <h3 className="text-sm font-semibold text-foreground">24 - 29 Março 2026</h3>
          <button className="p-1 hover:bg-muted rounded-lg transition-colors"><ChevronRight className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Carregando agendamentos...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border">
                <div className="p-3 text-xs text-muted-foreground font-medium">Horário</div>
                {weekDays.map((d, i) => (
                  <div key={i} className={`p-3 text-center border-l border-border ${i === 1 ? 'bg-primary/5' : ''}`}>
                    <p className="text-xs text-muted-foreground">{d.label}</p>
                    <p className={`text-lg font-bold ${i === 1 ? 'text-primary' : 'text-foreground'}`}>{d.date}</p>
                  </div>
                ))}
              </div>

              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border/50 min-h-[48px]">
                  <div className="p-2 text-xs text-muted-foreground flex items-start justify-end pr-3 pt-1">{time}</div>
                  {weekDays.map((_, dayIdx) => {
                    const apt = filtered.find((a) => a.time === time && a.dayIndex === dayIdx)
                    return (
                      <div key={dayIdx} className="border-l border-border/50 p-0.5 relative group">
                        {apt && (
                          <div className={`rounded-lg border-l-[3px] p-2 text-xs cursor-pointer hover:shadow-md transition-shadow ${statusColors[apt.status]}`}>
                            <p className="font-semibold text-foreground truncate">{apt.patient}</p>
                            <p className="text-muted-foreground truncate">{apt.doctor}</p>
                            <p className="text-muted-foreground/70">{apt.type} · {apt.duration}min</p>
                            <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                              <button onClick={() => openEdit(apt)} className="rounded p-1 bg-card shadow hover:bg-muted transition-colors">
                                <Edit2 className="h-3 w-3 text-primary" />
                              </button>
                              <button onClick={() => setDeleteTarget(apt)} className="rounded p-1 bg-card shadow hover:bg-muted transition-colors">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AppointmentModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingAppointment(null) }} onSave={handleSave} initial={editingAppointment} />
      <ConfirmModal
        open={!!deleteTarget}
        title="Cancelar Agendamento"
        description={`Deseja realmente cancelar o agendamento de ${deleteTarget?.patient}?`}
        confirmLabel="Cancelar Agendamento"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
