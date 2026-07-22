import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Save, 
  Info, 
  Settings2, 
  Scale, 
  Beaker, 
  UserCircle, 
  Plus, 
  Trash2, 
  Star,
  ShieldCheck,
  Zap,
  Layout,
  MessageSquare,
  FileText,
  History,
  Calculator,
  ExternalLink,
  MoreVertical
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useRegisters } from '@/context/RegistersContext'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"



export default function LabCatalogFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const [activeTab, setActiveTab] = useState('general')

  const { addExam, updateExam } = useRegisters()
  const [examData, setExamData] = useState({
    name: '',
    internalCode: '',
    type: 'lab' as 'clinical' | 'lab',
    tussCode: '',
    isActive: true,
    preparationInstructions: '',
    estimatedDurationMinutes: 30,
    resultDeadlineDays: 1,
    requiresAuthorization: false,
    showDuration: true,
    showDeadline: true,
    measurementUnit: '',
    specialtyId: '',
    defaultOrigin: '',
    defaultDestination: '',
    reportObservations: '',
  })

  useEffect(() => {
    if (isEditing) {
      // Em uma implementação real, buscaríamos os dados do exame pelo ID
      setExamData({
        name: "25-Hidroxivitamina D",
        internalCode: "VITD001",
        type: 'lab',
        tussCode: "VITD",
        isActive: true,
        preparationInstructions: "Jejum de 8 horas.",
        estimatedDurationMinutes: 30,
        resultDeadlineDays: 1,
        requiresAuthorization: false,
        showDuration: true,
        showDeadline: true,
      })
    }
  }, [isEditing, id])

  const handleSave = async () => {
    if (!examData.name) {
      toast.error('O nome do exame é obrigatório')
      return
    }

    try {
      if (isEditing) {
        await updateExam({ ...examData, id: id! } as any)
        toast.success('Exame atualizado!')
      } else {
        await addExam({
          ...examData,
          attachmentRules: [],
          isActive: examData.isActive ?? true,
          createdAt: new Date().toISOString()
        } as any)
        toast.success('Exame cadastrado com sucesso!')
      }
      
      // Delay navigation slightly to allow state to synchronize
      setTimeout(() => {
        navigate('/app/cadastros/catalogo')
      }, 500)
    } catch (error) {
      console.error('Erro ao salvar exame:', error)
      toast.error('Erro ao salvar o exame')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/cadastros/catalogo')} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isEditing ? 'Editar Exame' : 'Novo Exame'}</h1>
            <p className="text-xs text-muted-foreground">{isEditing ? 'VITD - 25-Hidroxivitamina D' : 'Preencha os dados do novo exame'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <Label className="text-xs font-bold uppercase tracking-wider">Ativo</Label>
            <Switch 
              checked={examData.isActive} 
              onCheckedChange={(val) => setExamData(prev => ({ ...prev, isActive: val }))} 
              className="border border-border/50"
            />
          </div>
          <Button variant="outline" onClick={() => navigate('/app/cadastros/catalogo')}>Cancelar</Button>
          <Button onClick={handleSave} className="gradient-bg text-white gap-2 px-6">
            <Save className="h-4 w-4" /> Salvar Exame
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-12 w-full justify-start gap-1">
          <TabsTrigger value="general" className="gap-2 px-6 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Info className="h-4 w-4" /> Informações Gerais
          </TabsTrigger>
          <TabsTrigger value="parameters" className="gap-2 px-6 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Settings2 className="h-4 w-4" /> Parâmetros e Máscara
          </TabsTrigger>
          <TabsTrigger value="reference" className="gap-2 px-6 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Scale className="h-4 w-4" /> Valores de Referência
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2 px-6 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <ShieldCheck className="h-4 w-4" /> Alertas e Regras
          </TabsTrigger>
          <TabsTrigger value="patient" className="gap-2 px-6 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <UserCircle className="h-4 w-4" /> Info. ao Paciente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralInfoSection 
            isEditing={isEditing} 
            data={examData} 
            onChange={(newData) => setExamData(prev => ({ ...prev, ...newData }))} 
          />
        </TabsContent>
        <TabsContent value="parameters">
          <ParametersSection />
        </TabsContent>
        <TabsContent value="reference">
          <ReferenceSection />
        </TabsContent>
        <TabsContent value="rules">
           <RulesSection />
        </TabsContent>
        <TabsContent value="patient">
          <PatientInfoSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeneralInfoSection({ isEditing, data, onChange }: { isEditing: boolean, data: any, onChange: (val: any) => void }) {
  const navigate = useNavigate()
  const materials = ['Sangue Total', 'Soro', 'Plasma', 'Urina', 'Fezes', 'Secreção', 'Líquor', 'Swab']
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(isEditing ? ['Soro'] : [])
  const [defaultMaterial, setDefaultMaterial] = useState(isEditing ? 'Soro' : '')
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([])

  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase.from('measurement_units').select('name').order('name')
      if (data) setMeasurementUnits(data)
    }
    fetchUnits()
  }, [])

  const toggleMaterial = (mat: string) => {
    setSelectedMaterials(prev => 
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    )
  }

  return (
    <Card className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-4 lg:col-span-2">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Nome do Exame *</Label>
          <Input 
            placeholder="Ex: Hemograma Completo" 
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-11 text-base font-medium focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Código *</Label>
          <Input 
            placeholder="Ex: GLI001" 
            value={data.internalCode}
            onChange={(e) => onChange({ internalCode: e.target.value })}
            className="h-11 text-base font-medium focus:ring-primary/20 transition-all shadow-sm uppercase"
          />
        </div>
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tipo de Exame</Label>
          <div className="flex gap-4 p-1.5 bg-muted/20 rounded-xl border border-border/50">
            <button
              type="button"
              onClick={() => onChange({ type: 'clinical' })}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                "hover:bg-background/50",
                "data-[active=true]:bg-background data-[active=true]:text-primary data-[active=true]:shadow-sm data-[active=true]:border-primary/20 border border-transparent"
              )}
              data-active={data.type === 'clinical'}
            >
              <div className={cn("h-2 w-2 rounded-full border border-primary/30", data.type === 'clinical' && "bg-primary")} />
              CLÍNICA
            </button>
            <button
              type="button"
              onClick={() => onChange({ type: 'lab' })}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                "hover:bg-background/50",
                "data-[active=true]:bg-background data-[active=true]:text-primary data-[active=true]:shadow-sm data-[active=true]:border-primary/20 border border-transparent"
              )}
              data-active={data.type === 'lab'}
            >
              <div className={cn("h-2 w-2 rounded-full border border-primary/30", data.type === 'lab' && "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]")} />
              LABORATÓRIO
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Código TUSS</Label>
          <Input 
            placeholder="Ex: 40302534" 
            value={data.tussCode}
            onChange={(e) => onChange({ tussCode: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Unidade de Medida</Label>
          <div className="flex gap-2">
            <select className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">-- Selecione --</option>
              {measurementUnits.map(unit => (
                <option key={unit.name} value={unit.name}>{unit.name}</option>
              ))}
            </select>
            <Button 
              variant="outline" 
              size="icon" 
              className="shrink-0" 
              onClick={() => navigate('/app/configuracoes/laboratorio?tab=units')}
              title="Gerenciar Unidades de Medida"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Especialidade</Label>
          <select className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option>Não se aplica</option>
          </select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Label>Duração estimada (min)</Label>
            <Switch 
              className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 border border-border/50"
              checked={data.showDuration} 
              onCheckedChange={(val) => onChange({ showDuration: val })} 
            />
          </div>
          {data.showDuration && (
            <Input 
              type="number" 
              value={data.estimatedDurationMinutes}
              onChange={(e) => onChange({ estimatedDurationMinutes: Number(e.target.value) })}
              className="h-10"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Prazo resultado (dias úteis)</Label>
          <Input 
            type="number" 
            value={data.resultDeadlineDays}
            onChange={(e) => onChange({ resultDeadlineDays: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Label>Prazo de Entrega (dias)</Label>
            <Switch 
              className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 border border-border/50"
              checked={data.showDeadline} 
              onCheckedChange={(val) => onChange({ showDeadline: val })} 
            />
          </div>
          {data.showDeadline && (
            <Input 
              type="number" 
              value={data.resultDeadlineDays}
              onChange={(e) => onChange({ resultDeadlineDays: Number(e.target.value) })}
              className="h-10"
            />
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Label>Instrução de preparo</Label>
        <textarea 
          className="w-full h-24 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
          placeholder="Orientações enviadas ao paciente (ex: jejum, preparo intestinal)"
          value={data.preparationInstructions}
          onChange={(e) => onChange({ preparationInstructions: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2 py-2">
        <input type="checkbox" id="pre-auth" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
        <Label htmlFor="pre-auth" className="cursor-pointer">Requer autorização prévia</Label>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Materiais aceitos *</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] gap-1 text-primary hover:text-primary hover:bg-primary/5"
              onClick={() => toast.info("Funcionalidade para cadastrar novos materiais será implementada em breve.")}
            >
              <Plus className="h-3 w-3" /> Novo Material
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Selecione um ou mais. Clique duplo para definir como padrão ⭐.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {materials.map(mat => (
            <button
              key={mat}
              type="button"
              onClick={() => toggleMaterial(mat)}
              onDoubleClick={() => selectedMaterials.includes(mat) && setDefaultMaterial(mat)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2",
                selectedMaterials.includes(mat) 
                  ? "bg-primary/10 border-primary text-primary" 
                  : "bg-background border-border text-muted-foreground hover:border-primary/50",
                defaultMaterial === mat && "ring-2 ring-primary ring-offset-2 ring-offset-card"
              )}
            >
              {defaultMaterial === mat && <Star className="h-3 w-3 fill-primary" />}
              {mat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
        <div className="space-y-2">
          <Label>Origem padrão</Label>
          <select className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Não definido --</option>
            <option>Recepção Central</option>
            <option>Posto Ipanguaçu</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Destino padrão</Label>
          <div className="flex gap-2">
            <select className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
              <option>-- Não definido --</option>
              <option>Ipanguaçu</option>
              <option>Pardini</option>
              <option>Bancada Bioquímica</option>
            </select>
            <Button 
              variant="outline" 
              size="icon" 
              className="shrink-0" 
              onClick={() => navigate('/app/configuracoes/laboratorio?tab=workbenches')}
              title="Gerenciar Locais / Bancadas"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Observações do Laudo</Label>
          <textarea 
            className="w-full h-24 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
            placeholder="Ex: A partir de 01/2026 os valores de referência foram atualizados conforme nova diretriz..." 
          />
          <p className="text-[11px] text-muted-foreground">Esse texto será impresso no laudo, abaixo dos resultados deste exame.</p>
        </div>

        <div className="md:col-span-2 space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Perguntas de Confirmação</Label>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Perguntas que o atendente deverá confirmar com o paciente ao adicionar este exame.</p>
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <span className="text-xs text-muted-foreground font-medium w-4">1.</span>
              <Input 
                defaultValue="O paciente está em jejum há pelo menos 8 horas?" 
                className="flex-1"
              />
              <Button variant="ghost" size="icon" className="text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ParametersSection() {
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([])
  const [parameters, setParameters] = useState<any[]>([])
  const [editingReference, setEditingReference] = useState<any>(null)

  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase.from('measurement_units').select('name').order('name')
      if (data) setMeasurementUnits(data)
    }
    fetchUnits()
  }, [])

  const addParameter = () => {
    const newId = parameters.length > 0 ? Math.max(...parameters.map(p => p.id)) + 1 : 1
    setParameters([...parameters, { 
      id: newId, 
      name: '', 
      section: '', 
      equipCode: '', 
      type: 'numerical', 
      origin: 'manual', 
      unit: '', 
      isMandatory: true, 
      allowNegative: false, 
      isCalculated: false,
      isHidden: false,
      formula: ''
    }])
  }

  const updateParameter = (id: number, field: string, value: any) => {
    setParameters(parameters.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const removeParameter = (id: number) => {
    setParameters(parameters.filter(p => p.id !== id))
  }

  const availableVariables = useMemo(() => {
    return parameters.filter(p => p.name).map(p => p.name)
  }, [parameters])

  return (
    <TooltipProvider>
      <Card className="p-0 border-none shadow-none bg-transparent space-y-6">
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Parâmetros do Exame</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={addParameter}>
              <Plus className="h-4 w-4" /> Adicionar Parâmetro
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Vincular exame existente
            </Button>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground w-10">#</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground w-20">Seção</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground w-24">Cód. Equip.</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground w-32">Tipo</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground w-32">Origem</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground w-40">Unidade</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground w-32">Referências</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Obrig.</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Neg.</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Calc.</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Oculto</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parameters.map((param, idx) => (
                  <React.Fragment key={param.id}>
                    <tr className="hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Input 
                            className="h-9 text-xs font-medium focus:ring-primary/20" 
                            value={param.name} 
                            onChange={(e) => updateParameter(param.id, 'name', e.target.value)}
                            placeholder="Nome do parâmetro"
                          />
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-muted-foreground hover:text-primary">
                            <History className="h-3 w-3 mr-1" /> Hist.
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input 
                          className="h-9 text-xs text-center uppercase" 
                          value={param.section} 
                          onChange={(e) => updateParameter(param.id, 'section', e.target.value)}
                          placeholder="Ex: ER"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input 
                          className="h-9 text-xs text-center" 
                          value={param.equipCode} 
                          onChange={(e) => updateParameter(param.id, 'equipCode', e.target.value)}
                          placeholder="ex"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select value={param.type} onValueChange={(val) => updateParameter(param.id, 'type', val)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="numerical">Numérico</SelectItem>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="selection">Seleção</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={param.origin} onValueChange={(val) => updateParameter(param.id, 'origin', val)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="equipment">Equipamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 items-center">
                          <Select value={param.unit} onValueChange={(val) => updateParameter(param.id, 'unit', val)}>
                            <SelectTrigger className="h-9 text-xs flex-1">
                              <SelectValue placeholder="Unidade" />
                            </SelectTrigger>
                            <SelectContent>
                              {measurementUnits.map(unit => (
                                <SelectItem key={unit.name} value={unit.name}>{unit.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary shrink-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] gap-1 px-2 w-full"
                          onClick={() => setEditingReference(param)}
                        >
                          <Settings2 className="h-3 w-3" /> Editar
                        </Button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch 
                                checked={param.isMandatory} 
                                onCheckedChange={(val) => updateParameter(param.id, 'isMandatory', val)}
                                className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Parâmetro obrigatório: precisa ser preenchido na digitação manual de resultados</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch 
                                checked={param.allowNegative} 
                                onCheckedChange={(val) => updateParameter(param.id, 'allowNegative', val)}
                                className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Neg. Permite digitar valores negativos para este parâmetro.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch 
                                checked={param.isCalculated} 
                                onCheckedChange={(val) => updateParameter(param.id, 'isCalculated', val)}
                                className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Calc. Parâmetro calculado automaticamente por fórmula. Não é editável manualmente.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch 
                                checked={param.isHidden} 
                                onCheckedChange={(val) => updateParameter(param.id, 'isHidden', val)}
                                className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Oculto Laudo: O parâmetro não será exibido na impressão do laudo.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                         <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeParameter(param.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                      </td>
                    </tr>
                    
                    {param.isCalculated && (
                      <tr>
                        <td colSpan={12} className="px-4 py-4 bg-muted/20 border-t border-b border-border">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-primary">
                              <Calculator className="h-3 w-3" />
                              Fórmula de cálculo de "{param.name || 'Novo Parâmetro'}"
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {availableVariables.filter(v => v !== param.name).map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => {
                                    const currentFormula = param.formula || ''
                                    updateParameter(param.id, 'formula', currentFormula + ` [${v}] `)
                                  }}
                                  className="px-2 py-1 rounded bg-white border border-border text-[10px] font-bold hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm"
                                >
                                  [{v}]
                                </button>
                              ))}
                              <button className="px-2 py-1 rounded bg-white border border-border text-[10px] font-bold opacity-50">{"{peso}"}</button>
                              <button className="px-2 py-1 rounded bg-white border border-border text-[10px] font-bold opacity-50">{"{sexo}"}</button>
                            </div>
                            <textarea
                              className="w-full h-16 p-3 rounded-lg border bg-white text-xs font-mono focus:ring-2 focus:ring-primary/20 outline-none resize-none shadow-inner"
                              placeholder="Ex: [Hematócrito] / [Hemácias] * 10"
                              value={param.formula}
                              onChange={(e) => updateParameter(param.id, 'formula', e.target.value)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {parameters.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground italic">
                      Nenhum parâmetro cadastrado. Clique em "Adicionar Parâmetro" para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ReferenceValuesModal 
          parameter={editingReference} 
          onClose={() => setEditingReference(null)} 
        />
      </Card>
    </TooltipProvider>
  )
}

function ReferenceValuesModal({ parameter, onClose }: { parameter: any, onClose: () => void }) {
  const [faixas, setFaixas] = useState<any[]>([
    { id: 1, description: 'Adulto Masculino', minAge: 18, maxAge: 150, sex: 'Masculino', isPregnant: false, minValue: '4.5', maxValue: '6.1' },
    { id: 2, description: 'Adulto Feminino', minAge: 18, maxAge: 150, sex: 'Feminino', isPregnant: false, minValue: '4', maxValue: '5.4' },
  ])

  const addFaixa = () => {
    const newId = faixas.length > 0 ? Math.max(...faixas.map(f => f.id)) + 1 : 1
    setFaixas([...faixas, { id: newId, description: '', minAge: 0, maxAge: 120, sex: 'Todos', isPregnant: false, minValue: '', maxValue: '' }])
  }

  const removeFaixa = (id: number) => {
    setFaixas(faixas.filter(f => f.id !== id))
  }

  if (!parameter) return null

  return (
    <Dialog open={!!parameter} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <DialogTitle>Valores de Referência — {parameter.name}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">Configure múltiplas faixas de referência com condições de idade, sexo e gestante.</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {faixas.map((faixa, idx) => (
            <div key={faixa.id} className="p-4 border border-border rounded-xl bg-muted/10 relative space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-white">Faixa {idx + 1}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFaixa(faixa.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Descrição (ex: Adulto Masculino)</Label>
                  <Input className="h-9 text-xs" value={faixa.description} placeholder="Ex: Adulto Masculino" onChange={() => {}} />
                </div>
                
                <div className="space-y-4 border-t pt-4 md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-emerald-600">Valor Mínimo</Label>
                    <Input className="h-9 text-xs font-bold" value={faixa.minValue} placeholder="0.0" onChange={() => {}} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-emerald-600">Valor Máximo</Label>
                    <Input className="h-9 text-xs font-bold" value={faixa.maxValue} placeholder="0.0" onChange={() => {}} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Idade Mín (anos)</Label>
                  <Input type="number" className="h-9 text-xs" value={faixa.minAge} onChange={() => {}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Idade Máx (anos)</Label>
                  <Input type="number" className="h-9 text-xs" value={faixa.maxAge} onChange={() => {}} />
                </div>

                <div className="flex items-center gap-4 md:col-span-2 bg-white/50 p-2 rounded-lg border border-dashed">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Sexo</Label>
                    <Select value={faixa.sex} onValueChange={() => {}}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todos">Todos</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={faixa.isPregnant} className="scale-75" />
                    <Label className="text-xs cursor-pointer">Gestante</Label>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full border-dashed gap-2 py-6" onClick={addFaixa}>
            <Plus className="h-4 w-4" /> Adicionar Faixa de Referência
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="gradient-bg text-white px-8" onClick={onClose}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReferenceSection() {
  return (
    <Card className="p-8 space-y-8">
       <div className="flex flex-col gap-4 items-center justify-center py-12 text-center border-2 border-dashed rounded-xl border-muted bg-muted/5">
          <div className="bg-primary/10 p-4 rounded-full">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Gerenciamento de Valores de Referência</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Os valores de referência agora são configurados individualmente por parâmetro na aba 
              <span className="font-bold text-primary"> "Parâmetros e Máscara"</span>.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="mt-4 gap-2"
            onClick={() => {
              const tabList = document.querySelector('[role="tablist"]')
              const parametersTab = tabList?.querySelector('[value="parameters"]') as HTMLButtonElement
              parametersTab?.click()
            }}
          >
            Ir para Parâmetros
          </Button>
       </div>
    </Card>
  )
}

function RulesSection() {
  return (
    <Card className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" /> Alertas de Atendimento
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título do Alerta</Label>
              <Input placeholder="Aviso importante ao recepcionista" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem detalhada</Label>
              <textarea className="w-full h-24 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="Ex: Exame requer jejum absoluto..." />
            </div>
            <div className="flex items-center justify-between">
              <Label>Exigir confirmação de leitura</Label>
              <Switch />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold">Monitoramento Clínico</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Crítico Mínimo</Label>
              <Input type="number" placeholder="0.0" />
            </div>
            <div className="space-y-2">
              <Label>Valor Crítico Máximo</Label>
              <Input type="number" placeholder="0.0" />
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Delta Check</p>
                <p className="text-[10px] text-muted-foreground">Validar variação histórica brusca.</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Variação permitida (%)</Label>
              <Input type="number" defaultValue={20} className="w-24 h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t space-y-4">
        <h3 className="text-lg font-bold">Exames Complementares</h3>
        <p className="text-xs text-muted-foreground">Informe exames que devem ser adicionados juntos a este.</p>
        <div className="flex gap-2">
           <Input placeholder="Ex: Creatinina, Ureia..." />
           <Button variant="outline">Buscar</Button>
        </div>
      </div>
    </Card>
  )
}

function PatientInfoSection() {
  const [questions, setQuestions] = useState<string[]>([
    "O paciente está em jejum há pelo menos 8 horas?"
  ]);

  const addQuestion = () => setQuestions([...questions, ""]);
  const removeQuestion = (index: number) => setQuestions(questions.filter((_, i) => i !== index));
  const updateQuestion = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ficha Técnica</Label>
            <textarea 
              className="w-full h-32 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
              placeholder="Informações técnicas do exame..." 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Orientações ao Paciente</Label>
            <textarea 
              className="w-full h-32 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
              placeholder="Ex: Jejum de 8 horas."
              defaultValue="Jejum de 8 horas."
            />
            <p className="text-[11px] text-muted-foreground">Essas orientações serão exibidas para a recepção durante o cadastro de atendimentos.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Observações do Laudo</Label>
            <textarea 
              className="w-full h-32 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
              placeholder="Ex: A partir de 01/2026 os valores de referência foram atualizados conforme nova diretriz..." 
            />
            <p className="text-[11px] text-muted-foreground">Esse texto será impresso no laudo, abaixo dos resultados deste exame.</p>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">Perguntas de Confirmação</h3>
              <p className="text-xs text-muted-foreground">Perguntas que o atendente deverá confirmar com o paciente ao adicionar este exame.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={addQuestion} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {questions.map((q, index) => (
            <div key={index} className="flex gap-3 items-center">
              <span className="text-xs text-muted-foreground font-medium w-4">{index + 1}.</span>
              <Input 
                value={q} 
                onChange={(e) => updateQuestion(index, e.target.value)}
                placeholder="Digite a pergunta..."
                className="flex-1"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeQuestion(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {questions.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed rounded-xl border-muted">
              <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
