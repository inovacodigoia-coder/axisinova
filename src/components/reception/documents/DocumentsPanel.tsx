import { useState, useMemo, useCallback, memo } from 'react'
import { useQueue } from '@/context/QueueContext'
import { useRegisters } from '@/context/RegistersContext'
import { useDocumentValidation } from '@/hooks/useDocumentValidation'
import type { CheckinDocument } from '@/types/reception.types'
import type { AttachmentRule } from '@/types/registers.types'
import { CheckCircle, XCircle, AlertTriangle, Upload, FileText, Image, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { NoConvenioRulesState } from '@/components/reception/empty-states/NoConvenioRulesState'

interface DocumentsPanelProps {
  selectedQueueId: string | null
}

export function DocumentsPanel({ selectedQueueId }: DocumentsPanelProps) {
  const { state, updateStatus } = useQueue()
  const entry = state.entries.find(e => e.id === selectedQueueId)
  const [documents, setDocuments] = useState<CheckinDocument[]>([])

  const { rules, validationStatus, convenio, hasRules } = useDocumentValidation(
    entry?.convenioId || null,
    entry?.appointmentType || null,
    documents
  )

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <FileText className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm text-center">Selecione um paciente na fila para gerenciar documentos</p>
      </div>
    )
  }

  const entryDocs = documents.filter(d => d.appointmentId === entry.appointmentId)

  const handleUpload = (rule: AttachmentRule) => {
    const newDoc: CheckinDocument = {
      id: `cdoc_${Date.now()}`,
      appointmentId: entry.appointmentId,
      companyId: entry.companyId,
      attachmentRuleId: rule.id,
      attachmentName: rule.attachmentName,
      isRequired: rule.isRequired,
      fileUrl: '/mock/uploaded.pdf',
      fileName: `${rule.attachmentName.toLowerCase().replace(/\s/g, '_')}.pdf`,
      fileSize: Math.floor(Math.random() * 500000) + 50000,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'current_user',
      status: 'uploaded',
    }
    setDocuments(prev => [...prev, newDoc])
    toast.success(`${rule.attachmentName} anexado com sucesso`)
  }

  const handleRemove = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId))
    toast.info('Documento removido')
  }

  const handleValidateAll = () => {
    if (validationStatus.isComplete) {
      updateStatus(entry.id, 'documents_ok', undefined, {
        documentsValidated: true,
        documentsStatus: validationStatus,
      })
      toast.success('Documentos validados! Paciente liberado para atendimento.')
    }
  }

  const requiredRules = rules.filter(r => r.isRequired)
  const optionalRules = rules.filter(r => !r.isRequired)
  const progress = validationStatus.required > 0
    ? Math.round((validationStatus.validated / validationStatus.required) * 100)
    : 100

  const getDocForRule = (ruleId: string) =>
    entryDocs.find(d => d.attachmentRuleId === ruleId && d.status !== 'rejected')

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-bold text-foreground mb-1">Documentos e Guias</h2>
        <p className="text-xs text-muted-foreground">{entry.patientName} · {entry.convenioName}</p>
      </div>

      {!hasRules ? (
        <div className="p-4">
          <NoConvenioRulesState convenioName={entry.convenioName} />
        </div>
      ) : (
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Documentos Obrigatórios ({validationStatus.validated} de {validationStatus.required})
          </h3>
          <div className="space-y-1.5">
            {requiredRules.map(rule => {
              const doc = getDocForRule(rule.id)
              const isOk = !!doc
              return (
                <div key={rule.id} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isOk ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      <span className={cn('text-xs', isOk ? 'text-foreground' : 'text-destructive font-medium')}>
                        {rule.attachmentName}
                      </span>
                    </div>
                    {!isOk ? (
                      <button onClick={() => handleUpload(rule)} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <Upload className="h-3 w-3 inline mr-1" />Anexar
                      </button>
                    ) : (
                      <button onClick={() => handleRemove(doc!.id)} className="text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                        Remover
                      </button>
                    )}
                  </div>
                  {rule.observations && (
                    <p className="text-[10px] text-muted-foreground ml-6 italic">"{rule.observations}"</p>
                  )}
                </div>
              )
            })}
          </div>

          {optionalRules.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Opcionais</h3>
              <div className="space-y-1.5">
                {optionalRules.map(rule => {
                  const doc = getDocForRule(rule.id)
                  const isOk = !!doc
                  return (
                    <div key={rule.id} className="flex items-center justify-between gap-2 opacity-70">
                      <div className="flex items-center gap-2">
                        {isOk ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border border-border" />}
                        <span className="text-xs text-muted-foreground">{rule.attachmentName}</span>
                      </div>
                      {!isOk && (
                        <button onClick={() => handleUpload(rule)} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-accent transition-colors">
                          Anexar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Completude</span>
              <span>{validationStatus.validated} de {validationStatus.required}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      )}

      {/* Uploaded docs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Documentos Anexados</h3>
        {entryDocs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum documento anexado</p>
        )}
        {entryDocs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              {doc.fileName?.endsWith('.pdf') ? <FileText className="h-5 w-5 text-destructive" /> : <Image className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{doc.attachmentName}</p>
              <p className="text-[10px] text-muted-foreground">{doc.fileSize ? `${(doc.fileSize / 1000).toFixed(0)} KB` : ''}</p>
            </div>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
              doc.status === 'validated' || doc.status === 'uploaded' ? 'bg-emerald-500/10 text-emerald-600' :
              doc.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
            )}>
              {doc.status === 'validated' || doc.status === 'uploaded' ? 'OK' : doc.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
            </span>
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="p-4 border-t border-border">
        <button
          disabled={hasRules && !validationStatus.isComplete}
          onClick={handleValidateAll}
          className={cn(
            'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
            (!hasRules || validationStatus.isComplete)
              ? 'gradient-bg text-white shadow-md hover:brightness-110'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {(!hasRules || validationStatus.isComplete) ? 'Validar Documentos e Liberar' : 'Anexe todos os obrigatórios'}
        </button>
      </div>
    </div>
  )
}
