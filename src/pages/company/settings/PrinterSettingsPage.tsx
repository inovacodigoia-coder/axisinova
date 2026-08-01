import { useState } from 'react'
import { Plus, Pencil, Trash2, Star, Printer, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePrinterConfig } from '@/hooks/usePrinterConfig'
import { AttendancePrintModal } from '@/components/reception/attendance/print/AttendancePrintModal'
import type { PrinterConfig, AttendanceControlDocument } from '@/types/payment-print.types'

function buildTestDocument(): AttendanceControlDocument {
  const now = new Date()
  return {
    orderNumber: 'TST-2025-000001',
    orderDate: now.toLocaleDateString('pt-BR'),
    orderTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    patientId: 'pat_test', patientName: 'PACIENTE DE TESTE',
    patientBirthDate: '01/01/1980', patientAge: '45 anos',
    patientCPF: '12345678900', patientPhone: '(84) 99999-0000', motherName: 'Mãe de Teste',
    serviceType: 'Consulta',
    exams: [{ name: 'Consulta Cardiológica', code: '10101012', forecastDate: '25/07/2026' }],
    doctorName: 'Dr. Teste', doctorCRM: '12345/RN', specialty: 'Cardiologia',
    unitName: 'Unidade Matriz', guicheName: 'Guichê 1', ticketCode: 'P001',
    paymentType: 'Particular',
    paymentMethod: 'PIX', paidValue: 250, receiptNumber: 'REC-TEST',
    attachments: [{ name: 'RG/CPF', type: 'document' }, { name: 'Pedido médico', type: 'document' }],
    observations: 'Este é um documento de teste.',
    registeredByName: 'Atendente Teste',
    companyName: 'CLÍNICA EXEMPLO', companyAddress: 'Rua das Flores, 123 · Natal/RN',
    companyCNPJ: '00.000.000/0001-00', companyPhone: '(84) 3333-0000',
  }
}

export default function PrinterSettingsPage() {
  const { printers, save, remove, blank } = usePrinterConfig()
  const [editing, setEditing] = useState<PrinterConfig | null>(null)
  const [testConfig, setTestConfig] = useState<PrinterConfig | null>(null)

  const handleNew = () => setEditing(blank())
  const handleEdit = (p: PrinterConfig) => setEditing({ ...p })
  const handleDelete = (id: string) => {
    if (!confirm('Remover esta impressora?')) return
    remove(id); toast.success('Impressora removida')
  }
  const handleSetDefault = (p: PrinterConfig) => {
    save({ ...p, isDefault: true }); toast.success('Impressora padrão atualizada')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração de Impressora</h1>
          <p className="text-sm text-muted-foreground">Configure as impressoras para emissão do controle de atendimento</p>
        </div>
        <button onClick={handleNew} className="inline-flex items-center gap-1.5 rounded-lg gradient-bg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
          <Plus className="h-4 w-4" /> Nova Impressora
        </button>
      </div>

      <div className="space-y-3">
        {printers.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
            Nenhuma impressora cadastrada.
          </div>
        )}
        {printers.map(p => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="rounded-lg gradient-bg p-2.5 text-white"><Printer className="h-5 w-5" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{p.printerName}</h3>
                    {p.isDefault && <span className="rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5">PADRÃO ✅</span>}
                    {!p.isActive && <span className="rounded-full bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5">INATIVA</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.connectionType === 'network' ? `Rede · ${p.ipAddress}:${p.port}` : p.connectionType === 'usb' ? 'USB' : p.connectionType === 'bluetooth' ? 'Bluetooth' : 'Virtual'}
                    {' · '}{p.paperSize.toUpperCase()} · {p.orientation === 'portrait' ? 'Retrato' : 'Paisagem'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Auto-impressão: {p.autoPrintOnFinalize ? 'Ativada' : 'Desativada'} · Cópias padrão: {p.defaultCopies}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setTestConfig(p)}><Printer className="h-3.5 w-3.5 mr-1" />Testar</Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(p)}><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Remover</Button>
                {!p.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleSetDefault(p)}><Star className="h-3.5 w-3.5 mr-1" />Definir padrão</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && <PrinterForm config={editing} onClose={() => setEditing(null)} onSave={(p) => { save(p); setEditing(null); toast.success('Impressora salva') }} />}
      {testConfig && (
        <AttendancePrintModal
          open
          onClose={() => setTestConfig(null)}
          document={buildTestDocument()}
          overrideConfig={testConfig}
          testMode
        />
      )}
    </div>
  )
}

/* ============== PrinterForm (inline) ============== */
function PrinterForm({ config, onClose, onSave }: { config: PrinterConfig; onClose: () => void; onSave: (p: PrinterConfig) => void }) {
  const [data, setData] = useState<PrinterConfig>(config)
  const set = <K extends keyof PrinterConfig>(k: K, v: PrinterConfig[K]) => setData(d => ({ ...d, [k]: v }))

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <details open className="rounded-lg border border-border">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-bold bg-muted/40 rounded-t-lg">{title}</summary>
      <div className="p-4 space-y-3">{children}</div>
    </details>
  )

  const Toggle = ({ k, label }: { k: keyof PrinterConfig; label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input type="checkbox" checked={!!data[k]} onChange={(e) => set(k, e.target.checked as never)} />
      <span>{label}</span>
    </label>
  )

  const handleSave = () => {
    if (!data.printerName.trim()) { toast.error('Informe o nome da impressora'); return }
    if (data.connectionType === 'network' && !data.ipAddress) { toast.error('Informe o IP'); return }
    onSave(data)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[680px] w-[95vw] max-h-[92vh] overflow-y-auto p-0 [&>button[type=button]]:hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sticky top-0 bg-card z-10">
          <h2 className="text-base font-bold">{config.printerName ? 'Editar Impressora' : 'Nova Impressora'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5">
          <div className="space-y-3">
            <Section title="1. Identificação">
              <Field label="Nome da impressora *">
                <input value={data.printerName} onChange={(e) => set('printerName', e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo *">
                  <select value={data.printerType} onChange={(e) => set('printerType', e.target.value as any)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="thermal">Térmica</option>
                    <option value="laser">Laser</option>
                    <option value="inkjet">Jato de tinta</option>
                    <option value="virtual_pdf">PDF virtual</option>
                  </select>
                </Field>
                <Field label="Conexão *">
                  <select value={data.connectionType} onChange={(e) => set('connectionType', e.target.value as any)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="usb">USB</option>
                    <option value="network">Rede (IP)</option>
                    <option value="bluetooth">Bluetooth</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </Field>
              </div>
              {data.connectionType === 'network' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Endereço IP">
                    <input value={data.ipAddress || ''} onChange={(e) => set('ipAddress', e.target.value)} placeholder="192.168.1.100"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
                  </Field>
                  <Field label="Porta">
                    <input type="number" value={data.port || 9100} onChange={(e) => set('port', parseInt(e.target.value) || 9100)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </Field>
                </div>
              )}
            </Section>

            <Section title="2. Layout do Papel">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tamanho">
                  <select value={data.paperSize} onChange={(e) => set('paperSize', e.target.value as any)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="a4">A4</option><option value="a5">A5</option>
                    <option value="80mm">80mm</option><option value="58mm">58mm</option>
                  </select>
                </Field>
                <Field label="Orientação">
                  <div className="flex gap-2">
                    {(['portrait', 'landscape'] as const).map(o => (
                      <button key={o} onClick={() => set('orientation', o)} type="button"
                        className={cn('flex-1 rounded-md border-2 py-2 text-xs font-semibold', data.orientation === o ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}>
                        {o === 'portrait' ? 'Retrato' : 'Paisagem'}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['marginTop', 'marginBottom', 'marginLeft', 'marginRight'] as const).map(m => (
                  <Field key={m} label={`Margem ${m.replace('margin', '').toLowerCase()} (mm)`}>
                    <input type="number" value={data[m]} onChange={(e) => set(m, parseInt(e.target.value) || 0)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
                  </Field>
                ))}
              </div>
            </Section>

            <Section title="3. Cabeçalho">
              <div className="grid grid-cols-2 gap-2">
                <Toggle k="showLogo" label="Logo da empresa" />
                <Toggle k="showCompanyName" label="Nome da empresa" />
                <Toggle k="showUnitName" label="Nome da unidade" />
                <Toggle k="showAddress" label="Endereço" />
                <Toggle k="showPhone" label="Telefone" />
                <Toggle k="showCNPJ" label="CNPJ" />
              </div>
            </Section>

            <Section title="4. Conteúdo">
              <div className="grid grid-cols-2 gap-2">
                <Toggle k="showQRCode" label="QR Code do pedido" />
                <Toggle k="showBarcode" label="Código de barras" />
                <Toggle k="showDoctorInfo" label="Dados do médico" />
                <Toggle k="showConvenioInfo" label="Dados do convênio" />
                <Toggle k="showAuthorizationInfo" label="Cód. autorização" />
                <Toggle k="showAttachmentChecklist" label="Checklist documentos" />
                <Toggle k="showObservations" label="Observações" />
              </div>
            </Section>

            <Section title="5. Rodapé e Assinaturas">
              <Field label="Texto do rodapé">
                <textarea value={data.footerText || ''} onChange={(e) => set('footerText', e.target.value)} rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </Field>
              <Toggle k="showSignatureLine" label="Linha de assinatura" />
              <Toggle k="showTimestamp" label="Data/hora de impressão" />
            </Section>

            <Section title="6. Configurações de Impressão">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cópias padrão">
                  <select value={data.defaultCopies} onChange={(e) => set('defaultCopies', parseInt(e.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>
              <Toggle k="autoPrintOnFinalize" label="Imprimir automaticamente ao finalizar" />
              <Toggle k="isDefault" label="Definir como impressora padrão" />
              <Toggle k="isActive" label="Impressora ativa" />
            </Section>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-16 self-start">
            <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Preview</div>
            <PrinterPreviewCard config={data} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-card sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <button onClick={handleSave} className="inline-flex items-center gap-1 rounded-md gradient-bg px-5 py-2 text-sm font-semibold text-white">
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>{children}</label>
}

function PrinterPreviewCard({ config }: { config: PrinterConfig }) {
  const isLandscape = config.orientation === 'landscape'
  return (
    <div className="rounded-md border-2 border-dashed border-primary/40 bg-white shadow-inner mx-auto" style={{
      width: isLandscape ? 280 : 200, height: isLandscape ? 200 : 280,
      padding: `${config.marginTop * 0.6}px ${config.marginRight * 0.6}px ${config.marginBottom * 0.6}px ${config.marginLeft * 0.6}px`,
    }}>
      <div className="border border-border h-full p-1.5 text-[7px] text-black space-y-0.5 overflow-hidden">
        {config.showCompanyName && <div className="text-center font-bold border-b border-black pb-0.5">EMPRESA</div>}
        {config.showAddress && <div className="text-center">Rua Exemplo, 123</div>}
        {config.showCNPJ && <div className="text-center">CNPJ: 00.000.000/0001-00</div>}
        <div className="text-center font-bold border-y border-black my-1">VIA DO PACIENTE</div>
        <div>Pedido: ATD-2025-000001</div>
        <div>Paciente: João da Silva</div>
        {config.showDoctorInfo && <div>Médico: Dr. Lima</div>}
        {config.showConvenioInfo && <div>Convênio: Unimed</div>}
        {config.showAttachmentChecklist && <div>✓ RG/CPF</div>}
        {config.showQRCode && <div className="text-center mt-1"><div className="inline-block w-8 h-8 bg-black/80" /></div>}
        {config.showSignatureLine && <div className="mt-2 border-t border-black pt-1">Assinatura:</div>}
        {config.footerText && <div className="text-center italic mt-1">{config.footerText.slice(0, 30)}</div>}
      </div>
    </div>
  )
}
