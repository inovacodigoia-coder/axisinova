import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, FolderPlus, CornerDownLeft, X, CheckCircle, Clock, FileText } from 'lucide-react'
import { MOCK_GUIDES, MOCK_AUDIT_LOG } from '@/mocks/billing.mock'
import type { GuideStatus } from '@/types/billing.types'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<GuideStatus, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-muted text-muted-foreground' },
  pending_docs: { label: 'Ag. Documentos', cls: 'bg-yellow-100 text-yellow-800' },
  pending_authorization: { label: 'Ag. Autorização', cls: 'bg-orange-100 text-orange-800' },
  authorized: { label: 'Autorizada', cls: 'bg-blue-100 text-blue-800' },
  submitted: { label: 'Enviada', cls: 'bg-purple-100 text-purple-800' },
  processing: { label: 'Processando', cls: 'bg-sky-100 text-sky-800' },
  paid: { label: 'Paga', cls: 'bg-green-100 text-green-800' },
  partial_glosa: { label: 'Glosa Parcial', cls: 'bg-orange-200 text-orange-900' },
  total_glosa: { label: 'Glosa Total', cls: 'bg-red-100 text-red-800' },
  returned_reception: { label: 'Devolvida', cls: 'bg-red-50 text-red-600' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-200 text-gray-600' },
}

const STATUS_STEPS: GuideStatus[] = ['draft', 'pending_docs', 'authorized', 'submitted', 'processing', 'paid']

export default function GuideDetailPage() {
  const { guideId } = useParams()
  const navigate = useNavigate()
  const guide = useMemo(() => MOCK_GUIDES.find(g => g.id === guideId), [guideId])
  const auditEntries = useMemo(() => MOCK_AUDIT_LOG.filter(a => a.targetId === guideId), [guideId])

  if (!guide) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Guia não encontrada</p>
    </div>
  )

  const sc = STATUS_CONFIG[guide.status]
  const currentStepIdx = STATUS_STEPS.indexOf(guide.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{guide.tissGuideNumber}</h1>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${sc.cls}`}>{sc.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">Criada em {new Date(guide.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"><Edit2 className="h-4 w-4" /> Editar</button>
          <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"><FolderPlus className="h-4 w-4" /> Adicionar ao Lote</button>
          <button onClick={() => toast.info('Devolução para recepção')} className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-700 hover:bg-orange-100 transition-colors"><CornerDownLeft className="h-4 w-4" /> Devolver</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Patient & Convenio */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Dados do Paciente e Convênio</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Paciente:</span> <span className="text-foreground font-medium">{guide.patientName}</span></div>
              <div><span className="text-muted-foreground">Nascimento:</span> <span className="text-foreground">{new Date(guide.patientBirthDate).toLocaleDateString('pt-BR')}</span></div>
              <div><span className="text-muted-foreground">Convênio:</span> <span className="text-foreground font-medium">{guide.convenioName}</span></div>
              <div><span className="text-muted-foreground">Carteirinha:</span> <span className="text-foreground">{guide.convenioCardNumber || '—'}</span></div>
              <div><span className="text-muted-foreground">Médico:</span> <span className="text-foreground">{guide.doctorName}</span></div>
              <div><span className="text-muted-foreground">CRM:</span> <span className="text-foreground">{guide.doctorCRM}</span></div>
              <div><span className="text-muted-foreground">Tipo Atend.:</span> <span className="text-foreground">{guide.attendanceType === '01' ? 'Consulta' : guide.attendanceType === '03' ? 'SADT' : guide.attendanceType}</span></div>
              {guide.authorizationNumber && <div><span className="text-muted-foreground">Autorização:</span> <span className="text-foreground">{guide.authorizationNumber}</span></div>}
            </div>
          </div>

          {/* Procedures */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Procedimentos</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Código TUSS</th>
                  <th className="pb-2 text-left font-medium">Descrição</th>
                  <th className="pb-2 text-right font-medium">Qtd</th>
                  <th className="pb-2 text-right font-medium">Valor Unit.</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Glosa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {guide.procedures.map(p => (
                  <tr key={p.id}>
                    <td className="py-2 font-mono text-xs text-foreground">{p.tussCode}</td>
                    <td className="py-2 text-foreground">{p.description}</td>
                    <td className="py-2 text-right text-foreground">{p.quantity}</td>
                    <td className="py-2 text-right text-foreground">R$ {p.unitValue.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right font-medium text-foreground">R$ {p.totalValue.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right">
                      {p.glosaValue ? (
                        <span className="text-destructive font-medium">R$ {p.glosaValue.toLocaleString('pt-BR')}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={4} className="py-3 text-right text-sm font-medium text-muted-foreground">Totais:</td>
                  <td className="py-3 text-right text-sm font-bold text-foreground">R$ {guide.totalValueSubmitted.toLocaleString('pt-BR')}</td>
                  <td className="py-3 text-right text-sm font-bold text-destructive">{guide.totalValueGlosa ? `R$ ${guide.totalValueGlosa.toLocaleString('pt-BR')}` : '—'}</td>
                </tr>
                {guide.totalValueApproved !== undefined && (
                  <tr>
                    <td colSpan={4} className="text-right text-sm text-muted-foreground">Valor aprovado:</td>
                    <td colSpan={2} className="text-right text-sm font-bold text-green-600">R$ {guide.totalValueApproved.toLocaleString('pt-BR')}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {guide.billerNotes && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-2">Observações Internas</h3>
              <p className="text-xs text-muted-foreground mb-2">Observação interna — não enviada ao convênio</p>
              <p className="text-sm text-foreground bg-muted rounded-lg p-3">{guide.billerNotes}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Timeline de Status</h3>
            <div className="space-y-3">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentStepIdx && currentStepIdx >= 0
                const current = step === guide.status
                const cfg = STATUS_CONFIG[step]
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-sm ${current ? 'font-bold text-foreground' : done ? 'text-foreground' : 'text-muted-foreground'}`}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Documentos Anexados</h3>
            {guide.documents.length > 0 ? (
              <div className="space-y-2">
                {guide.documents.map((docId, i) => (
                  <div key={docId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground flex-1">Documento {i + 1}</span>
                    <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-800">Validado</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
            )}
          </div>

          {/* Audit */}
          {auditEntries.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-4">Histórico de Auditoria</h3>
              <div className="space-y-3">
                {auditEntries.map(a => (
                  <div key={a.id} className="text-sm">
                    <p className="text-foreground font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.userName} · {new Date(a.timestamp).toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">{a.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
