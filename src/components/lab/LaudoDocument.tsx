import React from 'react';
import { LabAttendanceOrder } from '@/types/lab.types';
import { cn } from '@/lib/utils';

interface LaudoDocumentProps {
  order: Partial<LabAttendanceOrder> & Record<string, any>;
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

const fmtDateTime = (v?: string) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const fmtTime = (v?: string) => (v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-[130px] shrink-0 text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value || '—'}</span>
    </div>
  );
}

export default function LaudoDocument({
  order,
  companyLogo,
  secondaryLogo,
  laboratoryName = 'LABORATÓRIO MUNICIPAL CENTRAL',
  laboratorySubtitle,
  institutionalWarning,
  footerText,
  technicalResponsible,
  isRetified,
  retificationDetails,
}: LaudoDocumentProps) {
  const birth = order.patientBirthDate ? new Date(order.patientBirthDate) : null;
  const patientAge = birth ? new Date().getFullYear() - birth.getFullYear() : 0;

  const genderLabel =
    order.patientGender === 'M' || order.patientGender === 'male'
      ? 'Masculino'
      : order.patientGender === 'F' || order.patientGender === 'female'
        ? 'Feminino'
        : 'Outro';

  const approvedName = order.approvedBy || technicalResponsible?.name || '—';
  const approvedRegister = order.approvedRegister || technicalResponsible?.register || '';

  return (
    <div className="laudo-print bg-white p-10 font-sans text-zinc-900 w-[794px] min-h-[1123px] mx-auto shadow-sm print:shadow-none print:m-0 print:w-full">
      {isRetified && retificationDetails && (
        <div className="mb-6 p-4 border-2 border-orange-500 bg-orange-50 text-orange-900 rounded-lg no-print">
          <h4 className="font-bold">⚠️ LAUDO RETIFICADO</h4>
          <p className="text-xs mt-1">Este laudo foi retificado em {fmtDateTime(retificationDetails.date)}</p>
          <p className="text-xs font-medium">Motivo: {retificationDetails.reason}</p>
          <p className="text-[10px] text-orange-700">Retificado por: {retificationDetails.userName}</p>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-14 w-32 flex items-center">
          {companyLogo ? <img src={companyLogo} alt="Logo principal" className="h-full max-w-full object-contain" /> : null}
        </div>
        <div className="flex-1 px-4 text-center">
          <h1 className="text-base font-bold uppercase tracking-wide">{laboratoryName}</h1>
          {laboratorySubtitle && <p className="text-[10px] text-zinc-600 mt-1">{laboratorySubtitle}</p>}
        </div>
        <div className="h-14 w-32 flex items-center justify-end">
          {secondaryLogo ? <img src={secondaryLogo} alt="Logo secundário" className="h-full max-w-full object-contain" /> : null}
        </div>
      </div>

      {/* Identificação do paciente */}
      <h2 className="text-[17px] font-semibold uppercase tracking-wide mb-2">{order.patientName || 'NOME DO PACIENTE'}</h2>
      <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-[11px] pb-3 border-b border-zinc-300">
        <InfoRow label="Protocolo" value={order.protocol} />
        <InfoRow label="Data do atendimento" value={fmtDateTime(order.registeredAt as any)} />
        <InfoRow label="Sexo" value={genderLabel} />
        <InfoRow
          label="Médico solicitante"
          value={
            order.doctorName
              ? `${order.doctorName}${order.doctorCRM ? ` — CRM ${order.doctorCRM}` : ''}`
              : '—'
          }
        />
        <InfoRow label="Data de nascimento" value={birth ? `${fmtDate(order.patientBirthDate)} (${patientAge} anos)` : '—'} />
        <InfoRow label="Local" value={(order as any).originName} />
      </div>

      {institutionalWarning && (
        <div className="mt-4 text-[9px] leading-relaxed text-zinc-600 whitespace-pre-line">{institutionalWarning}</div>
      )}

      {/* Exames — respeitando a ordem das bancadas técnicas */}
      <div className="laudo-body mt-6 space-y-7 min-h-[520px]">
        {order.exams?.map((exam: any, idx: number) => {
          const results: any[] = exam.results || [];
          const sections: { name: string; rows: any[] }[] = [];
          results.forEach((r) => {
            const name = (r.section || '').trim();
            let bucket = sections.find((s) => s.name === name);
            if (!bucket) {
              bucket = { name, rows: [] };
              sections.push(bucket);
            }
            bucket.rows.push(r);
          });

          return (
            <div key={exam.examId || idx} className="exame-section break-inside-avoid">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-800">{exam.name}</h3>
              <div className="w-full h-px bg-zinc-300 my-1" />
              <p className="text-[9px] text-zinc-500 mb-3">
                Material: {exam.material || 'Soro'}
                {exam.methodology ? `  •  Método: ${exam.methodology}` : ''}
              </p>

              {sections.map((section, sIdx) => (
                <div key={sIdx} className="mb-4">
                  {section.name && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-3 w-[3px] bg-cyan-500 rounded-sm" />
                      <span className="text-[11px] font-semibold text-zinc-800">{section.name}</span>
                    </div>
                  )}
                  <table className="w-full text-[10.5px]">
                    <thead>
                      <tr className="text-left text-zinc-500 border-b border-zinc-200 uppercase tracking-wider text-[9px]">
                        <th className="pb-1 font-medium w-[42%]">Parâmetro</th>
                        <th className="pb-1 font-medium w-[10%]">Valor atual</th>
                        <th className="pb-1 font-medium w-[8%]" />
                        <th className="pb-1 font-medium">Valor de referência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((res: any, rIdx: number) => (
                        <tr key={rIdx} className="align-top">
                          <td className="py-[3px] text-zinc-800">{res.parameterName || res.parameterCode}</td>
                          <td className="py-[3px] font-mono text-zinc-900 whitespace-nowrap">
                            {res.value || '—'} {res.unit && <span className="text-zinc-600">{res.unit}</span>}
                          </td>
                          <td
                            className={cn(
                              'py-[3px] font-mono font-bold whitespace-nowrap',
                              res.flag ? 'text-red-600 print:text-black' : 'text-transparent',
                            )}
                          >
                            {res.flag ? `*${res.flag}` : ''}
                          </td>
                          <td className="py-[3px] text-zinc-600">{res.referenceRange || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {exam.internalObservations && (
                <p className="text-[9px] text-zinc-600 mt-1 whitespace-pre-line">Obs.: {exam.internalObservations}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <div className="laudo-footer mt-10 pt-3 border-t border-zinc-300">
        <div className="grid grid-cols-2 gap-6 text-[9.5px] mb-8">
          <div className="space-y-1">
            <p>
              <span className="text-zinc-500">Data da coleta:</span>{' '}
              <span className="font-medium">{fmtDateTime((order as any).collectionTime)}</span>
            </p>
            <p>
              <span className="text-zinc-500">Aprovado por:</span>{' '}
              <span className="font-medium">
                {approvedName}
                {approvedRegister ? ` — ${approvedRegister}` : ''}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p>
              <span className="text-zinc-500">Data de aprovação:</span>{' '}
              <span className="font-medium">{fmtDate((order as any).approvedAt)}</span>
            </p>
            <p>
              <span className="text-zinc-500">Horário de aprovação:</span>{' '}
              <span className="font-medium">{fmtTime((order as any).approvedAt)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-6">
          <div className="h-14 mb-1">
            {technicalResponsible?.signatureUrl ? (
              <img src={technicalResponsible.signatureUrl} alt="Assinatura do responsável" className="h-full object-contain" />
            ) : (
              <div className="h-full w-48 border-b border-zinc-400" />
            )}
          </div>
          <div className="text-center">
            {technicalResponsible?.name && <p className="font-semibold text-[10px]">{technicalResponsible.name}</p>}
            {technicalResponsible?.role && <p className="text-[9px] text-zinc-600">{technicalResponsible.role}</p>}
            {technicalResponsible?.register && <p className="text-[9px] text-zinc-600">{technicalResponsible.register}</p>}
          </div>
        </div>

        <div className="border-t border-zinc-300 pt-2 flex justify-between items-end text-[8px] text-zinc-500 gap-4">
          <div className="whitespace-pre-line text-left">{footerText || ''}</div>
          <div className="shrink-0">Página 1 de 1</div>
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
