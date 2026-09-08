import React, { useMemo } from 'react';
import Barcode from 'react-barcode';
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash';
import { DEFAULT_LABEL_CONFIG, type LabelConfig } from '@/hooks/useLabelConfig';

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
  /** Configuração de tamanho/fonte/margem definida em Configurações do Laboratório */
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
  config,
}: LabelProps & { labName?: string }) => {
  const cfg = config || DEFAULT_LABEL_CONFIG;

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

  const px = (n: number) => `${n}px`;

  return (
    <div
      className="box-border bg-white border border-slate-200 flex flex-col text-black font-mono overflow-hidden"
      style={{
        width: `${cfg.widthMm}mm`,
        height: `${cfg.heightMm}mm`,
        padding: `${cfg.marginMm}mm`,
      }}
    >
      {/* Cabeçalho: urgência / bancada / data */}
      <div
        className="flex shrink-0 items-center gap-1 overflow-hidden font-bold uppercase"
        style={{ fontSize: px(cfg.fontHeader), lineHeight: 1.15 }}
      >
        {isUrgent && <span className="bg-black text-white px-1">URG</span>}
        <span className="flex-1 truncate">{workbench || 'GERAL'}</span>
        <span className="whitespace-nowrap">{printDate || '---'}</span>
      </div>

      {/* Código de barras */}
      <div
        className="flex w-full shrink-0 justify-center overflow-hidden"
        style={{ height: px(cfg.barcodeHeightPx) }}
      >
        <Barcode
          value={sampleHash || sampleId || 'ERROR'}
          format="CODE128"
          width={1.1}
          height={cfg.barcodeHeightPx}
          displayValue={false}
          margin={0}
          background="transparent"
        />
      </div>

      {/* Código da amostra + hash exclusivo do tubo (interfaceamento) */}
      <div className="flex shrink-0 items-center justify-between gap-1 overflow-hidden whitespace-nowrap">
        <span className="font-bold" style={{ fontSize: px(cfg.fontCode), lineHeight: 1.15 }}>{sampleId}</span>
        {sampleHash && (
          <span className="font-bold tracking-tight" style={{ fontSize: px(cfg.fontHeader), lineHeight: 1.15 }}>
            {sampleHash}
          </span>
        )}
      </div>

      {/* Dados do paciente */}
      <div className="shrink-0 truncate font-bold uppercase" style={{ fontSize: px(cfg.fontPatient), lineHeight: 1.15 }}>
        {patientName || 'PACIENTE NÃO INFORMADO'}
      </div>
      <div className="shrink-0 overflow-hidden whitespace-nowrap" style={{ fontSize: px(cfg.fontSmall), lineHeight: 1.15 }}>
        NASC: {birthDate || '--/--/----'}
      </div>
      <div className="shrink-0 truncate font-bold uppercase" style={{ fontSize: px(cfg.fontPatient), lineHeight: 1.15 }}>
        {material || '---'}{tube ? ` (${String(tube).toUpperCase()})` : ''}
      </div>

      {/* Referências dos exames */}
      <div className="shrink-0 overflow-hidden font-bold uppercase" style={{ fontSize: px(cfg.fontSmall), lineHeight: 1.15 }}>
        {refsText || '—'}
      </div>

      {/* Rodapé: Nome do Laboratório (Esquerda) e Software (Direita) */}
      <div className="mt-auto flex shrink-0 items-end justify-between gap-1 overflow-hidden">
        <span
          className="text-slate-600 font-bold uppercase truncate max-w-[70%]"
          style={{ fontSize: px(cfg.fontFooter), lineHeight: 1.15 }}
        >
          {labName}
        </span>
        <span
          className="text-slate-500 font-medium tracking-tighter opacity-80 whitespace-nowrap"
          style={{ fontSize: px(cfg.fontFooter), lineHeight: 1.15 }}
        >
          AXIS INOVA
        </span>
      </div>
    </div>
  );
};
