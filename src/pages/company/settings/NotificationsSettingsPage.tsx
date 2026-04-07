import { Save, Bell } from 'lucide-react'
import { toast } from 'sonner'

export default function NotificationsSettingsPage() {
  const events = ['Novo agendamento', 'Cancelamento', 'Paciente faltoso', 'Guia com pendência', 'Faturamento gerado']
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
        <p className="text-sm text-muted-foreground">Configure como deseja ser notificado</p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 space-y-3">
        {events.map(ev => (
          <div key={ev} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-sm text-foreground">{ev}</span>
            <select className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm">
              <option>E-mail</option>
              <option>WhatsApp</option>
              <option>Ambos</option>
              <option>Nenhum</option>
            </select>
          </div>
        ))}
        <div className="flex justify-end pt-4">
          <button onClick={() => toast.success('Notificações salvas')} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  )
}
