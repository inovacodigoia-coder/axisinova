import { useState, useEffect, useRef } from 'react'
import { useLabelConfig, DEFAULT_LABEL_CONFIG, type LabelConfig } from '@/hooks/useLabelConfig'
import { useLabSettings } from '@/hooks/useLabSettings'
import { SampleLabel } from '@/components/lab/print/SampleLabel'
import { gerarPdfEtiquetas } from '@/lib/labelPdf'
import html2canvas from 'html2canvas'
import { servidorImpressaoAtivo, imprimirDireto, TIPOS_DOCUMENTO } from '@/lib/impressaoLocal'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { 
  Building2, 
  Printer, 
  Signature, 
  Monitor, 
  Ruler, 
  Beaker, 
  Layout, 
  AlertCircle, 
  ShieldCheck, 
  History,
  Upload,
  Save,
  Plus,
  Trash2,
  Edit2,
  Info,
  Loader2,
  FileText,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'
import LabMethodsSection from '@/components/lab/settings/LabMethodsSection'

export default function LabSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'lab-data'
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const { user } = useAuth()

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab })
  }

  useEffect(() => {
    if (user?.companyId) {
      fetchSettings()
    }
  }, [user?.companyId])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('lab_settings')
        .select('*')
        .eq('company_id', user?.companyId)
        .maybeSingle()

      if (error) throw error
      if (data) setSettings(data)
    } catch (error) {
      console.error('Error fetching lab settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.companyId) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('lab_settings')
        .upsert({
          company_id: user.companyId,
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id' })

      if (error) throw error
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Error saving lab settings:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do Laboratório</h1>
        <p className="text-sm text-muted-foreground">Gerencie os parâmetros técnicos e administrativos do módulo laboratorial.</p>
      </div>

      <div className="flex gap-6">
        <Card className="w-64 shrink-0 p-2 h-fit space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Configurações Base</p>
          <NavItem active={activeTab === 'lab-data'} onClick={() => setActiveTab('lab-data')} icon={<Building2 className="h-4 w-4" />} label="Dados do Laboratório" />
          <NavItem active={activeTab === 'tiss'} onClick={() => setActiveTab('tiss')} icon={<ShieldCheck className="h-4 w-4" />} label="Configurações TISS" />
          <NavItem active={activeTab === 'signature'} onClick={() => setActiveTab('signature')} icon={<Signature className="h-4 w-4" />} label="Assinatura Digital" />
          <NavItem active={activeTab === 'printer'} onClick={() => setActiveTab('printer')} icon={<Printer className="h-4 w-4" />} label="Impressora / Etiqueta" />
          <NavItem active={activeTab === 'report-layout'} onClick={() => setActiveTab('report-layout')} icon={<FileText className="h-4 w-4" />} label="Layout do Laudo" />
          
          <p className="px-3 py-2 mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Técnico</p>
          <NavItem active={activeTab === 'equipment'} onClick={() => setActiveTab('equipment')} icon={<Monitor className="h-4 w-4" />} label="Máquinas / Equip." />
          <NavItem active={activeTab === 'units'} onClick={() => setActiveTab('units')} icon={<Ruler className="h-4 w-4" />} label="Unidades de Medida" />
          <NavItem active={activeTab === 'methods'} onClick={() => setActiveTab('methods')} icon={<Beaker className="h-4 w-4" />} label="Metodologias" />
          <NavItem active={activeTab === 'workbenches'} onClick={() => setActiveTab('workbenches')} icon={<Layout className="h-4 w-4" />} label="Bancadas" />
          <NavItem active={activeTab === 'collection-reasons'} onClick={() => setActiveTab('collection-reasons')} icon={<AlertCircle className="h-4 w-4" />} label="Motivos de Coleta" />
          
          <p className="px-3 py-2 mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sistema</p>
          <NavItem active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<ShieldCheck className="h-4 w-4" />} label="Segurança" />
          <NavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<History className="h-4 w-4" />} label="Logs de Auditoria" />
        </Card>

        <div className="flex-1 min-w-0">
          <Card className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando configurações...</p>
              </div>
            ) : (
            <>
              <div className={activeTab === 'lab-data' ? 'block' : 'hidden'}>
                <LabDataSection settings={settings} setSettings={setSettings} />
              </div>
              <div className={activeTab === 'tiss' ? 'block' : 'hidden'}>
                <TISSSection />
              </div>
              <div className={activeTab === 'signature' ? 'block' : 'hidden'}>
                <SignatureSection settings={settings} setSettings={setSettings} />
              </div>
              <div className={activeTab === 'security' ? 'block' : 'hidden'}>
                <SecuritySection />
              </div>
              <div className={activeTab === 'printer' ? 'block' : 'hidden'}>
                <PrinterLabelSection />
              </div>
              <div className={activeTab === 'units' ? 'block' : 'hidden'}>
                <UnitsSection />
              </div>
              <div className={activeTab === 'methods' ? 'block' : 'hidden'}>
                <MethodsSection />
              </div>
              <div className={activeTab === 'workbenches' ? 'block' : 'hidden'}>
                <WorkbenchesSection />
              </div>
              <div className={activeTab === 'equipment' ? 'block' : 'hidden'}>
                <EquipmentRedirect />
              </div>
              <div className={activeTab === 'collection-reasons' ? 'block' : 'hidden'}>
                <CollectionReasonsSection />
              </div>
              <div className={activeTab === 'report-layout' ? 'block' : 'hidden'}>
                <ReportLayoutSection settings={settings} setSettings={setSettings} />
              </div>
              <div className={activeTab === 'logs' ? 'block' : 'hidden'}>
                <LogsSection />
              </div>
              
              <div className="mt-8 pt-6 border-t flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="gradient-bg text-white gap-2 px-8">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                  Salvar Alterações
                </Button>
              </div>
            </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function LabDataSection({ settings, setSettings }: { settings: any; setSettings: (v: any) => void }) {
  const set = (field: string, value: string) => setSettings({ ...(settings || {}), [field]: value })
  const val = (field: string) => settings?.[field] ?? ''

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold mb-4">Dados do Laboratório</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Laboratório *</Label>
            <Input value={val('lab_name')} onChange={(e) => set('lab_name', e.target.value)} placeholder="Ex: Laboratório Vital" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={val('cnpj')} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={val('phone')} onChange={(e) => set('phone', e.target.value)} placeholder="(00) 0000-0000" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={val('email')} onChange={(e) => set('email', e.target.value)} placeholder="contato@lab.com.br" />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>CEP</Label>
            <Input value={val('address_zip')} onChange={(e) => set('address_zip', e.target.value)} placeholder="00000-000" />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Logradouro</Label>
            <Input value={val('address_street')} onChange={(e) => set('address_street', e.target.value)} placeholder="Rua / Avenida" />
          </div>
          <div className="space-y-2">
            <Label>Número</Label>
            <Input value={val('address_number')} onChange={(e) => set('address_number', e.target.value)} placeholder="123" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Complemento</Label>
            <Input value={val('address_complement')} onChange={(e) => set('address_complement', e.target.value)} placeholder="Sala, bloco..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Bairro</Label>
            <Input value={val('address_district')} onChange={(e) => set('address_district', e.target.value)} placeholder="Centro" />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={val('address_city')} onChange={(e) => set('address_city', e.target.value)} placeholder="Cidade" />
          </div>
          <div className="space-y-2">
            <Label>UF</Label>
            <Input maxLength={2} value={val('address_state')} onChange={(e) => set('address_state', e.target.value.toUpperCase())} placeholder="RN" />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold mb-4">Responsável Técnico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={val('responsible_name')} onChange={(e) => set('responsible_name', e.target.value)} placeholder="Nome do Responsável" />
          </div>
          <div className="space-y-2">
            <Label>Registro Profissional</Label>
            <Input value={val('responsible_register')} onChange={(e) => set('responsible_register', e.target.value)} placeholder="Ex: CRBM-RN-08453" />
          </div>
        </div>
      </div>
    </div>
  )
}

async function uploadLabAsset(file: File, folder: string) {
  // Files must live under the owning company's folder (enforced by storage policies).
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Sessão expirada. Faça login novamente.')
  const { data: prof } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', authUser.id)
    .maybeSingle()
  const companyId = prof?.company_id
  if (!companyId) throw new Error('Empresa não identificada para o upload.')

  const fileExt = file.name.split('.').pop()
  const filePath = `${companyId}/${folder}/${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('company-assets')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('company-assets').getPublicUrl(filePath)
  return data.publicUrl
}

function openReportExample(settings: any) {
  const esc = (s: string) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
  const logoL = settings?.report_logo_primary_url
  const logoR = settings?.report_logo_secondary_url
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>Laudo de exemplo</title>
<style>
  body{font-family:Georgia,serif;color:#27272a;margin:0;padding:32px;background:#f4f4f5}
  .page{background:#fff;max-width:794px;margin:0 auto;padding:40px;box-shadow:0 1px 6px rgba(0,0,0,.1);position:relative}
  .head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:2px solid #27272a;padding-bottom:12px}
  .head img{max-height:64px;max-width:140px;object-fit:contain}
  .head .ttl{text-align:center;flex:1}
  .head h1{font-size:18px;margin:0;text-transform:uppercase}
  .head p{font-size:11px;margin:4px 0 0;color:#52525b}
  .ph{height:64px;width:140px;border:1px dashed #d4d4d8;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#a1a1aa}
  .info{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px;margin-top:16px}
  .warn{margin-top:16px;padding:10px;border:1px solid #e4e4e7;background:#fafafa;font-size:11px;white-space:pre-wrap}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:24px}
  th{text-align:left;border-bottom:1px solid #27272a;padding:6px 0}
  td{padding:6px 0;border-bottom:1px solid #f4f4f5}
  .sign{margin-top:56px;text-align:center;font-size:11px}
  .sign img{max-height:64px;object-fit:contain;display:block;margin:0 auto 4px}
  .foot{margin-top:32px;border-top:1px solid #27272a;padding-top:8px;font-size:9px;color:#71717a;white-space:pre-wrap}
  .wm{position:absolute;top:120px;left:0;right:0;text-align:center;font-size:44px;color:rgba(0,0,0,.07);font-weight:bold;letter-spacing:2px}
</style></head><body><div class="page">
${settings?.report_watermark_enabled !== false ? `<div class="wm">${esc(settings?.report_watermark_text || '[ CÓPIA NÃO AUTENTICADA ]')}</div>` : ''}
<div class="head">
  ${logoL ? `<img src="${logoL}" alt="Logo principal" />` : '<div class="ph">LOGO ESQUERDA</div>'}
  <div class="ttl"><h1>${esc(settings?.report_header_title || 'LABORATÓRIO MUNICIPAL CENTRAL')}</h1>
  ${settings?.report_header_subtitle ? `<p>${esc(settings.report_header_subtitle)}</p>` : ''}</div>
  ${logoR ? `<img src="${logoR}" alt="Logo secundário" />` : '<div class="ph">LOGO DIREITA</div>'}
</div>
<h2 style="font-size:15px;margin:16px 0 0;text-transform:uppercase">MARIA DA SILVA SANTOS</h2>
<div class="info">
  <div><b>Protocolo:</b> 20260000-000-00</div><div><b>Atendimento:</b> 22/06/2026 16:08</div><div><b>Sexo:</b> Feminino</div>
  <div><b>Nascimento:</b> 18/02/1989 (37 anos)</div><div><b>Médico:</b> Dr. José Nóbrega</div><div><b>Local:</b> Matriz</div>
</div>
${settings?.report_institutional_warning ? `<div class="warn">${esc(settings.report_institutional_warning)}</div>` : ''}
<table><thead><tr><th>PARÂMETRO</th><th>RESULTADO</th><th>UNIDADE</th><th style="text-align:right">REFERÊNCIA</th></tr></thead>
<tbody><tr><td>Glicose (jejum)</td><td><b>92</b></td><td>mg/dL</td><td style="text-align:right">70 - 99</td></tr>
<tr><td>Hemoglobina</td><td><b>13,4</b></td><td>g/dL</td><td style="text-align:right">12,0 - 16,0</td></tr></tbody></table>
<div class="sign">
  ${settings?.signature_image_url ? `<img src="${settings.signature_image_url}" alt="Assinatura" />` : '<div style="height:48px"></div>'}
  <div style="border-top:1px solid #a1a1aa;width:240px;margin:0 auto 4px"></div>
  <b>${esc(settings?.signature_name || 'Responsável Técnico')}</b>
  ${settings?.signature_include_register === false ? '' : `<div>${esc(settings?.signature_register || '')}</div>`}
</div>
<div class="foot">${esc(settings?.report_footer_text || 'Rodapé do laudo não configurado.')}</div>
</div></body></html>`
  const w = window.open('', '_blank')
  if (!w) { toast.error('Permita pop-ups para visualizar o laudo.'); return }
  w.document.write(html)
  w.document.close()
}

function ReportLayoutSection({ settings, setSettings }: { settings: any, setSettings: (s: any) => void }) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const publicUrl = await uploadLabAsset(file, 'lab-logos')
      setSettings((prev: any) => ({ ...(prev || {}), [field]: publicUrl }))
      toast.success('Upload realizado com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Erro ao fazer upload da logo')
    } finally {
      e.target.value = ''
    }
  }

  const removeLogo = (field: string) => {
    setSettings((prev: any) => ({ ...(prev || {}), [field]: null }))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Cabeçalho e Rodapé do Laudo</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => openReportExample(settings)}
        >
          <FileText className="h-4 w-4" /> Gerar laudo de exemplo
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground -mt-4">
        Título, subtítulo, logos e marca d'água aparecem no topo de cada página do PDF. Use o botão acima para visualizar sem salvar.
      </p>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Título do cabeçalho</Label>
          <Input 
            value={settings?.report_header_title || ''} 
            onChange={(e) => setSettings({ ...settings, report_header_title: e.target.value })}
            placeholder="Ex: LABORATÓRIO MUNICIPAL CENTRAL" 
          />
          <p className="text-[10px] text-muted-foreground">Fallback: nome do laboratório.</p>
        </div>
        <div className="space-y-2">
          <Label>Subtítulo (opcional)</Label>
          <Input 
            value={settings?.report_header_subtitle || ''}
            onChange={(e) => setSettings({ ...settings, report_header_subtitle: e.target.value })}
            placeholder="Ex: Secretaria Municipal de Saúde" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>Logo principal (esquerda)</Label>
          <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/20">
            <div className="h-16 w-16 bg-card border rounded flex items-center justify-center overflow-hidden shrink-0">
              {settings?.report_logo_primary_url ? (
                <img 
                  key={settings.report_logo_primary_url}
                  src={settings.report_logo_primary_url} 
                  alt="Logo Principal" 
                  className="h-full w-full object-contain"
                  onLoad={() => console.log("Primary logo loaded:", settings.report_logo_primary_url)}
                  onError={(e) => {
                    console.error("Error loading primary logo", settings.report_logo_primary_url);
                  }}
                />
              ) : (
                <div className="text-[8px] text-muted-foreground font-bold">LOGO</div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Input type="file" accept="image/*" className="text-xs w-full h-auto cursor-pointer" onChange={(e) => handleUpload(e, 'report_logo_primary_url')} />
              {settings?.report_logo_primary_url && (
                <button onClick={() => removeLogo('report_logo_primary_url')} className="text-[10px] text-red-500 font-bold text-left flex items-center gap-1 hover:underline">
                  <X className="h-3 w-3" /> Remover
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label>Logo secundário (direita, opcional)</Label>
          <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/20">
            <div className="h-16 w-16 bg-card border rounded flex items-center justify-center overflow-hidden shrink-0">
              {settings?.report_logo_secondary_url ? (
                <img 
                  key={settings.report_logo_secondary_url}
                  src={settings.report_logo_secondary_url} 
                  alt="Logo Secundário" 
                  className="h-full w-full object-contain"
                  onLoad={() => console.log("Secondary logo loaded:", settings.report_logo_secondary_url)}
                  onError={(e) => {
                    console.error("Error loading secondary logo", settings.report_logo_secondary_url);
                  }}
                />
              ) : (
                <div className="text-[8px] text-muted-foreground font-bold">LOGO</div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Input type="file" accept="image/*" className="text-xs w-full h-auto cursor-pointer" onChange={(e) => handleUpload(e, 'report_logo_secondary_url')} />
              {settings?.report_logo_secondary_url && (
                <button onClick={() => removeLogo('report_logo_secondary_url')} className="text-[10px] text-red-500 font-bold text-left flex items-center gap-1 hover:underline">
                  <X className="h-3 w-3" /> Remover
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Ex: brasão da prefeitura. Recomendado PNG transparente.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Aviso institucional (abaixo dos dados do paciente na 1ª página)</Label>
        <textarea 
          className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none" 
          placeholder="Texto livre exibido apenas na primeira página, logo abaixo do bloco do paciente."
          value={settings?.report_institutional_warning || ''}
          onChange={(e) => setSettings({ ...settings, report_institutional_warning: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Rodapé do Laudo</Label>
        <textarea 
          className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none" 
          placeholder="Aparece na lateral esquerda do rodapé em todas as páginas."
          value={settings?.report_footer_text || ''}
          onChange={(e) => setSettings({ ...settings, report_footer_text: e.target.value })}
        />
      </div>

      <div className="p-4 bg-muted/30 rounded-xl border border-border flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold">Marca d'água em laudos não assinados</Label>
            <p className="text-[10px] text-muted-foreground">Impressa no topo de cada página quando o laudo ainda não foi liberado.</p>
          </div>
          <Switch 
            checked={settings?.report_watermark_enabled ?? true} 
            onCheckedChange={(checked) => setSettings({ ...settings, report_watermark_enabled: checked })}
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Texto da marca d'água</Label>
          <Input 
            value={settings?.report_watermark_text || ''} 
            onChange={(e) => setSettings({ ...settings, report_watermark_text: e.target.value })}
            placeholder="[ CÓPIA NÃO AUTENTICADA ]" 
            className="max-w-xs" 
          />
        </div>
      </div>
    </div>
  )
}

function SignatureSection({ settings, setSettings }: { settings: any, setSettings: (updater: any) => void }) {
  const [uploading, setUploading] = useState(false)

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const url = await uploadLabAsset(file, 'lab-signatures')
      setSettings((prev: any) => ({ ...(prev || {}), signature_image_url: url }))
      toast.success('Assinatura enviada com sucesso!')
    } catch (error) {
      console.error('Error uploading signature:', error)
      toast.error('Erro ao fazer upload da assinatura')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Assinatura do Responsável</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input
              placeholder="Dr. Alexsandro Silva"
              value={settings?.signature_name || ''}
              onChange={(e) => setSettings((prev: any) => ({ ...(prev || {}), signature_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Registro Profissional</Label>
            <Input
              placeholder="CRBM-RN-1234"
              value={settings?.signature_register || ''}
              onChange={(e) => setSettings((prev: any) => ({ ...(prev || {}), signature_register: e.target.value }))}
            />
          </div>
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Assinatura automática ao liberar</Label>
              <Switch
                checked={settings?.signature_auto_on_release ?? false}
                onCheckedChange={(checked) => setSettings((prev: any) => ({ ...(prev || {}), signature_auto_on_release: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Incluir registro profissional no laudo</Label>
              <Switch
                checked={settings?.signature_include_register ?? true}
                onCheckedChange={(checked) => setSettings((prev: any) => ({ ...(prev || {}), signature_include_register: checked }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Imagem da Assinatura (Fundo Transparente)</Label>
          <label className="w-full aspect-[2/1] bg-card border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-primary/50 transition-colors cursor-pointer overflow-hidden">
            {settings?.signature_image_url ? (
              <img src={settings.signature_image_url} alt="Assinatura" className="h-full w-full object-contain p-2" />
            ) : (
              <>
                {uploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Signature className="h-8 w-8 text-muted-foreground group-hover:text-primary" />}
                <p className="text-xs text-muted-foreground">Clique para fazer upload (240x120px)</p>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 relative overflow-hidden" asChild>
              <label className="cursor-pointer">
                {uploading ? 'Enviando...' : 'Trocar Imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
              </label>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setSettings((prev: any) => ({ ...(prev || {}), signature_image_url: null }))}
            >
              Remover
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


function SecuritySection() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Segurança da Sessão</h3>
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>Tempo de sessão (minutos)</Label>
          <div className="flex gap-2">
            <Input type="number" defaultValue={30} min={5} max={480} />
            <div className="bg-muted px-3 flex items-center rounded-lg text-xs font-bold text-muted-foreground">MIN</div>
          </div>
        </div>
        
        <Card className="p-4 bg-yellow-50 border-yellow-200 flex gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-yellow-900">Atenção</p>
            <ul className="text-[11px] text-yellow-800 space-y-1 list-disc pl-4">
              <li>O usuário receberá um aviso 1 minuto antes do encerramento.</li>
              <li>Trabalho não salvo em cadastros será perdido no logout automático.</li>
              <li>A alteração vale para todos os perfis da empresa.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}

function PrinterLabelSection() {
  const { config, setConfig, save, reload, isLoading, isSaving } = useLabelConfig()
  const { settings } = useLabSettings()
  const [testando, setTestando] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const presets = [
    { name: 'CD410 rotacionado 50x25', w: 50, h: 25, r: 90 },
    { name: 'CD410 single 50x25', w: 50, h: 25, r: 0 },
    { name: '50x30 padrão', w: 50, h: 30, r: 0 },
    { name: '60x40 grande', w: 60, h: 40, r: 0 },
  ]

  const set = (patch: Partial<LabelConfig>) => setConfig({ ...config, ...patch })

  // Com rotação de 90°/270° a etiqueta é desenhada com as medidas invertidas,
  // para que ao girar ocupe exatamente a etiqueta física configurada.
  const rotNorm = ((Number(config.rotation) % 360) + 360) % 360
  const isQuarter = rotNorm === 90 || rotNorm === 270
  const renderConfig: LabelConfig = isQuarter
    ? { ...config, widthMm: config.heightMm, heightMm: config.widthMm }
    : config


  const applyPreset = (p: typeof presets[number]) => {
    setConfig({ ...config, widthMm: p.w, heightMm: p.h, rotation: p.r, preset: p.name })
    toast.info(`Preset ${p.name} aplicado. Clique em Salvar para gravar.`)
  }

  const handleSave = async () => {
    try {
      await save(config)
      toast.success('Configuração de etiqueta salva.')
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar configuração.')
    }
  }

  const handleReset = () => {
    setConfig({ ...DEFAULT_LABEL_CONFIG })
    toast.info('Valores padrão restaurados. Clique em Salvar para gravar.')
  }

  /** Elemento real da etiqueta (sem a rotação do container de preview) */
  const getLabelElement = (): HTMLElement | null => {
    const sheet = previewRef.current?.querySelector('.label-test-sheet') as HTMLElement | null
    return (sheet?.firstElementChild as HTMLElement | null) ?? sheet
  }

  /**
   * Clona o mesmo elemento exibido na preview (com os estilos da página) dentro
   * de um iframe isolado e imprime. Sem canvas/blob: o resultado é exatamente o
   * que aparece na Preview em Tempo Real.
   */
  const printNoNavegador = async (copies: number) => {
    const label = getLabelElement()
    if (!label) throw new Error('Pré-visualização indisponível para o teste.')

    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;'
    document.body.appendChild(frame)

    const doc = frame.contentDocument
    const win = frame.contentWindow
    if (!doc || !win) {
      frame.remove()
      throw new Error('Não foi possível preparar a impressão.')
    }

    // Estilos da aplicação (Tailwind + tokens) para manter a aparência
    const headStyles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((n) => n.outerHTML)
      .join('\n')

    doc.open()
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta de teste</title>${headStyles}
      <style>
        @page { size: ${config.widthMm}mm ${config.heightMm}mm; margin: 0; }
        html, body { margin:0; padding:0; background:#fff; }
        .page {
          width: ${config.widthMm}mm;
          height: ${config.heightMm}mm;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          page-break-after: always; break-after: page;
        }
        .page:last-child { page-break-after: auto; break-after: auto; }
        .rot {
          width: ${renderConfig.widthMm}mm;
          height: ${renderConfig.heightMm}mm;
          transform: rotate(${config.rotation}deg);
          transform-origin: center;
          display: flex;
        }
      </style></head><body></body></html>`)
    doc.close()

    for (let i = 0; i < copies; i++) {
      const page = doc.createElement('div')
      page.className = 'page'
      const rot = doc.createElement('div')
      rot.className = 'rot'
      rot.appendChild(doc.importNode(label, true))
      page.appendChild(rot)
      doc.body.appendChild(page)
    }

    // Aguarda estilos/fontes carregarem antes de imprimir
    await new Promise<void>((resolve) => window.setTimeout(resolve, 350))
    try {
      await (doc as any).fonts?.ready
    } catch {
      /* noop */
    }

    win.focus()
    win.print()
    window.setTimeout(() => frame.remove(), 2000)
  }



  const handleTestPrint = async () => {
    if (testando) return
    setTestando(true)
    try {
      const el = getLabelElement()
      if (!el) {
        toast.error('Pré-visualização indisponível para o teste.')
        return
      }
      const copies = Math.max(1, Number(config.copies) || 1)

      const ativo = await servidorImpressaoAtivo()
      if (ativo) {
        const pdf = await gerarPdfEtiquetas(Array(copies).fill(el), config.widthMm, config.heightMm)
        const r = await imprimirDireto(TIPOS_DOCUMENTO.etiquetaCliente, pdf)
        toast.success(r.mensagem || 'Etiqueta de teste enviada para a impressora.')
        return
      }
      await printNoNavegador(copies)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao gerar a etiqueta de teste.')
    } finally {
      setTestando(false)
    }
  }

  const NumberField = ({ label, value, onChange, step = 1, min = 1, max = 200, suffix }: any) => (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex">
        <Input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-r-none"
        />
        <div className="bg-muted px-2 flex items-center rounded-r-lg border border-l-0 text-[10px] font-bold text-muted-foreground">
          {suffix}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Configuração de Impressora / Etiqueta</h3>
          <p className="text-xs text-muted-foreground">
            Ajuste tamanho, margem, fontes e código de barras. Vale para todas as etiquetas impressas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleTestPrint} disabled={testando}>
            {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Impressão teste
          </Button>
          <Button size="sm" className="gradient-bg text-white gap-2" onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Presets rápidos (CD410 e outros)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {presets.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
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
            <NumberField label="Largura (mm)" suffix="MM" value={config.widthMm} onChange={(v: number) => set({ widthMm: v })} min={20} max={150} />
            <NumberField label="Altura (mm)" suffix="MM" value={config.heightMm} onChange={(v: number) => set({ heightMm: v })} min={15} max={150} />
            <NumberField label="Margem interna" suffix="MM" step={0.5} min={0} max={10} value={config.marginMm} onChange={(v: number) => set({ marginMm: v })} />
            <NumberField label="Altura cód. barras" suffix="PX" min={10} max={80} value={config.barcodeHeightPx} onChange={(v: number) => set({ barcodeHeightPx: v })} />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Tamanho das fontes (px)</Label>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Cabeçalho / bancada" suffix="PX" step={0.5} min={5} max={20} value={config.fontHeader} onChange={(v: number) => set({ fontHeader: v })} />
              <NumberField label="Código da amostra" suffix="PX" step={0.5} min={6} max={24} value={config.fontCode} onChange={(v: number) => set({ fontCode: v })} />
              <NumberField label="Paciente / material" suffix="PX" step={0.5} min={5} max={20} value={config.fontPatient} onChange={(v: number) => set({ fontPatient: v })} />
              <NumberField label="Nascimento / exames" suffix="PX" step={0.5} min={5} max={20} value={config.fontSmall} onChange={(v: number) => set({ fontSmall: v })} />
              <NumberField label="Rodapé" suffix="PX" step={0.5} min={4} max={16} value={config.fontFooter} onChange={(v: number) => set({ fontFooter: v })} />
              <NumberField label="Cópias no teste" suffix="UN" min={1} max={10} value={config.copies} onChange={(v: number) => set({ copies: v })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rotação do conteúdo (pré-visualização)</Label>
            <select
              value={String(config.rotation)}
              onChange={(e) => set({ rotation: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="0">0° (Padrão)</option>
              <option value="90">90° (Sentido Horário)</option>
              <option value="-90">-90° (Sentido Anti-horário)</option>
              <option value="180">180° (Invertido)</option>
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => { void reload(); toast.info('Configuração recarregada.') }}>
              <History className="h-3.5 w-3.5" /> Recarregar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleReset}>
              <History className="h-3.5 w-3.5" /> Restaurar padrão
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-bold text-muted-foreground uppercase">Preview em Tempo Real</Label>
          <div
            ref={previewRef}
            className="bg-muted/50 rounded-xl p-6 flex items-center justify-center border-2 border-dashed border-border min-h-[300px] overflow-auto"
          >
            <div
              className="label-test-sheet"
              style={{
                transform: `rotate(${config.rotation}deg)`,
                transition: 'all 0.2s ease',
                width: `${renderConfig.widthMm}mm`,
                height: `${renderConfig.heightMm}mm`,

                display: 'flex',
              }}
            >
              <SampleLabel
                orderNumber="190-00"
                patientName="PACIENTE TESTE IMPRESSAO"
                birthDate="15/07/1989"
                material="SANGUE TOTAL"
                tube="EDTA"
                workbench="HEMATOLOGIA"
                sampleCode="190-00-1-2"
                printDate={new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                labelIndex={1}
                examRefs={['H', 'GLI']}
                labName={settings?.lab_name || 'LABORATÓRIO'}
                config={renderConfig}
              />
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground italic">
            A impressão teste usa o servidor local quando disponível; caso contrário abre a impressão do navegador.
          </p>
          <style>{`
            @media print {
              @page { size: ${config.widthMm}mm ${config.heightMm}mm; margin: 0; }
              body.printing-receipt #receipt-print-portal .label-test-sheet > div {
                border: none !important;
                box-shadow: none !important;
              }
            }
          `}</style>


        </div>
      </div>
    </div>
  )
}

function TISSSection() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold mb-1">Configurações TISS</h3>
        <p className="text-xs text-muted-foreground mb-4">Dados regulatórios e operacionais para faturamento.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Registro ANS</Label>
            <Input placeholder="Ex: 123456" />
          </div>
          <div className="space-y-2">
            <Label>Código IBGE (Município)</Label>
            <Input placeholder="Ex: 2400109" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ do Prestador (Padrão)</Label>
            <Input placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Sequência de Lotes (Read-only)</Label>
            <Input value="000154" readOnly className="bg-muted cursor-not-allowed font-mono" />
          </div>
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h4 className="font-bold text-sm">Versão do Padrão TISS</h4>
        <select className="w-full md:w-1/2 h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
          <option>4.01.00</option>
          <option>3.05.00</option>
        </select>
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <Info className="h-4 w-4 text-blue-600" />
          <p className="text-[11px] text-blue-800">A versão do padrão TISS influência a geração do XML de faturamento.</p>
        </div>
      </div>
    </div>
  )
}

function EquipmentRedirect() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Monitor className="h-12 w-12 text-muted-foreground" />
      <div className="text-center">
        <h3 className="font-bold">Gerenciamento de Equipamentos</h3>
        <p className="text-sm text-muted-foreground max-w-xs">Os equipamentos são gerenciados em uma tela dedicada para melhor controle técnico.</p>
      </div>
      <Button asChild className="gradient-bg text-white">
        <a href="/app/cadastros/equipamentos">Ir para Equipamentos</a>
      </Button>
    </div>
  )
}

function UnitsSection() {
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUnit, setEditingUnit] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [unitName, setUnitName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('measurement_units')
        .select('*')
        .order('name')
      
      if (error) throw error
      setUnits(data || [])
    } catch (error: any) {
      console.error('Error fetching units:', error)
      toast.error('Erro ao carregar unidades de medida')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (unit: any = null) => {
    setEditingUnit(unit)
    setUnitName(unit ? unit.name : '')
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!unitName.trim()) {
      toast.error('Nome da unidade é obrigatório')
      return
    }

    try {
      setSaving(true)
      
      if (editingUnit) {
        const { error } = await supabase
          .from('measurement_units')
          .update({ name: unitName })
          .eq('id', editingUnit.id)
        
        if (error) throw error
        toast.success('Unidade atualizada com sucesso')
      } else {
        // Obter company_id do primeiro item ou do usuário atual (simplificado para demo)
        const { data: userData } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userData.user?.id)
          .single()

        const { error } = await supabase
          .from('measurement_units')
          .insert({ 
            name: unitName, 
            company_id: profile?.company_id 
          })
        
        if (error) throw error
        toast.success('Unidade criada com sucesso')
      }

      setIsDialogOpen(false)
      fetchUnits()
    } catch (error: any) {
      toast.error('Erro ao salvar unidade')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('measurement_units')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Unidade excluída com sucesso')
      fetchUnits()
    } catch (error: any) {
      toast.error('Erro ao excluir unidade')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Unidades de Medida</h3>
        <Button size="sm" onClick={() => handleOpenDialog()} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Nova Unidade
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {units.map(u => (
            <div key={u.id} className="p-3 sm:p-4 border rounded-xl bg-card flex flex-col gap-3 group hover:border-primary/30 transition-all min-h-[140px]">
              <div className="flex flex-col gap-2 flex-1 justify-center">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] sm:text-sm font-mono font-bold break-all leading-tight">{u.name}</span>
                  {u.active !== false && (
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-teal-50 text-teal-700 border-teal-200 shrink-0">
                      Ativa
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t mt-auto">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-full sm:flex-1 gap-2 hover:bg-primary/10 hover:text-primary transition-colors text-xs"
                  onClick={() => handleOpenDialog(u)}
                >
                  <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Editar</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-full sm:flex-1 gap-2 hover:bg-red-50 hover:text-red-600 transition-colors text-xs"
                  onClick={() => handleDelete(u.id)}
                >
                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Excluir</span>
                </Button>
              </div>
            </div>
          ))}
          {units.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
              Nenhuma unidade de medida cadastrada.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da unidade</Label>
              <Input
                id="name"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Ex: /mm³"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button 
              className="gradient-bg text-white" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



function MethodsSection() {
  return <LabMethodsSection />
}

function WorkbenchesSection() {
  const { workbenches, addWorkbench, updateWorkbench, removeWorkbench, isLoading } = useRegisters()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWorkbench, setEditingWorkbench] = useState<any>(null)
  const [workbenchName, setWorkbenchName] = useState('')
  const [workbenchDesc, setWorkbenchDesc] = useState('')
  const [reportBreakPolicy, setReportBreakPolicy] = useState<'sequential' | 'dedicated_page' | 'default'>('default')
  const [reportOrder, setReportOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  const handleOpenDialog = (workbench?: any) => {
    if (workbench) {
      setEditingWorkbench(workbench)
      setWorkbenchName(workbench.name)
      setWorkbenchDesc(workbench.description || '')
      setReportBreakPolicy(workbench.reportBreakPolicy || 'default')
      setReportOrder(workbench.reportOrder || 0)
    } else {
      setEditingWorkbench(null)
      setWorkbenchName('')
      setWorkbenchDesc('')
      setReportBreakPolicy('default')
      setReportOrder(0)
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!workbenchName) {
      toast.error('Nome é obrigatório')
      return
    }

    setSaving(true)
    try {
      const data = {
        name: workbenchName,
        description: workbenchDesc,
        reportBreakPolicy,
        reportOrder,
        isActive: true
      }

      if (editingWorkbench) {
        await updateWorkbench({ ...editingWorkbench, ...data })
        toast.success('Bancada atualizada com sucesso')
      } else {
        await addWorkbench(data as any)
        toast.success('Bancada criada com sucesso')
      }
      setIsDialogOpen(false)
    } catch (error) {
      toast.error('Erro ao salvar bancada')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Bancadas Técnicas</h3>
        <Button size="sm" onClick={() => handleOpenDialog()} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Nova Bancada
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {workbenches.map(b => (
            <div key={b.id} className="p-4 border rounded-xl bg-card flex items-center justify-between hover:border-primary/30 transition-all">
              <div className="grid grid-cols-[1fr_2fr_1fr_100px] gap-4 items-center w-full mr-4">
                <div>
                  <p className="font-bold text-sm">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Bancada</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{b.description || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium">
                    {b.reportBreakPolicy === 'sequential' ? 'Sequencial (agrupa)' : 
                     b.reportBreakPolicy === 'dedicated_page' ? 'Página dedicada' : 'Padrão'}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Quebra no laudo</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold">{b.reportOrder}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Ordem</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenDialog(b)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removeWorkbench(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {workbenches.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma bancada cadastrada.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingWorkbench ? 'Editar Bancada' : 'Nova Bancada'}</DialogTitle>
            <DialogDescription>
              Cadastre uma bancada técnica para organizar seus exames.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="wb-name">Nome *</Label>
              <Input
                id="wb-name"
                value={workbenchName}
                onChange={(e) => setWorkbenchName(e.target.value)}
                placeholder="Ex: Bioquímica"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wb-desc">Descrição</Label>
              <textarea
                id="wb-desc"
                value={workbenchDesc}
                onChange={(e) => setWorkbenchDesc(e.target.value)}
                placeholder="Ex: Dosagens bioquímicas em soro e plasma"
                className="w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wb-policy">Política de quebra no laudo</Label>
                <select
                  id="wb-policy"
                  value={reportBreakPolicy}
                  onChange={(e) => setReportBreakPolicy(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="sequential">Sequencial (agrupa)</option>
                  <option value="dedicated_page">Página dedicada</option>
                  <option value="default">Padrão</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wb-order">Ordem no laudo</Label>
                <Input
                  id="wb-order"
                  type="number"
                  value={reportOrder}
                  onChange={(e) => setReportOrder(Number(e.target.value))}
                />
                <p className="text-[10px] text-muted-foreground">Menor valor aparece primeiro.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CollectionReasonsSection() {
  const reasons = [
    { code: 'CANCEL_JEJUM', label: 'Jejum inadequado', type: 'cancel' },
    { code: 'POSTPONE_INSUMO', label: 'Insumo indisponível', type: 'postpone' },
  ]
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Motivos de Coleta</h3>
        <Button size="sm" className="gradient-bg text-white gap-2"><Plus className="h-4 w-4" /> Novo Motivo</Button>
      </div>
      <div className="space-y-2">
        {reasons.map(r => (
          <div key={r.code} className="p-4 border rounded-xl bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "text-[10px] uppercase font-black px-1.5 py-0.5 rounded text-white",
                r.type === 'cancel' ? 'bg-red-500' : 'bg-amber-500'
              )}>
                {r.type === 'cancel' ? 'Cancelar' : 'Adiar'}
              </div>
              <p className="font-bold text-sm">{r.label}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogsSection() {
  const logs = [
    { time: '14:32:01', user: 'Alexsandro', action: 'Coleta registrada', detail: 'Protocolo 20260716-001', color: 'bg-teal-500' },
    { time: '14:30:15', user: 'Sistema', action: 'Login', detail: 'Acesso via Web', color: 'bg-emerald-500' },
  ]
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Logs de Auditoria</h3>
      <div className="space-y-3">
        {logs.map((l, i) => (
          <div key={i} className="flex gap-4 text-xs items-center p-3 rounded-lg border bg-muted/20">
            <span className="font-mono text-muted-foreground">{l.time}</span>
            <div className="flex-1">
              <span className="font-bold">{l.user}</span>
              <div className={cn("inline-flex ml-3 text-[9px] uppercase font-black px-1.5 py-0.5 rounded text-white", l.color)}>{l.action}</div>
              <p className="text-muted-foreground mt-0.5">{l.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
