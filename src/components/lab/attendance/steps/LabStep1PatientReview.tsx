import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Printer, Download, User, Phone, ShieldCheck, Users, HeartPulse, FileText, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GENDER_LABELS, ETHNICITY_LABELS, MARITAL_LABELS, STATUS_LABELS, BRAZIL_STATES } from '@/types/patient.types';
import { useRegisters } from '@/context/RegistersContext';

interface Props { state: any; update: (patch: any) => void; }

type TabType = 'pessoal' | 'contato' | 'convenios' | 'responsavel' | 'clinico' | 'observacoes';

export function LabStep1PatientReview({ state, update }: Props) {
  const { convenios } = useRegisters();
  const activeConvenios = useMemo(() => convenios.filter(c => c.isActive), [convenios]);
  const [activeTab, setActiveTab] = useState<TabType>('pessoal');
  const patient = state.patient;
  if (!patient) return null;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'pessoal', label: 'Pessoal', icon: User },
    { id: 'contato', label: 'Contato', icon: Phone },
    { id: 'convenios', label: 'Convênios', icon: ShieldCheck },
    { id: 'responsavel', label: 'Responsável', icon: Users },
    { id: 'clinico', label: 'Clínico', icon: HeartPulse },
    { id: 'observacoes', label: 'Observações', icon: FileText },
  ];

  const tempPatient = state.tempPatient || {};
  const mergedPatient = { ...patient, ...tempPatient };

  const handleUpdate = (patch: any) => {
    update({ tempPatient: { ...tempPatient, ...patch } });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Quantidade de Pedidos</span>
            <div className="flex gap-2">
              <Badge className="bg-primary/10 text-primary gap-1.5"><User className="h-3 w-3" /> 16</Badge>
              <Badge className="bg-rose-500/10 text-rose-600 gap-1.5">📞 0</Badge>
            </div>
          </div>
          <div className="h-8 w-px bg-border hidden md:block" />
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 text-center">Status</span>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Paciente Ativo</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2"><Download className="h-4 w-4" /> Exportar</Button>
          <Button variant="outline" size="sm" className="h-9 gap-2"><Printer className="h-4 w-4" /> Imprimir</Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-muted/30 p-1.5 rounded-xl border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="p-6 border-border/50 shadow-md">
        {activeTab === 'pessoal' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Identificação</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <div className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-4 bg-muted/10 group hover:border-primary/50 transition-colors cursor-pointer">
                  <User className="h-16 w-16 text-muted-foreground group-hover:text-primary/50 transition-colors" />
                  <span className="text-[10px] mt-2 text-muted-foreground uppercase font-bold">Foto do Paciente</span>
                </div>
              </div>
              <div className="md:col-span-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nome Completo" required>
                    <Input value={mergedPatient.fullName} onChange={(e) => handleUpdate({ fullName: e.target.value })} className="h-10" />
                  </Field>
                  <Field label="Nome Social">
                    <Input value={mergedPatient.socialName || ""} onChange={(e) => handleUpdate({ socialName: e.target.value })} placeholder="Como prefere ser chamado" className="h-10" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="CPF">
                    <Input value={mergedPatient.cpf || ""} onChange={(e) => handleUpdate({ cpf: e.target.value })} className="h-10" />
                  </Field>
                  <Field label="RG">
                    <Input value={mergedPatient.rg || ""} onChange={(e) => handleUpdate({ rg: e.target.value })} className="h-10" />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Órgão Exp.">
                      <Input value={mergedPatient.rgIssuer || ""} onChange={(e) => handleUpdate({ rgIssuer: e.target.value })} className="h-10" />
                    </Field>
                    <Field label="UF">
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={mergedPatient.rgState || ""} onChange={(e) => handleUpdate({ rgState: e.target.value })}>
                        <option value="">—</option>
                        {BRAZIL_STATES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Field label="Data de Nascimento" required>
                    <Input type="date" value={mergedPatient.birthDate} onChange={(e) => handleUpdate({ birthDate: e.target.value })} className="h-10" />
                  </Field>
                  <Field label="Gênero" required>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={mergedPatient.gender} onChange={(e) => handleUpdate({ gender: e.target.value })}>
                      {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  {mergedPatient.gender === 'female' && (
                    <div className="flex items-center gap-2 pt-6">
                      <input 
                        type="checkbox" 
                        id="isPregnant" 
                        checked={!!mergedPatient.clinicalData?.isPregnant} 
                        onChange={(e) => handleUpdate({ 
                          clinicalData: { ...mergedPatient.clinicalData, isPregnant: e.target.checked } 
                        })} 
                        className="h-4 w-4 rounded border-input cursor-pointer" 
                      />
                      <Label htmlFor="isPregnant" className="text-xs font-bold cursor-pointer text-rose-600 flex items-center gap-1.5">
                        🤰 Gestante
                      </Label>
                    </div>
                  )}
                  <Field label="Etnia">
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={mergedPatient.ethnicity || ""} onChange={(e) => handleUpdate({ ethnicity: e.target.value })}>
                      <option value="">—</option>
                      {Object.entries(ETHNICITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado Civil">
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={mergedPatient.maritalStatus || ""} onChange={(e) => handleUpdate({ maritalStatus: e.target.value })}>
                      <option value="">—</option>
                      {Object.entries(MARITAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contato' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Contato e Endereço</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Telefone Principal" required>
                <Input value={mergedPatient.phone1} onChange={(e) => handleUpdate({ phone1: e.target.value })} className="h-10" />
              </Field>
              <Field label="Telefone Secundário">
                <Input value={mergedPatient.phone2 || ""} onChange={(e) => handleUpdate({ phone2: e.target.value })} className="h-10" />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={mergedPatient.email || ""} onChange={(e) => handleUpdate({ email: e.target.value })} className="h-10" />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <Field label="CEP" className="md:col-span-1">
                <Input value={mergedPatient.address?.cep || ""} onChange={(e) => handleUpdate({ address: { ...mergedPatient.address, cep: e.target.value } })} className="h-10" />
              </Field>
              <Field label="Logradouro" className="md:col-span-2">
                <Input value={mergedPatient.address?.street || ""} onChange={(e) => handleUpdate({ address: { ...mergedPatient.address, street: e.target.value } })} className="h-10" />
              </Field>
              <Field label="Número">
                <Input value={mergedPatient.address?.number || ""} onChange={(e) => handleUpdate({ address: { ...mergedPatient.address, number: e.target.value } })} className="h-10" />
              </Field>
            </div>
          </div>
        )}

        {activeTab === 'convenios' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Convênios Vinculados</h3>
              </div>
              <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> Adicionar Convênio</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Informações do Convênio</h4>
                <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/5">
                  <Field label="Plano Principal">
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={mergedPatient.convenios?.[0]?.convenioId || ""}
                      onChange={(e) => {
                        const selected = activeConvenios.find(c => c.id === e.target.value);
                        handleUpdate({ 
                          convenios: [{ 
                            convenioId: e.target.value, 
                            convenioName: selected?.name,
                            planName: 'Padrão'
                          }] 
                        });
                      }}
                    >
                      <option value="">Particular</option>
                      {activeConvenios.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nº Cartão">
                      <Input 
                        value={mergedPatient.convenios?.[0]?.cardNumber || ""} 
                        onChange={(e) => {
                          const convs = [...(mergedPatient.convenios || [])];
                          if (convs[0]) convs[0].cardNumber = e.target.value;
                          else convs[0] = { cardNumber: e.target.value };
                          handleUpdate({ convenios: convs });
                        }}
                        placeholder="0000 0000 0000 0000"
                      />
                    </Field>
                    <Field label="Validade">
                      <Input 
                        type="date"
                        value={mergedPatient.convenios?.[0]?.cardExpiry || ""} 
                        onChange={(e) => {
                          const convs = [...(mergedPatient.convenios || [])];
                          if (convs[0]) convs[0].cardExpiry = e.target.value;
                          else convs[0] = { cardExpiry: e.target.value };
                          handleUpdate({ convenios: convs });
                        }}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lista de Convênios</h4>
                <div className="space-y-3">
                  {mergedPatient.convenios?.length > 0 ? (
                    mergedPatient.convenios.map((c: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl border border-border bg-card relative group overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="absolute left-0 top-0 bottom-0 w-1 gradient-bg" />
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm mb-1">{c.convenioName || 'Particular'}</h4>
                            <p className="text-xs text-muted-foreground">Plano: {c.planName || 'Padrão'}</p>
                            <p className="text-xs text-muted-foreground mt-2">Nº Cartão: <span className="font-mono">{c.cardNumber || '—'}</span></p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
                      <ShieldCheck className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground italic">Nenhum convênio cadastrado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'responsavel' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Responsável Legal</h3>
            </div>
            {mergedPatient.responsible ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nome do Responsável">
                  <Input value={mergedPatient.responsible.name} className="h-10" readOnly />
                </Field>
                <Field label="CPF do Responsável">
                  <Input value={mergedPatient.responsible.cpf} className="h-10" readOnly />
                </Field>
                <Field label="Parentesco">
                  <Input value={mergedPatient.responsible.relationship} className="h-10" readOnly />
                </Field>
                <Field label="Telefone">
                  <Input value={mergedPatient.responsible.phone1} className="h-10" readOnly />
                </Field>
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Paciente maior de idade. Cadastro de responsável opcional.</p>
                <Button variant="outline" size="sm" className="mt-4">Cadastrar Responsável</Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clinico' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <HeartPulse className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Dados Clínicos</h3>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field label="Tipo Sanguíneo">
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" 
                    value={mergedPatient.clinicalData?.bloodType || ""} 
                    onChange={(e) => handleUpdate({ clinicalData: { ...mergedPatient.clinicalData, bloodType: e.target.value } })}
                  >
                    <option value="">—</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </Field>
                <div className="flex items-center gap-6 pt-6">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="priority" 
                      checked={!!mergedPatient.clinicalData?.needsPriority} 
                      onChange={(e) => handleUpdate({ clinicalData: { ...mergedPatient.clinicalData, needsPriority: e.target.checked } })} 
                      className="h-4 w-4 rounded border-input cursor-pointer" 
                    />
                    <Label htmlFor="priority" className="text-xs font-bold cursor-pointer">Necessita atendimento prioritário</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="donor" 
                      checked={!!mergedPatient.clinicalData?.organDonor} 
                      onChange={(e) => handleUpdate({ clinicalData: { ...mergedPatient.clinicalData, organDonor: e.target.checked } })} 
                      className="h-4 w-4 rounded border-input cursor-pointer" 
                    />
                    <Label htmlFor="donor" className="text-xs font-bold cursor-pointer">Doador de órgãos</Label>
                  </div>
                </div>
              </div>

              {/* Alergias */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Alergias
                  </h4>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"><Plus className="h-3 w-3" /> Adicionar</Button>
                </div>
                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/5">
                  {mergedPatient.clinicalData?.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {mergedPatient.clinicalData.allergies.map((a: any, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-200">
                          {a.substance} ({a.severity})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic text-center">Nenhuma alergia registrada.</p>
                  )}
                </div>
              </div>

              {/* Condições Crônicas */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <HeartPulse className="h-3 w-3" /> Condições crônicas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['HAS', 'DM Tipo 1', 'DM Tipo 2', 'Cardiopatia', 'DPOC', 'Asma', 'IRC', 'Neoplasia', 'Hipotireoidismo', 'Epilepsia', 'Depressão', 'Ansiedade', 'Obesidade', 'Artrite', 'Osteoporose'].map((cond) => {
                    const isSelected = mergedPatient.clinicalData?.chronicConditions?.includes(cond);
                    return (
                      <button
                        key={cond}
                        onClick={() => {
                          const current = mergedPatient.clinicalData?.chronicConditions || [];
                          const updated = isSelected ? current.filter((c: string) => c !== cond) : [...current, cond];
                          handleUpdate({ clinicalData: { ...mergedPatient.clinicalData, chronicConditions: updated } });
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all",
                          isSelected 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medicações Contínuas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <FileText className="h-3 w-3" /> Medicações contínuas
                  </h4>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"><Plus className="h-3 w-3" /> Adicionar</Button>
                </div>
                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/5">
                  {mergedPatient.clinicalData?.continuousMedications?.length > 0 ? (
                    <div className="space-y-2">
                      {mergedPatient.clinicalData.continuousMedications.map((m: any, i: number) => (
                        <div key={i} className="text-[11px] font-medium flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          {m.name} - {m.dosage} ({m.frequency})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic text-center">Nenhuma medicação registrada.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Deficiências / Necessidades especiais">
                  <Input 
                    value={mergedPatient.clinicalData?.disabilities || ""} 
                    onChange={(e) => handleUpdate({ clinicalData: { ...mergedPatient.clinicalData, disabilities: e.target.value } })} 
                    placeholder="Descrever, se houver"
                    className="h-10" 
                  />
                </Field>
                <Field label="Observações clínicas">
                  <Input 
                    value={mergedPatient.clinicalData?.notes || ""} 
                    onChange={(e) => handleUpdate({ clinicalData: { ...mergedPatient.clinicalData, notes: e.target.value } })} 
                    className="h-10" 
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'observacoes' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Observações</h3>
            </div>
            
            <div className="space-y-6">
              <Field label="Observações Gerais">
                <textarea 
                  className="w-full min-h-[120px] rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-primary/20 transition-all" 
                  value={mergedPatient.generalNotes || ""} 
                  onChange={(e) => handleUpdate({ generalNotes: e.target.value })}
                  placeholder="Anotações internas sobre o paciente..."
                />
              </Field>

              {mergedPatient.internalAlerts && (
                <div className={cn(
                  "p-5 rounded-2xl border flex gap-4 items-start shadow-sm",
                  mergedPatient.internalAlerts.color === 'red' ? "bg-rose-50 border-rose-200 text-rose-700" :
                  mergedPatient.internalAlerts.color === 'yellow' ? "bg-amber-50 border-amber-200 text-amber-700" :
                  "bg-blue-50 border-blue-200 text-blue-700"
                )}>
                  <div className={cn("p-2.5 rounded-xl shadow-sm", 
                    mergedPatient.internalAlerts.color === 'red' ? "bg-rose-500 text-white" :
                    mergedPatient.internalAlerts.color === 'yellow' ? "bg-amber-500 text-white" :
                    "bg-blue-500 text-white"
                  )}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[10px] uppercase tracking-widest mb-1">Alerta de Atendimento</h4>
                    <p className="text-sm font-medium leading-relaxed">{mergedPatient.internalAlerts.message}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Observações Financeiras">
                  <textarea 
                    className="w-full min-h-[100px] rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm" 
                    value={mergedPatient.financialNotes || ""} 
                    onChange={(e) => handleUpdate({ financialNotes: e.target.value })}
                    placeholder="Pendências, acordos ou restrições financeiras..."
                  />
                </Field>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    Etiquetas (Tags)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mergedPatient.tags?.length > 0 ? (
                      mergedPatient.tags.map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold border border-border">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">Nenhuma etiqueta atribuída.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[11px] font-bold border border-transparent flex items-center shadow-sm transition-all",
      className
    )}>
      {children}
    </span>
  );
}

function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
