import { useState } from 'react'
import { useQueue } from '@/context/QueueContext'
import { MOCK_DOCUMENTS, CONVENIO_DOC_RULES } from '@/mocks/reception.mock'
import { DOCUMENT_TYPE_LABELS, type DocumentType, type ReceptionDocument } from '@/types/reception.types'
import { CheckCircle, XCircle, AlertTriangle, Upload, Eye, Trash2, FileText, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface DocumentsPanelProps {
  selectedQueueId: string | null
}

export function DocumentsPanel({ selectedQueueId }: DocumentsPanelProps) {
  const { state, updateStatus } = useQueue()
  const entry = state.entries.find(e => e.id === selectedQueueId)
  const [documents, setDocuments] = useState<ReceptionDocument[]>(MOCK_DOCUMENTS)

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm text-center">Selecione um paciente na fila para gerenciar documentos</p>
      </div>
    )
  }

  const patientDocs = documents.filter(d => d.patientId === entry.patientId && d.appointmentId === entry.appointmentId)
  const rules = CONVENIO_DOC_RULES.find(r => r.convenioId === entry.convenioId && r.appointmentType === entry.appointmentType)

  const requiredTypes = rules
    ? Object.entries(rules.requirements).filter(([, level]) => level === 'required').map(([type]) => type as DocumentType)
    : []
  const optionalTypes = rules
    ? Object.entries(rules.requirements).filter(([, level]) => level === 'optional').map(([type]) => type as DocumentType)
    : []

  const hasDoc = (type: DocumentType) => patientDocs.some(d => d.type === type && d.status !== 'rejected')
  const completedCount = requiredTypes.filter(t => hasDoc(t)).length
  const progress = requiredTypes.length > 0 ? Math.round((completedCount / requiredTypes.length) * 100) : 100
  const allRequired = requiredTypes.every(t => hasDoc(t))

  const handleUpload = (type: DocumentType) => {
    const newDoc: ReceptionDocument = {
      id: `doc_r${Date.now()}`,
      appointmentId: entry.appointmentId,
      patientId: entry.patientId,
      type,
      name: `${DOCUMENT_TYPE_LABELS[type]}.pdf`,
      fileUrl: '/mock/uploaded.pdf',
      fileSize: Math.floor(Math.random() * 500000) + 50000,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'cu_03',
      isRequired: requiredTypes.includes(type),
      status: 'validated',
    }
    setDocuments(prev => [...prev, newDoc])
    toast.success(`${DOCUMENT_TYPE_LABELS[type]} anexado com sucesso`)
  }

  const handleValidateAll = () => {
    if (allRequired) {
      updateStatus(entry.id, 'documents_ok')
      toast.success('Documentos validados! Paciente liberado para atendimento.')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-bold text-foreground mb-1">Documentos e Guias</h2>
        <p className="text-xs text-muted-foreground">{entry.patientName} · {entry.convenioName}</p>
      </div>

      {/* Checklist */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Documentos Obrigatórios
        </h3>
        <div className="space-y-1.5">
          {requiredTypes.map(type => {
            const doc = patientDocs.find(d => d.type === type)
            const isOk = doc && doc.status !== 'rejected'
            const isRejected = doc?.status === 'rejected'
            return (
              <div key={type} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isOk ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                    : isRejected ? <XCircle className="h-4 w-4 text-destructive" />
                    : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <span className={cn('text-xs', isOk ? 'text-foreground' : 'text-muted-foreground')}>
                    {DOCUMENT_TYPE_LABELS[type]}
                  </span>
                </div>
                {!isOk && (
                  <button onClick={() => handleUpload(type)} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Upload className="h-3 w-3 inline mr-1" />Anexar
                  </button>
                )}
              </div>
            )
          })}
          {optionalTypes.map(type => {
            const doc = patientDocs.find(d => d.type === type)
            const isOk = doc && doc.status !== 'rejected'
            return (
              <div key={type} className="flex items-center justify-between gap-2 opacity-70">
                <div className="flex items-center gap-2">
                  {isOk ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border border-border" />}
                  <span className="text-xs text-muted-foreground">{DOCUMENT_TYPE_LABELS[type]} (opc.)</span>
                </div>
                {!isOk && (
                  <button onClick={() => handleUpload(type)} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-accent transition-colors">
                    Anexar
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Completude</span>
            <span>{completedCount} de {requiredTypes.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Uploaded docs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Documentos Anexados</h3>
        {patientDocs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              {doc.name.endsWith('.pdf') ? <FileText className="h-5 w-5 text-red-500" /> : <Image className="h-5 w-5 text-blue-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{DOCUMENT_TYPE_LABELS[doc.type]}</p>
              <p className="text-[10px] text-muted-foreground">{(doc.fileSize / 1000).toFixed(0)} KB</p>
            </div>
            <div className="flex items-center gap-1">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
                doc.status === 'validated' ? 'bg-emerald-500/10 text-emerald-600' :
                doc.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
              )}>
                {doc.status === 'validated' ? 'OK' : doc.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="p-4 border-t border-border">
        <button
          disabled={!allRequired}
          onClick={handleValidateAll}
          className={cn(
            'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
            allRequired
              ? 'gradient-bg text-white shadow-md hover:brightness-110'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {allRequired ? 'Validar Documentos e Liberar' : 'Anexe todos os obrigatórios'}
        </button>
      </div>
    </div>
  )
}
