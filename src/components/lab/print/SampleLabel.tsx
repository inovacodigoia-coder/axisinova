import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

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
  originSigla = 'H'
}: LabelProps) => {
  const sampleId = useMemo(() => {
    if (!orderNumber || typeof labelIndex !== 'number') return 'INVALID-ID';
    return `${orderNumber}-${labelIndex}`;
  }, [orderNumber, labelIndex]);

  const barcodeValue = useMemo(() => {
    // Validating content for Code 128
    // Code 128 supports all 128 ASCII characters, but we ensure it's not empty
    return sampleId || 'ERROR';
  }, [sampleId]);

  return (
    <div className="w-[50mm] h-[30mm] bg-white border border-slate-200 p-2 flex flex-col justify-between text-[#1A202C] font-sans overflow-hidden">
      {/* Header: Priority, Workbench, Time */}
      <div className="flex justify-between items-start text-[7px] leading-tight font-bold uppercase border-b border-slate-100 pb-0.5 mb-1">
        <div className="flex flex-col">
          {isUrgent && <span className="text-red-600">URG (Urgência)</span>}
          <span>BAN: {workbench || '---'}</span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span>{printDate || '---'}</span>
          <span className="text-[10px] font-black text-blue-600">{originSigla}</span>
        </div>
      </div>

      {/* Barcode / Main ID Area */}
      <div className="flex-1 flex gap-2 items-center overflow-hidden">
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="text-[10px] font-black leading-none mb-0.5 whitespace-nowrap">
            {sampleId}
          </div>
          <div className="h-7 w-full flex items-center justify-start overflow-hidden">
            {/* Real Barcode Code 128 */}
            <Barcode 
              value={barcodeValue}
              format="CODE128"
              width={1}
              height={20}
              displayValue={false}
              margin={0}
              background="transparent"
            />
          </div>
          <div className="text-[7px] font-bold mt-0.5 text-center tracking-widest uppercase">
             ({hash || '---'})
          </div>
        </div>
        <div className="w-10 h-10 flex-shrink-0 bg-white p-0.5 border border-slate-100 rounded-sm">
          {sampleId !== 'INVALID-ID' ? (
            <QRCodeSVG value={sampleId} size={36} includeMargin={false} />
          ) : (
            <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[5px] text-red-500">ERR</div>
          )}
        </div>
      </div>

      {/* Patient Data */}
      <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1">
        <div className="text-[8px] font-bold uppercase truncate">
          {patientName || 'PACIENTE NÃO INFORMADO'}
        </div>
        <div className="flex justify-between text-[6px] font-medium items-end">
          <div className="flex flex-col">
             <span>NASC: {birthDate || '--/--/----'}</span>
          </div>
          <div className="text-right font-black uppercase max-w-[60%] truncate">
            {material || '---'} ({tube || '---'})
          </div>
        </div>
      </div>
    </div>
  );
};
