import { useMemo, useState } from 'react'
import { Download, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRegisters } from '@/context/RegistersContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { buscarEmBlocos, emPedacos } from '@/lib/buscarEmBlocos'
import { configuracaoExame, configuracaoParametro } from '@/lib/catalogoConfiguracao'
import { exportReferenceModeColumns } from '@/lib/examReferenceMode'
import { exportExamBillingCodes } from '@/lib/examBillingCodes'
import { ExportCatalogDialog } from './ExportCatalogDialog'
import { ImportarPlanilhaModal } from './ImportarPlanilhaModal'

/** Same saved-catalog spreadsheet flow in the list and exam editor. */
export function CatalogSpreadsheetActions() {
  const { exams: registeredExams, workbenches, isLoading } = useRegisters()
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const exams = useMemo(() => registeredExams.filter(e =>
    ['lab', 'laboratório', 'laboratorio'].includes(String(e.type).toLowerCase())
  ).map(e => ({
    id: e.id,
    code: (e.internalCode || e.tussCode || 'S/C').toUpperCase(),
    name: e.name || 'Sem nome',
    workbenchId: e.workbenchId,
    workbench: workbenches.find(w => w.id === e.workbenchId)?.name || 'Sem Bancada',
    status: e.isActive ? 'active' : 'inactive',
  })), [registeredExams, workbenches])

  const handleExport = async (selectedIds: string[]) => {
    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      
      const wanted = new Set(selectedIds)
      const labExams = registeredExams.filter(e => 
        e && wanted.has(e.id) && (String(e.type).toLowerCase() === 'lab' || String(e.type).toLowerCase() === 'laboratório' || String(e.type).toLowerCase() === 'laboratorio')
      )

      if (labExams.length === 0) {
        toast.error('Não há exames para exportar')
        setIsExporting(false)
        return
      }

      // Fetch ALL parameters for these exams from the new table
      // Exportação completa: ids em pedaços e blocos de 1.000 até acabar.
      const todosDosExames = async (tabela: 'lab_exam_parameters' | 'lab_exam_reference_values') => {
        const out: any[] = []
        for (const lote of emPedacos(labExams.map(e => e.id))) {
          out.push(...(await buscarEmBlocos<any>((de, ate) => (supabase.from(tabela) as any).select('*').in('exam_id', lote).order('id').range(de, ate))).linhas)
        }
        return out
      }
      let dbParameters: any[] = []
      try { dbParameters = await todosDosExames('lab_exam_parameters') } catch (paramsError) {
        console.error('Erro ao buscar parâmetros do banco:', paramsError)
      }

      // 1. Catálogo de Exames
      const catalogData = labExams.map(e => ({
        'Nome': e.name,
        'Código': e.internalCode || e.tussCode || '',
        ...exportExamBillingCodes(e),
        'Materiais': (e.selectedMaterials || []).join(', '),
        'Bancada': workbenches?.find(w => w.id === e.workbenchId)?.name || '',
        'Prazo de Entrega': e.resultDeadlineDays || 0,
        'Status': e.isActive ? 'Ativo' : 'Inativo',
        'Unidade de Medida': e.measurementUnit || '',
        'Instruções de Preparo': e.preparationInstructions || '',
        'Duração Estimada (min)': e.estimatedDurationMinutes || 0,
        'Exige Autorização': e.requiresAuthorization ? 'Sim' : 'Não',
        'Metodologia': e.methodology || '',
        'Observações do Laudo': e.reportObservations || '',
        'Equipamento Interface': e.interfacingConfig?.equipmentCode || '',
        'Configuração completa': configuracaoExame(e),
      }))

      // 2. Parâmetros e Máscara
      const paramsData: any[] = []

      const typeLabel = (t?: string) => {
        const v = String(t || '').toLowerCase()
        if (v.includes('sele')) return 'Seleção'
        if (v.includes('text')) return 'Texto'
        if (v.includes('calc')) return 'Calculado'
        return 'Numérico'
      }
      const yn = (v: any) => (v ? 'Sim' : 'Não')

      const ageUnitLabel = (unit?: string) => {
        const v = String(unit || '').toLowerCase()
        if (v === 'meses' || v === 'months') return 'Meses'
        if (v === 'semanas' || v === 'weeks') return 'Semanas'
        if (v === 'dias' || v === 'days') return 'Dias'
        if (v === 'valor' || v === 'value') return 'Valor'
        return 'Anos'
      }
      const isValor = (unit?: string) => ageUnitLabel(unit) === 'Valor'
      const txt = (v: any) => (v == null || String(v).trim() === '' ? '' : String(v).trim())

      // Merge database parameters with context parameters (migration period)
      labExams.forEach(e => {
        const examCode = e.internalCode || e.tussCode || '';
        const jsonParams: any[] = Array.isArray(e.parameters) ? e.parameters : []
        const optionsOf = (name: string) => {
          const match = jsonParams.find((jp: any) => String(jp.name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase())
          return Array.isArray(match?.options) ? match.options.filter(Boolean).join(' | ') : ''
        }

        // Use parameters from the new table if they exist
        const examDbParams = dbParameters?.filter(p => p.exam_id === e.id) || [];
        
        // A tela de edição usa os parâmetros do exame (JSON); a tabela só vale se ele estiver vazio.
        if (jsonParams.length === 0 && examDbParams.length > 0) {
          examDbParams.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).forEach((p, i) => {
            paramsData.push({
              'Código': examCode,
              'Ordem': p.sort_order || i + 1,
              'Nome do parâmetro': p.name || '',
              'Seção': p.section || '',
              'Código no equipamento': p.equipment_code || '',
              'Tipo': typeLabel(p.type),
              'Origem': p.origin === 'apoio' ? 'Apoio' : p.origin === 'equipment' || p.origin === 'interface' ? 'Equipamento' : 'Manual',
              'Unidade de medida': p.unit || '',
              'Opções de seleção': optionsOf(p.name || ''),
              'Obrigatório': yn(p.is_required),
              'Permite negativo': yn(p.allow_negative),
              'Calculado': yn(p.is_calculated),
              'Oculto': yn(p.is_hidden),
              'Fórmula do parâmetro': p.formula || '',
              ...exportReferenceModeColumns(jsonParams.find((jp: any) => String(jp.name || '').trim().toLowerCase() === String(p.name || '').trim().toLowerCase()))
            })
          })
        } else if (jsonParams.length > 0) {
          // Fallback to existing jsonb parameters if table is empty
          jsonParams.forEach((p: any, i: number) => {
            paramsData.push({
              'Código': examCode,
              'Ordem': i + 1,
              'Nome do parâmetro': p.name || '',
              'Seção': p.section || '',
              'Código no equipamento': p.equipCode || p.equipmentCode || '',
              'Tipo': typeLabel(p.type),
              'Origem': p.origin === 'apoio' ? 'Apoio' : p.origin === 'equipment' || p.origin === 'interface' ? 'Equipamento' : 'Manual',
              'Unidade de medida': p.unit || '',
              'Opções de seleção': Array.isArray(p.options) ? p.options.filter(Boolean).join(' | ') : '',
              'Obrigatório': yn(p.isMandatory ?? p.isRequired),
              'Permite negativo': yn(p.allowNegative),
              'Calculado': yn(p.isCalculated),
              'Oculto': yn(p.isHidden),
              'Fórmula do parâmetro': p.formula || '',
              'Casas decimais': p.decimals ?? '',
              'Valor padrão ativo': yn(p.defaultValueEnabled),
              'Valor padrão': p.defaultValue ?? '',
              'Permite editar seleção': yn(p.allowEditSelection),
              'Várias opções': yn(p.multiSelect),
              ...exportReferenceModeColumns(p),
              'Configuração completa': configuracaoParametro(p),
            })
          })
        }
      })

      // 3. Faixas de Referência
      let dbReferences: any[] = []
      try { dbReferences = await todosDosExames('lab_exam_reference_values') } catch (refsError) {
        console.error('Erro ao buscar faixas de referência do banco:', refsError)
      }

      const refsData: any[] = []
      labExams.forEach(e => {
        const examCode = e.internalCode || e.tussCode || '';
        
        // Use database references if they exist
        const examDbRefs = dbReferences?.filter(r => r.exam_id === e.id) || [];
        
        const temJson = Array.isArray(e.parameters) && e.parameters.length > 0
        if (!temJson && examDbRefs.length > 0) {
          // Lookup das faixas no JSON do exame (fonte das flags de jejum/gravidez)
          const jsonRefs = new Map<string, any>()
          e.parameters?.forEach((p: any) => {
            p.referenceValues?.forEach((r: any) => {
              const key = `${(p.name || '').toLowerCase()}|${(r.description || '').toLowerCase()}`
              jsonRefs.set(key, r)
            })
          })
          examDbRefs.forEach(r => {
            const param = dbParameters?.find(p => p.id === r.parameter_id);
            const paramName = param?.name || r.parameter_name || '';
            const jsonRef = jsonRefs.get(`${paramName.toLowerCase()}|${(r.description || '').toLowerCase()}`)
            const useFasting = !!(r.use_fasting || jsonRef?.useFasting)
            const isFasting = !!(r.is_fasting || jsonRef?.isFasting)
            refsData.push({
              'Código': examCode,
              'Nome do parâmetro': paramName,
              'Descrição': r.description || '',
              'Valor mínimo': r.min_value ?? '',
              'Valor máximo': r.max_value ?? '',
              'Valor texto': r.text_range || '',
              'Idade mínima': isValor(r.age_unit) ? '' : (r.age_min ?? 0),
              'Idade máxima': isValor(r.age_unit) ? '' : (r.age_max ?? 120),
              'Unidade da Idade': ageUnitLabel(r.age_unit),
              'Valor Mín (resultado)': isValor(r.age_unit) ? txt(r.value_min ?? jsonRef?.minAge) : '',
              'Valor Máx (resultado)': isValor(r.age_unit) ? txt(r.value_max ?? jsonRef?.maxAge) : '',
              'Sexo': r.gender || 'both',
              'Gestante': jsonRef?.isPregnant ? 'Sim' : 'Não',
              'Usa condição de jejum': useFasting ? 'Sim' : 'Não',
              'Jejum': isFasting ? 'Sim' : 'Não'
            })
          })
        } else if (e.parameters && Array.isArray(e.parameters)) {
          // Fallback to searching inside parameters (nested reference values)
          e.parameters.forEach((p: any) => {
            if (p.referenceValues && Array.isArray(p.referenceValues)) {
              p.referenceValues.forEach((r: any) => {
                refsData.push({
                  'Código': examCode,
                  'Nome do parâmetro': p.name || '',
                  'Descrição': r.description || '',
                  'Valor mínimo': r.minValue ?? '',
                  'Valor máximo': r.maxValue ?? '',
                  'Valor texto': r.textRange || '',
                  'Idade mínima': isValor(r.ageUnit ?? r.n) ? '' : (r.minAge ?? 0),
                  'Idade máxima': isValor(r.ageUnit ?? r.n) ? '' : (r.maxAge ?? 120),
                  'Unidade da Idade': ageUnitLabel(r.ageUnit ?? r.n),
                  'Valor Mín (resultado)': isValor(r.ageUnit ?? r.n) ? txt(r.minAge) : '',
                  'Valor Máx (resultado)': isValor(r.ageUnit ?? r.n) ? txt(r.maxAge) : '',
                  'Sexo': r.sex || 'both',
                  'Gestante': r.isPregnant ? 'Sim' : 'Não',
                  'Usa condição de jejum': r.useFasting ? 'Sim' : 'Não',
                  'Jejum': r.isFasting ? 'Sim' : 'Não'
                })
              })
            }
          })
        } else if (e.referenceValues && Array.isArray(e.referenceValues)) {
          // Legacy direct referenceValues on exam
          e.referenceValues.forEach((r: any) => {
            refsData.push({
              'Código': examCode,
              'Nome do parâmetro': r.parameterName || e.name || '',
              'Descrição': r.description || '',
              'Valor mínimo': r.minValue ?? '',
              'Valor máximo': r.maxValue ?? '',
              'Valor texto': r.textRange || '',
              'Idade mínima': isValor(r.ageUnit ?? r.n) ? '' : (r.minAge ?? 0),
              'Idade máxima': isValor(r.ageUnit ?? r.n) ? '' : (r.maxAge ?? 120),
              'Unidade da Idade': ageUnitLabel(r.ageUnit ?? r.n),
              'Valor Mín (resultado)': isValor(r.ageUnit ?? r.n) ? txt(r.minAge) : '',
              'Valor Máx (resultado)': isValor(r.ageUnit ?? r.n) ? txt(r.maxAge) : '',
              'Sexo': r.sex || 'both',
              'Gestante': r.isPregnant ? 'Sim' : 'Não',
              'Usa condição de jejum': r.useFasting ? 'Sim' : 'Não',
              'Jejum': r.isFasting ? 'Sim' : 'Não'
            })
          })
        }
      })


      const wb = XLSX.utils.book_new()
      
      const wsCatalog = XLSX.utils.json_to_sheet(catalogData)
      XLSX.utils.book_append_sheet(wb, wsCatalog, "Catálogo de Exames")
      
      if (paramsData.length > 0) {
        const wsParams = XLSX.utils.json_to_sheet(paramsData)
        XLSX.utils.book_append_sheet(wb, wsParams, "Parâmetros do Exame")
      }
      
      if (refsData.length > 0) {
        const wsRefs = XLSX.utils.json_to_sheet(refsData)
        XLSX.utils.book_append_sheet(wb, wsRefs, "Faixas de Referência")
      }

      XLSX.writeFile(wb, `Catalogo_Exames_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success(`Catálogo exportado com sucesso! (${labExams.length} exame(s))`)
      setExportModalOpen(false)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error('Erro ao exportar o catálogo')
    } finally {
      setIsExporting(false)
    }
  }


  return <>
    <Button variant="outline" onClick={() => setExportModalOpen(true)} disabled={isLoading || isExporting} className="gap-2">
      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar Catálogo
    </Button>
    <Button variant="outline" onClick={() => setImportModalOpen(true)} disabled={isLoading} className="gap-2">
      <Upload className="h-4 w-4" /> Importar Planilha
    </Button>
    <ExportCatalogDialog open={exportModalOpen} onOpenChange={setExportModalOpen} exams={exams}
      workbenches={workbenches.map(w => ({ id: w.id, name: w.name }))} exporting={isExporting} onExport={handleExport} />
    {importModalOpen && <ImportarPlanilhaModal isOpen onClose={() => setImportModalOpen(false)} existingCodes={exams.map(e => e.code)} />}
  </>
}
