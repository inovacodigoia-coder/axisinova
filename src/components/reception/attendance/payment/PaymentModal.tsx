import { useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Check, CreditCard, Smartphone, Banknote, Building, FileText, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'
import { usePayment } from '@/hooks/usePayment'
import type { PaymentMethod, PaymentRecord } from '@/types/payment-print.types'

interface Props {
  open: boolean
  onClose: () => void
  orderId: string
  patientId: string
  patientName: string
  procedureName: string
  grossValue: number
  onPaid: (record: PaymentRecord) => void
}

const METHODS: { value: PaymentMethod; icon: any; label: string }[] = [
  { value: 'credit_card', icon: CreditCard, label: 'Crédito' },
  { value: 'debit_card', icon: CreditCard, label: 'Débito' },
  { value: 'pix', icon: Smartphone, label: 'PIX' },
  { value: 'cash', icon: Banknote, label: 'Dinheiro' },
  { value: 'bank_transfer', icon: Building, label: 'Transferência' },
  { value: 'check', icon: FileText, label: 'Cheque' },
]

const DISCOUNT_REASONS = ['Convênio corporativo', 'Funcionário', 'Cortesia médica', 'Campanha promocional', 'Outro']

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export function PaymentModal({ open, onClose, orderId, patientId, patientName, procedureName, grossValue, onPaid }: Props) {
  const { registerPayment } = usePayment()

  // discount
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountReason, setDiscountReason] = useState('')
  const [otherReason, setOtherReason] = useState('')

  // method
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [installments, setInstallments] = useState(1)
  const [cardLastDigits, setCardLastDigits] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [pixTxId, setPixTxId] = useState('')
  const [cashReceived, setCashReceived] = useState(0)
  const [bankName, setBankName] = useState('')
  const [docNumber, setDocNumber] = useState('')

  const discount = useMemo(() => {
    if (!discountEnabled || !discountValue) return 0
    if (discountType === 'percent') return Math.min(grossValue * (discountValue / 100), grossValue)
    return Math.min(discountValue, grossValue)
  }, [discountEnabled, discountType, discountValue, grossValue])
  const netValue = Math.max(0, grossValue - discount)
  const changeValue = method === 'cash' ? Math.max(0, cashReceived - netValue) : 0
  const cashInsufficient = method === 'cash' && cashReceived > 0 && cashReceived < netValue

  const pixKey = 'pagamento@clinica.com.br'
  const copyPix = () => { navigator.clipboard.writeText(pixKey); toast.success('Chave PIX copiada!') }

  const validMethod = (): boolean => {
    if (!method) return false
    if (discountEnabled && discountValue > 0 && !discountReason) return false
    if (method === 'credit_card' && netValue / installments < 10) return false
    if (method === 'cash' && cashReceived < netValue) return false
    return true
  }

  const handleRegister = () => {
    if (!method || !validMethod()) { toast.error('Preencha os dados do pagamento'); return }
    const reason = discountReason === 'Outro' ? otherReason : discountReason
    const record = registerPayment({
      orderId, patientId, patientName,
      grossValue,
      discountType: discountEnabled && discountValue > 0 ? discountType : 'none',
      discountValue: discountEnabled ? discountValue : 0,
      discountReason: reason || undefined,
      netValue,
      paidValue: method === 'cash' ? cashReceived : netValue,
      changeValue: method === 'cash' ? changeValue : undefined,
      method,
      installments: method === 'credit_card' ? installments : undefined,
      cardLastDigits: (method === 'credit_card' || method === 'debit_card') ? cardLastDigits : undefined,
      authorizationCode: (method === 'credit_card' || method === 'debit_card') ? authCode : (method === 'pix' ? pixTxId : undefined),
      pixKey: method === 'pix' ? pixKey : undefined,
      bankName: (method === 'bank_transfer' || method === 'check') ? bankName : undefined,
      documentNumber: (method === 'bank_transfer' || method === 'check') ? docNumber : undefined,
    })
    toast.success(`💳 Pagamento registrado · Recibo: ${record.receiptNumber}`)
    onPaid(record)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[760px] w-[95vw] max-h-[92vh] overflow-y-auto p-0 [&>button[type=button]]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-foreground">💰 Registro de Pagamento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{procedureName} · {patientName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="rounded-lg border border-border bg-gradient-to-br from-card to-muted/30 p-4 space-y-1.5 text-sm">
            <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Resumo do Pagamento</div>
            <div className="flex justify-between"><span>Procedimento:</span><span className="font-medium">{procedureName}</span></div>
            <div className="flex justify-between"><span>Valor tabela:</span><span>{fmtBRL(grossValue)}</span></div>
            <div className="flex justify-between"><span>Desconto:</span><span className="text-amber-600">{fmtBRL(discount)}</span></div>
            <div className="border-t border-border my-2" />
            <div className="flex justify-between text-base font-bold"><span>TOTAL A PAGAR:</span><span className="text-primary">{fmtBRL(netValue)}</span></div>
          </div>

          {/* Discount */}
          <section className="rounded-lg border border-border p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)} />
              <span className="text-sm font-semibold">Aplicar Desconto</span>
            </label>
            {discountEnabled && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="radio" checked={discountType === 'percent'} onChange={() => setDiscountType('percent')} />
                    Percentual (%)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="radio" checked={discountType === 'fixed'} onChange={() => setDiscountType('fixed')} />
                    Valor fixo (R$)
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min={0} max={discountType === 'percent' ? 100 : grossValue} step="0.01"
                    value={discountValue || ''} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder={discountType === 'percent' ? 'Ex: 10' : 'Ex: 25.00'}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  <select value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="">Motivo do desconto *</option>
                    {DISCOUNT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {discountReason === 'Outro' && (
                  <input value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="Descreva o motivo"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                )}
              </div>
            )}
          </section>

          {/* Method */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Método de Pagamento *</h3>
            <div className="grid grid-cols-3 gap-3">
              {METHODS.map(({ value, icon: Icon, label }) => {
                const active = method === value
                return (
                  <button key={value} onClick={() => setMethod(value)}
                    className={cn(
                      'rounded-lg border-2 p-3 flex flex-col items-center gap-1.5 transition-all relative',
                      active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50',
                    )}>
                    <Icon className={cn('h-6 w-6', active ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-primary absolute top-1.5 right-1.5" />}
                  </button>
                )
              })}
            </div>

            {/* Method specifics */}
            {method === 'credit_card' && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Parcelas</span>
                  <select value={installments} onChange={(e) => setInstallments(parseInt(e.target.value))}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}x de {fmtBRL(netValue / n)}{n === 1 ? ' (sem juros)' : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Últimos 4 dígitos</span>
                  <input value={cardLastDigits} onChange={(e) => setCardLastDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Cód. autorização</span>
                  <input value={authCode} onChange={(e) => setAuthCode(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </label>
              </div>
            )}

            {method === 'debit_card' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Últimos 4 dígitos</span>
                  <input value={cardLastDigits} onChange={(e) => setCardLastDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Cód. autorização</span>
                  <input value={authCode} onChange={(e) => setAuthCode(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </label>
              </div>
            )}

            {method === 'pix' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center rounded-lg border border-border p-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 rounded-lg bg-white border-2 border-primary/30">
                    <QRCodeSVG value={`PIX|${pixKey}|${netValue.toFixed(2)}`} size={140} aria-label={`QR Code PIX para pagamento de ${fmtBRL(netValue)}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Aponte a câmera</span>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Chave PIX</div>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono">
                    <span className="truncate flex-1">{pixKey}</span>
                    <button onClick={copyPix} aria-label="Copiar chave PIX" className="text-primary hover:text-primary/80"><Copy className="h-4 w-4" /></button>
                  </div>
                  <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                    Valor: <strong>{fmtBRL(netValue)}</strong>
                  </div>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Código de transação</span>
                    <input value={pixTxId} onChange={(e) => setPixTxId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </label>
                </div>
              </div>
            )}

            {method === 'cash' && (
              <div className="mt-4 space-y-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Valor recebido</span>
                  <input type="number" step="0.01" min={0} value={cashReceived || ''} onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </label>
                <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Valor a pagar:</span><span>{fmtBRL(netValue)}</span></div>
                  <div className="flex justify-between"><span>Valor recebido:</span><span>{fmtBRL(cashReceived)}</span></div>
                  <div className="flex justify-between font-bold">
                    <span>Troco:</span>
                    <span className={cn(cashInsufficient ? 'text-destructive' : 'text-emerald-600')}>{fmtBRL(changeValue)}</span>
                  </div>
                  {cashInsufficient && <span className="inline-block mt-1 rounded bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-semibold">Valor insuficiente</span>}
                </div>
              </div>
            )}

            {(method === 'bank_transfer' || method === 'check') && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Banco</span>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">{method === 'check' ? 'Nº do cheque' : 'Nº do documento'}</span>
                  <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </label>
              </div>
            )}
          </section>

          {/* Footer */}
          <div className="flex justify-between items-center border-t border-border pt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <button onClick={handleRegister} disabled={!validMethod()}
              className={cn('inline-flex items-center gap-1 rounded-md gradient-bg px-6 py-2 text-sm font-semibold text-white shadow-sm', !validMethod() && 'opacity-50 cursor-not-allowed')}>
              <Check className="h-4 w-4" /> Registrar Pagamento
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
