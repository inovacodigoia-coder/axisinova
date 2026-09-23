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
  Check,
  Minus,
  SearchIcon,
  GripVertical
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import LabMethodologySearchModal from '@/components/lab/catalog/LabMethodologySearchModal'
import ExamReportSection from '@/components/lab/catalog/ExamReportSection'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const ageUnitLabel = (unit?: string) => {
  if (unit === 'meses') return 'meses'
  if (unit === 'semanas') return 'semanas'
  if (unit === 'dias') return 'dias'
  if (unit === 'valor' || unit === 'value') return 'valor'
  return 'anos'
}

const isValueUnit = (unit?: string) => unit === 'valor' || unit === 'value'

const normalizeAgeUnit = (unit?: string) => {
  if (unit === 'meses' || unit === 'months') return 'meses'
  if (unit === 'semanas' || unit === 'weeks') return 'semanas'
  if (unit === 'dias' || unit === 'days') return 'dias'
  if (unit === 'valor' || unit === 'value') return 'valor'
  return 'anos'
}


export default function LabCatalogFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const [activeTab, setActiveTab] = useState('general')
  const [isSaving, setIsSaving] = useState(false)
  const [showGlobalRefs, setShowGlobalRefs] = useState(false)

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
    reportTemplateId: '',
    reportSinglePage: false,

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
  // ===== Laudos do exame (cada laudo tem a sua própria configuração) =====
  const { laudos, reload: reloadLaudos } = useExamLaudos(isEditing ? id : undefined)
  const [selectedLaudoId, setSelectedLaudoId] = useState<string>('')
  const defaultLaudoId = laudos[0]?.id || ''
  const isDefaultLaudo = !selectedLaudoId || selectedLaudoId === defaultLaudoId
  const [confirmationQuestions, setConfirmationQuestions] = useState<string[]>([])
  const [availableEquipments, setAvailableEquipments] = useState<any[]>([])
  const [isMethodologySearchOpen, setIsMethodologySearchOpen] = useState(false)

  useEffect(() => {
    const fetchEquipments = async () => {
      const { data: profile } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', profile.user?.id)
        .single();

      if (profileData?.company_id) {
        const { data } = await supabase
          .from('lab_equipments' as any)
          .select('*')
          .eq('company_id', profileData.company_id)
          .eq('is_active', true)
          .order('name');
        
        setAvailableEquipments(data || []);
      }
    };
    fetchEquipments();
  }, []);

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
          reportTemplateId: (existingExam as any).reportTemplateId || "",
          reportSinglePage: (existingExam as any).reportSinglePage ?? false,
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
          for (const [paramIndex, param] of parameters.entries()) {
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
              sort_order: paramIndex + 1,
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
              
              const refValuesToInsert = param.referenceValues.map((ref: any) => {
                const refIsValueUnit = isValueUnit(normalizeAgeUnit(ref.ageUnit));
                // Na unidade "Valor", os limites do resultado podem ser texto (ex.: "<50")
                const boundText = (v: any) => {
                  const s = v == null ? '' : String(v).trim();
                  return s === '' ? null : s;
                };
                const ageInt = (v: any) => {
                  const n = Math.round(Number(v));
                  return isFinite(n) ? n : 0;
                };
                return {
                  exam_id: examId,
                  parameter_id: parameterId,
                  company_id: companyId,
                  internal_code: examData.internalCode,
                  description: ref.description || '',
                  min_value: ref.minValue?.toString() || null,
                  max_value: ref.maxValue?.toString() || null,
                  text_range: ref.textRange || null,
                  age_min: refIsValueUnit ? 0 : ageInt(ref.minAge ?? 0),
                  age_max: refIsValueUnit ? 0 : ageInt(ref.maxAge ?? 150),
                  age_unit: normalizeAgeUnit(ref.ageUnit),
                  value_min: refIsValueUnit ? boundText(ref.minAge) : null,
                  value_max: refIsValueUnit ? boundText(ref.maxAge) : null,


                  gender: ref.sex || 'both',
                  use_fasting: !!ref.useFasting,
                  is_fasting: !!ref.isFasting,
                  parameter_name: param.name
                };
              });

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
          <TabsTrigger value="report" className="gap-2 px-4 py-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <FileText className="h-4 w-4" /> Laudo do Exame
          </TabsTrigger>
          <TabsTrigger value="parameters" className="gap-2 px-4 py-2 data-[state=active]:gradient-bg data-[state=active]:text-white">
            <Settings2 className="h-4 w-4" /> Parâmetros e Máscara
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
            showGlobalRefs={showGlobalRefs}
            setShowGlobalRefs={setShowGlobalRefs}
            onChange={(newData) => setExamData(prev => ({ ...prev, ...newData }))} 
            onOpenMethodologySearch={() => setIsMethodologySearchOpen(true)}
          />
        </TabsContent>
        <TabsContent value="report">
          <ExamReportSection
            data={examData}
            parameters={parameters}
            onChange={(newData) => setExamData(prev => ({ ...prev, ...newData }))}
          />
        </TabsContent>
        <TabsContent value="parameters">
          <ParametersSection 
            parameters={parameters} 
            setParameters={setParameters} 
            currentExamId={id}
            exams={exams}
          />
        </TabsContent>
        <TabsContent value="rules">
           <RulesSection />
        </TabsContent>
      </Tabs>

      <LabMethodologySearchModal 
        isOpen={isMethodologySearchOpen}
        onClose={() => setIsMethodologySearchOpen(false)}
        onSelect={(method) => setExamData(prev => ({ ...prev, methodology: method.name }))}
        currentValue={examData.methodology}
      />
    </div>
  )
}

function GeneralInfoSection({ 
  isEditing, 
  data, 
  workbenches, 
  onChange, 
  showGlobalRefs, 
  setShowGlobalRefs,
  onOpenMethodologySearch 
}: { 
  isEditing: boolean, 
  data: any, 
  workbenches: any[], 
  onChange: (val: any) => void, 
  showGlobalRefs: boolean, 
  setShowGlobalRefs: (val: boolean) => void,
  onOpenMethodologySearch: () => void
}) {
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
        <MethodologyPicker
          value={data.methodology}
          onChange={(val) => onChange({ methodology: val })}
          onOpenSearch={onOpenMethodologySearch}
        />
      </div>

      {data.referenceValues && data.referenceValues.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-border">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setShowGlobalRefs(!showGlobalRefs)}
          >
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Valores de Referência do Exame</h3>
              <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20">
                {data.referenceValues.length} {data.referenceValues.length === 1 ? 'faixa' : 'faixas'}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full group-hover:bg-muted transition-colors">
              {showGlobalRefs ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          
          {showGlobalRefs && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mt-8">
        <p className="text-xs text-primary font-mono leading-relaxed opacity-80 italic">
          '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
          <br /><br />
          No Editar Exame na parte de Valores de Referência do Exame
          <br /><br />
          Vamos colocar um icone + que vai mostrar todas as Referência e muda para um icone de - quando estiver mostrando os Valores de Referência do Exame
          <br /><br />
          Sempre que abrir um exame os Valores de Referência do Exame vai vir oculto e com o icone + para mostrar tambem vamos colocar um campo contador mostrando quantas faixas foram criadas para esse exame.
        </p>
      </div>
    </Card>
  )
}

function ParametersSection({
  parameters,
  setParameters,
  currentExamId,
  exams,
}: {
  parameters: any[];
  setParameters: (p: any[]) => void;
  currentExamId?: string;
  exams: any[];
}) {
  const [measurementUnits, setMeasurementUnits] = useState<any[]>([])
  const [editingReference, setEditingReference] = useState<any>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const moveParameter = (from: number, to: number) => {
    if (from === to || from == null || to == null) return
    const next = [...parameters]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setParameters(next)
  }

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

  const externalVariables = useMemo(() => {
    const referencedCodes = parameters.flatMap((param: any) =>
      Array.from(String(param.formula || '').matchAll(/\{\s*([^}]+?)\s*\}/g), match => match[1].trim().toUpperCase()),
    )
    return Array.from(new Set(referencedCodes))
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
                  <th className="px-2 py-3 font-bold text-[10px] uppercase text-muted-foreground w-14 text-center border-r">#</th>
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
                    <tr
                      className={cn(
                        "hover:bg-muted/10 transition-colors group",
                        dragIndex === idx && "opacity-50",
                        overIndex === idx && dragIndex !== null && dragIndex !== idx && "border-t-2 border-t-primary"
                      )}
                      onDragOver={(e) => { if (dragIndex !== null) { e.preventDefault(); setOverIndex(idx) } }}
                      onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) moveParameter(dragIndex, idx); setDragIndex(null); setOverIndex(null) }}
                    >
                      <td
                        className="px-2 py-2 text-[10px] text-muted-foreground font-bold text-center border-r bg-muted/5 cursor-grab active:cursor-grabbing select-none"
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragIndex(idx) }}
                        onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                        title="Arraste para reordenar"
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <GripVertical className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                          {idx + 1}
                        </div>
                      </td>
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
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => updateParameter(param.id, 'isMandatory', !param.isMandatory)}
                            className={cn(
                              "h-5 w-8 rounded-full transition-all relative flex items-center border border-border/50 shadow-sm",
                              param.isMandatory ? "bg-[#00D4FF]" : "bg-muted"
                            )}
                          >
                            <div className={cn(
                              "h-3 w-3 rounded-full bg-white shadow-sm transition-all absolute",
                              param.isMandatory ? "left-[16px]" : "left-[3px]"
                            )} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => updateParameter(param.id, 'allowNegative', !param.allowNegative)}
                            className={cn(
                              "h-5 w-8 rounded-full transition-all relative flex items-center border border-border/50 shadow-sm",
                              param.allowNegative ? "bg-[#00D4FF]" : "bg-muted"
                            )}
                          >
                            <div className={cn(
                              "h-3 w-3 rounded-full bg-white shadow-sm transition-all absolute",
                              param.allowNegative ? "left-[16px]" : "left-[3px]"
                            )} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => updateParameter(param.id, 'isCalculated', !param.isCalculated)}
                            className={cn(
                              "h-5 w-8 rounded-full transition-all relative flex items-center border border-border/50 shadow-sm",
                              param.isCalculated ? "bg-[#00D4FF]" : "bg-muted"
                            )}
                          >
                            <div className={cn(
                              "h-3 w-3 rounded-full bg-white shadow-sm transition-all absolute",
                              param.isCalculated ? "left-[16px]" : "left-[3px]"
                            )} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => updateParameter(param.id, 'isHidden', !param.isHidden)}
                            className={cn(
                              "h-5 w-8 rounded-full transition-all relative flex items-center border border-border/50 shadow-sm",
                              param.isHidden ? "bg-[#00D4FF]" : "bg-muted"
                            )}
                          >
                            <div className={cn(
                              "h-3 w-3 rounded-full bg-white shadow-sm transition-all absolute",
                              param.isHidden ? "left-[16px]" : "left-[3px]"
                            )} />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                         <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted rounded-full">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem 
                                  className="text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer gap-2"
                                  onClick={() => removeParameter(param.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                      </td>
                    </tr>
                    
                    {param.type === 'selection' && (
                      <tr>
                        <td colSpan={13} className="px-4 py-3 bg-cyan-50/40 border-t border-b border-cyan-100">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-cyan-700">
                              <Settings2 className="h-3 w-3" />
                              Opções de seleção de "{param.name || 'Parâmetro'}" — exibidas na Digitação de Resultados
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(param.options || []).map((opt: string, oi: number) => (
                                <div key={oi} className="flex items-center gap-1 bg-white border border-cyan-200 rounded-md pl-2 pr-1 py-0.5 shadow-sm">
                                  <input
                                    className="text-[10px] font-bold text-slate-700 outline-none bg-transparent w-28"
                                    value={opt}
                                    placeholder="Ex: Reagente"
                                    onChange={(e) => {
                                      const next = [...(param.options || [])]
                                      next[oi] = e.target.value
                                      updateParameter(param.id, 'options', next)
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-red-500"
                                    onClick={() => updateParameter(param.id, 'options', (param.options || []).filter((_: string, i: number) => i !== oi))}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 text-[9px] gap-1 border-cyan-300 text-cyan-700"
                                onClick={() => updateParameter(param.id, 'options', [...(param.options || []), ''])}
                              >
                                + Opção
                              </Button>
                            </div>
                            {(!param.options || param.options.length === 0) && (
                              <p className="text-[9px] italic text-muted-foreground">
                                Nenhuma opção cadastrada. Adicione as opções (ex.: Reagente / Não Reagente) para que apareçam como lista na digitação.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {param.isCalculated && (
                      <tr>
                        <td colSpan={13} className="px-4 py-3 bg-blue-50/30 border-t border-b border-blue-100">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-blue-600">
                              <Calculator className="h-3 w-3" />
                              Fórmula de cálculo de "{param.name || 'Parâmetro'}"
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {availableVariables.filter(v => v !== param.name).map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => {
                                    const currentFormula = param.formula || ''
                                    updateParameter(param.id, 'formula', currentFormula + ` [${v}] `)
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[9px] font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                  [{v}]
                                </button>
                              ))}
                              {externalVariables.map(code => {
                                const selected = new RegExp(`\\{\\s*${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}`, 'i').test(param.formula || '')
                                return (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => {
                                      const currentFormula = param.formula || ''
                                      updateParameter(param.id, 'formula', currentFormula + ` {${code}} `)
                                    }}
                                    className={cn(
                                      "px-2 py-0.5 rounded-md border text-[9px] font-bold transition-all shadow-sm",
                                      selected
                                        ? "bg-blue-600 border-blue-600 text-primary-foreground"
                                        : "bg-card border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-primary-foreground",
                                    )}
                                  >
                                    {`{${code}}`}
                                  </button>
                                )
                              })}
                              <button className="px-2 py-0.5 rounded-md bg-white border border-border text-[9px] font-bold opacity-40">{"{peso}"}</button>
                              <button className="px-2 py-0.5 rounded-md bg-white border border-border text-[9px] font-bold opacity-40">{"{sexo}"}</button>
                            </div>
                            <textarea
                              className="w-full h-12 p-2 rounded-lg border bg-white text-[11px] font-mono focus:ring-2 focus:ring-blue-200 outline-none resize-none shadow-inner"
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
                {(!parameters || parameters.length === 0) && (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-muted-foreground italic text-xs">
                      Nenhum parâmetro cadastrado. Utilize o botão acima para adicionar.
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
  const [useFasting, setUseFasting] = useState(false)

  const isTextual = parameter?.type === 'text' || parameter?.type === 'selection'

  useEffect(() => {
    setUseFasting(!!parameter?.referenceValues?.some((f: any) => f.useFasting))
  }, [parameter])

  useEffect(() => {
    if (parameter && parameter.referenceValues?.length) {
      setFaixas(parameter.referenceValues)
    } else if (parameter && isTextual) {
      setFaixas([
        { id: 1, description: 'Padrão', minAge: 0, maxAge: 150, sex: 'Todos', isPregnant: false, textRange: '' },
      ])
    } else if (parameter) {
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
          <p className="text-xs text-muted-foreground">Configure múltiplas faixas de referência com condições de idade, sexo, gestante e jejum.</p>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed p-3 bg-muted/10">
          <div>
            <Label className="text-xs font-bold">Usar condição de jejum</Label>
            <p className="text-[11px] text-muted-foreground">
              Ative apenas para exames que possuem valores diferentes com e sem jejum.
            </p>
          </div>
          <Switch checked={useFasting} onCheckedChange={setUseFasting} />
        </div>

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
                
                {isTextual ? (
                  <div className="space-y-1.5 border-t pt-4 md:col-span-2">
                    <Label className="text-[10px] font-bold uppercase text-emerald-600">Valor de Referência (texto)</Label>
                    {parameter?.type === 'selection' && (parameter?.options || []).length > 0 ? (
                      <Select
                        value={faixa.textRange || ''}
                        onValueChange={(val) => updateFaixa(faixa.id, 'textRange', val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecione a opção considerada normal" />
                        </SelectTrigger>
                        <SelectContent>
                          {(parameter.options || []).filter((o: string) => !!o).map((o: string) => (
                            <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-9 text-xs font-bold"
                        value={faixa.textRange || ''}
                        placeholder="Ex: Não reagente / Ausência de parasitas"
                        onChange={(e) => updateFaixa(faixa.id, 'textRange', e.target.value)}
                      />
                    )}
                  </div>
                ) : (
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
                )}

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                    {isValueUnit(faixa.ageUnit) ? 'Valor Mín (resultado)' : `Idade Mín (${ageUnitLabel(faixa.ageUnit)})`}
                  </Label>
                  <Input 
                    type={isValueUnit(faixa.ageUnit) ? 'text' : 'number'} 
                    step={isValueUnit(faixa.ageUnit) ? undefined : 'any'}
                    placeholder={isValueUnit(faixa.ageUnit) ? 'Ex: 10 ou <50' : undefined}
                    className="h-9 text-xs" 
                    value={faixa.minAge ?? ''} 
                    onChange={(e) => updateFaixa(faixa.id, 'minAge', isValueUnit(faixa.ageUnit) ? e.target.value : Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                    {isValueUnit(faixa.ageUnit) ? 'Valor Máx (resultado)' : `Idade Máx (${ageUnitLabel(faixa.ageUnit)})`}
                  </Label>
                  <Input 
                    type={isValueUnit(faixa.ageUnit) ? 'text' : 'number'} 
                    step={isValueUnit(faixa.ageUnit) ? undefined : 'any'}
                    placeholder={isValueUnit(faixa.ageUnit) ? 'Ex: 500 ou >=50' : undefined}
                    className="h-9 text-xs" 
                    value={faixa.maxAge ?? ''} 
                    onChange={(e) => updateFaixa(faixa.id, 'maxAge', isValueUnit(faixa.ageUnit) ? e.target.value : Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Unidade da idade</Label>
                  <Select
                    value={faixa.ageUnit || 'anos'}
                    onValueChange={(val) => updateFaixa(faixa.id, 'ageUnit', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anos" className="text-xs">Anos</SelectItem>
                      <SelectItem value="meses" className="text-xs">Meses</SelectItem>
                      <SelectItem value="semanas" className="text-xs">Semanas</SelectItem>
                      <SelectItem value="dias" className="text-xs">Dias</SelectItem>
                      <SelectItem value="valor" className="text-xs">Valor</SelectItem>
                    </SelectContent>
                  </Select>
                  {isValueUnit(faixa.ageUnit) && (
                    <p className="text-[10px] text-muted-foreground">
                      Esta faixa é escolhida pelo valor digitado no resultado (entre o valor mín e máx acima), e não pela idade.
                    </p>
                  )}
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
                  {useFasting && (
                    <div className="flex items-center gap-2 pt-5">
                      <Switch
                        checked={!!faixa.isFasting}
                        className="scale-75"
                        onCheckedChange={(val) => updateFaixa(faixa.id, 'isFasting', val)}
                      />
                      <Label className="text-xs cursor-pointer">Jejum</Label>
                    </div>
                  )}
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
              onSave({
                referenceValues: faixas.map((f) => ({
                  ...f,
                  useFasting,
                  isFasting: useFasting ? !!f.isFasting : false,
                })),
              });
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
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  {isValueUnit(faixa.ageUnit) ? 'Valor Mín/Máx' : 'Idade Mín/Máx'}
                </Label>
                <div className="h-9 px-3 flex items-center bg-muted/20 rounded-lg text-xs">
                  {isValueUnit(faixa.ageUnit)
                    ? [faixa.minAge, faixa.maxAge].filter((v: any) => v != null && String(v).trim() !== '').join(' a ') || '—'
                    : `${faixa.minAge ?? 0} a ${faixa.maxAge ?? 150} ${ageUnitLabel(faixa.ageUnit)}`}
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



function MethodologyPicker({ value, onChange, onOpenSearch }: { value?: string, onChange: (val: string) => void, onOpenSearch: () => void }) {
  const [methods, setMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data } = await supabase.from('lab_methods' as any).select('id, name, description').order('name')
      if (active) {
        setMethods((data as any[]) || [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Ex: Colorimétrico, Enzimático, etc."
          value={value || ''}
          list="lab-methods-list"
          onChange={(e) => onChange(e.target.value)}
          className="h-11"
        />
        <datalist id="lab-methods-list">
          {methods.map(m => <option key={m.id} value={m.name} />)}
        </datalist>
        <Button variant="outline" className="h-11 gap-2" onClick={onOpenSearch}>
          <Search className="h-4 w-4" /> Buscar Metodologia
        </Button>
      </div>

      {loading ? (
        <p className="text-[11px] text-muted-foreground">Carregando metodologias...</p>
      ) : methods.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {methods.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.name)}
              title={m.description || m.name}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                value === m.name
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Nenhuma metodologia cadastrada. Configure em Configurações &gt; Laboratório &gt; Metodologias.
        </p>
      )}
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

function InterfacingSection({ 
  config, 
  params, 
  internalParameters,
  availableEquipments,
  onChange 
}: { 
  config: any, 
  params: any[], 
  internalParameters: any[],
  availableEquipments: any[],
  onChange: (val: any) => void 
}) {
  const equipments = availableEquipments;


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
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} ({eq.manufacturer || eq.model || 'S/M'})</SelectItem>
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
