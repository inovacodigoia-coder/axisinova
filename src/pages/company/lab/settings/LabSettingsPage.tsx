import { useState, useEffect } from 'react'
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
  Globe,
  FileText,
  X
} from 'lucide-react'
import { LabOriginsSettings } from '@/components/lab/settings/LabOriginsSettings'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'

export default function LabSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'lab-data'
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const { userProfile } = useRegisters()

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab })
  }

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchSettings()
    }
  }, [userProfile?.company_id])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('lab_settings')
        .select('*')
        .eq('company_id', userProfile.company_id)
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
    if (!userProfile?.company_id) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('lab_settings')
        .upsert({
          company_id: userProfile.company_id,
          ...settings,
          updated_at: new Date().toISOString()
        })

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
          <NavItem active={activeTab === 'origins'} onClick={() => setActiveTab('origins')} icon={<Globe className="h-4 w-4" />} label="Origens" />
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
                {activeTab === 'lab-data' && <LabDataSection />}
                {activeTab === 'tiss' && <TISSSection />}
                {activeTab === 'signature' && <SignatureSection />}
                {activeTab === 'security' && <SecuritySection />}
                {activeTab === 'printer' && <PrinterLabelSection />}
                {activeTab === 'units' && <UnitsSection />}
                {activeTab === 'methods' && <MethodsSection />}
                {activeTab === 'workbenches' && <WorkbenchesSection />}
                {activeTab === 'equipment' && <EquipmentRedirect />}
                {activeTab === 'collection-reasons' && <CollectionReasonsSection />}
                {activeTab === 'origins' && <LabOriginsSettings />}
                {activeTab === 'report-layout' && <ReportLayoutSection settings={settings} setSettings={setSettings} />}
                {activeTab === 'logs' && <LogsSection />}
                
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

function LabDataSection() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold mb-4">Dados do Laboratório</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Laboratório *</Label>
            <Input placeholder="Ex: Laboratório Vital" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input placeholder="(00) 0000-0000" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" placeholder="contato@lab.com.br" />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold mb-4">Responsável Técnico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input placeholder="Nome do Responsável" />
          </div>
          <div className="space-y-2">
            <Label>Registro Profissional</Label>
            <Input placeholder="Ex: CRBM-RN-08453" />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold mb-4">Laudo (Personalização)</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cabeçalho Customizado</Label>
            <textarea className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Texto para o cabeçalho do laudo..." />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-dashed border-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-24 bg-card border rounded flex items-center justify-center text-[10px] text-muted-foreground font-bold">LOGO</div>
              <div>
                <p className="text-sm font-bold">Logo do Laboratório</p>
                <p className="text-xs text-muted-foreground">PNG transparente, max 2MB</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Upload</Button>
          </div>
          <div className="flex items-center justify-between">
            <Label>Exibir logo no laudo</Label>
            <Switch />
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportLayoutSection({ settings, setSettings }: { settings: any, setSettings: (s: any) => void }) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `lab-settings/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath)

      setSettings({ ...settings, [field]: publicUrl })
      toast.success('Upload realizado com sucesso!')
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Erro ao fazer upload da logo')
    }
  }

  const removeLogo = (field: string) => {
    setSettings({ ...settings, [field]: null })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Cabeçalho e Rodapé do Laudo</h3>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
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
            {settings?.report_logo_primary_url ? (
              <img src={settings.report_logo_primary_url} alt="Logo Principal" className="h-12 w-12 object-contain" />
            ) : (
              <div className="h-12 w-12 bg-card border rounded flex items-center justify-center text-[8px] text-muted-foreground font-bold">LOGO</div>
            )}
            <div className="flex flex-col gap-2">
              <Input type="file" accept="image/*" className="text-xs w-full h-auto" onChange={(e) => handleUpload(e, 'report_logo_primary_url')} />
              {settings?.report_logo_primary_url && (
                <button onClick={() => removeLogo('report_logo_primary_url')} className="text-[10px] text-red-500 font-bold text-left flex items-center gap-1">
                  <X className="h-3 w-3" /> Remover
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label>Logo secundário (direita, opcional)</Label>
          <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/20">
            {settings?.report_logo_secondary_url ? (
              <img src={settings.report_logo_secondary_url} alt="Logo Secundário" className="h-12 w-12 object-contain" />
            ) : (
              <div className="h-12 w-12 bg-card border rounded flex items-center justify-center text-[8px] text-muted-foreground font-bold">LOGO</div>
            )}
            <div className="flex flex-col gap-2">
              <Input type="file" accept="image/*" className="text-xs w-full h-auto" onChange={(e) => handleUpload(e, 'report_logo_secondary_url')} />
              {settings?.report_logo_secondary_url && (
                <button onClick={() => removeLogo('report_logo_secondary_url')} className="text-[10px] text-red-500 font-bold text-left flex items-center gap-1">
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

function SignatureSection() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Assinatura do Responsável</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input placeholder="Dr. Alexsandro Silva" />
          </div>
          <div className="space-y-2">
            <Label>Registro Profissional</Label>
            <Input placeholder="CRBM-RN-1234" />
          </div>
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Assinatura automática ao liberar</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Incluir registro profissional no laudo</Label>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label>Imagem da Assinatura (Fundo Transparente)</Label>
          <div className="w-full aspect-[2/1] bg-card border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-primary/50 transition-colors">
            <Signature className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
            <p className="text-xs text-muted-foreground">Clique para fazer upload (240x120px)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">Trocar Imagem</Button>
            <Button variant="ghost" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">Remover</Button>
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
  const [rotation, setRotation] = useState("0")
  const [width, setWidth] = useState(50)
  const [height, setHeight] = useState(25)

  const presets = [
    { name: "CD410 rotacionado 50x25", w: 50, h: 25, r: "90" },
    { name: "CD410 single 50x25 (2 por página)", w: 50, h: 25, r: "0" },
    { name: "CD410 single 50x25 (1 por página)", w: 50, h: 25, r: "0" },
    { name: "50x30 padrão", w: 50, h: 30, r: "0" }
  ]

  const applyPreset = (p: any) => {
    setWidth(p.w)
    setHeight(p.h)
    setRotation(p.r)
    toast.info(`Preset ${p.name} aplicado!`)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Configuração de Impressora / Etiqueta</h3>
        <Button variant="outline" size="sm" className="gap-2">
           <Layout className="h-4 w-4" /> Gerenciar Slots
        </Button>
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
            <div className="space-y-2">
              <Label>Largura (mm)</Label>
              <Input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Altura (mm)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rotação do conteúdo</Label>
            <select 
              value={rotation} 
              onChange={(e) => setRotation(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="0">0° (Padrão)</option>
              <option value="90">90° (Sentido Horário)</option>
              <option value="-90">-90° (Sentido Anti-horário)</option>
              <option value="180">180° (Invertido)</option>
            </select>
          </div>

          <div className="pt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-2">
               <Plus className="h-3.5 w-3.5" /> Duplicar Slot
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2">
               <History className="h-3.5 w-3.5" /> Resetar
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-bold text-muted-foreground uppercase">Preview em Tempo Real</Label>
          <div className="bg-muted/50 rounded-xl p-8 flex items-center justify-center border-2 border-dashed border-border min-h-[300px]">
            <div 
              style={{ 
                width: `${width * 3.7}px`, 
                height: `${height * 3.7}px`,
                transform: `rotate(${rotation}deg)`,
                transition: 'all 0.3s ease'
              }} 
              className="bg-card border-2 border-primary/50 rounded shadow-sm relative p-3 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-5 w-5 bg-primary/10 rounded" />
              </div>
              <div className="h-2.5 w-24 bg-muted rounded" />
              <div className="h-2 w-32 bg-muted/50 rounded" />
              <div className="flex justify-between items-end">
                  <div className="h-6 w-6 bg-muted rounded" />
                  <div className="h-5 w-10 bg-muted/50 rounded" />
              </div>
              <div className="absolute top-0 right-0 p-1 text-[7px] font-bold text-primary/40 uppercase">Label ID: 001</div>
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground italic">
            Visualização aproximada. Escala: 1mm ≈ 3.7px
          </p>
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
  const methods = [
    { name: 'Colorimétrico', desc: 'Método colorimétrico clássico' },
    { name: 'Glicose-oxidase', desc: 'Método enzimático GOD-PAP' },
    { name: 'Hexoquinase', desc: 'Método enzimático Hexoquinase' },
    { name: 'Quimioluminescência', desc: 'Imunoensaio quimioluminescente' },
  ]
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Metodologias Analíticas</h3>
        <Button size="sm" className="gradient-bg text-white gap-2"><Plus className="h-4 w-4" /> Nova Metodologia</Button>
      </div>
      <div className="space-y-2">
        {methods.map(m => (
          <div key={m.name} className="p-4 border rounded-xl bg-card flex items-center justify-between hover:border-primary/30 transition-all">
            <div>
              <p className="font-bold text-sm">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  )
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
