import { linhasDoLaudo } from '@/lib/laudoParametrosOpcionais'
import { semReferencia } from '@/lib/laudoValorTexto'
import { coletaEasLaudo3 } from '@/lib/easLaudo3'

const sections = ['MÉTODO DE COLETA', 'EXAME FÍSICO', 'EXAME QUÍMICO', 'EXAME MICROSCÓPICO DO SEDIMENTO']

/** Exam body only: company header, identity and signatures stay in LaudoDocument. */
export function EasLaudo3Document({ exam, order }: { exam: any; order: any }) {
  const rows = linhasDoLaudo(exam.results || [])
  const collectedLabel = coletaEasLaudo3(exam, order)
  return <section className="eas3-document exame-section">
    <h3 className="text-center text-base font-bold">URINÁLISE</h3>
    <div className="mb-2 mt-3 text-xs">SUMÁRIO DE URINA TIPO I
      <p className="mt-1 text-[9px]">[DATA DA COLETA: {collectedLabel}]</p>
    </div>
    <table className="eas3-table w-full table-fixed text-[11px]">
      <colgroup><col className="w-[30%]" /><col className="w-[40%]" /><col className="w-[30%]" /></colgroup>
      <thead><tr><th /><th className="pb-2 text-left font-normal">Resultado</th><th className="pb-2 text-left font-normal">Valor de referência</th></tr></thead>
      <tbody>{sections.map(section => {
        const group = rows.filter((r: any) => r.section === section)
        if (!group.length) return null
        return group.map((r: any, i: number) => <tr key={`${section}:${r.parameterId || i}`}>
          <td colSpan={3} className="p-0">
            {i === 0 && <div className="eas3-section pt-1 font-bold">{section}</div>}
            <div className="eas3-row">
              <div className="eas3-label">{section !== sections[0] && <><span>{r.reportLabel || r.parameterName || r.parameterCode}</span><span className="eas3-leader" /></>}</div>
              <div className="eas3-value">{r.value === '' || r.value == null ? '—' : String(r.value)}{r.unit && !['-', '—'].includes(r.unit) ? ` ${r.unit}` : ''}</div>
              <div className="eas3-reference">{semReferencia(r.referenceRange) ? '' : r.referenceRange}</div>
            </div>
          </td>
        </tr>)
      })}</tbody>
    </table>
    {exam.internalObservations && <p className="mt-2 whitespace-pre-wrap text-[10px]">Obs.: {exam.internalObservations}</p>}
    {exam.reportObservations && <p className="mt-2 whitespace-pre-wrap text-[10px]">{exam.reportObservations}</p>}
    <style>{`
      .eas3-document { color: var(--document-ink); font-family: 'Courier New', monospace; letter-spacing: 0; }
      .eas3-row { display: grid; grid-template-columns: 30% 40% 30%; min-height: 18px; line-height: 1.4; }
      .eas3-label { display: flex; gap: 3px; min-width: 0; padding-right: 6px; }
      .eas3-label > span:first-child { overflow-wrap: anywhere; }
      .eas3-leader { flex: 1; min-width: 4px; border-bottom: 1px dotted var(--document-ink); height: 12px; }
      .eas3-value, .eas3-reference { min-width: 0; padding-right: 8px; overflow-wrap: anywhere; white-space: pre-wrap; }
      .eas3-reference { font-size: 9px; }
      .eas3-section { margin-top: 3px; margin-bottom: 1px; }
      .eas3-page .laudo-body { margin-top: 16px; }
      .eas3-page .laudo-footer { margin-top: 16px; }
      .eas3-table tr { break-inside: avoid; }
    `}</style>
  </section>
}