import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Eye, Trash2, Check, AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useRegisters } from '@/context/RegistersContext'
import { useAuth } from '@/context/AuthContext'
import { DOCUMENT_TYPES } from '@/mocks/attendance-cadastro.mock'
import { cn } from '@/lib/utils'
import type { CadastroState } from '../AttendanceCadastroModal'
import type { AttendanceAttachment } from '@/types/attendance-cadastro.types'

interface Props { state: CadastroState; update: (patch: Partial<CadastroState>) => void }

const TYPE_MAP: Record<string, 'consulta' | 'exame' | 'procedimento'> = {
  consultation: 'consulta', exam: 'exame', procedure: 'procedimento',
}

export function Step4Attachments({ state, update }: Props) {
  const { user } = useAuth()
  const { convenios } = useRegisters()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [activeRuleId, setActiveRuleId] = useState<string | undefined>()
  const [activeDocType, setActiveDocType] = useState<string>('Outros')

  const convenio = convenios.find(c => c.id === state.convenioId)
  const rules = useMemo(() => {
    if (!convenio || !state.serviceType) return []
    const apt = TYPE_MAP[state.serviceType]
    return convenio.attachmentRules.filter(r => r.appliesToTypes.includes(apt)).sort((a, b) => a.order - b.order)
  }, [convenio, state.serviceType])

  const requiredRules = rules.filter(r => r.isRequired)
  const missing = requiredRules.filter(r => !state.attachments.some(a => a.attachmentRuleId === r.id))
  const completePct = requiredRules.length ? Math.round(((requiredRules.length - missing.length) / requiredRules.length) * 100) : 100

  const triggerUpload = (ruleId?: string, docType?: string) => {
    setActiveRuleId(ruleId)
    setActiveDocType(docType || 'Outros')
    fileInputRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo excede 10MB'); return }
    setUploading(true)
    const path = `${user?.companyId || 'comp'}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { data, error } = await supabase.storage.from('attendance-attachments').upload(path, file)
    if (error || !data) { toast.error(`Falha no upload: ${error?.message}`); setUploading(false); return }
    const { data: pub } = supabase.storage.from('attendance-attachments').createSignedUrl
      ? await supabase.storage.from('attendance-attachments').createSignedUrl(data.path, 60 * 60 * 24 * 7)
      : { data: { signedUrl: '' } } as any

    const att: AttendanceAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orderId: '',
      documentType: activeDocType,
      fileName: file.name,
      fileSize: file.size,
      fileUrl: pub?.signedUrl || '',
      storagePath: data.path,
      isRequired: !!activeRuleId,
      attachmentRuleId: activeRuleId,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.id || 'user',
    }
    update({ attachments: [...state.attachments, att] })
    toast.success('Anexo adicionado')
    setUploading(false)
  }

  const removeAttachment = async (id: string) => {
    const att = state.attachments.find(a => a.id === id)
    if (att?.storagePath) {
      await supabase.storage.from('attendance-attachments').remove([att.storagePath])
    }
    update({ attachments: state.attachments.filter(a => a.id !== id) })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-0 h-full">
      {/* Painel de regras */}
      <aside className="border-r border-border bg-muted/30 p-4 space-y-3 overflow-y-auto">
        <h3 className="text-sm font-bold text-foreground">Documentos Necessários</h3>
        {!convenio || rules.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            {state.paymentType !== 'convenio'
              ? 'Atendimento sem convênio — sem regras de documentos.'
              : 'Regras de documentos não configuradas para este convênio.'}
          </div>
        ) : (
          <>
            <div className="text-[10px] text-muted-foreground font-semibold uppercase">
              {state.serviceType === 'consultation' ? 'Consulta' : state.serviceType === 'exam' ? 'Exame' : 'Procedimento'} · {convenio.name}
            </div>
            <ul className="space-y-1">
              {rules.map(rule => {
                const has = state.attachments.some(a => a.attachmentRuleId === rule.id)
                return (
                  <li key={rule.id}>
                    <button onClick={() => triggerUpload(rule.id, rule.attachmentName)}
                      className={cn(
                        'w-full text-left rounded-md border p-2 flex items-center gap-2 text-xs transition-all',
                        has ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                        rule.isRequired ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' :
                        'border-border bg-card text-muted-foreground hover:bg-muted'
                      )}>
                      {has ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : rule.isRequired ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : <FileText className="h-3.5 w-3.5" />}
                      <span className="flex-1 truncate">{rule.attachmentName}</span>
                      <span className="text-[10px] font-semibold">{rule.isRequired ? 'Obrig.' : 'Opc.'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="pt-2 border-t border-border">
              <div className="text-[10px] text-muted-foreground mb-1">Completude: {requiredRules.length - missing.length} de {requiredRules.length} obrigatórios</div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className={cn('h-full transition-all', completePct === 100 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${completePct}%` }} />
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Uploader + lista */}
      <main className="p-5 space-y-4 overflow-y-auto">
        <input ref={fileInputRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.tiff" onChange={handleFile} />

        <button onClick={() => triggerUpload(undefined, 'Outros')} disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-border bg-card p-8 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2 disabled:opacity-50">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {uploading ? 'Enviando...' : '📎 Arraste documentos aqui ou clique para selecionar'}
          </span>
          <span className="text-xs text-muted-foreground">PDF · JPG · PNG · TIFF · Máx. 10MB</span>
        </button>

        {state.attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Documentos anexados ({state.attachments.length})</h4>
            {state.attachments.map(a => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.fileName}</div>
                  <div className="text-xs text-muted-foreground">{a.documentType} · {(a.fileSize / 1024).toFixed(0)} KB · {new Date(a.uploadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {a.fileUrl && <a href={a.fileUrl} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground p-1"><Eye className="h-4 w-4" /></a>}
                <button onClick={() => removeAttachment(a.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}

        {missing.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs">
            <div className="font-semibold text-amber-900 mb-1">⚠️ {missing.length} documento(s) obrigatório(s) faltando</div>
            <textarea value={state.attachmentOverrideReason || ''} onChange={e => update({ attachmentOverrideReason: e.target.value })}
              placeholder="Justifique para prosseguir mesmo assim (registrado no log)..."
              rows={2} className="w-full mt-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs" />
          </div>
        )}
      </main>
    </div>
  )
}
