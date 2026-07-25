import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

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
  labelIndex
}: LabelProps) => {
  const sampleId = `${orderNumber}-${labelIndex}`;

  return (
    <div className="w-[50mm] h-[30mm] bg-white border border-slate-200 p-2 flex flex-col justify-between text-[#1A202C] font-sans overflow-hidden">
      {/* Header: Priority, Workbench, Time */}
      <div className="flex justify-between items-start text-[7px] leading-tight font-bold uppercase border-b border-slate-100 pb-0.5 mb-1">
        <div className="flex flex-col">
          {isUrgent && <span className="text-red-600">URG (Urgência)</span>}
          <span>BAN: {workbench}</span>
        </div>
        <div className="text-right">
          <span>{printDate}</span>
        </div>
      </div>

      {/* Barcode / Main ID Area */}
      <div className="flex-1 flex gap-2 items-center">
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-[9px] font-black leading-none mb-1">
            {sampleId}
          </div>
          <div className="h-6 w-full bg-slate-100 flex items-center justify-center border border-slate-200">
            {/* Using a placeholder for barcode as actual barcode needs a specific lib */}
            <div className="w-[90%] h-4 bg-[repeating-linear-gradient(90deg,#000,#000_1px,#fff_1px,#fff_2px)]"></div>
          </div>
          <div className="text-[6px] font-bold mt-0.5 text-center">
             ({hash})
          </div>
        </div>
        <div className="w-10 h-10 flex-shrink-0">
          <QRCodeSVG value={sampleId} size={40} />
        </div>
      </div>

      {/* Patient Data */}
      <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1">
        <div className="text-[7px] font-bold uppercase truncate">
          {patientName}
        </div>
        <div className="flex justify-between text-[6px] font-medium">
          <span>NASC: {birthDate}</span>
          <span className="font-black">{material} ({tube})</span>
        </div>
      </div>
    </div>
  );
};
