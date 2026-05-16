import { QRCodeSVG } from 'qrcode.react'
import type { AttendanceControlDocument, PrinterConfig } from '@/types/payment-print.types'

interface Props {
  document: AttendanceControlDocument
  config: PrinterConfig
  via: 'patient' | 'establishment'
}

function maskCPF(cpf?: string) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length < 11) return cpf
  return `${d.slice(0, 3)}.***.***-${d.slice(-2)}`
}
function maskCard(card?: string) {
  if (!card) return '—'
  return card.length > 8 ? `${card.slice(0, 4)} **** **** ${card.slice(-4)}` : card
}

export function AttendanceReceiptVia({ document: doc, config, via }: Props) {
  const isPatient = via === 'patient'
  const widthClass = config.paperSize === '80mm' || config.paperSize === '58mm' ? 'w-[80mm]' : 'w-[140mm]'

  return (
    <div className={`via mx-auto ${widthClass} border border-dashed border-black/40 bg-white text-black p-4 text-[10pt] leading-tight font-sans`}>
      {/* Header */}
      <div className="text-center border-b border-black pb-2 mb-2">
        {config.showLogo && doc.companyLogo && (
          <img src={doc.companyLogo} alt="logo" className="h-10 mx-auto mb-1" />
        )}
        {config.showCompanyName && <div className="font-bold uppercase">{doc.companyName}</div>}
        {config.showAddress && doc.companyAddress && <div className="text-[8pt]">{doc.companyAddress}</div>}
        <div className="text-[8pt]">
          {config.showPhone && doc.companyPhone ? doc.companyPhone : ''}
          {config.showPhone && doc.companyPhone && config.showCNPJ && doc.companyCNPJ ? ' · ' : ''}
          {config.showCNPJ && doc.companyCNPJ ? `CNPJ: ${doc.companyCNPJ}` : ''}
        </div>
        {config.showUnitName && doc.unitName && <div className="text-[8pt] font-semibold">Unidade: {doc.unitName}</div>}
      </div>

      <div className="text-center font-bold uppercase border-b border-black pb-1 mb-2">
        {isPatient ? 'Via do Paciente' : 'Via do Estabelecimento'}
      </div>

      <div className="space-y-1 border-b border-black pb-2 mb-2">
        <div><strong>Nº Pedido:</strong> {doc.orderNumber}</div>
        <div><strong>Data/Hora:</strong> {doc.orderDate} {doc.orderTime}</div>
        {doc.ticketCode && <div><strong>Ficha:</strong> {doc.ticketCode}{doc.guicheName ? ` · ${doc.guicheName}` : ''}</div>}
      </div>

      {/* Paciente */}
      <div className="mb-2">
        <div className="font-bold text-[9pt] uppercase mb-1">Paciente</div>
        <div><strong>Nome:</strong> {doc.patientName}</div>
        {doc.patientBirthDate && <div><strong>Nasc.:</strong> {doc.patientBirthDate} {doc.patientAge ? `(${doc.patientAge} anos)` : ''}</div>}
        <div><strong>CPF:</strong> {isPatient ? maskCPF(doc.patientCPF) : (doc.patientCPF || '—')}</div>
        {doc.patientPhone && <div><strong>Tel:</strong> {doc.patientPhone}</div>}
        {!isPatient && doc.motherName && <div><strong>Mãe:</strong> {doc.motherName}</div>}
      </div>

      {/* Atendimento */}
      <div className="border-t border-black pt-2 mb-2">
        <div className="font-bold text-[9pt] uppercase mb-1">Atendimento</div>
        <div><strong>Tipo:</strong> {doc.serviceType}</div>
        {config.showDoctorInfo && doc.doctorName && (
          <div><strong>Médico:</strong> {doc.doctorName}{doc.doctorCRM ? ` · CRM ${doc.doctorCRM}` : ''}</div>
        )}
        {doc.specialty && <div><strong>Especialidade:</strong> {doc.specialty}</div>}
        <div><strong>Procedimento:</strong> {doc.procedureName}</div>
        <div><strong>Código:</strong> {doc.procedureCode}</div>
      </div>

      {/* Convênio / Pagamento */}
      {config.showConvenioInfo && doc.convenioName && (
        <div className="border-t border-black pt-2 mb-2">
          <div className="font-bold text-[9pt] uppercase mb-1">Convênio</div>
          <div><strong>Convênio:</strong> {doc.convenioName}</div>
          {doc.cardNumber && <div><strong>Carteirinha:</strong> {maskCard(doc.cardNumber)}</div>}
          {config.showAuthorizationInfo && doc.authorizationCode && (
            <div><strong>Autorização:</strong> {doc.authorizationCode}{doc.authorizationExpiry ? ` · Vál: ${doc.authorizationExpiry}` : ''}</div>
          )}
        </div>
      )}

      {/* Pagamento (estabelecimento + particular) */}
      {!isPatient && doc.paymentMethod && (
        <div className="border-t border-black pt-2 mb-2">
          <div className="font-bold text-[9pt] uppercase mb-1">Pagamento</div>
          <div><strong>Método:</strong> {doc.paymentMethod}</div>
          {typeof doc.paidValue === 'number' && (
            <div><strong>Valor pago:</strong> R$ {doc.paidValue.toFixed(2).replace('.', ',')}</div>
          )}
          {doc.receiptNumber && <div><strong>Recibo:</strong> {doc.receiptNumber}</div>}
        </div>
      )}

      {/* Documentos */}
      {config.showAttachmentChecklist && doc.attachments.length > 0 && (
        <div className="border-t border-black pt-2 mb-2">
          <div className="font-bold text-[9pt] uppercase mb-1">Documentos Entregues</div>
          {doc.attachments.map((a, i) => (
            <div key={i}>✓ {a.name}</div>
          ))}
        </div>
      )}

      {/* Dados internos */}
      {!isPatient && doc.registeredByName && (
        <div className="border-t border-black pt-2 mb-2">
          <div className="font-bold text-[9pt] uppercase mb-1">Dados Internos</div>
          <div><strong>Registrado por:</strong> {doc.registeredByName}{doc.guicheName ? ` (${doc.guicheName})` : ''}</div>
        </div>
      )}

      {/* Observações */}
      {config.showObservations && doc.observations && (
        <div className="border-t border-black pt-2 mb-2">
          <div className="font-bold text-[9pt] uppercase mb-1">Observações</div>
          <div className="whitespace-pre-wrap">{doc.observations}</div>
        </div>
      )}

      {/* QR Code */}
      {config.showQRCode && (
        <div className="border-t border-black pt-2 mb-2 flex flex-col items-center">
          <QRCodeSVG value={doc.orderNumber} size={70} />
          <div className="text-[8pt] mt-1 font-mono">{doc.orderNumber}</div>
        </div>
      )}

      {/* Assinatura */}
      {config.showSignatureLine && (
        <div className="mt-4 border-t border-black pt-3 text-[9pt]">
          {isPatient ? 'Assinatura do paciente: ____________________________'
                     : 'Assinatura do atendente: __________________________'}
        </div>
      )}

      {/* Rodapé */}
      {config.footerText && (
        <div className="mt-3 text-center text-[8pt] italic">{config.footerText}</div>
      )}
      {config.showTimestamp && (
        <div className="mt-1 text-center text-[7pt] text-black/60">
          Impresso em {new Date().toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  )
}
