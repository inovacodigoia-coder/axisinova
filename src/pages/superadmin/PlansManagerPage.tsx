import { useState, useEffect } from 'react'
import { Save, X, Plus, Trash2, Pencil, Star, Eye, EyeOff } from 'lucide-react'
import { usePricingPlans, type PricingPlanRow } from '@/hooks/usePricingPlans'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { toast } from 'sonner'

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

interface EditState {
  name: string
  description: string
  price_monthly: string
  price_annual: string
  max_doctors: string
  max_users: string
  storage_gb: string
  features: string[]
  is_popular: boolean
  is_visible: boolean
}

export default function PlansManagerPage() {
  const { plans, loading, updatePlan } = usePricingPlans()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (p: PricingPlanRow) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || '',
      price_monthly: String(p.price_monthly),
      price_annual: String(p.price_annual),
      max_doctors: p.max_doctors == null ? '' : String(p.max_doctors),
      max_users: p.max_users == null ? '' : String(p.max_users),
      storage_gb: String(p.storage_gb),
      features: [...p.features],
      is_popular: p.is_popular,
      is_visible: p.is_visible,
    })
  }

  const cancelEdit = () => { setEditingId(null); setForm(null) }

  const updateFeature = (idx: number, value: string) => {
    if (!form) return
    const features = [...form.features]
    features[idx] = value
    setForm({ ...form, features })
  }
  const addFeature = () => { if (form) setForm({ ...form, features: [...form.features, ''] }) }
  const removeFeature = (idx: number) => {
    if (!form) return
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) })
  }

  const save = async () => {
    if (!form || !editingId) return
    setSaving(true)
    const ok = await updatePlan(editingId, {
      name: form.name,
      description: form.description || null,
      price_monthly: Number(form.price_monthly) || 0,
      price_annual: Number(form.price_annual) || 0,
      max_doctors: form.max_doctors.trim() === '' ? null : Number(form.max_doctors),
      max_users: form.max_users.trim() === '' ? null : Number(form.max_users),
      storage_gb: Number(form.storage_gb) || 0,
      features: form.features.map(f => f.trim()).filter(Boolean),
      is_popular: form.is_popular,
      is_visible: form.is_visible,
    } as any)
    setSaving(false)
    if (ok) cancelEdit()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos e Preços</h1>
          <p className="text-sm text-muted-foreground">Edite preços, recursos e limites. As alterações aparecem imediatamente na landing page <code className="text-xs">/</code></p>
        </div>
      </div>

      {loading && <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">Carregando planos...</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map(plan => {
          const isEditing = editingId === plan.id
          return (
            <div key={plan.id} className={`rounded-2xl border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all ${plan.is_popular ? 'border-secondary ring-2 ring-secondary/20' : 'border-border'}`}>
              {!isEditing ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <div className="flex items-center gap-1">
                      {plan.is_popular && <StatusBadge variant="info">Popular</StatusBadge>}
                      {!plan.is_visible && <StatusBadge variant="neutral">Oculto</StatusBadge>}
                    </div>
                  </div>
                  {plan.description && <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-foreground">R$ {fmt(Number(plan.price_monthly))}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                    <p className="text-xs text-muted-foreground mt-1">Anual: R$ {fmt(Number(plan.price_annual))}/mês</p>
                  </div>
                  <div className="mb-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Médicos</span><span className="font-medium">{plan.max_doctors ?? '∞'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Usuários</span><span className="font-medium">{plan.max_users ?? '∞'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Armazenamento</span><span className="font-medium">{plan.storage_gb >= 1000 ? '1 TB' : `${plan.storage_gb} GB`}</span></div>
                  </div>
                  <ul className="space-y-1.5 mb-4 max-h-48 overflow-auto">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <span className="text-[hsl(var(--success))] mt-0.5">✅</span> <span className="flex-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => startEdit(plan)} className="w-full gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90">
                    <Pencil className="h-4 w-4" /> Editar plano
                  </button>
                </>
              ) : form && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">Editando: {plan.name}</h3>
                    <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>

                  <Input label="Nome" value={form.name} onChange={v => setForm({ ...form, name: v })} />
                  <TextArea label="Descrição" value={form.description} onChange={v => setForm({ ...form, description: v })} />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">R$/mês</label>
                      <CurrencyInput value={form.price_monthly} onChange={v => setForm({ ...form, price_monthly: String(v) })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">R$/mês (anual)</label>
                      <CurrencyInput value={form.price_annual} onChange={v => setForm({ ...form, price_annual: String(v) })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input label="Médicos" value={form.max_doctors} onChange={v => setForm({ ...form, max_doctors: v })} type="number" placeholder="∞" />
                    <Input label="Usuários" value={form.max_users} onChange={v => setForm({ ...form, max_users: v })} type="number" placeholder="∞" />
                    <Input label="Storage GB" value={form.storage_gb} onChange={v => setForm({ ...form, storage_gb: v })} type="number" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Recursos</label>
                      <button type="button" onClick={addFeature} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Adicionar</button>
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
                      {form.features.map((f, i) => (
                        <div key={i} className="flex gap-1">
                          <input value={f} onChange={e => updateFeature(i, e.target.value)} className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs" />
                          <button type="button" onClick={() => removeFeature(i)} className="rounded-md border border-input bg-background px-2 hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({ ...form, is_popular: !form.is_popular })} className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium inline-flex items-center justify-center gap-1 ${form.is_popular ? 'border-secondary bg-secondary/10 text-secondary' : 'border-input text-muted-foreground'}`}>
                      <Star className="h-3.5 w-3.5" /> {form.is_popular ? 'Popular' : 'Marcar popular'}
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, is_visible: !form.is_visible })} className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium inline-flex items-center justify-center gap-1 ${form.is_visible ? 'border-input text-foreground' : 'border-input text-muted-foreground bg-muted'}`}>
                      {form.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {form.is_visible ? 'Visível' : 'Oculto'}
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={cancelEdit} className="flex-1 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
                    <button onClick={save} disabled={saving} className="flex-1 gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                      <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Implantação e Treinamento (mantido) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Implantação e Treinamento (30 dias)</h2>
        <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Plano</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Perfil de Cliente</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Esforço de Treinamento</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Valor Sugerido (Setup)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="px-6 py-4 font-bold text-foreground">Starter</td><td className="px-6 py-4 text-muted-foreground">Consultórios pequenos</td><td className="px-6 py-4 text-muted-foreground">1 médico + até 3 usuários.</td><td className="px-6 py-4 font-semibold text-foreground">R$ 800,00 a R$ 1.200,00</td></tr>
              <tr className="border-b border-border"><td className="px-6 py-4 font-bold text-foreground">Pro</td><td className="px-6 py-4 text-muted-foreground">Clínicas em crescimento</td><td className="px-6 py-4 text-muted-foreground">Até 15 médicos + usuários ilimitados.</td><td className="px-6 py-4 font-semibold text-foreground">R$ 2.500,00 a R$ 3.500,00</td></tr>
              <tr><td className="px-6 py-4 font-bold text-foreground">Enterprise</td><td className="px-6 py-4 text-muted-foreground">Redes e Hospitais</td><td className="px-6 py-4 text-muted-foreground">Médicos ilimitados, multi-unidades.</td><td className="px-6 py-4 font-semibold text-foreground">A partir de R$ 7.000,00</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  )
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
    </div>
  )
}
