import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import Barcode from 'react-barcode';
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash';

export interface LabelFieldSizes {
  header: number;
  code: number;
  patient: number;
  small: number;
  footer: number;
}

export const DEFAULT_LABEL_FIELD_SIZES: LabelFieldSizes = {
  header: 10,
  code: 12,
  patient: 10,
  small: 9,
  footer: 8,
};

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
  /** Margem interna em mm */
  marginMm?: number;
  /** Altura do código de barras em px */
  barcodeHeightPx?: number;
  /** Tamanhos de fonte por campo (px) */
  fontSizes?: Partial<LabelFieldSizes>;
  /** Ajusta automaticamente o conteúdo ao tamanho da etiqueta */
  autoFit?: boolean;
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
  widthMm = 50,
  heightMm = 30,
  marginMm = 1.5,
  barcodeHeightPx = 24,
  fontSizes,
  autoFit = true,
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

  // Fator de ajuste do conteúdo em relação ao tamanho base (50x30mm)
  const scale = autoFit ? Math.min(widthMm / 50, heightMm / 30) : 1;
  const f = { ...DEFAULT_LABEL_FIELD_SIZES, ...(fontSizes || {}) };
  const px = (n: number) => `${Math.max(4, n * scale).toFixed(1)}px`;
  const lh = (n: number) => `${Math.max(5, n * scale * 1.18).toFixed(1)}px`;
  const barH = Math.max(8, Math.round(barcodeHeightPx * scale));
  // largura da barra proporcional à largura útil da etiqueta
  const barWidth = Math.max(0.6, Math.min(2, ((widthMm - marginMm * 2) / 47) * 1.1));

  return (
    <div
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: `${marginMm}mm`,
        gap: `${Math.max(0, 0.4 * scale)}mm`,
      }}
      className="box-border bg-white border border-slate-200 flex flex-col justify-between text-black font-mono overflow-hidden"
    >
      {/* Cabeçalho: urgência / bancada / data */}
      <div
        className="flex shrink-0 items-center gap-1 overflow-hidden font-bold uppercase"
        style={{ fontSize: px(f.header), lineHeight: lh(f.header) }}
      >
        {isUrgent && <span className="bg-black text-white px-1">URG</span>}
        <span className="flex-1 truncate">{workbench || 'GERAL'}</span>
        <span className="whitespace-nowrap">{printDate || '---'}</span>
      </div>

      {/* Código de barras */}
      <div className="flex w-full shrink-0 justify-center overflow-hidden" style={{ height: `${barH}px` }}>
        <Barcode
          value={sampleHash || sampleId || 'ERROR'}
          format="CODE128"
          width={barWidth}
          height={barH}
          displayValue={false}
          margin={0}
          background="transparent"
        />
      </div>

      {/* Código da amostra + hash exclusivo do tubo (interfaceamento) */}
      <div className="flex shrink-0 items-center justify-between gap-1 overflow-hidden whitespace-nowrap">
        <span className="font-bold" style={{ fontSize: px(f.code), lineHeight: lh(f.code) }}>{sampleId}</span>
        {sampleHash && (
          <span className="font-bold tracking-tight" style={{ fontSize: px(f.small), lineHeight: lh(f.code) }}>
            {sampleHash}
          </span>
        )}
      </div>

      {/* Dados do paciente */}
      <div
        className="shrink-0 truncate font-bold uppercase"
        style={{ fontSize: px(f.patient), lineHeight: lh(f.patient) }}
      >
        {patientName || 'PACIENTE NÃO INFORMADO'}
      </div>
      <div
        className="shrink-0 overflow-hidden whitespace-nowrap"
        style={{ fontSize: px(f.small), lineHeight: lh(f.small) }}
      >
        NASC: {birthDate || '--/--/----'}
      </div>
      <div
        className="shrink-0 truncate font-bold uppercase"
        style={{ fontSize: px(f.patient), lineHeight: lh(f.patient) }}
      >
        {material || '---'}{tube ? ` (${String(tube).toUpperCase()})` : ''}
      </div>

      {/* Referências dos exames */}
      <div
        className="shrink-0 overflow-hidden font-bold uppercase"
        style={{ fontSize: px(f.small), lineHeight: lh(f.small) }}
      >
        {refsText || '—'}
      </div>

      {/* Rodapé: Nome do Laboratório (Esquerda) e Software (Direita) */}
      <div className="flex shrink-0 items-end justify-between gap-1 overflow-hidden">
        <span
          className="text-slate-600 font-bold uppercase truncate max-w-[70%]"
          style={{ fontSize: px(f.footer), lineHeight: lh(f.footer) }}
        >
          {labName}
        </span>
        <span
          className="text-slate-500 font-medium tracking-tighter opacity-80 whitespace-nowrap"
          style={{ fontSize: px(f.footer), lineHeight: lh(f.footer) }}
        >
          AXIS INOVA
        </span>
      </div>
    </div>
  );
};
