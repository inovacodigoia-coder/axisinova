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
  /** Dimensões físicas da etiqueta (Configuração de Impressora / Etiqueta) */
  widthMm?: number;
  heightMm?: number;
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
    <div
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
      className="box-border bg-white border border-slate-200 px-1.5 py-[1px] flex flex-col text-black font-mono overflow-hidden"
    >
      {/* Cabeçalho: urgência / bancada / data */}
      <div className="flex h-[12px] shrink-0 items-center gap-1 overflow-hidden text-[10px] leading-[12px] font-bold uppercase">
        {isUrgent && <span className="bg-black text-white px-1">URG</span>}
        <span className="flex-1 truncate">{workbench || 'GERAL'}</span>
        <span className="whitespace-nowrap">{printDate || '---'}</span>
      </div>

      {/* Código de barras */}
      <div className="flex h-[24px] w-full shrink-0 justify-center overflow-hidden">
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
      <div className="flex h-[14px] shrink-0 items-center justify-between gap-1 overflow-hidden whitespace-nowrap">
        <span className="text-[12px] leading-[14px] font-bold">{sampleId}</span>
        {sampleHash && <span className="text-[10px] leading-[14px] font-bold tracking-tight">{sampleHash}</span>}
      </div>

      {/* Dados do paciente */}
      <div className="h-[12px] shrink-0 truncate text-[10px] leading-[12px] font-bold uppercase">{patientName || 'PACIENTE NÃO INFORMADO'}</div>
      <div className="h-[11px] shrink-0 overflow-hidden whitespace-nowrap text-[9.5px] leading-[11px]">
        NASC: {birthDate || '--/--/----'}
      </div>
      <div className="h-[12px] shrink-0 truncate text-[10px] leading-[12px] font-bold uppercase">
        {material || '---'}{tube ? ` (${String(tube).toUpperCase()})` : ''}
      </div>

      {/* Referências dos exames */}
      <div className="h-[11px] shrink-0 overflow-hidden text-[9px] leading-[11px] font-bold uppercase">
        {refsText || '—'}
      </div>

      {/* Rodapé: Nome do Laboratório (Esquerda) e Software (Direita) */}
      <div className="flex h-[10px] shrink-0 items-end justify-between gap-1 overflow-hidden">
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

