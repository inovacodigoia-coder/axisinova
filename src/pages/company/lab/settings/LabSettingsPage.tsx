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
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'


export default function LabSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'lab-data'

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab })
  }

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!')
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
            {activeTab === 'logs' && <LogsSection />}
            
            <div className="mt-8 pt-6 border-t flex justify-end">
              <Button onClick={handleSave} className="gradient-bg text-white gap-2 px-8">
                <Save className="h-4 w-4" /> Salvar Alterações
              </Button>
            </div>
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
            <div key={u.id} className="p-4 border rounded-xl bg-card flex flex-col gap-3 group hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold break-all">{u.name}</span>
                {u.active && (
                  <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 shrink-0">
                    Ativa
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 pt-2 border-t mt-auto">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 flex-1 gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => handleOpenDialog(u)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Editar</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 flex-1 gap-2 hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => handleDelete(u.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Excluir</span>
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
  const benches = [
    { name: 'Bioquímica', desc: 'Dosagens bioquímicas em soro e plasma' },
    { name: 'Hematologia', desc: 'Hemograma e provas hematológicas' },
    { name: 'Imunologia', desc: 'Testes imunológicos e hormonais' },
    { name: 'Uroanálise', desc: 'Exames de urina e sedimentoscopia' },
  ]
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Bancadas Técnicas</h3>
        <Button size="sm" className="gradient-bg text-white gap-2"><Plus className="h-4 w-4" /> Nova Bancada</Button>
      </div>
      <div className="space-y-2">
        {benches.map(b => (
          <div key={b.name} className="p-4 border rounded-xl bg-card flex items-center justify-between hover:border-primary/30 transition-all">
            <div>
              <p className="font-bold text-sm">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
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
