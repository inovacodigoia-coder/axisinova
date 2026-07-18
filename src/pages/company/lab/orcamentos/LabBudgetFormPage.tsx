import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Save, 
  Search, 
  UserPlus, 
  User, 
  Trash2, 
  Plus, 
  Clock,
  CheckCircle2,
  FileText,
  Settings
} from 'lucide-react';

import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function LabBudgetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [examSearch, setExamSearch] = useState('');

  const handleSave = () => {
    toast.success(isEditing ? "Orçamento atualizado!" : "Orçamento criado com sucesso!");
    navigate('/app/orcamentos');
  };

  const addExam = (exam: any) => {
    setExams([...exams, { ...exam, id: Date.now(), quantity: 1, total: exam.price }]);
    setExamSearch('');
  };

  const removeExam = (id: number) => {
    setExams(exams.filter(e => e.id !== id));
  };

  const subtotal = exams.reduce((acc, curr) => acc + curr.total, 0);
  const discount = subtotal * 0.1; // 10% simulated
  const total = subtotal - discount;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/orcamentos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>
            <p className="text-sm text-muted-foreground">Orçamentos / {isEditing ? id : 'Novo'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/app/orcamentos')}>Cancelar</Button>
          <Button onClick={handleSave} className="gap-2 gradient-bg">
            <Save className="h-4 w-4" /> {isEditing ? 'Atualizar' : 'Salvar Orçamento'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 py-4 px-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
            step === 1 ? "bg-primary text-white" : "bg-primary/20 text-primary"
          )}>1</div>
          <span className={cn("text-sm font-medium", step === 1 ? "text-primary" : "text-muted-foreground")}>Paciente e Configurações</span>
        </div>
        <div className="h-px w-12 bg-border"></div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
            step === 2 ? "bg-primary text-white" : "bg-primary/20 text-primary"
          )}>2</div>
          <span className={cn("text-sm font-medium", step === 2 ? "text-primary" : "text-muted-foreground")}>Exames e Valores</span>
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Identificação do Paciente
            </h3>
            
            {!selectedPatient ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Busca por nome, CPF ou nome da mãe..." 
                    className="pl-10 h-12"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                </div>
                {patientSearch.length > 2 && (
                  <div className="border rounded-lg p-2 bg-muted/30 text-center py-8">
                    <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
                    <Button variant="link" className="mt-2">Cadastrar paciente rápido</Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="anon" className="rounded border-gray-300" />
                  <Label htmlFor="anon" className="text-sm cursor-pointer">Paciente não identificado (Orçamento Anônimo)</Label>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-xl bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">JS</div>
                  <div>
                    <h4 className="font-bold">João da Silva</h4>
                    <p className="text-xs text-muted-foreground">CPF: 012.***.***-34 • (84) 99999-0001</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>Trocar</Button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Médico Solicitante
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Buscar Médico (CRM ou Nome)</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Ex: 12345/RN ou Carlos Lima" className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label>Especialidade</Label>
                  <Input placeholder="Ex: Cardiologia" className="mt-1" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" /> Configurações
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Convênio *</Label>
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option>Particular</option>
                      <option>Unimed</option>
                      <option>SUS</option>
                    </select>
                  </div>
                  <div>
                    <Label>Validade *</Label>
                    <Input type="date" defaultValue="2025-07-14" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <textarea className="w-full mt-1 p-3 rounded-md border border-input bg-background text-sm min-h-[80px]" placeholder="Notas internas ou para o paciente..." />
                </div>
              </div>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="gap-2 px-8">Próximo Passo <CheckCircle2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Adicionar Exames
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9">Adicionar Grupo</Button>
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-sm font-medium">
                  Exames: <span className="text-primary font-bold">{exams.length}</span>
                  <span className="mx-2 text-border">|</span>
                  Total: <span className="text-emerald-600 font-bold">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar exame por nome ou código (Ex: Hemograma, HEM)..." 
                className="pl-10 h-12"
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
              />
              {examSearch.length > 2 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-xl overflow-hidden">
                  <ScrollArea className="h-64">
                    {[
                      { code: 'HEM', name: 'Hemograma Completo', price: 45, material: 'Sangue Total' },
                      { code: 'GLI', name: 'Glicose em Jejum', price: 18, material: 'Soro' },
                      { code: 'COL', name: 'Colesterol Total', price: 22, material: 'Soro' }
                    ].map((item, idx) => (
                      <button 
                        key={idx} 
                        className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                        onClick={() => addExam(item)}
                      >
                        <div>
                          <span className="font-bold text-primary mr-2">[{item.code}]</span>
                          <span className="font-medium">{item.name}</span>
                          <p className="text-xs text-muted-foreground">{item.material}</p>
                        </div>
                        <span className="font-bold">R$ {item.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3">Exame</th>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3 text-right">Valor Unit.</th>
                    <th className="px-4 py-3 text-center">Qtd</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum exame adicionado ao orçamento.
                      </td>
                    </tr>
                  ) : (
                    exams.map((exam) => (
                      <tr key={exam.id}>
                        <td className="px-4 py-4">
                          <span className="font-bold text-primary mr-2">{exam.code}</span>
                          {exam.name}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{exam.material}</td>
                        <td className="px-4 py-4 text-right">R$ {exam.price.toFixed(2)}</td>
                        <td className="px-4 py-4 text-center">{exam.quantity}</td>
                        <td className="px-4 py-4 text-right font-bold">R$ {exam.total.toFixed(2)}</td>
                        <td className="px-4 py-4 text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeExam(exam.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col items-end gap-2 pr-4">
              <div className="flex justify-between w-64 text-sm text-muted-foreground">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-64 text-sm text-emerald-600 font-medium">
                <span>Desconto (10%):</span>
                <span>- R$ {discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-64 text-lg font-bold border-t pt-2 mt-2">
                <span>TOTAL:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline">Salvar Rascunho</Button>
              <Button onClick={handleSave} className="gap-2 gradient-bg px-8">
                <Save className="h-4 w-4" /> Salvar Orçamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
