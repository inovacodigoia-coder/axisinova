import React, { useMemo } from 'react';
import Barcode from 'react-barcode';
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash';

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

  return (
    <div className="w-[50mm] h-[30mm] bg-white border border-slate-200 px-1.5 py-[1px] flex flex-col text-black font-mono overflow-hidden relative">
      {/* Cabeçalho: urgência / bancada / data */}
      <div className="flex items-center gap-1 text-[10px] leading-[12px] h-[12px] font-bold uppercase">
        {isUrgent && <span className="bg-black text-white px-1">URG</span>}
        <span className="flex-1 truncate">{workbench || 'GERAL'}</span>
        <span className="whitespace-nowrap">{printDate || '---'}</span>
      </div>

      {/* Código de barras */}
      <div className="w-full flex justify-center h-[24px] overflow-hidden">
        <Barcode
          value={sampleHash || sampleId || 'ERROR'}
          format="CODE128"
          width={1.1}
          height={24}
          displayValue={false}
          margin={0}
          background="transparent"
        />
      </div>

      {/* Código da amostra + hash exclusivo do tubo (interfaceamento) */}
      <div className="flex items-center justify-between gap-1 whitespace-nowrap h-[14px]">
        <span className="text-[12px] leading-[14px] font-bold">{sampleId}</span>
        {sampleHash && <span className="text-[10px] leading-[14px] font-bold tracking-tight">{sampleHash}</span>}
      </div>

      {/* Dados do paciente */}
      <div className="text-[10px] leading-[12px] h-[12px] font-bold uppercase truncate">{patientName || 'PACIENTE NÃO INFORMADO'}</div>
      <div className="text-[9.5px] leading-[11px] h-[11px] whitespace-nowrap">
        NASC: {birthDate || '--/--/----'}
      </div>
      <div className="text-[10px] leading-[12px] h-[12px] font-bold uppercase truncate">
        {material || '---'}{tube ? ` (${String(tube).toUpperCase()})` : ''}
      </div>

      {/* Referências dos exames */}
      <div className="text-[9px] leading-[11px] font-bold uppercase overflow-hidden flex-1">
        {refsText || '—'}
      </div>

      {/* Rodapé: Nome do Laboratório (Esquerda) e Software (Direita) */}
      <div className="flex justify-between items-end gap-1 h-[10px]">
        <span className="text-[8px] leading-[10px] text-slate-600 font-bold uppercase truncate max-w-[70%]">
          {labName}
        </span>
        <span className="text-[8px] leading-[10px] text-slate-500 font-medium tracking-tighter opacity-80 whitespace-nowrap">
          AXIS INOVA
        </span>
      </div>
    </div>
  );
};

