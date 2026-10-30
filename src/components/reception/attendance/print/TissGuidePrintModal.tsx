import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useLabSettings } from '@/hooks/useLabSettings'
import { ServidorImpressaoStatus } from '@/components/print/ServidorImpressaoStatus'
import { servidorImpressaoAtivo, imprimirDireto, TIPOS_DOCUMENTO } from '@/lib/impressaoLocal'
import { gerarPdfElementos } from '@/lib/labelPdf'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'

interface TissGuidePrintModalProps {
  open: boolean
  onClose: () => void
  order: AttendanceOrder
  guide: any
  patient?: any
}

function Box({ num, label, value, className = '' }: { num: string; label: string; value?: string; className?: string }) {
  return (
    <div className={`border border-black px-1 py-[2px] leading-tight ${className}`}>
      <div className="text-[6pt] font-bold">{num}-{label}</div>
      <div className="text-[8pt] min-h-[12px] font-semibold">{value || ''}</div>
    </div>
  )
}

export function TissGuidePrintModal({ open, onClose, order, guide, patient }: TissGuidePrintModalProps) {
  const { settings } = useLabSettings()
  const exams: any[] = guide?.exams || []
  const today = format(new Date(order.registeredAt), 'dd/MM/yyyy')
  const hour = format(new Date(order.registeredAt), 'HH:mm')
  const total = exams.reduce((s, e) => s + (Number(e.price) || 0), 0)
  const [enviando, setEnviando] = useState(false)

  const printNavegador = () => {
    const d = window.document
    const source = d.getElementById('tiss-guide-root')
    if (!source) { window.print(); return }
    const portal = d.createElement('div')
    portal.id = 'receipt-print-portal'
    portal.innerHTML = source.innerHTML
    d.body.appendChild(portal)
    d.body.classList.add('printing-receipt')
    const cleanup = () => {
      d.body.classList.remove('printing-receipt')
      portal.remove()
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    setTimeout(() => { window.print(); setTimeout(cleanup, 800) }, 60)
  }

  const handlePrint = async () => {
    if (enviando) return
    setEnviando(true)
    try {
      const ativo = await servidorImpressaoAtivo()
      if (ativo) {
        const nodes = Array.from(
          window.document.querySelectorAll<HTMLElement>('#tiss-guide-root > div'),
        )
        if (nodes.length) {
          const pdf = await gerarPdfElementos(nodes, 190, { formato: 'a4', orientacao: 'portrait', margemMm: 8 })
          const r = await imprimirDireto(TIPOS_DOCUMENTO.guiaSaSpdt, pdf)
          toast.success(r.mensagem || 'Guia enviada para a impressora.')
          return
        }
      }
      printNavegador()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao imprimir pelo servidor local. Usando impressão do navegador.')
      printNavegador()
    } finally {
      setEnviando(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[980px] w-[95vw] h-[92vh] p-0 flex flex-col gap-0 [&>button[type=button]]:hidden">
        <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } }`}</style>
        <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-card no-print">
          <div>
            <h2 className="text-base font-bold text-foreground">Guia SP/SADT · {order.orderNumber}</h2>
            <p className="text-xs text-muted-foreground">Guia de Serviço Profissional / Serviço Auxiliar de Diagnóstico e Terapia</p>
          </div>
          <div className="flex items-center gap-2">
            <ServidorImpressaoStatus />
            <Button size="sm" onClick={handlePrint} disabled={enviando}>
              {enviando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
              {enviando ? 'Enviando...' : 'Imprimir'}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-200 p-6">
          <div id="tiss-guide-root">
            <div className="bg-white mx-auto p-4 text-black" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="text-[8pt] font-bold">TISS2007</div>
                <div className="text-[9pt] font-bold text-center leading-tight uppercase">
                  Guia de Serviço Profissional/Serviço Auxiliar de<br />Diagnóstico e Terapia - SP/SADT
                </div>
                <div className="text-right">
                  <div className="text-[8pt]">2-Nº <span className="text-[11pt] font-bold">{order.protocol || order.orderNumber}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0">
                <Box num="1" label="Registro ANS" value={settings?.cnpj ? '00000' : '00000'} />
                <Box num="3" label="Número da Guia Principal" value={order.orderNumber} className="col-span-2" />
              </div>
              <div className="grid grid-cols-4 gap-0">
                <Box num="4" label="Data da Autorização" value={order.authorizationDate ? format(new Date(order.authorizationDate), 'dd/MM/yyyy') : ''} />
                <Box num="5" label="Senha" value={order.authorizationPassword || order.authorizationCode} />
                <Box num="6" label="Data Validade Senha" value={order.authorizationExpiry ? format(new Date(order.authorizationExpiry), 'dd/MM/yyyy') : ''} />
                <Box num="7" label="Número da Guia Atribuído pela Operadora" value={order.authorizationCode} />
              </div>

              <div className="text-[6.5pt] font-bold mt-1">DADOS DO BENEFICIÁRIO</div>
              <div className="grid grid-cols-5 gap-0">
                <Box num="8" label="Número da Carteira" value={order.cardNumber} />
                <Box num="9" label="Validade da Carteira" value={order.cardExpiry} />
                <Box num="10" label="Nome" value={(order.patientName || '').toUpperCase()} className="col-span-2" />
                <Box num="12" label="Atendimento a RN" value="Não" />
              </div>

              <div className="text-[6.5pt] font-bold mt-1">DADOS DO CONTRATADO SOLICITANTE</div>
              <div className="grid grid-cols-2 gap-0">
                <Box num="13" label="Código na Operadora" value={guide?.convenioCode || ''} />
                <Box num="14" label="Nome do Contratado" value={(guide?.convenioName || order.convenioName || 'PARTICULAR').toUpperCase()} />
              </div>
              <div className="grid grid-cols-5 gap-0">
                <Box num="15" label="Nome do Profissional Solicitante" value={(guide?.doctorName || order.doctorName || '').toUpperCase()} className="col-span-2" />
                <Box num="16" label="Conselho Profissional" value={guide?.doctorCRM || order.doctorCRM ? 'CRM' : ''} />
                <Box num="17" label="Número no Conselho" value={guide?.doctorCRM || order.doctorCRM} />
                <Box num="18" label="UF" value={guide?.doctorCRMState || ''} />
              </div>

              <div className="text-[6.5pt] font-bold mt-1">DADOS DA SOLICITAÇÃO/PROCEDIMENTOS OU ITENS ASSISTENCIAIS SOLICITADOS</div>
              <div className="grid grid-cols-4 gap-0">
                <Box num="21" label="Caráter do Atendimento" value="E" />
                <Box num="22" label="Data da Solicitação" value={today} />
                <Box num="23" label="Indicação Clínica" value="" className="col-span-2" />
              </div>

              <table className="w-full border border-black border-collapse mt-1">
                <thead>
                  <tr className="text-[6.5pt] font-bold">
                    <th className="border border-black px-1 text-left w-[60px]">24-Tabela</th>
                    <th className="border border-black px-1 text-left w-[110px]">25-Código do Procedimento</th>
                    <th className="border border-black px-1 text-left">26-Descrição</th>
                    <th className="border border-black px-1 text-right w-[70px]">27-Qtde. Solic.</th>
                  </tr>
                </thead>
                <tbody className="text-[8pt]">
                  {exams.map((e, i) => (
                    <tr key={i}>
                      <td className="border border-black px-1">16</td>
                      <td className="border border-black px-1">{e.code || e.tussCode || '00000000'}</td>
                      <td className="border border-black px-1 uppercase">{e.name}</td>
                      <td className="border border-black px-1 text-right">1</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-[6.5pt] font-bold mt-1">DADOS DO CONTRATADO EXECUTANTE</div>
              <div className="grid grid-cols-3 gap-0">
                <Box num="29" label="Código na Operadora" value={settings?.cnpj?.replace(/\D/g, '')} />
                <Box num="30" label="Nome do Contratado" value={(settings?.lab_name || 'AXIS INOVA').toUpperCase()} />
                <Box num="31" label="Código CNES" value={(settings as any)?.cnes || ''} />
              </div>

              <div className="text-[6.5pt] font-bold mt-1">DADOS DO ATENDIMENTO</div>
              <div className="grid grid-cols-4 gap-0">
                <Box num="32" label="Tipo de Atendimento" value="5" />
                <Box num="33" label="Indicação de Acidente" value="2" />
                <Box num="34" label="Tipo de Consulta" value="" />
                <Box num="35" label="Motivo de Encerramento" value="" />
              </div>

              <table className="w-full border border-black border-collapse mt-1">
                <thead>
                  <tr className="text-[6.5pt] font-bold">
                    <th className="border border-black px-1 text-left">36-Data</th>
                    <th className="border border-black px-1 text-left">37-Hora Inicial</th>
                    <th className="border border-black px-1 text-left">38-Hora Final</th>
                    <th className="border border-black px-1 text-left">39-Tabela</th>
                    <th className="border border-black px-1 text-left">40-Código</th>
                    <th className="border border-black px-1 text-left">41-Descrição</th>
                    <th className="border border-black px-1 text-right">42-Qtde.</th>
                    <th className="border border-black px-1 text-center">43-Via</th>
                    <th className="border border-black px-1 text-center">44-Téc.</th>
                    <th className="border border-black px-1 text-right">46-Valor Unit.</th>
                    <th className="border border-black px-1 text-right">47-Valor Total</th>
                  </tr>
                </thead>
                <tbody className="text-[8pt]">
                  {exams.map((e, i) => (
                    <tr key={i}>
                      <td className="border border-black px-1">{today}</td>
                      <td className="border border-black px-1">{hour}</td>
                      <td className="border border-black px-1">{hour}</td>
                      <td className="border border-black px-1">16</td>
                      <td className="border border-black px-1">{e.code || '00000000'}</td>
                      <td className="border border-black px-1 uppercase">{e.name}</td>
                      <td className="border border-black px-1 text-right">1</td>
                      <td className="border border-black px-1 text-center">U</td>
                      <td className="border border-black px-1 text-center">C</td>
                      <td className="border border-black px-1 text-right">{(Number(e.price) || 0).toFixed(2)}</td>
                      <td className="border border-black px-1 text-right">{(Number(e.price) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-[6.5pt] font-bold mt-1">IDENTIFICAÇÃO DO(S) PROFISSIONAL(IS) EXECUTANTE(S)</div>
              <div className="grid grid-cols-4 gap-0">
                <Box num="49" label="Grau Part." value="" />
                <Box num="51" label="Nome do Profissional" value={(guide?.doctorName || order.doctorName || '').toUpperCase()} className="col-span-2" />
                <Box num="53" label="Número no Conselho" value={guide?.doctorCRM || order.doctorCRM} />
              </div>

              <div className="grid grid-cols-3 gap-0 mt-1">
                <Box num="59" label="Total de Procedimentos (R$)" value={total.toFixed(2)} />
                <Box num="61" label="Total de Materiais (R$)" value="0,00" />
                <Box num="65" label="Total Geral (R$)" value={total.toFixed(2)} />
              </div>

              <div className="grid grid-cols-3 gap-0 mt-1">
                <Box num="66" label="Assinatura do Responsável pela Autorização" value={today} />
                <Box num="67" label="Assinatura do Beneficiário ou Responsável" value={today} />
                <Box num="68" label="Assinatura do Contratado" value={today} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
