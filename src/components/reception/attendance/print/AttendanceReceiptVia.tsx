import { QRCodeSVG } from 'qrcode.react'
import type { AttendanceControlDocument, PrinterConfig } from '@/types/payment-print.types'
import { format } from 'date-fns'

interface Props {
  document: AttendanceControlDocument
  config: PrinterConfig
  via: 'patient' | 'establishment'
}

export function AttendanceReceiptVia({ document: doc, config, via }: Props) {
  const isPatient = via === 'patient'
  const isThermal = config.paperSize === '80mm' || config.paperSize === '58mm'
  const widthClass = isThermal ? 'w-[80mm]' : 'w-[140mm]'
  
  // Calculate general delivery forecast (max date)
  const generalForecast = doc.exams.reduce((max, exam) => {
    if (!exam.forecastDate) return max
    return !max || exam.forecastDate > max ? exam.forecastDate : max
  }, '')

  return (
    <div className={`via mx-auto ${widthClass} border border-dashed border-black/40 bg-white text-black p-4 text-[9pt] leading-tight font-sans`}>
      {/* 1. Laboratório Info */}
      <div className="text-center border-b border-black pb-2 mb-2">
        {config.showLogo && doc.companyLogo && (
          <img src={doc.companyLogo} alt="logo" className="h-10 mx-auto mb-1" />
        )}
        <div className="font-bold uppercase text-[11pt]">{doc.companyName}</div>
        {doc.companyAddress && <div className="text-[8pt]">{doc.companyAddress}</div>}
        <div className="text-[8pt]">
          {doc.companyPhone ? `Tel: ${doc.companyPhone}` : ''}
          {doc.companyPhone && doc.companyCNPJ ? ' · ' : ''}
          {doc.companyCNPJ ? `CNPJ: ${doc.companyCNPJ}` : ''}
        </div>
      </div>

      <div className="text-center font-bold uppercase border-b border-black pb-1 mb-2">
        {via === 'patient' ? 'COMPROVANTE DO PACIENTE' : 'CONTROLE INTERNO'}
      </div>

      {/* 2. Nome do Paciente */}
      <div className="text-center font-bold text-[12pt] border-b border-black pb-1 mb-2 uppercase">
        {doc.patientName}
      </div>

      {/* 3. Detalhes do atendimento */}
      <div className="grid grid-cols-2 gap-x-2 text-[8pt] border-b border-black pb-2 mb-2">
        <div><strong>Pedido:</strong> {doc.orderNumber}</div>
        <div><strong>Atend.:</strong> {doc.orderDate} {doc.orderTime}</div>
        <div><strong>Nasc.:</strong> {doc.patientBirthDate} ({doc.patientAge})</div>
        <div><strong>Sexo:</strong> {doc.patientGender}</div>
      </div>

      {/* 4. Solicitantes (Médicos) */}
      <div className="border-b border-black pb-2 mb-2">
        <div className="font-bold text-[8pt] uppercase mb-1">Solicitante(s)</div>
        {Array.from(new Set(doc.exams.map(e => e.doctorName))).filter(Boolean).map((doctor, idx) => (
          <div key={idx} className="flex justify-between text-[8pt]">
            <span>{doctor}</span>
            <span className="text-[7pt]">CRM {doc.exams.find(e => e.doctorName === doctor)?.doctorCRM}</span>
          </div>
        ))}
      </div>

      {/* 5. Lista de exames */}
      <div className="border-b border-black pb-2 mb-2">
        <div className="flex justify-between font-bold text-[8pt] border-b border-black/50 pb-1 mb-1">
          <span>Exames</span>
          <span>Previsão</span>
        </div>
        <div className="space-y-1">
          {doc.exams.map((exam, i) => (
            <div key={i} className="flex justify-between text-[8pt] items-start">
              <span className="pr-2">{exam.name}</span>
              <span className="whitespace-nowrap">{exam.forecastDate}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Instruções e QR Code */}
      <div className="border-b border-black pb-2 mb-2 flex items-start gap-4">
        <div className="flex-1 text-[8pt]">
          <div className="font-bold mb-1">Resultados:</div>
          <div>Leia o QR Code ao lado ou acesse o portal do paciente.</div>
          {doc.locatorCode && (
            <div className="mt-2">
              <div><strong>Localizador:</strong> {doc.locatorCode}</div>
              <div><strong>Senha:</strong> {doc.password}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <QRCodeSVG value={`https://axisinova.lovable.app/resultado?l=${doc.locatorCode}`} size={70} />
          <div className="text-[7pt] mt-1 font-mono">{doc.locatorCode}</div>
        </div>
      </div>

      {/* 7. Previsão Geral */}
      <div className="text-center bg-black/5 py-2 mb-2 border border-black/10">
        <div className="text-[8pt] font-bold">PREVISÃO GERAL PARA RETIRADA:</div>
        <div className="text-[10pt] font-black">{generalForecast || 'Sob Consulta'}</div>
      </div>

      {/* 8. Rodapé (Quem cadastrou) */}
      <div className="text-[7pt] text-black/60 italic mt-2">
        <div>Atendido por: {doc.registeredByName}</div>
        <div>Impresso em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
      </div>
    </div>
  )
}