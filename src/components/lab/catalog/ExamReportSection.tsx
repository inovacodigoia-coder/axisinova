import React, { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, Plus, Save, Loader2, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useExamReportConfig, LabReportTemplate } from '@/hooks/useExamReportConfig'
import { LAUDO_TAGS } from '@/utils/laudoTags'
import PDFPreviewModal from '@/components/lab/PDFPreviewModal'

interface Props {
  data: any
  parameters: any[]
  onChange: (val: any) => void
}

const DEFAULT_BODY = `Metodologia: {{exame.metodo}}
Material: {{exame.material}}
{{exame.observacoes}}`

export default function ExamReportSection({ data, parameters, onChange }: Props) {
  const { user } = useAuth()
  const { templates, reload } = useExamReportConfig()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [draft, setDraft] = useState<Partial<LabReportTemplate> | null>(null)
  const lastFocused = useRef<'header_html' | 'body_html' | 'footer_html'>('body_html')

  const selected = useMemo(
    () => templates.find((t) => t.id === data.reportTemplateId) || null,
    [templates, data.reportTemplateId],
  )
  const editing = draft && draft.id === selected?.id ? draft : selected

  const previewOrder = useMemo(
    () => ({
      protocol: 'PREVIEW-0001',
      patientName: 'PACIENTE DE DEMONSTRAÇÃO',
      patientBirthDate: '1990-05-12',
      patientGender: 'F',
      registeredAt: new Date().toISOString(),
      collectionTime: new Date().toISOString(),
      doctorName: 'Dr. Exemplo',
      originName: 'MATRIZ',
      exams: [
        {
          examId: 'preview',
          code: data.internalCode || '—',
          name: data.name || 'Exame sem nome',
          material: data.defaultMaterial || 'Soro',
          methodology: data.methodology || '',
          workbench: 'Pré-visualização',
          workbenchOrder: 0,
          status: 'liberado',
          singlePage: !!data.reportSinglePage,
          reportObservations: data.reportObservations || '',
          reportTemplate: editing || null,
          results: (parameters || []).map((p: any, i: number) => ({
            parameterId: String(p.id ?? i),
            parameterCode: p.name,
            parameterName: p.name,
            section: p.section || '',
            value: p.type === 'text' || p.type === 'select' ? 'Resultado' : '0,00',
            unit: p.unit || '',
            referenceRange: p.referenceValues || p.reference || '—',
            flag: '',
            status: 'normal',
          })),
        },
      ],
    }),
    [data, parameters, editing],
  )

  const insertTag = (tag: string) => {
    const field = lastFocused.current
    const base = (editing as any)?.[field] || ''
    setDraft({ ...(editing || {}), [field]: `${base}${base ? '' : ''}${tag}` } as any)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !user?.companyId) return
    setSaving(true)
    const { data: created, error } = await supabase
      .from('lab_report_templates' as any)
      .insert({
        company_id: user.companyId,
        name: newName.trim(),
        body_html: DEFAULT_BODY,
        single_page: !!data.reportSinglePage,
      } as any)
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error(`Erro ao criar laudo: ${error.message}`); return }
    await reload()
    setCreating(false)
    setNewName('')
    onChange({ reportTemplateId: (created as any).id })
    toast.success('Laudo criado e atribuído a este exame')
  }

  const handleSaveTemplate = async () => {
    if (!editing?.id) return
    setSaving(true)
    const { error } = await supabase
      .from('lab_report_templates' as any)
      .update({
        name: editing.name,
        description: editing.description ?? null,
        header_html: editing.header_html ?? null,
        body_html: editing.body_html ?? null,
        footer_html: editing.footer_html ?? null,
        single_page: !!editing.single_page,
        is_default: !!editing.is_default,
      } as any)
      .eq('id', editing.id)
    setSaving(false)
    if (error) { toast.error(`Erro ao salvar laudo: ${error.message}`); return }
    setDraft(null)
    await reload()
    toast.success('Modelo de laudo salvo')
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    const { error } = await supabase.from('lab_report_templates' as any).delete().eq('id', editing.id)
    if (error) { toast.error(`Erro ao excluir: ${error.message}`); return }
    onChange({ reportTemplateId: '' })
    setDraft(null)
    await reload()
    toast.success('Modelo excluído')
  }

  const Field = ({ field, label, rows }: { field: 'header_html' | 'body_html' | 'footer_html'; label: string; rows: number }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">{label}</Label>
      <Textarea
        rows={rows}
        value={(editing as any)?.[field] || ''}
        onFocus={() => { lastFocused.current = field }}
        onChange={(e) => setDraft({ ...(editing || {}), [field]: e.target.value } as any)}
        className="font-mono text-xs"
        placeholder="Use as etiquetas abaixo, ex.: {{exame.nome}}"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Ações principais */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" /> Laudo do exame
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure como este exame é impresso no laudo do paciente e na liberação da análise.
            </p>
          </div>
          <Button onClick={() => setPreviewOpen(true)} className="gap-2">
            <Eye className="h-4 w-4" /> Visualizar laudo
          </Button>
        </div>

        <div className="mt-5 flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-medium">Laudo em folha exclusiva</p>
            <p className="text-xs text-muted-foreground">
              Ao ativar, este exame sai sozinho em uma página com cabeçalho, assinatura e rodapé completos.
            </p>
          </div>
          <Switch
            checked={!!data.reportSinglePage}
            onCheckedChange={(v) => onChange({ reportSinglePage: v })}
          />
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Observações do laudo</Label>
          <Textarea
            rows={3}
            value={data.reportObservations || ''}
            onChange={(e) => onChange({ reportObservations: e.target.value })}
            placeholder="Texto fixo impresso ao final deste exame no laudo"
          />
        </div>
      </div>

      {/* Modelo de laudo */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Modelo de laudo atribuído</Label>
            <Select
              value={data.reportTemplateId || 'none'}
              onValueChange={(v) => { setDraft(null); onChange({ reportTemplateId: v === 'none' ? '' : v }) }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Padrão do sistema</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Criar laudo novo
          </Button>
        </div>

        {editing ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Nome do modelo</Label>
                <Input
                  value={editing.name || ''}
                  onChange={(e) => setDraft({ ...(editing || {}), name: e.target.value } as any)}
                />
              </div>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={!!editing.single_page}
                    onCheckedChange={(v) => setDraft({ ...(editing || {}), single_page: v } as any)}
                  />
                  Folha exclusiva
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={!!editing.is_default}
                    onCheckedChange={(v) => setDraft({ ...(editing || {}), is_default: v } as any)}
                  />
                  Modelo padrão
                </label>
              </div>
            </div>

            <Field field="header_html" label="Cabeçalho do exame" rows={3} />
            <Field field="body_html" label="Corpo / texto do laudo" rows={6} />
            <Field field="footer_html" label="Rodapé do exame" rows={3} />

            <div className="rounded-lg border border-dashed border-border p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> Etiquetas disponíveis (clique para inserir)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LAUDO_TAGS.map((t) => (
                  <Badge
                    key={t.tag}
                    variant="secondary"
                    className="cursor-pointer font-mono text-[10px]"
                    title={`${t.group} — ${t.label}`}
                    onClick={() => insertTag(t.tag)}
                  >
                    {t.tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="ghost" className="gap-2 text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Excluir modelo
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar modelo
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhum modelo personalizado atribuído — o laudo usa o layout padrão do laboratório.
          </p>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Criar laudo novo</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Nome do laudo</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Laudo Hematologia" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>Criar e atribuir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        order={previewOrder as any}
        onDownload={() => window.print()}
        onPrint={() => window.print()}
      />
    </div>
  )
}
