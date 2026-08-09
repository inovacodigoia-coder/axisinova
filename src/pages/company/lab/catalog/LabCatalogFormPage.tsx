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
  MoreVertical,
  Loader2,
  ArrowLeftRight,
  Link,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  Check
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
  const [isSaving, setIsSaving] = useState(false)

  const { addExam, updateExam, exams, workbenches } = useRegisters() as any
  
  // Make context available globally for sub-sections
  useEffect(() => {
    ;(window as any)._allExams = exams;
    ;(window as any)._workbenches = workbenches;
  }, [exams, workbenches])
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
    methodology: '',
    interfacingConfig: {
      equipmentId: '',
      equipmentCode: '',
      autoReceiveResults: true,
      autoSendOrders: true,
    },
    interfacingParameters: [] as {
      parameterName: string;
      machineCode: string;
      criticalAlert: boolean;
      criticalLimit: string;
    }[],
    selectedMaterials: [] as string[],
    defaultMaterial: '',
    workbenchId: '',
    referenceValues: [] as any[],
  })

  const [parameters, setParameters] = useState<any[]>([])
  const [confirmationQuestions, setConfirmationQuestions] = useState<string[]>([])

  useEffect(() => {
    if (isEditing && exams && exams.length > 0) {
      const existingExam = exams.find((e: any) => e.id === id)
      if (existingExam) {
        setExamData({
          name: existingExam.name || "",
          internalCode: existingExam.internalCode || "",
          type: existingExam.type || 'lab',
          tussCode: existingExam.tussCode || "",
          isActive: existingExam.isActive ?? true,
          preparationInstructions: existingExam.preparationInstructions || "",
          estimatedDurationMinutes: existingExam.estimatedDurationMinutes || 30,
          resultDeadlineDays: existingExam.resultDeadlineDays || 1,
          requiresAuthorization: existingExam.requiresAuthorization || false,
          showDuration: existingExam.showDuration ?? true,
          showDeadline: existingExam.showDeadline ?? true,
          measurementUnit: existingExam.measurementUnit || "",
          specialtyId: existingExam.specialtyId || "",
          defaultOrigin: existingExam.defaultOrigin || "",
          defaultDestination: existingExam.defaultDestination || "",
          reportObservations: existingExam.reportObservations || "",
          methodology: existingExam.methodology || "",
          interfacingConfig: existingExam.interfacingConfig || {
            equipmentId: '',
            equipmentCode: '',
            autoReceiveResults: true,
            autoSendOrders: true,
          },
          interfacingParameters: existingExam.interfacingParameters || [],
          selectedMaterials: existingExam.selectedMaterials || [],
          defaultMaterial: existingExam.defaultMaterial || "",
          workbenchId: existingExam.workbenchId || "",
          referenceValues: existingExam.referenceValues || [],
        })
        setParameters(existingExam.parameters || [])
        setConfirmationQuestions(existingExam.confirmationQuestions || [])
      }
    }
  }, [isEditing, id, exams])

  // Effect to sync parameters back to examData for persistence
  useEffect(() => {
    setExamData(prev => ({ ...prev, parameters }))
  }, [parameters])

  const handleSave = async () => {
    if (!examData.name) {
      toast.error('O nome do exame é obrigatório')
      return
    }

    setIsSaving(true)
    try {
      const finalData = {
        ...examData,
        parameters: parameters || [],
        confirmationQuestions: confirmationQuestions || [],
      }

      let examId = id;
      if (isEditing) {
        await updateExam({ 
          ...finalData, 
          id: id!
        } as any)
      } else {
        const newExam = await addExam({
          ...finalData,
          attachmentRules: [],
          isActive: examData.isActive ?? true,
          createdAt: new Date().toISOString()
        } as any)
        examId = newExam?.id;
      }

      // Save Parameters to the new table
      if (examId && (parameters.length > 0 || isEditing)) {
        // Get company_id from profile
        const { data: profile } = await supabase.auth.getUser();
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', profile.user?.id)
          .single();
        
        const companyId = profileData?.company_id;

        if (companyId) {
          // If editing, we might need to handle deletions or just refresh all
          // For safety in this complex wizard, we'll ensure parameters match the current state
          
          // Upsert parameters
          for (const param of parameters) {
            const paramPayload = {
              exam_id: examId,
              company_id: companyId,
              name: param.name,
              section: param.section || '',
              equipment_code: param.equipCode || '',
              type: param.type || 'numerical',
              origin: param.origin || 'manual',
              unit: param.unit || '',
              is_required: param.isMandatory ?? true,
              allow_negative: param.allowNegative ?? false,
              is_calculated: param.isCalculated ?? false,
              is_hidden: param.isHidden ?? false,
              formula: param.formula || '',
              reference_values: param.referenceValues ? JSON.stringify(param.referenceValues) : null
            };

            // If param has a DB id, update it, otherwise search by name to avoid duplicates
            const { data: existingParam } = await supabase
              .from('lab_exam_parameters')
              .select('id')
              .eq('exam_id', examId)
              .eq('name', param.name)
              .maybeSingle();

            let parameterId = existingParam?.id;

            if (parameterId) {
              await supabase.from('lab_exam_parameters').update(paramPayload).eq('id', parameterId);
            } else {
              const { data: newParam } = await supabase
                .from('lab_exam_parameters')
                .insert(paramPayload)
                .select()
                .single();
              parameterId = newParam?.id;
            }
            
            // Now save reference values for this parameter
            if (parameterId && param.referenceValues && Array.isArray(param.referenceValues)) {
              // Delete existing ones for this parameter to refresh
              await supabase.from('lab_exam_reference_values').delete().eq('parameter_id', parameterId);
              
              const refValuesToInsert = param.referenceValues.map((ref: any) => ({
                exam_id: examId,
                parameter_id: parameterId,
                company_id: companyId,
                internal_code: examData.internalCode,
                description: ref.description || '',
                min_value: ref.minValue?.toString() || null,
                max_value: ref.maxValue?.toString() || null,
                text_range: ref.textRange || null,
                age_min: ref.minAge ?? 0,
                age_max: ref.maxAge ?? 150,
                gender: ref.sex || 'both',
                parameter_name: param.name
              }));

              if (refValuesToInsert.length > 0) {
                await supabase.from('lab_exam_reference_values').insert(refValuesToInsert);
              }
            }
          }
        }
      }

      
      toast.success(isEditing ? 'Exame atualizado com sucesso!' : 'Exame cadastrado com sucesso!')
      
      // Delay navigation slightly to allow state to synchronize
      setTimeout(() => {
        navigate('/app/cadastros/catalogo')
      }, 500)
    } catch (error: any) {
      console.error('Erro ao salvar exame:', error)
      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Erro ao salvar o exame. Por favor, tente novamente.')
      toast.error(errorMsg)
    } finally {
      setIsSaving(false)
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
            <p className="text-xs text-muted-foreground">{isEditing ? `${examData?.internalCode || 'S/C'} - ${examData?.name || 'Carregando...'}` : 'Preencha os dados do novo exame'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <Label className="text-xs font-bold uppercase tracking-wider">Ativo</Label>
            <Switch 
              checked={examData?.isActive ?? true} 
              onCheckedChange={(val) => setExamData(prev => ({ ...prev, isActive: val }))} 
              className="border border-border/50"
            />
          </div>
          <Button variant="outline" onClick={() => navigate('/app/cadastros/catalogo')} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="gradient-bg text-white gap-2 px-6"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Exame'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto w-full justify-start gap-1 flex-wrap">
          <TabsTrigger value="general" className="gap-2 px-4 py-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Info className="h-4 w-4" /> Informações Gerais
          </TabsTrigger>
          <TabsTrigger value="parameters" className="gap-2 px-4 py-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Settings2 className="h-4 w-4" /> Parâmetros e Máscara
          </TabsTrigger>
          <TabsTrigger value="interfacing" className="gap-2 px-4 py-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <ArrowLeftRight className="h-4 w-4" /> Interfaceamento
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2 px-4 py-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <ShieldCheck className="h-4 w-4" /> Alertas e Regras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralInfoSection 
            isEditing={isEditing} 
            data={examData} 
            workbenches={workbenches}
            onChange={(newData) => setExamData(prev => ({ ...prev, ...newData }))} 
          />
        </TabsContent>
        <TabsContent value="parameters">
          <ParametersSection 
            parameters={parameters} 
            setParameters={setParameters} 
          />
        </TabsContent>

        <TabsContent value="interfacing">
          <InterfacingSection 
            config={examData.interfacingConfig} 
            params={examData.interfacingParameters}
            internalParameters={parameters}
            onChange={(newData) => setExamData(prev => ({ ...prev, ...newData }))}
          />
        </TabsContent>
        <TabsContent value="rules">
           <RulesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeneralInfoSection({ isEditing, data, workbenches, onChange }: { isEditing: boolean, data: any, workbenches: any[], onChange: (val: any) => void }) {
  const navigate = useNavigate()
  const materials = ['Sangue Total', 'Soro', 'Plasma', 'Urina', 'Fezes', 'Secreção', 'Líquor', 'Swab']
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(data.selectedMaterials || [])
  const [defaultMaterial, setDefaultMaterial] = useState(data.defaultMaterial || "")
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([])

  useEffect(() => {
    if (data.selectedMaterials) setSelectedMaterials(data.selectedMaterials)
    if (data.defaultMaterial) setDefaultMaterial(data.defaultMaterial)
  }, [data.selectedMaterials, data.defaultMaterial])

  useEffect(() => {
    const fetchUnits = async () => {
      const { data: units, error } = await supabase
        .from('measurement_units')
        .select('name')
        .order('name')
      
      if (!error && units) {
        setMeasurementUnits(units)
      }
    }
    fetchUnits()
  }, [])

  const toggleMaterial = (mat: string) => {
    setSelectedMaterials(prev => {
      const newMaterials = prev.includes(mat) 
        ? prev.filter(m => m !== mat) 
        : [...prev, mat]
      
      // Use setExamData to ensure it persists in the form state
      onChange({ selectedMaterials: newMaterials })
      return newMaterials
    })
  }

  const handleSetDefault = (mat: string) => {
    setDefaultMaterial(mat)
    onChange({ defaultMaterial: mat })
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
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Bancada Técnica</Label>
          <Select 
            value={data.workbenchId || ''} 
            onValueChange={(val) => onChange({ workbenchId: val })}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Selecione a bancada" />
            </SelectTrigger>
            <SelectContent>
              {workbenches && workbenches.length > 0 ? (
                workbenches.map(wb => (
                  <SelectItem key={wb.id} value={wb.id}>{wb.name}</SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>Nenhuma bancada cadastrada</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Unidade de Medida</Label>
          <Select 
            value={data.measurementUnit || ''} 
            onValueChange={(val) => onChange({ measurementUnit: val })}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {measurementUnits && measurementUnits.length > 0 ? (
                measurementUnits.map((unit: any) => (
                  <SelectItem key={unit.name} value={unit.name}>{unit.name}</SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>Nenhuma unidade cadastrada</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-border/50">
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Prazo Entrega (Dias)</Label>
          <div className="flex items-center gap-3 h-11 px-4 bg-muted/20 rounded-xl border border-border/50">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="number"
              min="0"
              value={data.resultDeadlineDays || 0}
              onChange={(e) => onChange({ resultDeadlineDays: parseInt(e.target.value) || 0 })}
              className="border-none bg-transparent h-auto p-0 focus-visible:ring-0 text-base font-medium"
            />
          </div>
        </div>
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Duração Estimada (Min)</Label>
          <div className="flex items-center gap-3 h-11 px-4 bg-muted/20 rounded-xl border border-border/50">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <Input 
              type="number"
              min="0"
              value={data.estimatedDurationMinutes || 0}
              onChange={(e) => onChange({ estimatedDurationMinutes: parseInt(e.target.value) || 0 })}
              className="border-none bg-transparent h-auto p-0 focus-visible:ring-0 text-base font-medium"
            />
          </div>
        </div>
        <div className="space-y-4 flex flex-col justify-end">
          <div className="flex items-center gap-3 h-11 px-4 bg-muted/20 rounded-xl border border-border/50">
            <Switch 
              checked={data.isActive ?? true}
              onCheckedChange={(val) => onChange({ isActive: val })}
            />
            <Label className="text-sm font-medium cursor-pointer">Exame Ativo</Label>
          </div>
        </div>
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Código TUSS</Label>
          <Input 
            placeholder="Ex: 40302534" 
            value={data.tussCode}
            onChange={(e) => onChange({ tussCode: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border/50">
        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Materiais Aceitos</Label>
        <div className="flex flex-wrap gap-2">
          {['Sangue Total', 'Soro', 'Plasma', 'Urina', 'Fezes', 'Secreção', 'Líquor', 'Swab'].map(mat => (
            <button
              key={mat}
              type="button"
              onClick={() => toggleMaterial(mat)}
              onDoubleClick={() => handleSetDefault(mat)}
              className={cn(
                "px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center gap-2",
                selectedMaterials.includes(mat) 
                  ? "bg-primary/5 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]" 
                  : "bg-background border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {defaultMaterial === mat && <Star className="h-3 w-3 fill-primary text-primary" />}
              {mat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Orientações ao Paciente</Label>
          <textarea 
            className="w-full h-32 p-4 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none shadow-sm transition-all" 
            placeholder="Ex: Jejum de 8 horas. Não ingerir bebidas alcoólicas 24h antes..."
            value={data.preparationInstructions}
            onChange={(e) => onChange({ preparationInstructions: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Exibido para a recepção durante o cadastro.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Observações do Laudo</Label>
          <textarea 
            className="w-full h-32 p-4 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none shadow-sm transition-all" 
            placeholder="Ex: Valores de referência atualizados conforme nova diretriz da SBPC..." 
            value={data.reportObservations}
            onChange={(e) => onChange({ reportObservations: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Impresso no laudo, abaixo dos resultados.
          </p>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-border">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Metodologia Analítica</h3>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Ex: Colorimétrico, Enzimático, etc." 
            value={data.methodology}
            onChange={(e) => onChange({ methodology: e.target.value })}
            className="h-11"
          />
          <Button variant="outline" className="h-11 gap-2">
            <Search className="h-4 w-4" /> Buscar Metodologia
          </Button>
        </div>
      </div>

      {data.referenceValues && data.referenceValues.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Valores de Referência do Exame</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Estes são os valores de referência globais configurados para este exame. Para referências específicas por parâmetro, utilize a aba 
            <span className="font-bold text-primary"> "Parâmetros e Máscara"</span>.
          </p>
          
          <div className="bg-muted/10 border rounded-xl p-4">
            <ReferenceValuesSection 
              parameter={{ name: data.name }} 
              referenceValues={data.referenceValues}
            />
          </div>
        </div>
      )}


      <div className="space-y-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Perguntas de Confirmação</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            const newQuestions = [...(data.confirmationQuestions || []), ""];
            onChange({ confirmationQuestions: newQuestions });
          }} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar Pergunta
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Perguntas que o atendente deverá confirmar com o paciente ao adicionar este exame.</p>
        
        <div className="space-y-3">
          {(data.confirmationQuestions || []).map((q: string, index: number) => (
            <div key={index} className="flex gap-3 items-center">
              <Input 
                value={q} 
                onChange={(e) => {
                  const newQuestions = [...data.confirmationQuestions];
                  newQuestions[index] = e.target.value;
                  onChange({ confirmationQuestions: newQuestions });
                }}
                placeholder="Ex: Está em uso de algum medicamento?"
                className="h-10"
              />
              <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500" onClick={() => {
                const newQuestions = data.confirmationQuestions.filter((_: any, i: number) => i !== index);
                onChange({ confirmationQuestions: newQuestions });
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!data.confirmationQuestions || data.confirmationQuestions.length === 0) && (
            <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
              Nenhuma pergunta de confirmação cadastrada.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function ParametersSection({ parameters, setParameters }: { parameters: any[], setParameters: (p: any[]) => void }) {
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([])
  const [editingReference, setEditingReference] = useState<any>(null)

  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase.from('measurement_units').select('name').order('name')
      if (data) setMeasurementUnits(data)
    }
    fetchUnits()
  }, [])

  const addParameter = () => {
    const newId = (parameters && parameters.length > 0) ? Math.max(...parameters.map(p => p.id)) + 1 : 1
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

  const handleSaveReference = (referenceData: any) => {
    if (!editingReference) return;
    updateParameter(editingReference.id, 'referenceValues', referenceData.referenceValues);
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
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Beaker className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Parâmetros do Exame</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Definição técnica e valores de referência</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2 border-primary/20 hover:border-primary/50 text-primary" onClick={addParameter}>
              <Plus className="h-4 w-4" /> Adicionar Parâmetro
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Vincular existente
            </Button>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden bg-card shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-3 font-bold text-[10px] uppercase text-muted-foreground w-8 text-center border-r">#</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground min-w-[220px]">Nome do Parâmetro</th>
                  <th className="px-2 py-3 font-bold text-[10px] uppercase text-muted-foreground w-16 text-center">Seção</th>
                  <th className="px-2 py-3 font-bold text-[10px] uppercase text-muted-foreground w-16 text-center">Equip.</th>
                  <th className="px-3 py-3 font-bold text-[10px] uppercase text-muted-foreground w-28">Tipo</th>
                  <th className="px-3 py-3 font-bold text-[10px] uppercase text-muted-foreground w-28">Origem</th>
                  <th className="px-3 py-3 font-bold text-[10px] uppercase text-muted-foreground w-32">Unidade</th>
                  <th className="px-3 py-3 font-bold text-[10px] uppercase text-muted-foreground w-24 text-center">Ref.</th>
                  <th className="px-2 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Obrig</th>
                  <th className="px-2 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Neg</th>
                  <th className="px-2 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Calc</th>
                  <th className="px-2 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">Oculto</th>
                  <th className="px-3 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parameters && parameters.length > 0 && parameters.map((param, idx) => (
                  <React.Fragment key={param.id}>
                    <tr className="hover:bg-muted/10 transition-colors group">
                      <td className="px-3 py-2 text-[10px] text-muted-foreground font-bold text-center border-r bg-muted/5">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <Input 
                            className="h-8 text-xs font-semibold focus:ring-primary/20 border-transparent hover:border-border focus:border-primary group-hover:bg-white bg-transparent transition-all" 
                            value={param.name} 
                            onChange={(e) => updateParameter(param.id, 'name', e.target.value)}
                            placeholder="Ex: Hemoglobina"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                                <History className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Histórico de alterações</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-1 py-2">
                        <Input 
                          className="h-8 text-[10px] text-center uppercase border-transparent hover:border-border focus:border-primary group-hover:bg-white bg-transparent" 
                          value={param.section} 
                          onChange={(e) => updateParameter(param.id, 'section', e.target.value)}
                          placeholder="ER"
                        />
                      </td>
                      <td className="px-1 py-2">
                        <Input 
                          className="h-8 text-[10px] text-center border-transparent hover:border-border focus:border-primary group-hover:bg-white bg-transparent" 
                          value={param.equipCode} 
                          onChange={(e) => updateParameter(param.id, 'equipCode', e.target.value)}
                          placeholder="00"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={param.type} onValueChange={(val) => updateParameter(param.id, 'type', val)}>
                          <SelectTrigger className="h-8 text-[10px] border-transparent hover:border-border focus:border-primary group-hover:bg-white bg-transparent px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="numerical" className="text-[10px]">Numérico</SelectItem>
                            <SelectItem value="text" className="text-[10px]">Texto</SelectItem>
                            <SelectItem value="selection" className="text-[10px]">Seleção</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Select value={param.origin} onValueChange={(val) => updateParameter(param.id, 'origin', val)}>
                          <SelectTrigger className="h-8 text-[10px] border-transparent hover:border-border focus:border-primary group-hover:bg-white bg-transparent px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual" className="text-[10px]">Manual</SelectItem>
                            <SelectItem value="equipment" className="text-[10px]">Equipamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 items-center">
                          <Select value={param.unit} onValueChange={(val) => updateParameter(param.id, 'unit', val)}>
                            <SelectTrigger className="h-8 text-[10px] flex-1 border-transparent hover:border-border focus:border-primary group-hover:bg-white bg-transparent px-2">
                              <SelectValue placeholder="Unid." />
                            </SelectTrigger>
                            <SelectContent>
                              {measurementUnits.map(unit => (
                                <SelectItem key={unit.name} value={unit.name} className="text-[10px]">{unit.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Button 
                          variant={param.referenceValues?.length > 0 ? "outline" : "ghost"} 
                          size="sm" 
                          className={cn(
                            "h-7 text-[9px] gap-1 px-2 w-full uppercase font-bold transition-all",
                            param.referenceValues?.length > 0 ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/50" : "text-muted-foreground"
                          )}
                          onClick={() => setEditingReference(param)}
                        >
                          <Settings2 className="h-3 w-3" /> 
                          {param.referenceValues?.length > 0 ? `${param.referenceValues.length} Faixas` : 'Definir'}
                        </Button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-pointer">
                                <Switch 
                                  checked={param.isMandatory} 
                                  onCheckedChange={(val) => updateParameter(param.id, 'isMandatory', val)}
                                  className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                                />
                              </div>
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
                              <div className="cursor-pointer">
                                <Switch 
                                  checked={param.allowNegative} 
                                  onCheckedChange={(val) => updateParameter(param.id, 'allowNegative', val)}
                                  className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                                />
                              </div>
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
                              <div className="cursor-pointer">
                                <Switch 
                                  checked={param.isCalculated} 
                                  onCheckedChange={(val) => updateParameter(param.id, 'isCalculated', val)}
                                  className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                                />
                              </div>
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
                              <div className="cursor-pointer">
                                <Switch 
                                  checked={param.isHidden} 
                                  onCheckedChange={(val) => updateParameter(param.id, 'isHidden', val)}
                                  className="shadow-sm border border-border/50 data-[state=checked]:!bg-[#00D4FF] data-[state=unchecked]:!bg-[#ef4444]"
                                />
                              </div>
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
          onSave={handleSaveReference}
        />

      </Card>
    </TooltipProvider>
  )
}

function ReferenceValuesModal({ parameter, onClose, onSave }: { parameter: any, onClose: () => void, onSave?: (val: any) => void }) {
  const [faixas, setFaixas] = useState<any[]>([])

  useEffect(() => {
    if (parameter && parameter.referenceValues) {
      setFaixas(parameter.referenceValues)
    } else {
      setFaixas([
        { id: 1, description: 'Adulto Masculino', minAge: 18, maxAge: 150, sex: 'Masculino', isPregnant: false, minValue: '4.5', maxValue: '6.1' },
        { id: 2, description: 'Adulto Feminino', minAge: 18, maxAge: 150, sex: 'Feminino', isPregnant: false, minValue: '4', maxValue: '5.4' },
      ])
    }
  }, [parameter])

  const updateFaixa = (id: number, field: string, value: any) => {
    setFaixas(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

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
                  <Input 
                    className="h-9 text-xs" 
                    value={faixa.description} 
                    placeholder="Ex: Adulto Masculino" 
                    onChange={(e) => updateFaixa(faixa.id, 'description', e.target.value)} 
                  />
                </div>
                
                <div className="space-y-4 border-t pt-4 md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-emerald-600">Valor Mínimo</Label>
                    <Input 
                      className="h-9 text-xs font-bold" 
                      value={faixa.minValue} 
                      placeholder="0.0" 
                      onChange={(e) => updateFaixa(faixa.id, 'minValue', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-emerald-600">Valor Máximo</Label>
                    <Input 
                      className="h-9 text-xs font-bold" 
                      value={faixa.maxValue} 
                      placeholder="0.0" 
                      onChange={(e) => updateFaixa(faixa.id, 'maxValue', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Idade Mín (anos)</Label>
                  <Input 
                    type="number" 
                    className="h-9 text-xs" 
                    value={faixa.minAge} 
                    onChange={(e) => updateFaixa(faixa.id, 'minAge', Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Idade Máx (anos)</Label>
                  <Input 
                    type="number" 
                    className="h-9 text-xs" 
                    value={faixa.maxAge} 
                    onChange={(e) => updateFaixa(faixa.id, 'maxAge', Number(e.target.value))} 
                  />
                </div>

                <div className="flex items-center gap-4 md:col-span-2 bg-white/50 p-2 rounded-lg border border-dashed">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Sexo</Label>
                    <Select value={faixa.sex} onValueChange={(val) => updateFaixa(faixa.id, 'sex', val)}>
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
                    <Switch 
                      checked={faixa.isPregnant} 
                      className="scale-75" 
                      onCheckedChange={(val) => updateFaixa(faixa.id, 'isPregnant', val)}
                    />
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
          <Button className="gradient-bg text-white px-8" onClick={() => {
            if (onSave) {
              onSave({ referenceValues: faixas });
            }
            onClose();
          }}>Salvar</Button>
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

function ReferenceValuesSection({ parameter, referenceValues = [] }: { parameter?: any, referenceValues?: any[] }) {
  // If no reference values are provided, don't show anything
  if (!referenceValues || referenceValues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {referenceValues.map((faixa, idx) => (
          <div key={faixa.id || idx} className="p-4 border border-border rounded-xl bg-background relative space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-muted/50">Faixa {idx + 1}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Descrição</Label>
                <div className="h-9 px-3 flex items-center bg-muted/20 rounded-lg text-xs font-medium">
                  {faixa.description || 'S/D'}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-emerald-600">Mínimo</Label>
                <div className="h-9 px-3 flex items-center bg-muted/20 rounded-lg text-xs font-bold text-emerald-700">
                  {faixa.minValue || '0.0'}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-emerald-600">Máximo</Label>
                <div className="h-9 px-3 flex items-center bg-muted/20 rounded-lg text-xs font-bold text-emerald-700">
                  {faixa.maxValue || '0.0'}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Idade Mín/Máx</Label>
                <div className="h-9 px-3 flex items-center bg-muted/20 rounded-lg text-xs">
                  {faixa.minAge ?? 0} a {faixa.maxAge ?? 150} anos
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Sexo</Label>
                <div className="h-9 px-3 flex items-center bg-muted/20 rounded-lg text-xs">
                  {faixa.sex || 'Todos'} {faixa.isPregnant ? '(Gestante)' : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



function MethodologySection({ methodology, onChange }: { methodology?: string, onChange: (val: string) => void }) {
  const commonMethodologies = [
    'Enzimático Colorimétrico',
    'Cromatografia Líquida de Alta Performance (HPLC)',
    'Imunoensaio Quimioluminescente (CLIA)',
    'Eletroforese',
    'Reação em Cadeia da Polimerase (PCR)',
    'Microscopia Direta',
    'Cultura Automatizada'
  ]

  return (
    <Card className="p-8 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Metodologia do Exame</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione ou descreva a metodologia utilizada para a realização deste exame. Esta informação será exibida no laudo final.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label>Metodologia Sugerida</Label>
          <div className="flex flex-wrap gap-2">
            {commonMethodologies.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onChange(m)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  methodology === m ? "bg-primary text-white border-primary" : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descrição Personalizada</Label>
          <textarea
            value={methodology}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-32 p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            placeholder="Descreva a metodologia detalhadamente..."
          />
        </div>
      </div>
    </Card>
  )
}

function InterfacingSection({ config, params, internalParameters, onChange }: { 
  config: any, 
  params: any[], 
  internalParameters: any[],
  onChange: (val: any) => void 
}) {
  const [equipments, setEquipments] = useState<any[]>([])
  
  useEffect(() => {
    const fetchEquipments = async () => {
      try {
        const { data, error } = await supabase.from('lab_equipments').select('*').eq('is_active', true)
        if (error) throw error
        if (data) setEquipments(data)
      } catch (err) {
        console.error('Error fetching equipments:', err)
      }
    }
    fetchEquipments()
  }, [])

  // Initialize mapping if parameters exist but mapping doesn't
  useEffect(() => {
    if (internalParameters && internalParameters.length > 0 && (!params || params.length === 0)) {
      const initialParams = internalParameters.map(p => ({
        parameterName: p.name || '',
        machineCode: '',
        criticalAlert: false,
        criticalLimit: ''
      }))
      onChange({ interfacingParameters: initialParams })
    }
  }, [internalParameters, params?.length])

  const updateConfig = (key: string, value: any) => {
    onChange({
      interfacingConfig: { ...config, [key]: value }
    })
  }

  const updateParam = (index: number, key: string, value: any) => {
    const newParams = [...params]
    newParams[index] = { ...newParams[index], [key]: value }
    onChange({ interfacingParameters: newParams })
  }

  return (
    <div className="space-y-6">
      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-2 border-b pb-4 mb-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Comunicação HL7</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Equipamento</Label>
            <Select 
              value={config?.equipmentId || ''} 
              onValueChange={(val) => updateConfig('equipmentId', val)}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecione o equipamento" />
              </SelectTrigger>
              <SelectContent>
                {equipments && equipments.length > 0 ? (
                  equipments.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} ({eq.model || 'S/M'})</SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Nenhum equipamento cadastrado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Código no Equipamento</Label>
            <Input 
              value={config?.equipmentCode || ''}
              onChange={(e) => updateConfig('equipmentCode', e.target.value)}
              placeholder="Ex: 10008"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-8 pt-2">
          <div className="flex items-center gap-3">
            <Switch 
              checked={config?.autoReceiveResults ?? true}
              onCheckedChange={(val) => updateConfig('autoReceiveResults', val)}
            />
            <Label className="text-sm font-medium cursor-pointer">Receber resultados automaticamente</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch 
              checked={config?.autoSendOrders ?? true}
              onCheckedChange={(val) => updateConfig('autoSendOrders', val)}
            />
            <Label className="text-sm font-medium cursor-pointer">Enviar pedidos ao equipamento</Label>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-2 border-b pb-4 mb-2">
          <ArrowLeftRight className="h-5 w-5 text-primary rotate-90" />
          <h3 className="text-lg font-bold">Mapeamento de Parâmetros</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-border/50">
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Parâmetro Interno</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Código Máquina</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Alerta Crítico</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Limite Crítico</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {params && params.length > 0 ? (
                params.map((param, idx) => param && (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="py-4 text-sm font-medium">{param.parameterName}</td>
                    <td className="py-4">
                      <Input 
                        value={param.machineCode}
                        onChange={(e) => updateParam(idx, 'machineCode', e.target.value)}
                        placeholder="ex: wbc"
                        className="h-9 w-48 text-xs rounded-lg"
                      />
                    </td>
                    <td className="py-4 text-center">
                      <Switch 
                        checked={param.criticalAlert}
                        onCheckedChange={(val) => updateParam(idx, 'criticalAlert', val)}
                        className="scale-75"
                      />
                    </td>
                    <td className="py-4">
                      <Input 
                        value={param.criticalLimit}
                        onChange={(e) => updateParam(idx, 'criticalLimit', e.target.value)}
                        placeholder="Valor"
                        className="h-9 w-24 text-xs rounded-lg"
                      />
                    </td>
                    <td className="py-4 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Link className={cn("h-4 w-4", param.machineCode ? "text-cyan-500" : "text-muted-foreground/30")} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {param.machineCode ? "Mapeado corretamente" : "Aguardando mapeamento"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground italic">
                    Nenhum parâmetro definido. Configure os parâmetros na aba "Parâmetros e Máscara" primeiro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
