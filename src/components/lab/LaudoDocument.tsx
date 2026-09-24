import React from 'react';
import { LabAttendanceOrder } from '@/types/lab.types';
import { cn } from '@/lib/utils';
import { buildLaudoTagContext, renderLaudoTemplate } from '@/utils/laudoTags';


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
const parseLocalDate = (value?: string) => {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const fmtDate = (v?: string) => parseLocalDate(v)?.toLocaleDateString('pt-BR') || '—';
const fmtTime = (v?: string) => (v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-[130px] shrink-0 text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value || '—'}</span>
    </div>
  );
}

/* ---------- Ordenação e agrupamento de seções ---------- */

const SECTION_ORDER = ['série vermelha', 'serie vermelha', 'série branca', 'serie branca', 'contagem de plaquetas', 'plaquetas'];

const sectionRank = (name: string) => {
  const n = (name || '').trim().toLowerCase();
  const idx = SECTION_ORDER.findIndex((s) => n === s || n.includes(s));
  return idx === -1 ? 900 : idx;
};

const SERIE_VERMELHA = 'Série Vermelha';
const SERIE_BRANCA = 'Série Branca';
const PLAQUETAS = 'Contagem de Plaquetas';

const stripAccents = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Deduz a seção do hemograma pelo nome do parâmetro quando não vier do catálogo. */
const inferSection = (paramName: string): string => {
  const n = stripAccents(paramName);
  if (/(plaqueta|vpm|volume plaquetario|pdw|plaquetocrito)/.test(n)) return PLAQUETAS;
  if (/(leucocit|neutrofil|bastonete|segmentado|eosinofil|basofil|linfocit|monocit|blasto|mielocit|promielocit|metamielocit|celulas jovens)/.test(n))
    return SERIE_BRANCA;
  if (/(hemacia|eritrocit|hemoglobina|hematocrito|vcm|hcm|chcm|rdw|reticulocit)/.test(n)) return SERIE_VERMELHA;
  return '';
};

const isWhiteSeries = (name: string) => /serie branca/.test(stripAccents(name));

const normalizeBase = (name: string) =>
  (name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/%|＃|#|absolutos?|abs\.?|\/\s*[µu]l|mm3|mm³/g, ' ')
    .replace(/[^a-zà-ú0-9]+/gi, ' ')
    .trim();

const isPercentRow = (row: any) =>
  String(row.unit || '').includes('%') || /%/.test(String(row.parameterName || ''));

type PairedRow = { base: string; label: string; pct?: any; abs?: any };

function buildPairedRows(rows: any[]): { paired: PairedRow[]; hasPairs: boolean } {
  const map = new Map<string, PairedRow>();
  const order: string[] = [];
  rows.forEach((r) => {
    const base = normalizeBase(r.parameterName || r.parameterCode || '');
    if (!map.has(base)) {
      map.set(base, { base, label: r.parameterName || r.parameterCode, pct: undefined, abs: undefined });
      order.push(base);
    }
    const entry = map.get(base)!;
    if (isPercentRow(r) && !entry.pct) {
      entry.pct = r;
      if (/%/.test(String(r.parameterName || '')) === false) entry.label = r.parameterName || entry.label;
    } else if (!entry.abs) {
      entry.abs = r;
    } else if (!entry.pct) {
      entry.pct = r;
    }
  });
  const paired = order.map((k) => map.get(k)!);
  const hasPairs = paired.some((p) => p.pct && p.abs);
  return { paired, hasPairs };
}

function Flag({ flag }: { flag?: string }) {
  if (!flag) return <span className="text-transparent">*</span>;
  return <span className="font-mono font-bold text-red-600 print:text-black">*{flag}</span>;
}

function StandardTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-[10.5px]">
      <thead>
        <tr className="text-left text-zinc-500 border-b border-zinc-200 uppercase tracking-wider text-[9px]">
          <th className="pb-1 font-medium w-[42%]">Parâmetro</th>
          <th className="pb-1 font-medium w-[18%]">Valor atual</th>
          <th className="pb-1 font-medium w-[6%]" />
          <th className="pb-1 font-medium">Valor de referência</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((res: any, rIdx: number) => (
          <tr key={rIdx} className="align-top">
            <td className="py-[3px] text-zinc-800">{res.parameterName || res.parameterCode}</td>
            <td className="py-[3px] font-mono text-zinc-900 whitespace-nowrap">
              {res.value || '—'} {res.unit && <span className="text-zinc-600">{res.unit}</span>}
            </td>
            <td className="py-[3px] whitespace-nowrap">
              <Flag flag={res.flag} />
            </td>
            <td className="py-[3px] text-zinc-600">{res.referenceRange || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DifferentialTable({ paired }: { paired: PairedRow[] }) {
  return (
    <table className="w-full text-[10.5px]">
      <thead>
        <tr className="text-left text-zinc-500 border-b border-zinc-200 uppercase tracking-wider text-[9px]">
          <th className="pb-1 font-medium w-[34%]">Parâmetro</th>
          <th className="pb-1 font-medium w-[12%]">Valor %</th>
          <th className="pb-1 font-medium w-[5%]" />
          <th className="pb-1 font-medium w-[15%]">Ref %</th>
          <th className="pb-1 font-medium w-[13%]">Valor /µL</th>
          <th className="pb-1 font-medium w-[5%]" />
          <th className="pb-1 font-medium">Ref /µL</th>
        </tr>
      </thead>
      <tbody>
        {paired.map((p, idx) => (
          <tr key={idx} className="align-top">
            <td className="py-[3px] text-zinc-800">{p.label}</td>
            <td className="py-[3px] font-mono text-zinc-900 whitespace-nowrap">{p.pct?.value || '—'}</td>
            <td className="py-[3px] whitespace-nowrap">
              <Flag flag={p.pct?.flag} />
            </td>
            <td className="py-[3px] text-zinc-600">{p.pct?.referenceRange || '—'}</td>
            <td className="py-[3px] font-mono text-zinc-900 whitespace-nowrap">{p.abs?.value || '—'}</td>
            <td className="py-[3px] whitespace-nowrap">
              <Flag flag={p.abs?.flag} />
            </td>
            <td className="py-[3px] text-zinc-600">{p.abs?.referenceRange || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExamBlock({ exam, order }: { exam: any; order?: any }) {
  const results: any[] = exam.results || [];
  const sections: { name: string; rows: any[] }[] = [];
  results.forEach((r) => {
    const name = ((r.section || '').trim() || inferSection(r.parameterName || r.parameterCode || '')).trim();
    let bucket = sections.find((s) => s.name === name);
    if (!bucket) {
      bucket = { name, rows: [] };
      sections.push(bucket);
    }
    bucket.rows.push(r);
  });
  sections.sort((a, b) => sectionRank(a.name) - sectionRank(b.name));

  const tpl = exam.reportTemplate || null;
  const ctx = React.useMemo(() => buildLaudoTagContext(order || {}, exam, {}), [order, exam]);

  return (
    <div className="exame-section break-inside-avoid">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-800">{exam.name}</h3>
      <div className="w-full h-px bg-zinc-300 my-1" />
      <p className="text-[9px] text-zinc-500">
        Material: {exam.material || 'Soro'}
      </p>
      {exam.realizadoPor && (
        <p className="text-[9px] text-zinc-500">Exame realizado por: {exam.realizadoPor}{exam.executorInformado ? ` · Executor: ${exam.executorInformado}` : ''}</p>
      )}
      {exam.apoioEmAndamento && (
        <p className="mt-2 text-[10px] font-semibold text-zinc-700">{exam.apoioEmAndamento}</p>
      )}
      {exam.apoioPdfAnexo && (
        <p className="mt-2 text-[10px] font-semibold text-zinc-700">Laudo do laboratório de apoio anexo a este documento.</p>
      )}
      {exam.methodology && (
        <p className="text-[9px] text-zinc-500">Método: {exam.methodology}</p>
      )}
      {tpl?.header_html && (
        <div
          className="laudo-tpl text-[9.5px] text-zinc-700 whitespace-pre-line mt-2"
          dangerouslySetInnerHTML={{ __html: renderLaudoTemplate(tpl.header_html, ctx) }}
        />
      )}
      <div className="mb-3" />

      {!exam.apoioEmAndamento && !exam.apoioPdfAnexo && sections.map((section, sIdx) => {
        const white = isWhiteSeries(section.name);
        const { paired, hasPairs } = white ? buildPairedRows(section.rows) : { paired: [], hasPairs: false };
        return (
          <div key={sIdx} className="mb-4">
            {section.name && (
              <div className="flex items-center gap-2 mb-1">
                <span className="h-3 w-[3px] bg-cyan-500 rounded-sm" />
                <span className="text-[11px] font-semibold text-zinc-800">{section.name}</span>
              </div>
            )}
            {white && hasPairs ? <DifferentialTable paired={paired} /> : <StandardTable rows={section.rows} />}
          </div>
        );
      })}

      {tpl?.body_html && (
        <div
          className="laudo-tpl text-[9.5px] text-zinc-700 whitespace-pre-line mt-2"
          dangerouslySetInnerHTML={{ __html: renderLaudoTemplate(tpl.body_html, ctx) }}
        />
      )}

      {exam.reportObservations && (
        <p className="text-[9px] text-zinc-600 mt-1 whitespace-pre-line">{exam.reportObservations}</p>
      )}

      {exam.internalObservations && (
        <p className="text-[9px] text-zinc-600 mt-1 whitespace-pre-line">Obs.: {exam.internalObservations}</p>
      )}

      {tpl?.footer_html && (
        <div
          className="laudo-tpl text-[9px] text-zinc-600 whitespace-pre-line mt-2"
          dangerouslySetInnerHTML={{ __html: renderLaudoTemplate(tpl.footer_html, ctx) }}
        />
      )}
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
  const birth = parseLocalDate(order.patientBirthDate);
  const today = new Date();
  const patientAge = birth
    ? today.getFullYear() - birth.getFullYear()
      - (today.getMonth() < birth.getMonth()
        || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0)
    : 0;

  const genderLabel =
    order.patientGender === 'M' || order.patientGender === 'male'
      ? 'Masculino'
      : order.patientGender === 'F' || order.patientGender === 'female'
        ? 'Feminino'
        : 'Outro';

  const approvedName = order.approvedBy || '—';
  const approvedRegister = order.approvedRegister?.trim() || '';

  // Uma folha por Bancada Técnica (nunca misturar bancadas na mesma página).
  // Exames marcados como "laudo em folha exclusiva" saem sozinhos em uma página.
  // Quando não é folha exclusiva, os exames são paginados por altura estimada para
  // que TODA página impressa tenha cabeçalho e rodapé completos.
  const pages = React.useMemo(() => {
    /** Altura útil aproximada (px) para os exames em uma folha A4 com cabeçalho + rodapé. */
    const CONTENT_BUDGET = 470;

    const estimateExamHeight = (exam: any) => {
      const rows = (exam.results || []).length;
      const sections = new Set(
        (exam.results || []).map((r: any) => (r.section || '').trim()),
      ).size;
      const tpl = exam.reportTemplate || null;
      let h = 46; // título + material + divisor
      if (exam.methodology) h += 12;
      if (exam.realizadoPor) h += 12;
      h += Math.max(sections, 1) * 20; // cabeçalhos de seção + header da tabela
      h += rows * 15;
      if (tpl?.header_html) h += 28;
      if (tpl?.body_html) h += 34;
      if (tpl?.footer_html) h += 26;
      if (exam.reportObservations) h += 26;
      if (exam.internalObservations) h += 22;
      return h + 24; // espaçamento entre exames
    };

    const groups: { workbench: string; order: number; exams: any[]; exclusive?: boolean }[] = [];
    const buckets: { workbench: string; order: number; exams: any[]; exclusive?: boolean }[] = [];

    (order.exams || []).forEach((exam: any) => {
      if (exam.singlePage) {
        buckets.push({
          workbench: exam.name || exam.workbench || 'Geral',
          order: exam.workbenchOrder ?? 9999,
          exams: [exam],
          exclusive: true,
        });
        return;
      }
      const wb = exam.workbench || 'Geral';
      let g = buckets.find((x) => x.workbench === wb && !x.exclusive);
      if (!g) {
        g = { workbench: wb, order: exam.workbenchOrder ?? 9999, exams: [] };
        buckets.push(g);
      }
      g.exams.push(exam);
    });

    buckets.forEach((bucket) => {
      if (bucket.exclusive) {
        groups.push(bucket);
        return;
      }
      let current: any[] = [];
      let used = 0;
      bucket.exams.forEach((exam: any) => {
        const h = estimateExamHeight(exam);
        if (current.length && used + h > CONTENT_BUDGET) {
          groups.push({ workbench: bucket.workbench, order: bucket.order, exams: current });
          current = [];
          used = 0;
        }
        current.push(exam);
        used += h;
      });
      if (current.length) groups.push({ workbench: bucket.workbench, order: bucket.order, exams: current });
    });

    groups.sort((a, b) => a.order - b.order || a.workbench.localeCompare(b.workbench));
    return groups;
  }, [order.exams]);



  

  const doctorLine = order.doctorName
    ? `${order.doctorName}${order.doctorCRM ? ` — ${order.doctorCRM}` : ''}`
    : (order as any).requestingDoctor || '—';

  return (
    <div className="laudo-print-wrapper flex flex-col gap-6 print:gap-0">
      {(pages.length ? pages : [{ workbench: 'Geral', order: 0, exams: [] }]).map((page, pageIdx) => (
        <div
          key={page.workbench + pageIdx}
          className="laudo-print laudo-page bg-white p-10 font-sans text-zinc-900 w-[794px] min-h-[1123px] mx-auto shadow-sm flex flex-col print:shadow-none print:m-0 print:w-full"
        >
          {isRetified && retificationDetails && pageIdx === 0 && (
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

          {/* Identificação do paciente (repetida em todas as folhas) */}
          <h2 className="text-[17px] font-semibold uppercase tracking-wide mb-2">{order.patientName || 'NOME DO PACIENTE'}</h2>
          <div className="grid grid-cols-2 gap-x-10 gap-y-1 text-[11px] pb-3 border-b border-zinc-300">
            <InfoRow label="Protocolo" value={order.protocol} />
            <InfoRow label="Data do atendimento" value={fmtDateTime(order.registeredAt as any)} />
            <InfoRow label="Sexo" value={genderLabel} />
            <InfoRow label="Médico solicitante" value={doctorLine} />
            <InfoRow label="Data de nascimento" value={birth ? `${fmtDate(order.patientBirthDate)} (${patientAge} anos)` : '—'} />
            <InfoRow label="Local" value={(order as any).originName} />
          </div>

          {institutionalWarning && pageIdx === 0 && (
            <div className="mt-4 text-[9px] leading-relaxed text-zinc-600 whitespace-pre-line">{institutionalWarning}</div>
          )}

          {/* Exames da bancada desta folha */}
          <div className="laudo-body mt-6 space-y-7 flex-1">
            {page.exams.map((exam: any, idx: number) => (
              <ExamBlock key={exam.examId || idx} exam={exam} order={order} />
            ))}
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

            <div className="border-t border-zinc-300 pt-2 text-[8px] text-zinc-500">
              <div className="whitespace-pre-line text-left">{footerText || ''}</div>
            </div>

          </div>
        </div>
      ))}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .laudo-print-wrapper { gap: 0 !important; }
          .laudo-print {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: hidden !important;
          }
          .laudo-page { 
            break-after: auto;
            page-break-after: auto;
            break-inside: avoid;
            page-break-inside: avoid;
            border: none !important;

          }

          .laudo-page + .laudo-page {
            break-before: page;
            page-break-before: always;
          }
          
          /* Forçar uma página para hemograma (seção break-inside-avoid já existe, mas vamos reforçar) */
          .exame-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
