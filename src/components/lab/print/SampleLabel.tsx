import React, { useMemo } from 'react';
import Barcode from 'react-barcode';
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash';
import {
  LabelConfig,
  LabelFieldKey,
  MM_TO_PX,
  PT_TO_PX,
  defaultLabelConfig,
} from '@/types/label-config.types';

interface LabelProps {
  orderNumber: string;
  patientName: string;
  birthDate: string;
  material: string;
  tube: string;
  workbench: string;
  /** @deprecated hash do pedido — mantido por compatibilidade, não é mais impresso */
  hash?: string;
  printDate: string;
  isUrgent?: boolean;
  labelIndex: number;
  originSigla?: string;
  /** Código completo da amostra (ex.: 16-00-1-1). Se ausente, é montado a partir do pedido. */
  sampleCode?: string;
  /** ID sequencial da empresa (último bloco do código) */
  companySequenceId?: number | null;
  /** Referências (códigos/siglas) dos exames contidos nesta amostra */
  examRefs?: string[];
  /** Configuração de tipografia/dimensões da etiqueta */
  config?: LabelConfig;
}

export const SampleLabel = ({
  orderNumber,
  patientName,
  birthDate,
  material,
  tube,
  workbench,
  printDate,
  isUrgent,
  labelIndex,
  sampleCode,
  companySequenceId,
  examRefs = [],
  labName,
  config = defaultLabelConfig,
}: LabelProps & { labName?: string }) => {
  const sampleId = useMemo(() => {
    if (sampleCode) return sampleCode;
    if (!orderNumber || typeof labelIndex !== 'number') return 'INVALID-ID';
    return buildSampleCode(orderNumber, labelIndex, companySequenceId);
  }, [sampleCode, orderNumber, labelIndex, companySequenceId]);

  const sampleHash = useMemo(() => generateSampleHash(sampleId), [sampleId]);

  const refsText = useMemo(() => {
    const list = (examRefs || []).map(r => String(r || '').trim().toUpperCase()).filter(Boolean);
    if (!list.length) return '';
    const text = Array.from(new Set(list)).join(' ');
    return text.length > 90 ? `${text.slice(0, 87)}...` : text;
  }, [examRefs]);

  const f = (key: LabelFieldKey): React.CSSProperties => {
    const style = config.fields[key] ?? defaultLabelConfig.fields[key];
    const px = style.size * PT_TO_PX;
    return {
      fontSize: `${px.toFixed(2)}px`,
      // Mantém espaço para ascendentes e descendentes; uma entrelinha igual
      // à fonte faz o html2canvas recortar os caracteres ao gerar o PDF.
      lineHeight: `${(px * 1.15).toFixed(2)}px`,
      fontWeight: style.bold ? 700 : 400,
    };
  };

  const barcodeHeightPx = Math.round(config.barcodeHeightMm * MM_TO_PX);
  const headerHeightPx = Math.max(
    config.fields.sector.size * PT_TO_PX * 1.15,
    config.fields.dateTime.size * PT_TO_PX * 1.15,
  );

  return (
    <div
      className="box-border bg-white border border-slate-200 flex flex-col text-black font-mono overflow-hidden"
      style={{
        width: `${config.widthMm}mm`,
        height: `${config.heightMm}mm`,
        padding: `${config.marginMm}mm`,
      }}
    >
      {/* Cabeçalho: urgência / bancada / data */}
      <div
        className="flex shrink-0 items-center gap-1 uppercase whitespace-nowrap overflow-hidden"
        style={{ height: `${headerHeightPx.toFixed(2)}px` }}
        data-label-header
      >
        {isUrgent && <span className="bg-black text-white px-1" style={f('sector')}>URG</span>}
        <span className="flex-1 whitespace-nowrap" style={f('sector')}>{workbench || 'GERAL'}</span>
        <span className="whitespace-nowrap" style={f('dateTime')}>{printDate || '---'}</span>
      </div>

      {/* Código de barras */}
      <div
        className="flex w-full shrink-0 items-start justify-center overflow-hidden [&_canvas]:block [&_canvas]:max-w-full"
        style={{ height: `${barcodeHeightPx}px` }}
        data-label-barcode
      >
        <Barcode
          value={sampleHash || sampleId || 'ERROR'}
          renderer="canvas"
          format="CODE128"
          width={1.1}
          height={barcodeHeightPx}
          displayValue={false}
          margin={0}
          background="transparent"
        />
      </div>

      {/* Código da amostra + hash exclusivo do tubo (interfaceamento) */}
      <div className="flex shrink-0 items-center justify-between gap-1 whitespace-nowrap">
        <span style={f('sampleCode')}>{sampleId}</span>
        {sampleHash && <span className="tracking-tight" style={f('sampleHash')}>{sampleHash}</span>}
      </div>

      {/* Dados do paciente */}
      <div className="shrink-0 whitespace-nowrap uppercase" style={f('patientName')}>{patientName || 'PACIENTE NÃO INFORMADO'}</div>
      <div className="shrink-0 whitespace-nowrap" style={f('birthDate')}>
        NASC: {birthDate || '--/--/----'}
      </div>
      <div className="shrink-0 whitespace-nowrap uppercase" style={f('material')}>
        {material || '---'}{tube ? ` (${String(tube).toUpperCase()})` : ''}
      </div>

      {/* Referências dos exames */}
      <div className="shrink-0 uppercase whitespace-nowrap" style={f('examRefs')}>
        {refsText || '—'}
      </div>

      {/* Rodapé: Nome do Laboratório (Esquerda) e Software (Direita) */}
      <div className="flex flex-1 shrink-0 items-end justify-between gap-1">
        <span className="text-slate-600 uppercase whitespace-nowrap max-w-[70%]" style={f('labName')}>
          {labName}
        </span>
        <span className="text-slate-500 tracking-tighter opacity-80 whitespace-nowrap" style={f('brand')}>
          AXIS INOVA
        </span>
      </div>
    </div>
  );
};
