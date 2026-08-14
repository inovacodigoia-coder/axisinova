import React, { useMemo } from 'react';
import Barcode from 'react-barcode';
import { normalizeHash } from '@/utils/orderHash';

interface LabelProps {
  orderNumber: string;
  patientName: string;
  birthDate: string;
  material: string;
  tube: string;
  workbench: string;
  hash: string;
  printDate: string;
  isUrgent?: boolean;
  labelIndex: number;
  originSigla?: string;
  /** Referências (códigos/siglas) dos exames contidos nesta amostra */
  examRefs?: string[];
}

export const SampleLabel = ({
  orderNumber,
  patientName,
  birthDate,
  material,
  tube,
  workbench,
  hash,
  printDate,
  isUrgent,
  labelIndex,
  examRefs = [],
}: LabelProps) => {
  const sampleId = useMemo(() => {
    if (!orderNumber || typeof labelIndex !== 'number') return 'INVALID-ID';
    return `${orderNumber}-${labelIndex}`;
  }, [orderNumber, labelIndex]);

  const refsText = useMemo(() => {
    const list = (examRefs || []).map(r => String(r || '').trim().toUpperCase()).filter(Boolean);
    if (!list.length) return '';
    const text = Array.from(new Set(list)).join(' ');
    return text.length > 90 ? `${text.slice(0, 87)}...` : text;
  }, [examRefs]);

  return (
    <div className="w-[50mm] h-[30mm] bg-white border border-slate-200 px-1.5 py-1 flex flex-col text-black font-mono overflow-hidden leading-none">
      {/* Cabeçalho: urgência / bancada / data */}
      <div className="flex items-center gap-1 text-[7px] font-bold uppercase">
        {isUrgent && <span className="bg-black text-white px-1 py-[1px]">URG</span>}
        <span className="flex-1 truncate">{workbench || 'GERAL'}</span>
        <span className="whitespace-nowrap">{printDate || '---'}</span>
      </div>

      {/* Código de barras */}
      <div className="w-full flex justify-center mt-0.5">
        <Barcode
          value={sampleId || 'ERROR'}
          format="CODE128"
          width={1.1}
          height={26}
          displayValue={false}
          margin={0}
          background="transparent"
        />
      </div>

      {/* Código da amostra + hash do pedido (mesmo para todas as etiquetas) */}
      <div className="flex items-baseline justify-between gap-1 whitespace-nowrap">
        <span className="text-[9px] font-bold">{sampleId}</span>
        {hash && <span className="text-[7.5px] font-bold tracking-tight">{normalizeHash(hash)}</span>}
      </div>

      {/* Dados do paciente */}
      <div className="text-[7px] font-bold uppercase truncate">{patientName || 'PACIENTE NÃO INFORMADO'}</div>
      <div className="text-[7px] whitespace-nowrap">
        NASC: {birthDate || '--/--/----'}
      </div>
      <div className="text-[7px] font-bold uppercase truncate">
        {material || '---'}{tube ? ` (${String(tube).toUpperCase()})` : ''}
      </div>

      {/* Referências dos exames */}
      <div className="text-[6.5px] font-bold uppercase leading-[1.15] overflow-hidden flex-1">
        {refsText || '—'}
      </div>
    </div>
  );
};
