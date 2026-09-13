import React, { useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Loader2, 
  ArrowLeft 
} from "lucide-react";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { useRegisters } from '@/context/RegistersContext';
import { importReferenceAge } from '@/utils/importReferenceAge';

interface ImportarPlanilhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCodes: string[]; // List of already registered exam codes for "new vs update" logic
}

type ImportState = 'upload' | 'processando' | 'preview' | 'importando' | 'concluido';

interface RowError {
  line: number;
  message: string;
}

interface ExamImportData {
  nome: string;
  codigo: string;
  materiaisAceitos: string;
  bancada: string;
  prazoEntrega: number;
  unidadeMedida?: string;
  parameters: any[];
  referenceValues: any[];
}

export const ImportarPlanilhaModal = ({ isOpen, onClose, existingCodes = [] }: ImportarPlanilhaModalProps) => {
  const { addExam, updateExam, exams, workbenches } = useRegisters();
  const [state, setState] = useState<ImportState>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [newExams, setNewExams] = useState<string[]>([]);
  const [updateExams, setUpdateExams] = useState<string[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [totalParams, setTotalParams] = useState(0);
  const [totalRefs, setTotalRefs] = useState(0);
  const [parsedExams, setParsedExams] = useState<ExamImportData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setState('upload');
    setFileName('');
    setNewExams([]);
    setUpdateExams([]);
    setErrors([]);
    setTotalParams(0);
    setTotalRefs(0);
    setParsedExams([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      toast.error('Arquivo inválido. Por favor, envie um arquivo .xlsx ou .xls');
      return;
    }

    setFileName(file.name);
    setState('processando');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Sheets we expect: "Catálogo de Exames", "Parâmetros do Exame", "Faixas de Referência"
        const catalogSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('catálogo') || n.toLowerCase().includes('catalogo')) || workbook.SheetNames[0];
        const paramsSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('parâmetros') || n.toLowerCase().includes('parametros'));
        const refsSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('faixas') || n.toLowerCase().includes('referência') || n.toLowerCase().includes('referencia'));

        const catalogSheet = workbook.Sheets[catalogSheetName];
        const paramsSheet = paramsSheetName ? workbook.Sheets[paramsSheetName] : null;
        const refsSheet = refsSheetName ? workbook.Sheets[refsSheetName] : null;

        if (!catalogSheet) {
          throw new Error('Aba de exames não encontrada.');
        }

        const catalogData = XLSX.utils.sheet_to_json<any>(catalogSheet);
        const paramsData = paramsSheet ? XLSX.utils.sheet_to_json<any>(paramsSheet) : [];
        const refsData = refsSheet ? XLSX.utils.sheet_to_json<any>(refsSheet) : [];
        // Validate before any exam is saved, using the same parser for both stores.
        refsData.forEach(importReferenceAge);

        const foundNew: string[] = [];
        const foundUpdate: string[] = [];
        const foundErrors: RowError[] = [];
        const validExams: ExamImportData[] = [];

        console.log('[ImportarPlanilhaModal] Parsing spreadsheet data:', { 
          catalogRows: catalogData.length, 
          paramRows: paramsData.length, 
          refRows: refsData.length 
        });

        catalogData.forEach((row, index) => {
          const lineNum = index + 2;
          
          const name = row['Nome'] || row['NOME'] || row['Exame'] || row['EXAME'];
          const code = String(row['Código'] || row['CÓDIGO'] || row['Codigo'] || row['CODIGO'] || '').trim();
          const materials = String(row['Materiais aceitos'] || row['Materiais'] || row['MATERIAIS'] || row['Material'] || '');
          const workbench = row['Bancada'] || row['BANCADA'] || row['Setor'] || row['SETOR'];
          const deadline = row['Prazo de entrega (dias)'] || row['Prazo'] || row['PRAZO'] || row['Prazo de Entrega'];
          const unit = row['Unidade de Medida'] || row['UNIDADE'] || row['Unidade'] || '';

          if (!name || !code || !materials || !workbench || deadline === undefined) {
            const missing = [];
            if (!name) missing.push('Nome');
            if (!code) missing.push('Código');
            if (!materials) missing.push('Materiais');
            if (!workbench) missing.push('Bancada');
            if (deadline === undefined) missing.push('Prazo');
            
            foundErrors.push({
              line: lineNum,
              message: `Linha ${lineNum} — Faltando campos: ${missing.join(', ')}`
            });
            return;
          }

          // Link parameters and reference ranges
          const examParams = paramsData.filter((p: any) => {
            const pCode = String(p['Código'] || p['CÓDIGO'] || p['Código do Exame'] || p['CÓDIGO EXAME'] || p['Codigo'] || p['CODIGO'] || '').trim();
            return pCode === code;
          });
          
          const examRefs: any[] = [];
          
          examParams.forEach((param: any) => {
            const paramName = String(param['Nome'] || param['NOME'] || param['Parâmetro'] || param['PARAMETRO'] || param['Nome do parâmetro'] || '').trim();
            const refs = refsData.filter((r: any) => {
              const rCode = String(r['Código'] || r['CÓDIGO'] || r['Código do Exame'] || r['CÓDIGO EXAME'] || r['Codigo'] || r['CODIGO'] || '').trim();
              const rParamName = String(r['Nome do parâmetro'] || r['Nome do Parâmetro'] || r['PARÂMETRO'] || r['Nome'] || '').trim();
              return rCode === code && rParamName === paramName;
            });
            examRefs.push(...refs);
          });

          validExams.push({
            nome: name,
            codigo: code,
            materiaisAceitos: materials,
            bancada: workbench,
            prazoEntrega: Number(deadline),
            unidadeMedida: unit,
            parameters: examParams,
            referenceValues: examRefs
          });

          if (existingCodes.includes(code)) {
            foundUpdate.push(code);
          } else {
            foundNew.push(code);
          }
        });

        console.log('[ImportarPlanilhaModal] Validated exams:', validExams.map(e => ({ code: e.codigo, paramsCount: e.parameters.length })));

        setParsedExams(validExams);
        setNewExams(foundNew);
        setUpdateExams(foundUpdate);
        setErrors(foundErrors); 
        setTotalParams(paramsData.length);
        setTotalRefs(refsData.length);
        setState('preview');
      } catch (error: any) {
        console.error(error);
        toast.error(`Erro ao ler arquivo: ${error.message}`);
        setState('upload');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    setState('importando');
    
    try {
      const results = { new: 0, updated: 0 };
      
      // Get company_id once at the start
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();
      const companyId = profile?.company_id;

      if (!companyId) throw new Error('Company ID not found');
      
      const getParamName = (p: any) => String(p['Nome do parâmetro'] || p['Nome'] || p['NOME'] || p['Parâmetro'] || p['PARAMETRO'] || '').trim();

      const parseParamType = (p: any) => {
        const raw = String(p['Tipo'] || p['TIPO'] || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        if (raw.includes('selec') || raw.includes('lista') || raw.includes('opc')) return 'selection';
        if (raw.includes('calc')) return 'calculation';
        if (raw.includes('text')) return 'text';
        return 'numerical';
      };

      const parseParamOptions = (p: any): string[] => {
        const raw = p['Opções de seleção'] ?? p['Opções'] ?? p['OPÇÕES'] ?? p['Opcoes'] ?? '';
        if (Array.isArray(raw)) return raw.map((o: any) => String(o).trim()).filter(Boolean);
        return String(raw).split(/[|;\n]/).map(o => o.trim()).filter(Boolean);
      };

      for (const examData of parsedExams) {
        // Find or create workbench
        let wbId = workbenches.find(w => w.name.toLowerCase() === examData.bancada.toLowerCase())?.id;

        // Ordena pelos valores da coluna "Ordem" (quando existir)
        const orderedParams = [...examData.parameters].sort(
          (a: any, b: any) => Number(a['Ordem'] ?? a['ORDEM'] ?? 9999) - Number(b['Ordem'] ?? b['ORDEM'] ?? 9999)
        );
        examData.parameters = orderedParams;

        // Build app-shaped parameters (persisted in the exam JSON, read by the edit screen)
        const appParameters = orderedParams
          .map((p: any, idx: number) => {
            const paramName = getParamName(p);
            if (!paramName) return null;
            const refs = examData.referenceValues
              .filter((r: any) => getParamName(r) === paramName)
              .map((r: any, rIdx: number) => ({
                id: `${idx + 1}-${rIdx + 1}`,
                description: String(r['Descrição'] || r['DESCRIÇÃO'] || ''),
                minValue: r['Valor mínimo'] ?? r['Valor Mínimo'] ?? r['Mínimo'] ?? '',
                maxValue: r['Valor máximo'] ?? r['Valor Máximo'] ?? r['Máximo'] ?? '',
                textRange: r['Valor texto'] ?? r['Texto'] ?? '',
                normalText: r['Valor texto'] ?? r['Texto'] ?? '',
                ...importReferenceAge(r),
                sex: (String(r['Sexo'] || r['Gênero'] || '').toUpperCase().startsWith('M') ? 'M'
                  : String(r['Sexo'] || r['Gênero'] || '').toUpperCase().startsWith('F') ? 'F' : 'Both'),
                isPregnant: r['Gestante'] === 'Sim' || r['Gestante'] === true,
                order: rIdx + 1,
              }));

            return {
              id: idx + 1,
              name: paramName,
              section: String(p['Seção'] || p['SEÇÃO'] || p['Setor'] || p['SETOR'] || ''),
              equipCode: String(p['Código no equipamento'] || p['Cód. Equip.'] || p['Código Equipamento'] || ''),
              type: parseParamType(p),
              origin: String(p['Origem'] || p['ORIGEM'] || '').toLowerCase() === 'equipamento' ? 'interface' : 'manual',
              unit: String(p['Unidade de medida'] || p['Unidade'] || p['UNIDADE'] || ''),
              isMandatory: p['Obrigatório'] === 'Sim' || p['Obrigatório'] === true,
              allowNegative: p['Permite negativo'] === 'Sim' || p['Permite negativo'] === true,
              isCalculated: p['Calculado'] === 'Sim' || p['Calculado'] === true,
              isHidden: p['Oculto'] === 'Sim' || p['Oculto'] === true,
              formula: String(p['Fórmula do parâmetro'] || p['Fórmula'] || ''),
              options: parseParamOptions(p),
              referenceValues: refs,
            };
          })
          .filter(Boolean) as any[];

        const examPayload: any = {
          name: examData.nome,
          internalCode: examData.codigo,
          type: 'lab', 
          resultDeadlineDays: examData.prazoEntrega,
          selectedMaterials: examData.materiaisAceitos.split(',').map(m => m.trim()),
          defaultMaterial: examData.materiaisAceitos.split(',')[0]?.trim() || '',
          measurementUnit: examData.unidadeMedida || '',
          workbenchId: wbId,
          isActive: true,
          showDeadline: true,
          confirmationQuestions: [], 
          attachmentRules: [],
          parameters: appParameters,
          referenceValues: appParameters.flatMap(p => p.referenceValues || []),
        };

        const existing = exams.find(e => e.internalCode === examData.codigo);
        let examId = existing?.id;

        if (existing) {
          await updateExam({ ...existing, ...examPayload });
          results.updated++;
        } else {
          const newExam = await addExam(examPayload);
          examId = newExam?.id;
          results.new++;
        }

        // Process Parameters and Reference Values if we have an examId
        if (examId) {
          console.log(`[ImportarPlanilhaModal] Processing ${examData.parameters.length} parameters for exam ${examData.codigo}`);
          
          for (const [pIdx, p] of examData.parameters.entries()) {
            const paramName = String(p['Nome'] || p['NOME'] || p['Parâmetro'] || p['PARAMETRO'] || p['Nome do parâmetro'] || '').trim();
            if (!paramName) continue;

            const paramPayload = {
              exam_id: examId,
              company_id: companyId,
              name: paramName,
              section: String(p['Seção'] || p['SEÇÃO'] || p['Setor'] || p['SETOR'] || ''),
              equipment_code: String(p['Código no equipamento'] || p['Cód. Equip.'] || p['CÓD. EQUIP.'] || p['Código Equipamento'] || p['COD_EQUIP'] || ''),
              type: parseParamType(p),
              origin: (p['Origem'] || p['ORIGEM'] || 'manual').toLowerCase() === 'equipamento' ? 'equipment' : 'manual',
              unit: String(p['Unidade de medida'] || p['Unidade'] || p['UNIDADE'] || ''),
              is_required: p['Obrigatório'] === 'Sim' || p['Obrigatório'] === true || !!(p['Obrig.'] || p['OBRIG.'] || false),
              allow_negative: p['Permite negativo'] === 'Sim' || !!(p['Neg.'] || p['NEG.'] || false),
              is_calculated: p['Calculado'] === 'Sim' || !!(p['Calc.'] || p['CALC.'] || false),
              is_hidden: p['Oculto'] === 'Sim' || p['OCULTO'] === 'Sim' || p['Oculto'] === true,
              formula: String(p['Fórmula do parâmetro'] || p['Fórmula'] || p['FORMULA'] || ''),
              sort_order: Number(p['Ordem'] ?? p['ORDEM'] ?? pIdx + 1),
              internal_code: examData.codigo,
            };

            // Upsert parameter by exam_id and name
            const { data: existingParam, error: selectError } = await supabase
              .from('lab_exam_parameters')
              .select('id')
              .eq('exam_id', examId)
              .eq('name', paramName)
              .maybeSingle();

            if (selectError) console.error('[ImportarPlanilhaModal] Error checking existing param:', selectError);

            let parameterId = existingParam?.id;

            if (parameterId) {
              const { error: updateError } = await supabase.from('lab_exam_parameters').update(paramPayload).eq('id', parameterId);
              if (updateError) console.error('[ImportarPlanilhaModal] Error updating param:', updateError);
            } else {
              const { data: newParam, error: insertError } = await supabase
                .from('lab_exam_parameters')
                .insert(paramPayload)
                .select()
                .single();
              
              if (insertError) {
                console.error('[ImportarPlanilhaModal] Error inserting param:', insertError);
              } else {
                parameterId = newParam?.id;
              }
            }

            // Sync Reference Values for this parameter
            if (parameterId) {
              const refsForParam = examData.referenceValues.filter((r: any) => {
                const rParamName = String(r['Nome do parâmetro'] || r['Nome do Parâmetro'] || r['PARÂMETRO'] || r['Nome'] || '').trim();
                return rParamName === paramName;
              });

              console.log(`[ImportarPlanilhaModal] Syncing ${refsForParam.length} references for parameter ${paramName}`);

              // Delete old refs to ensure fresh state from spreadsheet
              await supabase.from('lab_exam_reference_values').delete().eq('parameter_id', parameterId);

              if (refsForParam.length > 0) {
                const refsToInsert = refsForParam.map((r: any) => ({
                  exam_id: examId,
                  parameter_id: parameterId,
                  company_id: companyId,
                  internal_code: examData.codigo,
                  parameter_name: paramName,
                  description: String(r['Descrição'] || r['DESCRIÇÃO'] || ''),
                  min_value: r['Valor mínimo'] || r['Valor mín'] || r['Valor Mínimo'] || r['Mínimo'] || r['MIN']?.toString() || null,
                  max_value: r['Valor máximo'] || r['Valor máx'] || r['Valor Máximo'] || r['Máximo'] || r['MAX']?.toString() || null,
                  text_range: r['Valor texto'] || r['Referência Texto'] || r['Texto'] || null,
                  age_min: importReferenceAge(r).minAge,
                  age_max: importReferenceAge(r).maxAge,
                  age_unit: importReferenceAge(r).ageUnit,
                  gender: r['Sexo'] || r['Gênero'] || 'Todos',
                  is_pregnant: r['Gestante'] === 'Sim' || r['Gestante'] === true || !!(r['Gestante'] || false),
                }));

                const { error: refsError } = await supabase.from('lab_exam_reference_values').insert(refsToInsert);
                if (refsError) console.error('[ImportarPlanilhaModal] Error inserting references:', refsError);
              }
            }
          }
        }
      }
      
      setNewExams(Array(results.new).fill('')); 
      setUpdateExams(Array(results.updated).fill(''));
      setState('concluido');
      
      // Auto-reload to refresh the list with new DB state
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error(error);
      toast.error(`Erro na importação: ${error.message}`);
      setState('preview');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && state !== 'importando' && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border-slate-200 rounded-xl max-h-[90vh] flex flex-col [&>button]:hidden">
        <DialogHeader className="p-6 border-b border-slate-100 flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3">
            {state === 'preview' && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setState('upload')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-slate-900 font-semibold text-lg">
              {state === 'upload' && "Importar Planilha"}
              {state === 'processando' && "Processando arquivo"}
              {state === 'preview' && "Prévia da Importação"}
              {state === 'importando' && "Importando dados"}
              {state === 'concluido' && "Importação Concluída"}
            </DialogTitle>
          </div>
          {state !== 'importando' && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {state === 'upload' && (
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                />
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-slate-900 font-medium">Clique ou arraste o arquivo aqui</p>
                  <p className="text-slate-500 text-sm mt-1">Formatos aceitos: .xlsx, .xls</p>
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-lg p-4 space-y-3">
                <div className="flex gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-sm font-medium text-blue-900">Instruções da Planilha</p>
                </div>
                <ul className="text-sm text-blue-800 space-y-1 ml-7 list-disc">
                  <li>O arquivo deve conter 4 abas: Catálogo de Exames, Parâmetros do Exame, Faixas de Referência e Instruções.</li>
                  <li>A coluna <strong>Código</strong> é a chave única. Se já existir, o exame será atualizado.</li>
                  <li>Campos obrigatórios: Nome, Código, Materiais, Bancada e Prazo.</li>
                </ul>
              </div>
            </div>
          )}

          {state === 'processando' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-slate-900 font-medium">Lendo {fileName}...</p>
                <p className="text-slate-500 text-sm">Validando estrutura e dados</p>
              </div>
            </div>
          )}

          {state === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md w-fit">
                <FileSpreadsheet className="h-4 w-4" />
                {fileName}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-100 rounded-lg text-center shadow-sm">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">Novos</p>
                  <p className="text-3xl font-bold text-[#10B981]">{newExams.length}</p>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-lg text-center shadow-sm">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">Atualizar</p>
                  <p className="text-3xl font-bold text-[#2563EB]">{updateExams.length}</p>
                </div>
                <div className={cn(
                  "p-4 border rounded-lg text-center shadow-sm transition-colors",
                  errors.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-100"
                )}>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">Erros</p>
                  <p className={cn("text-3xl font-bold", errors.length > 0 ? "text-red-600" : "text-slate-400")}>
                    {errors.length}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Resumo da estrutura</p>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" /> {totalParams} parâmetros
                    </span>
                    <span className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" /> {totalRefs} faixas de referência
                    </span>
                  </div>
                </div>

                {newExams.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Códigos novos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {newExams.slice(0, 12).map(code => (
                        <Badge key={code} variant="secondary" className="bg-[#ECFDF5] text-[#059669] border-[#D1FAE5] font-medium text-[10px] px-3 py-1 rounded-full">
                          {code}
                        </Badge>
                      ))}
                      {newExams.length > 12 && (
                        <Badge variant="outline" className="text-slate-400">+{newExams.length - 12}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {updateExams.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Serão atualizados</p>
                    <div className="flex flex-wrap gap-1.5">
                      {updateExams.slice(0, 12).map(code => (
                        <Badge key={code} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-mono text-[10px]">
                          {code}
                        </Badge>
                      ))}
                      {updateExams.length > 12 && (
                        <Badge variant="outline" className="text-slate-400">+{updateExams.length - 12}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="bg-red-50/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-900">Inconsistências detectadas</p>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {errors.map((error, idx) => (
                        <p key={idx} className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100">
                          {error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-900">Importação Completa</p>
                      <p className="text-xs text-amber-800">
                        O sistema detectou que este arquivo contém <strong>Parâmetros do Exame</strong> e <strong>Faixas de Referência</strong> vinculados aos exames. 
                        Todos os dados serão processados simultaneamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === 'importando' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-slate-900 font-medium">Importando exames...</p>
                <p className="text-slate-500 text-sm">Gravando dados no banco</p>
              </div>
            </div>
          )}

          {state === 'concluido' && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">Importação Concluída</h3>
                <p className="text-slate-500 mt-2">
                  {newExams.length} exames criados e {updateExams.length} atualizados com sucesso.
                </p>
                {errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    {errors.length} linhas foram ignoradas devido a erros.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-slate-100 gap-2 shrink-0">
          {state !== 'concluido' && state !== 'importando' && (
            <Button variant="outline" onClick={onClose} className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancelar
            </Button>
          )}
          
          {state === 'preview' && (
            <Button 
              className="gradient-bg text-white min-w-[140px]" 
              disabled={newExams.length === 0 && updateExams.length === 0}
              onClick={handleConfirmImport}
            >
              Confirmar importação
            </Button>
          )}

          {state === 'concluido' && (
            <Button className="gradient-bg text-white w-full" onClick={onClose}>
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
