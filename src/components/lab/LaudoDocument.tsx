import React from 'react';
import { LabAttendanceOrder, LabExam } from '@/types/lab.types';
import { cn } from '@/lib/utils';

interface LaudoDocumentProps {
  order: Partial<LabAttendanceOrder>;
  companyLogo?: string;
  secondaryLogo?: string;
  laboratoryName?: string;
  laboratorySubtitle?: string;
  institutionalWarning?: string;
  footerText?: string;
  technicalResponsible?: {
    name: string;
    register: string;
    signatureUrl?: string;
    role?: string;
  };
  isRetified?: boolean;
  retificationDetails?: {
    date: string;
    reason: string;
    userName: string;
  };
}

export default function LaudoDocument({
  order,
  companyLogo,
  secondaryLogo,
  laboratoryName = "LABORATÓRIO MUNICIPAL CENTRAL",
  laboratorySubtitle,
  institutionalWarning,
  footerText,
  technicalResponsible,
  isRetified,
  retificationDetails
}: LaudoDocumentProps) {

  const patientAge = order.patientBirthDate 
    ? new Date().getFullYear() - new Date(order.patientBirthDate).getFullYear()
    : 0;

  return (
    <div className="laudo-print bg-white p-8 font-sans text-zinc-900 w-[794px] min-h-[1123px] mx-auto shadow-sm print:shadow-none print:m-0 print:w-full">
      {/* Retification Alert */}
      {isRetified && retificationDetails && (
        <div className="mb-6 p-4 border-2 border-orange-500 bg-orange-50 text-orange-900 rounded-lg no-print">
          <h4 className="font-bold flex items-center gap-2">
            ⚠️ LAUDO RETIFICADO
          </h4>
          <p className="text-xs mt-1">
            Este laudo foi retificado em {new Date(retificationDetails.date).toLocaleString('pt-BR')}
          </p>
          <p className="text-xs font-medium">Motivo: {retificationDetails.reason}</p>
          <p className="text-[10px] text-orange-700">Retificado por: {retificationDetails.userName}</p>
        </div>
      )}

      {/* Header */}
      <div className="laudo-header border-b-2 border-zinc-800 pb-4 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-16 w-32 flex items-center justify-center">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo principal" className="h-full max-w-full object-contain" />
            ) : null}
          </div>
          <div className="flex-1 px-4 text-center">
            <h1 className="text-xl font-bold uppercase tracking-tight">{laboratoryName}</h1>
            {laboratorySubtitle && (
              <p className="text-[11px] text-zinc-700 mt-1">{laboratorySubtitle}</p>
            )}
          </div>
          <div className="h-16 w-32 flex items-center justify-center">
            {secondaryLogo ? (
              <img src={secondaryLogo} alt="Logo secundário" className="h-full max-w-full object-contain" />
            ) : null}
          </div>
        </div>


        <div className="mb-4">
          <h2 className="text-lg font-bold uppercase">{order.patientName || 'NOME DO PACIENTE'}</h2>
        </div>

        <div className="grid grid-cols-3 gap-y-2 text-[11px] leading-relaxed">
          <div><strong>Protocolo:</strong> {order.protocol || '20260000-000-00'}</div>
          <div><strong>Data do atendimento:</strong> {order.registeredAt ? new Date(order.registeredAt).toLocaleString('pt-BR') : '22/06/2026 16:08'}</div>
          <div><strong>Sexo:</strong> {order.patientGender === 'M' ? 'Masculino' : order.patientGender === 'F' ? 'Feminino' : 'Outro'}</div>
          
          <div className="col-span-2">
            <strong>Médico solicitante:</strong> {order.doctorName || 'José Glaucio da Nobrega M. Filho'} 
            {order.doctorCRM && <span className="ml-1">— CRM {order.doctorCRM}</span>}
          </div>
          
          <div><strong>Nascimento:</strong> {order.patientBirthDate ? new Date(order.patientBirthDate).toLocaleDateString('pt-BR') : '18/02/1989'} ({patientAge} anos)</div>
          <div><strong>Local:</strong> Ipanguaçu</div>
        </div>
      </div>

      {/* Body - Exams */}
      <div className="laudo-body space-y-8 min-h-[600px]">
        {order.exams?.map((exam: any, idx: number) => (
          <div key={exam.examId || idx} className="exame-section">
            <h3 className="font-bold text-sm uppercase mb-1">{exam.name}</h3>
            <div className="w-full h-px bg-zinc-800 mb-1" />
            <p className="text-[10px] text-zinc-700 mb-4">Material: {exam.material || 'Soro'}</p>

            <table className="w-full text-[11px] leading-relaxed">
              <thead>
                <tr className="text-left border-b border-zinc-200">
                  <th className="pb-1 w-1/3">PARÂMETRO</th>
                  <th className="pb-1 text-center">RESULTADO</th>
                  <th className="pb-1 text-center">UNIDADE</th>
                  <th className="pb-1 text-right">VALORES DE REFERÊNCIA</th>
                </tr>
              </thead>
              <tbody>
                {exam.results?.map((res: any, rIdx: number) => (
                  <tr key={rIdx} className="border-b border-zinc-50">
                    <td className="py-2">{res.parameterName || res.parameterCode}</td>
                    <td className={cn(
                      "py-2 text-center font-bold",
                      res.status === 'altered' || res.status === 'critical' ? "text-red-600 print:text-black" : ""
                    )}>
                      {res.value}
                      {res.status === 'critical' && <span className="ml-1 text-[8px] bg-red-600 text-white px-1 rounded print:border print:border-black print:text-black print:bg-white no-print">CRÍTICO</span>}
                    </td>
                    <td className="py-2 text-center text-zinc-700">{res.unit || '-'}</td>
                    <td className="py-2 text-right text-zinc-700">{res.referenceRange || '3,5 - 5,2'}</td>
                  </tr>
                ))}
                {/* Fallback if no results listed in mock */}
                {(!exam.results || exam.results.length === 0) && (
                  <tr>
                    <td className="py-2">{exam.name}</td>
                    <td className="py-2 text-center font-bold">4</td>
                    <td className="py-2 text-center text-zinc-700">g/dL</td>
                    <td className="py-2 text-right text-zinc-700">3,5 - 5,2</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {exam.isRetificado && exam.retificationHistory?.length > 0 && (
              <div className="mt-2 text-[8px] text-zinc-500 italic">
                * Valor anterior: {exam.retificationHistory[exam.retificationHistory.length - 1].previousValue} (retificado em {new Date(exam.retificationHistory[exam.retificationHistory.length - 1].timestamp).toLocaleDateString('pt-BR')})
              </div>
            )}
            
            {idx < (order.exams?.length || 0) - 1 && (
              <div className="mt-6 border-t border-dashed border-zinc-200 w-24 mx-auto" />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="laudo-footer mt-12 pt-4 border-t border-zinc-200">
        <div className="grid grid-cols-2 gap-4 text-[9px] mb-8">
          <div className="space-y-1">
            <p><strong>Data da coleta:</strong> {order.collectionTime ? new Date(order.collectionTime).toLocaleString('pt-BR') : '23/06/2026 14:19'}</p>
            <p><strong>Aprovado por:</strong> {technicalResponsible?.name || 'Anderson'} — {technicalResponsible?.register || 'CRBM-RN 08453'}</p>
          </div>
          <div className="space-y-1 text-right">
            <p><strong>Data de aprovação:</strong> 26/06/2026</p>
            <p><strong>Horário de aprovação:</strong> 09:56</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-6">
          <div className="h-16 mb-2">
            {technicalResponsible?.signatureUrl ? (
              <img src={technicalResponsible.signatureUrl} alt="Assinatura" className="h-full object-contain" />
            ) : (
              <div className="h-full w-48 border-b border-zinc-400 flex items-end justify-center pb-1 text-[10px] text-zinc-300 italic">
                [IMAGEM DA ASSINATURA DIGITAL]
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="font-bold text-[10px]">{technicalResponsible?.name || 'Anderson Veríssimo O. Neto'}</p>
            <p className="text-[9px]">{technicalResponsible?.role || 'Biomédico'}</p>
            <p className="text-[9px]">{technicalResponsible?.register || 'CRBM-RN-08465'}</p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-2 flex justify-between items-end text-[8px] text-zinc-500">
          <div>
            <p className="font-bold text-zinc-700 uppercase">Ipanguaçu</p>
            <p>Resp. Téc.: Almir Souza • CRBM-RN-08465</p>
          </div>
          <div>
            Página 1 de 1
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .laudo-print { 
            box-shadow: none !important; 
            margin: 0 !important; 
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
