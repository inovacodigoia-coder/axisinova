import { useState, useEffect, useRef } from 'react'
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
  X,
  Download,
  UploadCloud
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { LabPrinterLabelSection } from '@/components/lab/settings/LabPrinterLabelSection'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'
import LabMethodsSection from '@/components/lab/settings/LabMethodsSection'
import MateriaisTubosSection from '@/components/lab/settings/MateriaisTubosSection'
import { TestTube } from 'lucide-react'
import HolidaysSection from '@/components/lab/settings/HolidaysSection'
import PrazoSettingsCard from '@/components/lab/settings/PrazoSettingsCard'
import MotivosColetaSection from '@/components/lab/triagem/MotivosColetaSection'
import UnidadesRotasSection from '@/components/lab/triagem/UnidadesRotasSection'
import LogsAuditoriaSection from '@/components/lab/triagem/LogsAuditoriaSection'

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
          <NavItem active={activeTab === 'materiais'} onClick={() => setActiveTab('materiais')} icon={<TestTube className="h-4 w-4" />} label="Materiais e Tubos" />
          <NavItem active={activeTab === 'methods'} onClick={() => setActiveTab('methods')} icon={<Beaker className="h-4 w-4" />} label="Metodologias" />
          <NavItem active={activeTab === 'workbenches'} onClick={() => setActiveTab('workbenches')} icon={<Layout className="h-4 w-4" />} label="Bancadas" />
          <NavItem active={activeTab === 'unidades-rotas'} onClick={() => setActiveTab('unidades-rotas')} icon={<Layout className="h-4 w-4" />} label="Unidades e Rotas" />
          <NavItem active={activeTab === 'collection-reasons'} onClick={() => setActiveTab('collection-reasons')} icon={<AlertCircle className="h-4 w-4" />} label="Motivos de Coleta" />
          <NavItem active={activeTab === 'holidays'} onClick={() => setActiveTab('holidays')} icon={<History className="h-4 w-4" />} label="Prazos e Feriados" />
          
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
                <LabPrinterLabelSection />
              </div>
              <div className={activeTab === 'holidays' ? 'block' : 'hidden'}>
                {activeTab === 'holidays' && <><PrazoSettingsCard /><div className="h-4" /><HolidaysSection /></>}
              </div>
              <div className={activeTab === 'units' ? 'block' : 'hidden'}>
                <UnitsSection />
              </div>
              <div className={activeTab === 'unidades-rotas' ? 'block' : 'hidden'}>
                {activeTab === 'unidades-rotas' && <UnidadesRotasSection />}
              </div>
              <div className={activeTab === 'materiais' ? 'block' : 'hidden'}>
                {activeTab === 'materiais' && <MateriaisTubosSection />}
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
                {activeTab === 'collection-reasons' && <MotivosColetaSection />}
              </div>
              <div className={activeTab === 'report-layout' ? 'block' : 'hidden'}>
                <ReportLayoutSection settings={settings} setSettings={setSettings} />
              </div>
              <div className={activeTab === 'logs' ? 'block' : 'hidden'}>
                {activeTab === 'logs' && <LogsAuditoriaSection />}
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
  const { workbenches, exams, addWorkbench, updateWorkbench, removeWorkbench, isLoading } = useRegisters() as any
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingWorkbench, setEditingWorkbench] = useState<any>(null)
  const [workbenchName, setWorkbenchName] = useState('')
  const [workbenchDesc, setWorkbenchDesc] = useState('')
  const [reportBreakPolicy, setReportBreakPolicy] = useState<'sequential' | 'dedicated_page' | 'default'>('default')
  const [reportOrder, setReportOrder] = useState(0)
  const [tipo, setTipo] = useState<'interna' | 'apoio'>('interna')
  const [apoioId, setApoioId] = useState('')
  const [ativa, setAtiva] = useState(true)
  const [apoios, setApoios] = useState<{ id: string; nome: string; ativo: boolean }[]>([])
  const [saving, setSaving] = useState(false)
  const [importando, setImportando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const WB_COLS = ['Nome', 'Tipo', 'Laboratório de apoio', 'Quebra no laudo', 'Ordem', 'Descrição', 'Ativa']

  const quebraLabel = (p: string) => p === 'sequential' ? 'Sequencial (agrupa)' : p === 'dedicated_page' ? 'Página dedicada' : 'Padrão'
  const quebraValor = (s: string) => {
    const v = (s || '').toLowerCase()
    if (v.startsWith('sequ')) return 'sequential'
    if (v.includes('dedicada')) return 'dedicated_page'
    return 'default'
  }

  const handleExportar = async () => {
    const XLSX = await import('xlsx')
    const rows = (workbenches || []).map((b: any) => ({
      'Nome': b.name,
      'Tipo': b.tipo === 'apoio' ? 'Apoio' : 'Interna',
      'Laboratório de apoio': b.tipo === 'apoio' ? apoioNome(b.apoioId) : '',
      'Quebra no laudo': quebraLabel(b.reportBreakPolicy),
      'Ordem': b.reportOrder ?? 0,
      'Descrição': b.description || '',
      'Ativa': b.isActive === false ? 'Não' : 'Sim',
    }))
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(WB_COLS.map(c => [c, '']))])
    ws['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 24 }, { wch: 20 }, { wch: 8 }, { wch: 40 }, { wch: 8 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bancadas')
    XLSX.writeFile(wb, 'bancadas-tecnicas.xlsx')
    toast.success('Planilha de bancadas exportada')
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportando(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer())
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]])
      if (!rows.length) { toast.error('Planilha vazia'); return }

      const norm = (v: unknown) => String(v ?? '').trim()
      const existentes = new Set((workbenches || []).map((b: any) => norm(b.name).toLowerCase()))
      let criadas = 0, ignoradas = 0
      const erros: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const nome = norm(r['Nome'])
        if (!nome) { erros.push(`Linha ${i + 2}: nome vazio`); continue }
        if (existentes.has(nome.toLowerCase())) { ignoradas++; continue }
        const tipo = norm(r['Tipo']).toLowerCase().startsWith('apo') ? 'apoio' : 'interna'
        let apoioId: string | null = null
        if (tipo === 'apoio') {
          const nomeApoio = norm(r['Laboratório de apoio']).toLowerCase()
          const ap = apoios.find(a => a.nome.toLowerCase() === nomeApoio)
          if (!ap) { erros.push(`Linha ${i + 2} (${nome}): laboratório de apoio não encontrado`); continue }
          apoioId = ap.id
        }
        const ordem = Number(r['Ordem'])
        await addWorkbench({
          name: nome,
          description: norm(r['Descrição']),
          reportBreakPolicy: quebraValor(norm(r['Quebra no laudo'])),
          reportOrder: Number.isFinite(ordem) ? ordem : 0,
          isActive: norm(r['Ativa']).toLowerCase() !== 'não' && norm(r['Ativa']).toLowerCase() !== 'nao',
          tipo,
          apoioId,
        } as any)
        existentes.add(nome.toLowerCase())
        criadas++
      }

      if (criadas) toast.success(`${criadas} bancada(s) importada(s)`)
      if (ignoradas) toast.info(`${ignoradas} já existente(s) ignorada(s)`)
      erros.slice(0, 3).forEach(m => toast.error(m))
      if (!criadas && !ignoradas && !erros.length) toast.info('Nada para importar')
    } catch (err: any) {
      toast.error(`Falha ao importar: ${err?.message || 'arquivo inválido'}`)
    } finally {
      setImportando(false)
    }
  }

  useEffect(() => {
    supabase.from('apoio_laboratorio').select('id, nome, ativo').order('nome')
      .then(({ data }) => setApoios(((data as any[]) || []).map(a => ({ id: a.id, nome: a.nome, ativo: a.ativo !== false }))))
  }, [])

  const examCount = (id: string) => ((exams || []) as any[]).filter(e => e.workbenchId === id).length
  const apoioNome = (id?: string | null) => apoios.find(a => a.id === id)?.nome || 'apoio'

  const handleOpenDialog = (workbench?: any) => {
    if (workbench) {
      setEditingWorkbench(workbench)
      setWorkbenchName(workbench.name)
      setWorkbenchDesc(workbench.description || '')
      setReportBreakPolicy(workbench.reportBreakPolicy || 'default')
      setReportOrder(workbench.reportOrder || 0)
      setTipo(workbench.tipo === 'apoio' ? 'apoio' : 'interna')
      setApoioId(workbench.apoioId || '')
      setAtiva(workbench.isActive !== false)
    } else {
      setEditingWorkbench(null)
      setWorkbenchName('')
      setWorkbenchDesc('')
      setReportBreakPolicy('default')
      setReportOrder(0)
      setTipo('interna')
      setApoioId('')
      setAtiva(true)
    }
    setIsDialogOpen(true)
  }

  const handleRemove = async (b: any) => {
    const n = examCount(b.id)
    if (n > 0) {
      toast.error(`Esta bancada é usada por ${n} exame(s). Troque a bancada desses exames antes de excluir.`)
      return
    }
    await removeWorkbench(b.id)
  }

  const handleSave = async () => {
    if (!workbenchName) {
      toast.error('Nome é obrigatório')
      return
    }
    if (tipo === 'apoio' && !apoioId) {
      toast.error('Escolha o laboratório de apoio desta bancada')
      return
    }
    if (editingWorkbench && !ativa && editingWorkbench.isActive !== false) {
      const n = examCount(editingWorkbench.id)
      if (n > 0) {
        toast.error(`Esta bancada é usada por ${n} exame(s). Troque a bancada desses exames antes de inativar.`)
        return
      }
    }

    setSaving(true)
    try {
      const data = {
        name: workbenchName,
        description: workbenchDesc,
        reportBreakPolicy,
        reportOrder,
        isActive: ativa,
        tipo,
        apoioId: tipo === 'apoio' ? apoioId : null,
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
      // mensagem já exibida
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
          {workbenches.map((b: any) => (
            <div key={b.id} className={cn("p-4 border rounded-xl bg-card flex items-center justify-between hover:border-primary/30 transition-all", b.isActive === false && 'opacity-60')}>
              <div className="grid grid-cols-[1fr_1fr_2fr_1fr_100px] gap-4 items-center w-full mr-4">
                <div>
                  <p className="font-bold text-sm">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">
                    Bancada{b.isActive === false ? ' · inativa' : ''} · {examCount(b.id)} exame(s)
                  </p>
                </div>
                <div>
                  {b.tipo === 'apoio'
                    ? <Badge variant="outline" className="border-accent text-accent-foreground bg-accent/20">Apoio: {apoioNome(b.apoioId)}</Badge>
                    : <Badge variant="secondary">Interna</Badge>}
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
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleRemove(b)}>
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
              A bancada decide onde o exame é feito: aqui no laboratório (interna) ou num laboratório de apoio.
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wb-tipo">Tipo *</Label>
                <select
                  id="wb-tipo"
                  value={tipo}
                  disabled={!!editingWorkbench && examCount(editingWorkbench.id) > 0}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="interna">Interna</option>
                  <option value="apoio">Apoio</option>
                </select>
              </div>
              {tipo === 'apoio' && (
                <div className="grid gap-2">
                  <Label htmlFor="wb-apoio">Laboratório de apoio *</Label>
                  <select
                    id="wb-apoio"
                    value={apoioId}
                    disabled={!!editingWorkbench && examCount(editingWorkbench.id) > 0}
                    onChange={(e) => setApoioId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecione…</option>
                    {apoios.filter(a => a.ativo || a.id === apoioId).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                  {apoios.length === 0 && <p className="text-[10px] text-muted-foreground">Cadastre o apoio em Terceirização › Laboratórios.</p>}
                </div>
              )}
            </div>
            {editingWorkbench && examCount(editingWorkbench.id) > 0 && (
              <p className="text-[11px] text-muted-foreground">Tipo e apoio não mudam enquanto houver exames nesta bancada ({examCount(editingWorkbench.id)}).</p>
            )}
            {editingWorkbench && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="wb-ativa">Bancada ativa</Label>
                <Switch id="wb-ativa" checked={ativa} onCheckedChange={setAtiva} />
              </div>
            )}
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

