import { useState } from 'react'
import { DollarSign, FileText, Download, AlertTriangle, CheckCircle, Send, Edit2, Trash2 } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { SearchInput } from '@/components/ui/SearchInput'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TissGuideModal, type TissGuideFormData } from '@/components/company/TissGuideModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useNotifications } from '@/components/company/NotificationPanel'
import { toast } from 'sonner'

type GuideStatus = 'approved' | 'pending' | 'rejected' | 'sent'

interface TissGuide {
  id: string; number: string; patient: string; procedure: string; operator: string
  value: number; sentDate: string; status: GuideStatus; glosaReason?: string; doctor: string
}

const initialGuides: TissGuide[] = [
  { id: '1', number: 'TISS-2026-001542', patient: 'Maria Silva', procedure: 'Consulta Médica - Clínico Geral', operator: 'Unimed', value: 250, sentDate: '22/03/2026', status: 'approved', doctor: 'Dr. Carlos Mendes' },
  { id: '2', number: 'TISS-2026-001543', patient: 'João Santos', procedure: 'Ultrassonografia Abdominal', operator: 'Bradesco Saúde', value: 480, sentDate: '22/03/2026', status: 'approved', doctor: 'Dra. Ana Paula' },
  { id: '3', number: 'TISS-2026-001544', patient: 'Ana Oliveira', procedure: 'Ressonância Magnética Lombar', operator: 'SulAmérica', value: 1200, sentDate: '21/03/2026', status: 'pending', doctor: 'Dr. Roberto Lima' },
  { id: '4', number: 'TISS-2026-001545', patient: 'Pedro Costa', procedure: 'Eletrocardiograma', operator: 'Amil', value: 180, sentDate: '20/03/2026', status: 'rejected', glosaReason: 'Código do procedimento divergente', doctor: 'Dr. Carlos Mendes' },
  { id: '5', number: 'TISS-2026-001546', patient: 'Lucia Ferreira', procedure: 'Hemograma Completo', operator: 'Unimed', value: 85, sentDate: '20/03/2026', status: 'sent', doctor: 'Dra. Ana Paula' },
  { id: '6', number: 'TISS-2026-001547', patient: 'Carlos Almeida', procedure: 'Raio-X Tórax', operator: 'Bradesco Saúde', value: 150, sentDate: '19/03/2026', status: 'approved', doctor: 'Dr. Roberto Lima' },
  { id: '7', number: 'TISS-2026-001548', patient: 'Fernanda Lima', procedure: 'Consulta Médica - Cardiologia', operator: 'SulAmérica', value: 350, sentDate: '19/03/2026', status: 'rejected', glosaReason: 'Prazo de envio excedido', doctor: 'Dra. Maria Souza' },
]

const statusConfig: Record<GuideStatus, { label: string; class: string }> = {
  approved: { label: 'Aprovada', class: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
  pending: { label: 'Pendente', class: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  rejected: { label: 'Glosada', class: 'bg-destructive/10 text-destructive' },
  sent: { label: 'Enviada', class: 'bg-primary/10 text-primary' },
}

export default function BillingTissPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [guides, setGuides] = useState<TissGuide[]>(initialGuides)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGuide, setEditingGuide] = useState<TissGuideFormData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TissGuide | null>(null)
  const { addNotification } = useNotifications()

  const filtered = guides.filter((g) => {
    if (statusFilter !== 'all' && g.status !== statusFilter) return false
    if (search && !g.patient.toLowerCase().includes(search.toLowerCase()) && !g.number.includes(search)) return false
    return true
  })

  const pieData = [
    { name: 'Aprovadas', value: guides.filter(g => g.status === 'approved').length, color: 'hsl(var(--success))' },
    { name: 'Pendentes', value: guides.filter(g => g.status === 'pending').length + guides.filter(g => g.status === 'sent').length, color: 'hsl(var(--warning))' },
    { name: 'Glosadas', value: guides.filter(g => g.status === 'rejected').length, color: 'hsl(var(--destructive))' },
  ]

  const totalValue = guides.filter(g => g.status === 'approved').reduce((sum, g) => sum + g.value, 0)

  const metrics = [
    { label: 'Faturamento TISS Mensal', value: `R$ ${totalValue.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
    { label: 'Guias Enviadas', value: String(guides.length), icon: Send, color: 'bg-primary/10 text-primary' },
    { label: 'Guias Aprovadas', value: String(guides.filter(g => g.status === 'approved').length), icon: CheckCircle, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
    { label: 'Guias com Glosa', value: String(guides.filter(g => g.status === 'rejected').length), icon: AlertTriangle, color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  ]

  const handleSave = (data: TissGuideFormData) => {
    if (data.id) {
      setGuides(prev => prev.map(g => g.id === data.id ? { ...g, patient: data.patient, procedure: data.procedure, operator: data.operator, value: data.value, doctor: data.doctor } : g))
      toast.success('Guia TISS atualizada!')
    } else {
      const newGuide: TissGuide = {
        id: `tiss_${Date.now()}`, number: `TISS-2026-${String(guides.length + 1549).padStart(6, '0')}`,
        patient: data.patient, procedure: data.procedure, operator: data.operator,
        value: data.value, sentDate: new Date().toLocaleDateString('pt-BR'),
        status: 'sent', doctor: data.doctor,
      }
      setGuides(prev => [newGuide, ...prev])
      toast.success('Guia TISS criada com sucesso!')
      addNotification({ type: 'billing', title: 'Nova guia TISS', message: `Guia ${newGuide.number} gerada para ${data.patient}` })
    }
    setModalOpen(false)
    setEditingGuide(null)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      setGuides(prev => prev.filter(g => g.id !== deleteTarget.id))
      toast.success('Guia removida com sucesso!')
      setDeleteTarget(null)
    }
  }

  const openEdit = (g: TissGuide) => {
    setEditingGuide({ id: g.id, patient: g.patient, procedure: g.procedure, procedureCode: '', operator: g.operator, value: g.value, doctor: g.doctor })
    setModalOpen(true)
  }

  const handleExportXml = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">\n${guides.map(g => `  <guia numero="${g.number}" paciente="${g.patient}" procedimento="${g.procedure}" valor="${g.value}" operadora="${g.operator}" />`).join('\n')}\n</ans:mensagemTISS>`
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `tiss_export_${new Date().toISOString().split('T')[0]}.xml`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Arquivo XML exportado com sucesso!')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento TISS</h1>
          <p className="text-sm text-muted-foreground">Gestão de guias e faturamento de convênios</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportXml} className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Exportar XML
          </button>
          <GradientButton onClick={() => { setEditingGuide(null); setModalOpen(true) }}><FileText className="h-4 w-4 mr-2" /> Nova Guia TISS</GradientButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
              <m.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="w-full sm:w-64">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar guia ou paciente..." />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="all">Todos os Status</option>
              <option value="approved">Aprovadas</option>
              <option value="pending">Pendentes</option>
              <option value="rejected">Glosadas</option>
              <option value="sent">Enviadas</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Nº Guia</th>
                  <th className="pb-3 font-medium">Paciente</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Procedimento</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Operadora</th>
                  <th className="pb-3 font-medium">Valor</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="py-3 font-mono text-xs text-foreground">{g.number}</td>
                    <td className="py-3 text-foreground">{g.patient}</td>
                    <td className="py-3 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{g.procedure}</td>
                    <td className="py-3 text-muted-foreground hidden lg:table-cell">{g.operator}</td>
                    <td className="py-3 font-medium text-foreground">R$ {g.value.toLocaleString('pt-BR')}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusConfig[g.status].class}`}>
                        {statusConfig[g.status].label}
                      </span>
                      {g.glosaReason && <p className="text-[10px] text-destructive mt-0.5">{g.glosaReason}</p>}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(g)} className="rounded p-1.5 hover:bg-muted transition-colors"><Edit2 className="h-3.5 w-3.5 text-primary" /></button>
                        <button onClick={() => setDeleteTarget(g)} className="rounded p-1.5 hover:bg-muted transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Guias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TissGuideModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingGuide(null) }} onSave={handleSave} initial={editingGuide} />
      <ConfirmModal open={!!deleteTarget} title="Remover Guia TISS" description={`Deseja remover a guia ${deleteTarget?.number}?`} confirmLabel="Remover" variant="danger" onConfirm={handleDelete} <ConfirmModal open={!!deleteTarget} title="Remover Guia TISS" description={`Deseja remover a guia ${deleteTarget?.number}?`} confirmLabel="Remover" variant="danger" onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} /> />
    </div>
  )
}
