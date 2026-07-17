import { useState } from 'react'
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
  Layout
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function LabCatalogFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const [activeTab, setActiveTab] = useState('general')

  const handleSave = () => {
    toast.success(isEditing ? 'Exame atualizado!' : 'Exame cadastrado!')
    navigate('/app/cadastros/catalogo')
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
          <GeneralInfoSection />
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

function GeneralInfoSection() {
  const materials = ['Sangue Total', 'Soro', 'Plasma', 'Urina', 'Fezes', 'Secreção', 'Líquor', 'Swab']
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(['Soro'])
  const [defaultMaterial, setDefaultMaterial] = useState('Soro')

  const toggleMaterial = (mat: string) => {
    setSelectedMaterials(prev => 
      prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]
    )
  }

  return (
    <Card className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2 lg:col-span-2">
          <Label>Nome do Exame *</Label>
          <Input placeholder="Ex: Hemograma Completo" defaultValue="25-Hidroxivitamina D" />
        </div>
        <div className="space-y-2">
          <Label>Código *</Label>
          <Input placeholder="Ex: HMG" defaultValue="VITD" />
        </div>
        <div className="space-y-2">
          <Label>Unidade de Medida</Label>
          <div className="flex gap-2">
            <select className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
              <option>ng/mL</option>
              <option>mg/dL</option>
              <option>U/L</option>
            </select>
            <Button variant="outline" size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Prazo de Entrega (dias) *</Label>
          <Input type="number" defaultValue={1} />
        </div>
        <div className="space-y-2">
          <Label>Bancada *</Label>
          <select className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option>Bioquímica</option>
            <option>Hematologia</option>
            <option>Imunologia</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Materiais aceitos *</Label>
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
          <select className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20">
            <option>-- Não definido --</option>
            <option>Bancada Bioquímica</option>
          </select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Ficha Técnica</Label>
          <textarea className="w-full h-24 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="Informações técnicas internas..." />
        </div>
      </div>
    </Card>
  )
}

function ParametersSection() {
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
                 <select className="h-8 px-2 rounded-md border text-xs outline-none bg-background">
                   <option>ng/mL</option>
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
  return (
    <Card className="p-8 space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Orientações ao Paciente</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Instruções de Preparo</Label>
            <textarea className="w-full h-32 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" defaultValue={"- Jejum de 8 a 12 horas.\n- Água pode ser consumida moderadamente.\n- Evitar bebidas alcoólicas 24h antes."} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Prazo de entrega ao paciente (dias)</Label>
              <Input type="number" defaultValue={1} />
            </div>
            <div className="flex items-center justify-between pt-8">
              <Label>Exibir orientações no comprovante?</Label>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
