import { useState, useEffect } from 'react'
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
  FileText
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useRegisters } from '@/context/RegistersContext'


export default function LabCatalogFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const [activeTab, setActiveTab] = useState('general')

  const { addExam, updateExam } = useRegisters()
  const [examData, setExamData] = useState({
    name: '',
    type: 'lab' as 'clinical' | 'lab',
    tussCode: '',
    isActive: true,
    preparationInstructions: '',
    estimatedDurationMinutes: 30,
    resultDeadlineDays: 1,
    requiresAuthorization: false,
  })

  useEffect(() => {
    if (isEditing) {
      // Em uma implementação real, buscaríamos os dados do exame pelo ID
      // Por enquanto, simulamos com os dados que já estavam no mock/default
      setExamData({
        name: "25-Hidroxivitamina D",
        type: 'lab',
        tussCode: "VITD",
        isActive: true,
        preparationInstructions: "Jejum de 8 horas.",
        estimatedDurationMinutes: 30,
        resultDeadlineDays: 1,
        requiresAuthorization: false,
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
        await addExam(examData as any)
        toast.success('Exame cadastrado!')
      }
      navigate('/app/cadastros/catalogo')
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
            <Switch defaultChecked />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <Label>Duração estimada (min)</Label>
          <Input 
            type="number" 
            value={data.estimatedDurationMinutes}
            onChange={(e) => onChange({ estimatedDurationMinutes: Number(e.target.value) })}
          />
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
          <Label>Prazo de Entrega (dias)</Label>
          <Input 
            type="number" 
            value={data.resultDeadlineDays}
            onChange={(e) => onChange({ resultDeadlineDays: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Prazo de Entrega (dias)</Label>
          <Input type="number" defaultValue={isEditing ? 3 : 0} />
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
          <Label>Ficha Técnica</Label>
          <textarea 
            className="w-full h-32 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
            placeholder="Informações técnicas do exame..." 
          />
        </div>
      </div>
    </Card>
  )
}

function ParametersSection() {
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([])

  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase.from('measurement_units').select('name').order('name')
      if (data) setMeasurementUnits(data)
    }
    fetchUnits()
  }, [])
  return (
    <Card className="p-8 space-y-8">
       <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Parâmetros e Máscara de Resultado</h3>
            <p className="text-xs text-muted-foreground">Configure os campos que serão preenchidos no laudo.</p>
          </div>
          <Button size="sm" className="gradient-bg text-white gap-2">
            <Plus className="h-4 w-4" /> Adicionar Parâmetro
          </Button>
       </div>

       <div className="border rounded-xl overflow-hidden bg-card">
         <table className="w-full text-left text-sm">
           <thead className="bg-muted/50 border-b">
             <tr>
               <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">Nome do Parâmetro</th>
               <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">Tipo</th>
               <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">Unidade</th>
               <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">Metodologia</th>
               <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">Máscara/Cálculo</th>
               <th className="px-4 py-3 text-right"></th>
             </tr>
           </thead>
           <tbody className="divide-y">
             <tr>
               <td className="px-4 py-3"><Input className="h-8 text-xs" defaultValue="Vitamina D" /></td>
               <td className="px-4 py-3">
                 <select className="h-8 px-2 rounded-md border text-xs outline-none bg-background">
                   <option>Editável</option>
                   <option>Calculado</option>
                   <option>Texto Livre</option>
                   <option>Seleção</option>
                 </select>
               </td>
               <td className="px-4 py-3">
                  <select className="h-8 px-2 rounded-md border text-xs outline-none bg-background w-full">
                    {measurementUnits.map(unit => (
                      <option key={unit.name} value={unit.name}>{unit.name}</option>
                    ))}
                  </select>
               </td>
               <td className="px-4 py-3">
                 <select className="h-8 px-2 rounded-md border text-xs outline-none bg-background">
                   <option>Quimioluminescência</option>
                 </select>
               </td>
               <td className="px-4 py-3">
                 <Input className="h-8 text-xs font-mono" placeholder="Ex: ##.#" defaultValue="##.#" />
               </td>
               <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
               </td>
             </tr>
           </tbody>
         </table>
       </div>

       <div className="pt-6 border-t space-y-4">
         <div className="flex items-center gap-2">
           <Layout className="h-5 w-5 text-primary" />
           <h4 className="font-bold text-sm">Layout da Máscara de Resultado</h4>
         </div>
         <div className="p-4 bg-muted/20 border border-dashed rounded-xl min-h-[150px] space-y-4">
            <p className="text-[10px] text-muted-foreground font-mono">Editor de Rich Text / HTML para o laudo (Simulação)</p>
            <div className="w-full h-32 bg-card border rounded p-4 text-sm font-mono flex flex-col gap-2">
               <div className="flex justify-between border-b pb-1 font-bold">
                 <span>PARÂMETRO</span>
                 <span>RESULTADO</span>
                 <span>VALOR DE REFERÊNCIA</span>
               </div>
               <div className="flex justify-between py-1">
                 <span>Vitamina D</span>
                 <span className="bg-primary/5 px-2 rounded border border-primary/20">{"{vitamina_d}"} ng/mL</span>
                 <span className="text-muted-foreground italic">Ver tabela abaixo</span>
               </div>
            </div>
         </div>
       </div>
    </Card>
  )
}

function ReferenceSection() {
  return (
    <Card className="p-8 space-y-8">
       <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Valores de Referência</h3>
            <p className="text-xs text-muted-foreground">Configure faixas dinâmicas baseadas em sexo e idade.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Nova Faixa
          </Button>
       </div>

       <div className="space-y-6">
         <div className="p-6 border border-border rounded-xl bg-muted/20 space-y-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Badge className="gradient-bg">Vitamina D</Badge>
               <span className="text-xs text-muted-foreground">ng/mL</span>
             </div>
             <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             <div className="space-y-1.5">
               <Label className="text-[10px] font-bold uppercase">Sexo</Label>
               <select className="w-full h-8 px-2 rounded-md border bg-background text-[11px] outline-none">
                 <option>Todos</option>
                 <option>Masculino</option>
                 <option>Feminino</option>
               </select>
             </div>
             <div className="space-y-1.5">
               <Label className="text-[10px] font-bold uppercase">Idade De</Label>
               <div className="flex gap-1">
                 <Input className="h-8 px-2 text-[11px]" defaultValue={0} />
                 <select className="h-8 px-1 rounded-md border bg-background text-[10px] outline-none">
                   <option>Anos</option>
                   <option>Meses</option>
                   <option>Dias</option>
                 </select>
               </div>
             </div>
             <div className="space-y-1.5">
               <Label className="text-[10px] font-bold uppercase">Idade Até</Label>
               <div className="flex gap-1">
                 <Input className="h-8 px-2 text-[11px]" defaultValue={120} />
                 <select className="h-8 px-1 rounded-md border bg-background text-[10px] outline-none">
                   <option>Anos</option>
                 </select>
               </div>
             </div>
             <div className="space-y-1.5">
               <Label className="text-[10px] font-bold uppercase text-emerald-600">Mínimo</Label>
               <Input className="h-8 px-2 text-[11px]" defaultValue={30} />
             </div>
             <div className="space-y-1.5">
               <Label className="text-[10px] font-bold uppercase text-emerald-600">Máximo</Label>
               <Input className="h-8 px-2 text-[11px]" defaultValue={100} />
             </div>
           </div>
           <div className="space-y-1.5">
             <Label className="text-[10px] font-bold uppercase">Texto de Referência (Opcional)</Label>
             <Input className="h-8 px-2 text-[11px]" placeholder="Ex: Negativo, Não Reagente..." />
           </div>
         </div>
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
