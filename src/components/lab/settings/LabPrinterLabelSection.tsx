import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Layout, Edit2, Plus, History, Printer, Save, Loader2, AlertTriangle, Type } from 'lucide-react'
import { toast } from 'sonner'
import { SampleLabel } from '@/components/lab/print/SampleLabel'
import { ServidorImpressaoStatus } from '@/components/print/ServidorImpressaoStatus'
import { servidorImpressaoAtivo, imprimirDireto, TIPOS_DOCUMENTO } from '@/lib/impressaoLocal'
import html2canvas from 'html2canvas'
import { gerarPdfEtiquetas } from '@/lib/labelPdf'
import { useLabelConfig } from '@/hooks/useLabelConfig'
import { useLabSettings } from '@/hooks/useLabSettings'
import {
  BARCODE_MAX_MM,
  BARCODE_MIN_MM,
  FONT_MAX_PT,
  FONT_MIN_PT,
  LABEL_FIELD_LABELS,
  LABEL_FIELD_ORDER,
  LabelConfig,
  LabelFieldKey,
  MARGIN_MAX_MM,
  MARGIN_MIN_MM,
  estimateContentHeightMm,
  labelPresets,
} from '@/types/label-config.types'

const TEST_LABEL = {
  orderNumber: '190-00',
  sampleCode: '190-00-1-2',
  patientName: 'PACIENTE TESTE HOMEM JOSE',
  birthDate: '15/07/1989',
  material: 'EDTA',
  tube: 'EDTA',
  workbench: 'HEMATOLOGIA',
  examRefs: ['H'],
}

async function printViaBrowser(node: HTMLElement, widthMm: number, heightMm: number) {
  // Rasteriza a etiqueta e imprime dentro de um iframe com a página no tamanho exato
  // da etiqueta (sem blob/nova aba, que podem ser bloqueados por extensões do navegador).
  const canvas = await html2canvas(node, {
    scale: 4,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
  })
  const dataUrl = canvas.toDataURL('image/png')

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Não foi possível abrir a impressão do navegador.')
  }

  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Etiqueta</title>
    <style>
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      img { display: block; width: ${widthMm}mm; height: ${heightMm}mm; }
    </style></head>
    <body><img src="${dataUrl}" /></body></html>`)
  doc.close()

  const run = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, 60000)
  }

  const img = doc.querySelector('img')
  if (img && !img.complete) img.onload = () => setTimeout(run, 150)
  else setTimeout(run, 300)
}

export function LabPrinterLabelSection() {
  const { config, setConfig, save, reload } = useLabelConfig()
  const { settings } = useLabSettings()
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [showTypography, setShowTypography] = useState(true)
  const previewRef = useRef<HTMLDivElement>(null)

  const update = (patch: Partial<LabelConfig>) => setConfig({ ...config, ...patch })
  const updateField = (key: LabelFieldKey, patch: Partial<{ size: number; bold: boolean }>) =>
    setConfig({ ...config, fields: { ...config.fields, [key]: { ...config.fields[key], ...patch } } })

  const rotated = Math.abs(config.rotation) === 90
  const sheetW = rotated ? config.heightMm : config.widthMm
  const sheetH = rotated ? config.widthMm : config.heightMm

  const estimated = useMemo(() => estimateContentHeightMm(config), [config])
  const overflow = estimated > config.heightMm + 0.5
  const marginInvalid =
    config.marginMm * 2 >= config.widthMm || config.marginMm * 2 >= config.heightMm

  const applyPreset = (name: string, preset: LabelConfig) => {
    setConfig({ ...preset, fields: { ...preset.fields } })
    toast.info(`Preset ${name} aplicado!`)
  }

  const handleSave = async () => {
    if (marginInvalid) {
      toast.error('A margem não pode ultrapassar metade da largura ou da altura da etiqueta.')
      return
    }
    setSaving(true)
    try {
      await save(config)
      toast.success(
        overflow
          ? 'Configuração salva. Atenção: o conteúdo pode ser cortado na impressão.'
          : 'Configuração de etiqueta salva.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    await reload()
    toast.info('Valores restaurados a partir da última configuração salva.')
  }

  const handleDuplicate = () => {
    // Duplica o slot atual: copia integralmente todos os valores (tipografia, margem, barras)
    setConfig({ ...config, fields: { ...config.fields } })
    toast.success('Slot duplicado com todos os ajustes de tipografia, margem e código de barras.')
  }

  const handleTestPrint = async () => {
    if (printing) return
    setPrinting(true)
    try {
      const node = previewRef.current
      if (!node) throw new Error('Preview indisponível.')
      const ativo = await servidorImpressaoAtivo()
      if (!ativo) {
        await printViaBrowser(node, sheetW, sheetH)
        toast.info('Servidor de impressão local não detectado — abrindo a impressão do navegador.')
        return
      }

      const pdf = await gerarPdfEtiquetas([node], sheetW, sheetH)
      const r = await imprimirDireto(TIPOS_DOCUMENTO.etiquetaCliente, pdf)
      toast.success(r.mensagem || 'Etiqueta de teste enviada para a impressora.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar a impressão teste.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-bold">Configuração de Impressora / Etiqueta</h3>
        <div className="flex items-center gap-2">
          <ServidorImpressaoStatus />
          <Button variant="outline" size="sm" className="gap-2">
            <Layout className="h-4 w-4" /> Gerenciar Slots
          </Button>
          <Button size="sm" className="gap-2 gradient-bg text-white" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Presets rápidos (CD410 e outros)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {labelPresets.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p.name, p.config)}
              className="p-3 text-left rounded-xl border border-border bg-card hover:border-primary transition-all text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t">
        <div className="space-y-6">
          <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Editor de Layout <Edit2 className="h-3 w-3" />
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Largura (mm)</Label>
              <Input type="number" min={10} max={200} value={config.widthMm}
                onChange={(e) => update({ widthMm: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Altura (mm)</Label>
              <Input type="number" min={10} max={200} value={config.heightMm}
                onChange={(e) => update({ heightMm: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Altura do Código de Barras (mm)</Label>
              <Input type="number" step={0.5} min={BARCODE_MIN_MM} max={BARCODE_MAX_MM}
                value={config.barcodeHeightMm}
                onChange={(e) => update({
                  barcodeHeightMm: Math.min(BARCODE_MAX_MM, Math.max(BARCODE_MIN_MM, Number(e.target.value) || BARCODE_MIN_MM)),
                })} />
            </div>
            <div className="space-y-2">
              <Label>Margem (mm)</Label>
              <Input type="number" step={0.5} min={MARGIN_MIN_MM} max={MARGIN_MAX_MM}
                value={config.marginMm}
                onChange={(e) => update({
                  marginMm: Math.min(MARGIN_MAX_MM, Math.max(MARGIN_MIN_MM, Number(e.target.value) || 0)),
                })} />
              <p className="text-[10px] text-muted-foreground">Aplicada nas 4 bordas.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rotação do conteúdo</Label>
            <select
              value={String(config.rotation)}
              onChange={(e) => update({ rotation: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="0">0° (Padrão)</option>
              <option value="90">90° (Sentido Horário)</option>
              <option value="-90">-90° (Sentido Anti-horário)</option>
              <option value="180">180° (Invertido)</option>
            </select>
          </div>

          {(overflow || marginInvalid) && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-700">
                {marginInvalid
                  ? 'Margem inválida: ela não pode ultrapassar metade da largura ou da altura da etiqueta.'
                  : `O conteúdo estimado (${estimated.toFixed(1)}mm) ultrapassa a altura da etiqueta (${config.heightMm}mm). Alguns textos podem ser cortados na impressão.`}
              </p>
            </div>
          )}

          <div className="pt-2 flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleDuplicate}>
              <Plus className="h-3.5 w-3.5" /> Duplicar Slot
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleReset}>
              <History className="h-3.5 w-3.5" /> Resetar
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-bold text-muted-foreground uppercase">Preview em Tempo Real</Label>
          <div className="bg-muted/50 rounded-xl p-8 flex items-center justify-center border-2 border-dashed border-border min-h-[300px] overflow-auto">
            <div
              ref={previewRef}
              className="flex items-center justify-center overflow-hidden bg-white"
              style={{ width: `${sheetW}mm`, height: `${sheetH}mm` }}
            >
              <div style={config.rotation ? { transform: `rotate(${config.rotation}deg)` } : undefined}>
                <SampleLabel
                  orderNumber={TEST_LABEL.orderNumber}
                  sampleCode={TEST_LABEL.sampleCode}
                  patientName={TEST_LABEL.patientName}
                  birthDate={TEST_LABEL.birthDate}
                  material={TEST_LABEL.material}
                  tube={TEST_LABEL.tube}
                  workbench={TEST_LABEL.workbench}
                  examRefs={TEST_LABEL.examRefs}
                  labelIndex={1}
                  printDate={new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  labName={settings?.lab_name || 'LABORATÓRIO'}
                  config={config}
                />
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleTestPrint} disabled={printing}>
            {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
            Impressão Teste
          </Button>
          <p className="text-[10px] text-center text-muted-foreground italic">
            A impressão teste usa o estado atual da tela, mesmo sem salvar.
          </p>
        </div>
      </div>

      <div className="pt-6 border-t">
        <button
          onClick={() => setShowTypography(v => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Type className="h-3.5 w-3.5" /> Tipografia dos Campos
          </h4>
          <span className="text-xs text-muted-foreground">{showTypography ? 'Ocultar' : 'Mostrar'}</span>
        </button>

        {showTypography && (
          <div className="mt-4 space-y-2">
            {LABEL_FIELD_ORDER.map(key => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-3 py-2">
                <span className="text-xs font-medium flex-1">{LABEL_FIELD_LABELS[key]}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step={0.5}
                    min={FONT_MIN_PT}
                    max={FONT_MAX_PT}
                    value={config.fields[key].size}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      updateField(key, { size: Math.min(FONT_MAX_PT, Math.max(FONT_MIN_PT, Number.isFinite(v) ? v : FONT_MIN_PT)) })
                    }}
                    className="h-8 w-20 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground w-4">pt</span>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={config.fields[key].bold}
                      onCheckedChange={(v) => updateField(key, { bold: v })}
                    />
                    <span className="text-[10px] text-muted-foreground">Negrito</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
