import type { CadastroState } from '../AttendanceCadastroModal'

interface Props { state: CadastroState; update: (patch: Partial<CadastroState>) => void }

function maskDate(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{0,2})(\d{0,2})(\d{0,4}).*/, (_, a, b, c) => [a, b && '/' + b, c && '/' + c].filter(Boolean).join(''))
}

function parseBrDate(v: string): Date | null {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1])
}

export function Step3Authorization({ state, update }: Props) {
  const required = !!state.procedureRequiresAuth
  const exp = state.authorizationExpiry ? parseBrDate(state.authorizationExpiry) : null
  const now = new Date()
  const expired = exp && exp < now
  const expiringSoon = exp && !expired && (exp.getTime() - now.getTime()) / 86400000 < 3

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className={`rounded-md border p-3 text-xs ${required ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
        {required ? '📋 Este procedimento requer autorização prévia do convênio' : '✅ Este procedimento não requer autorização prévia'}
      </div>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Autorização do Convênio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={`Número da Autorização ${required ? '*' : ''}`}>
            <input value={state.authorizationCode || ''} onChange={e => update({ authorizationCode: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label={`Data da Autorização ${required ? '*' : ''}`}>
            <input value={state.authorizationDate || ''} onChange={e => update({ authorizationDate: maskDate(e.target.value) })}
              placeholder="DD/MM/AAAA" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label={`Validade da Autorização ${required ? '*' : ''}`}>
            <input value={state.authorizationExpiry || ''} onChange={e => update({ authorizationExpiry: maskDate(e.target.value) })}
              placeholder="DD/MM/AAAA"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${expired ? 'border-red-400' : expiringSoon ? 'border-amber-400' : 'border-border'}`} />
            {expired && <p className="text-[10px] text-red-600 mt-1">⚠️ Autorização vencida</p>}
            {expiringSoon && <p className="text-[10px] text-amber-600 mt-1">⚠️ Autorização vence em breve</p>}
          </Field>
          <Field label="Senha de Autorização">
            <input value={state.authorizationPassword || ''} onChange={e => update({ authorizationPassword: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Código de Cobrança</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Código de Cobrança">
            <input value={state.billingCode || ''} onChange={e => update({ billingCode: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Tabela de Procedimentos">
            <select value={state.billingTable || 'TUSS'} onChange={e => update({ billingTable: e.target.value as any })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="TUSS">TUSS</option><option value="AMB">AMB</option>
              <option value="CBHPM">CBHPM</option><option value="OTHER">Outra</option>
            </select>
          </Field>
          <Field label="Quantidade">
            <input type="number" min={1} value={state.quantity ?? 1} onChange={e => update({ quantity: parseInt(e.target.value) || 1 })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Grau de Participação">
            <select value={state.participationDegree || '00'} onChange={e => update({ participationDegree: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="00">00 - Cirurgião</option><option value="01">01 - Primeiro auxiliar</option>
              <option value="02">02 - Segundo auxiliar</option><option value="03">03 - Anestesista</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Profissional Executante</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Médico">
            <input value={state.doctorName || ''} disabled className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm" />
          </Field>
          <Field label="CNES do Prestador">
            <input value={state.cnes || ''} onChange={e => update({ cnes: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="CBO">
            <input value={state.cbo || ''} onChange={e => update({ cbo: e.target.value.replace(/\D/g, '').slice(0, 6).replace(/^(\d{4})(\d{0,2}).*/, (_, a, b) => [a, b && '-' + b].filter(Boolean).join('')) })}
              placeholder="0000-00" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  )
}
