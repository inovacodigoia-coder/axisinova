import React from 'react';
import { CadastroState } from '@/components/reception/attendance/AttendanceCadastroModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GENDER_LABELS } from '@/types/patient.types';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  state: CadastroState;
  unitName?: string;
}

export function LabStep6Summary({ state, update, unitName }: Props & { update: (patch: any) => void }) {
  const patient = state.patient || state.tempPatient;
  const attendanceDate = new Date();
  const [agreed, setAgreed] = React.useState(false);
  const [registrationSuccess, setRegistrationSuccess] = React.useState<boolean | null>(null);

  const totalExams = React.useMemo(() => {
    return state.guides?.reduce((acc, guide) => acc + (guide.exams?.length || 0), 0) || 0;
  }, [state.guides]);

  const allExamsVerified = (state.verifiedExams?.length || 0) >= totalExams && totalExams > 0;

  React.useEffect(() => {
    if (agreed) {
      setRegistrationSuccess(null);
      const timer = setTimeout(() => {
        const isValid = !!(state.patient && state.guides && state.guides.length > 0 && allExamsVerified);
        setRegistrationSuccess(isValid);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [agreed, state.patient, state.guides, allExamsVerified]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-12 max-w-[1400px] mx-auto w-full pb-20">
        
        {/* Section: Cliente */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
            <h3 className="text-lg font-bold text-blue-600 uppercase tracking-tight">Cliente</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-6 text-sm">
            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">ID / Cliente</span>
              <span className="text-slate-700 font-bold uppercase">{patient?.sequenceId ? `#${patient.sequenceId} - ` : ''}{patient?.fullName || 'NÃO INFORMADO'}</span>
            </div>
            
            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Nascimento</span>
              <span className="text-slate-700 font-bold">
                {patient?.birthDate ? format(new Date(patient.birthDate), 'dd/MM/yyyy') : '--/--/----'}
                <span className="text-slate-400 font-normal ml-2">
                  {patient?.age ? `${patient.age} anos, 0 meses, 0 dias` : ''}
                </span>
              </span>
            </div>

            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Hospital</span>
              <span className="text-slate-700 font-bold uppercase">{unitName || 'CLÍNICA AXIS INOVA'}</span>
            </div>

            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Responsável</span>
              <span className="text-slate-700 font-bold uppercase">{patient?.responsible?.name || '-'}</span>
            </div>

            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Mãe</span>
              <span className="text-slate-700 font-bold uppercase">{patient?.motherName || '-'}</span>
            </div>

            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Data do Atendimento</span>
              <span className="text-slate-700 font-bold">
                {format(attendanceDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>

            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Telefone</span>
              <span className="text-slate-700 font-bold">{patient?.phone1 || '-'}</span>
            </div>

            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Sexo</span>
              <span className="text-slate-700 font-bold uppercase">
                {patient?.gender ? GENDER_LABELS[patient.gender] : '-'}
              </span>
            </div>

            <div className="space-y-1 border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-medium block text-xs">Jejum</span>
              <span className="text-slate-700 font-bold uppercase">{state.fastingSince || 'Sem jejum'}</span>
            </div>
          </div>
        </section>

        {/* Section: Guias */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
            <h3 className="text-lg font-bold text-blue-600 uppercase tracking-tight">Guias</h3>
          </div>

          {state.guides?.filter(guide => guide.exams && guide.exams.length > 0).map((guide, gIdx) => (
            <div key={guide.id || gIdx} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 uppercase">
                {gIdx + 1}. {guide.convenioName || guide.name || guide.plan}
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-200">
                      <th className="px-4 py-3">Exames(s) Solicitado(s)</th>
                      <th className="px-4 py-3">Referência</th>
                      <th className="px-4 py-3">Preço</th>
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3">Coletado</th>
                      <th className="px-4 py-3">Previsão de Entrega</th>
                      <th className="px-4 py-3">Qtde. Autorizada</th>
                      <th className="px-4 py-3">Senha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {guide.exams?.map((exam: any, eIdx: number) => {
                      const examKey = `${guide.id}-${exam.id}-${eIdx}`;
                      const isChecked = state.verifiedExams?.includes(examKey);
                      
                      return (
                        <tr key={exam.id || eIdx} className={cn("hover:bg-slate-50/50 transition-colors", isChecked && "bg-emerald-50/30")}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const current = state.verifiedExams || [];
                                  const next = e.target.checked 
                                    ? [...current, examKey]
                                    : current.filter(k => k !== examKey);
                                  update({ verifiedExams: next });
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-[10px] font-bold text-white shrink-0">H</span>
                              <span className="font-bold text-slate-700 text-xs uppercase">{exam.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-medium text-xs">{exam.internalCode || exam.code || '-'}</td>
                          <td className="px-4 py-3 text-slate-700 font-bold text-xs">
                            {exam.price > 0 ? `R$ ${exam.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {exam.selectedMaterial || exam.material || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {exam.collected ? 'Sim' : 'Não'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {exam.expectedDeliveryDate ? (
                              /^\d{4}-\d{2}-\d{2}/.test(exam.expectedDeliveryDate) 
                                ? format(new Date(exam.expectedDeliveryDate), 'dd/MM/yyyy HH:mm')
                                : exam.expectedDeliveryDate
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {state.authorizationCode ? '1 de 1' : '0 de 1'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {state.authorizationPassword || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {(!state.guides || state.guides.length === 0) && (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <span className="text-slate-400 text-sm">Nenhuma guia cadastrada</span>
            </div>
          )}
        </section>

        {/* Verification Check */}
        <section className="pt-6 border-t border-slate-100">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Confirmo que todas as informações acima estão corretas e foram verificadas.
              </span>
            </label>

            {agreed && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className={cn(
                  "p-4 rounded-xl border flex items-center gap-3",
                  registrationSuccess === true ? "bg-emerald-50 border-emerald-200 text-emerald-700" : 
                  registrationSuccess === false ? "bg-rose-50 border-rose-200 text-rose-700" :
                  "bg-blue-50 border-blue-200 text-blue-700"
                )}>
                  {registrationSuccess === null && (
                    <>
                      <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-bold">Validando dados do cadastro...</span>
                    </>
                  )}
                  {registrationSuccess === true && (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-bold">Cadastro verificado com sucesso! Pronto para criar.</span>
                    </>
                  )}
                  {registrationSuccess === false && (
                    <>
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-sm font-bold">
                        {!allExamsVerified 
                          ? "Atenção: Você precisa marcar o check de verificação em todos os exames acima." 
                          : "Atenção: Verifique se todos os campos obrigatórios foram preenchidos."}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

