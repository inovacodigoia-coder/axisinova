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
    <div className="w-[50mm] h-[30mm] bg-white border border-slate-200 px-1.5 py-0.5 flex flex-col text-black font-mono overflow-hidden leading-none relative">
      {/* Cabeçalho: urgência / bancada / data */}
      <div className="flex items-center gap-1 text-[7px] font-bold uppercase mb-0.5">
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

      {/* Código da amostra + hash exclusivo do tubo (interfaceamento) */}
      <div className="flex items-baseline justify-between gap-1 whitespace-nowrap">
        <span className="text-[9px] font-bold">{sampleId}</span>
        {sampleHash && <span className="text-[7.5px] font-bold tracking-tight">{sampleHash}</span>}
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
      <div className="text-[6.5px] font-bold uppercase leading-[1.15] overflow-hidden flex-1 pb-2">
        {refsText || '—'}
      </div>

      {/* Rodapé: Nome do Laboratório (Esquerda) e Software (Direita) */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-1.5 pb-0.5">
        <span className="text-[5.5px] text-slate-400 font-bold uppercase truncate max-w-[60%]">
          {labName}
        </span>
        <span className="text-[4.5px] text-slate-300 font-medium tracking-tighter opacity-60">
          AXIS INOVA
        </span>
      </div>
    </div>
  );
};
