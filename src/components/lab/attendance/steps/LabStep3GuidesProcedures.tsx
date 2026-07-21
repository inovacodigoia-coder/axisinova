import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calculator, 
  Stethoscope, 
  ClipboardCheck, 
  Table, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  state: any;
  update: (patch: any) => void;
}

interface SelectedExam {
  id: string;
  code: string;
  name: string;
  table: string;
  value: number;
  quantity: number;
  authorizationRequired: boolean;
  insuranceCode?: string;
}

export function LabStep3GuidesProcedures({ state, update }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExams, setSelectedExams] = useState<SelectedExam[]>(state.selectedExams || []);

  const exams = [
    { id: '1', code: '40301101', name: 'HEMOGRAMA COMPLETO', table: 'TUSS', value: 25.00, authorizationRequired: false },
    { id: '2', code: '40302043', name: 'GLICOSE', table: 'TUSS', value: 12.00, authorizationRequired: false },
    { id: '3', code: '40302582', name: 'UREIA', table: 'TUSS', value: 15.00, authorizationRequired: false },
    { id: '4', code: '40302426', name: 'CREATININA', table: 'TUSS', value: 15.00, authorizationRequired: false },
    { id: '5', code: '40304364', name: 'TSH - HORMÔNIO TIREOESTIMULANTE', table: 'TUSS', value: 45.00, authorizationRequired: true },
    { id: '6', code: '40304372', name: 'T4 LIVRE', table: 'TUSS', value: 42.00, authorizationRequired: true },
  ];

  const filteredExams = exams.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.code.includes(searchTerm)
  );

  const handleAddExam = (exam: any) => {
    if (selectedExams.find(e => e.id === exam.id)) {
      toast.warning('Este exame já foi adicionado');
      return;
    }
    const newList = [...selectedExams, { ...exam, quantity: 1 }];
    setSelectedExams(newList);
    update({ selectedExams: newList });
  };

  const handleRemoveExam = (id: string) => {
    const newList = selectedExams.filter(e => e.id !== id);
    setSelectedExams(newList);
    update({ selectedExams: newList });
  };

  const total = selectedExams.reduce((acc, curr) => acc + (curr.value * curr.quantity), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Guia / Requisição Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-primary space-y-3">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Médico Requisitante</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar médico..." 
              className="pl-9 h-10" 
              value={state.requestingDoctor || ""}
              onChange={(e) => update({ requestingDoctor: e.target.value })}
            />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-cyan-500 space-y-3">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nº Guia / Requisição</Label>
          <Input 
            placeholder="00000000" 
            className="h-10 font-mono" 
            value={state.guideNumber || ""}
            onChange={(e) => update({ guideNumber: e.target.value })}
          />
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 space-y-3">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tabela de Preço</Label>
          <select 
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={state.billingTable || "TUSS"}
            onChange={(e) => update({ billingTable: e.target.value })}
          >
            <option value="TUSS">TUSS (Padrão)</option>
            <option value="AMB">AMB 92</option>
            <option value="CBHPM">CBHPM</option>
            <option value="PROPRIA">TABELA PRÓPRIA</option>
          </select>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 space-y-3">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Valor Total Estimado</Label>
          <div className="h-10 flex items-center px-3 bg-emerald-50 rounded-md border border-emerald-100">
            <span className="text-emerald-700 font-bold">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Exam Search (Left) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Catálogo de Exames
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">{exams.length} exames disponíveis</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Código ou Nome do Exame..." 
              className="pl-10 h-11 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border rounded-xl overflow-hidden bg-muted/20">
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Exame</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {filteredExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs">{exam.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs leading-none mb-1">{exam.name}</div>
                        <div className="text-[10px] text-muted-foreground flex gap-2">
                          <span className="flex items-center gap-1"><Table className="h-3 w-3" /> {exam.table}</span>
                          {exam.authorizationRequired && <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" /> Requer Aut.</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 rounded-full hover:bg-primary hover:text-white"
                          onClick={() => handleAddExam(exam)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Exams (Right) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-500" /> Exames Selecionados
            </h3>
            <div className="flex gap-2">
               <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold gap-1.5"><FileSpreadsheet className="h-3 w-3" /> Importar XLM</Button>
            </div>
          </div>

          <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Procedimento</th>
                  <th className="px-4 py-3 w-20 text-center">Qtd.</th>
                  <th className="px-4 py-3 text-right">Valor Unit.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedExams.length > 0 ? (
                  selectedExams.map((exam) => (
                    <tr key={exam.id} className="animate-in fade-in slide-in-from-right-2 duration-300">
                      <td className="px-4 py-4">
                        <div className="font-bold text-xs uppercase mb-1">{exam.name}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground font-mono">{exam.code}</span>
                          {exam.authorizationRequired && (
                            <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> AUTORIZAÇÃO PENDENTE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <Input 
                             type="number" 
                             className="w-12 h-8 text-center text-xs p-1" 
                             value={exam.quantity}
                             onChange={(e) => {
                               const val = parseInt(e.target.value) || 1;
                               const newList = selectedExams.map(ex => ex.id === exam.id ? { ...ex, quantity: val } : ex);
                               setSelectedExams(newList);
                               update({ selectedExams: newList });
                             }}
                           />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-xs font-medium text-muted-foreground">
                        R$ {exam.value.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right text-xs font-bold text-foreground">
                        R$ {(exam.value * exam.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleRemoveExam(exam.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Stethoscope className="h-10 w-10" />
                        <p className="text-xs font-medium">Nenhum exame selecionado para este atendimento.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {selectedExams.length > 0 && (
                <tfoot className="bg-muted/30 border-t border-border">
                  <tr className="font-bold">
                    <td colSpan={3} className="px-4 py-4 text-right text-xs uppercase text-muted-foreground">Total do Pedido:</td>
                    <td className="px-4 py-4 text-right text-base text-primary">R$ {total.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {selectedExams.some(e => e.authorizationRequired) && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-amber-800 uppercase mb-1">Atenção: Exames que requerem autorização</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Alguns dos exames selecionados exigem autorização prévia do convênio. O passo de "Autorização" será habilitado para preenchimento dos códigos necessários.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
