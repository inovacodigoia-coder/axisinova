import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, DollarSign, ArrowLeftRight, FileText, 
  Plus, Trash2, Check, Percent, User, Globe, Phone, Mail, MapPin, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  state: any;
  update: (patch: any) => void;
}

const PAYMENT_METHODS = [
  { id: 'responsible', label: 'RESPONSÁVEL', icon: User },
  { id: 'discount', label: 'DESCONTO', icon: Percent },
  { id: 'cash', label: 'DINHEIRO', icon: DollarSign },
  { id: 'transfer', label: 'TRANSFERÊNCIAS', icon: ArrowLeftRight },
  { id: 'card', label: 'CARTÃO', icon: CreditCard },
  { id: 'check', label: 'CHEQUE', icon: FileText },
];

export function LabStep4Payment({ state, update }: Props) {
  const [activeTab, setActiveTab] = useState('responsible');
  const [payments, setPayments] = useState<any[]>(state.payments || []);

  const totalAmount = useMemo(() => {
    if (!state.guides) return 0;
    return state.guides.reduce((acc: number, guide: any) => {
      return acc + (guide.exams?.reduce((eAcc: number, exam: any) => eAcc + (exam.price || 0), 0) || 0);
    }, 0);
  }, [state.guides]);

  const totalPaid = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.value || 0), 0);
  }, [payments]);

  const totalDiscount = useMemo(() => {
    return payments.filter(p => p.method === 'discount').reduce((acc, p) => acc + (p.value || 0), 0);
  }, [payments]);

  const debt = totalAmount - totalPaid - totalDiscount;

  const handleAddPayment = (method: string, value: number, data: any = {}) => {
    const newPayment = { id: Date.now().toString(), method, value, ...data };
    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    update({ payments: newPayments });
    toast.success('Pagamento adicionado');
  };

  const removePayment = (id: string) => {
    const newPayments = payments.filter(p => p.id !== id);
    setPayments(newPayments);
    update({ payments: newPayments });
  };

  return (
    <div className="flex h-full animate-in fade-in duration-500">
      {/* Left Panel: Form */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Payment Method Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => setActiveTab(method.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-4 px-2 border-b-2 transition-all",
                  activeTab === method.id 
                    ? "border-primary text-primary bg-background font-bold" 
                    : "border-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-5 w-5 mb-1", activeTab === method.id ? "text-primary" : "text-muted-foreground")} />
                <span className="text-[10px] uppercase tracking-wider">{method.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'responsible' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase">Responsável Financeiro</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome *</Label>
                    <Input defaultValue={state.patient?.fullName} placeholder="NOME DO RESPONSÁVEL" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">CPF</Label>
                  <Input defaultValue={state.patient?.cpf} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">CNPJ</Label>
                  <Input placeholder="CNPJ" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase">Nacionalidade</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">País</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option>Brasil</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Passaporte</Label>
                    <Input placeholder="PASSAPORTE" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase">Contato</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Telefone</Label>
                    <Input defaultValue={state.patient?.phone1} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Email</Label>
                    <Input defaultValue={state.patient?.email} placeholder="email@exemplo.com" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" id="change-address" className="rounded border-slate-300" />
                <label htmlFor="change-address" className="text-xs font-medium text-slate-600">Alterar Endereço de Cobrança</label>
              </div>

              <div className="flex justify-end gap-3 pt-8">
                <Button variant="ghost" className="text-xs font-bold uppercase text-muted-foreground">CANCELAR</Button>
                <Button className="text-xs font-bold uppercase px-8">ADICIONAR</Button>
              </div>
            </div>
          )}

          {activeTab !== 'responsible' && (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <Search className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Configuração de {PAYMENT_METHODS.find(m => m.id === activeTab)?.label}</p>
             </div>
          )}
        </div>
      </div>

      {/* Right Panel: Summary */}
      <div className="w-96 bg-slate-50/50 flex flex-col p-6 space-y-6">
        <div>
          <h3 className="text-[11px] font-bold text-slate-500 uppercase text-center mb-4 tracking-wider">Resumo do Pagamento</h3>
          
          <div className="space-y-2">
            <div className="flex bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <div className="w-12 bg-primary flex items-center justify-center text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="flex-1 p-3">
                <div className="text-xs font-bold text-slate-600">R$ {totalAmount.toFixed(2)}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400">TOTAL</div>
              </div>
            </div>

            <div className="flex bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <div className="w-12 bg-slate-400 flex items-center justify-center text-white">
                <Percent className="h-5 w-5" />
              </div>
              <div className="flex-1 p-3 relative">
                <div className="text-xs font-bold text-slate-600">R$ {totalDiscount.toFixed(2)}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400">0% DESCONTO</div>
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase text-center mb-4">Pagamentos</h4>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-center text-[11px] text-muted-foreground mt-8">Nenhum pagamento recebido</p>
            ) : (
              payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                   <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-100 rounded-md">
                        {PAYMENT_METHODS.find(m => m.id === p.method)?.icon ? 
                          React.createElement(PAYMENT_METHODS.find(m => m.id === p.method)!.icon, { className: "h-3.5 w-3.5 text-slate-600" }) 
                          : <DollarSign className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-700">R$ {p.value.toFixed(2)}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">
                          {PAYMENT_METHODS.find(m => m.id === p.method)?.label}
                        </div>
                      </div>
                   </div>
                   <button onClick={() => removePayment(p.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                     <Trash2 className="h-3.5 w-3.5" />
                   </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase text-center mb-4">Resumo</h4>
          
          <div className="flex bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
            <div className="w-12 bg-primary flex items-center justify-center text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex-1 p-3">
              <div className="text-xs font-bold text-slate-600">R$ {totalAmount.toFixed(2)}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">TOTAL DO PEDIDO</div>
            </div>
          </div>

          <div className="flex bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
            <div className="w-12 bg-rose-500 flex items-center justify-center text-white">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div className="flex-1 p-3">
              <div className="text-xs font-bold text-slate-600">R$ {debt.toFixed(2)}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">DÍVIDA</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
