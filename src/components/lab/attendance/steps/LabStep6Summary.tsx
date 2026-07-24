import React from 'react';
import { CadastroState } from '@/components/reception/attendance/AttendanceCadastroModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GENDER_LABELS } from '@/types/patient.types';

interface Props {
  state: CadastroState;
  unitName?: string;
}

export function LabStep6Summary({ state, unitName }: Props) {
  const patient = state.patient || state.tempPatient;
  const attendanceDate = new Date();

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
              <span className="text-slate-400 font-medium block text-xs">Cliente</span>
              <span className="text-slate-700 font-bold uppercase">{patient?.fullName || 'NÃO INFORMADO'}</span>
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

          {state.guides?.map((guide, gIdx) => (
            <div key={guide.id || gIdx} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700">
                {gIdx + 1}. {guide.convenioName || 'PARTICULAR'} {guide.plan ? `- ${guide.plan}` : ''}
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
                      <th className="px-4 py-3">Complemento</th>
                      <th className="px-4 py-3">Qtde. Autorizada</th>
                      <th className="px-4 py-3">Senha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {guide.exams?.map((exam: any, eIdx: number) => (
                      <tr key={exam.id || eIdx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-[10px] font-bold text-white shrink-0">H</span>
                            <span className="font-bold text-slate-700 text-xs uppercase">{exam.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-medium text-xs">{exam.internalCode || exam.code || '-'}</td>
                        <td className="px-4 py-3 text-slate-700 font-bold text-xs">
                          {exam.price ? `R$ ${exam.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {exam.selectedMaterial || exam.material || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{exam.collected ? 'Sim' : 'Não'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {exam.deliveryDate ? format(new Date(exam.deliveryDate), 'dd/MM/yyyy - HH:mm') : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">-</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">0 de 1</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">-</td>
                      </tr>
                    ))}
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
        </div>
      </div>
    </div>
  );
}
