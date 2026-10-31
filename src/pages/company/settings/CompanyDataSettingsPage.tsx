import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

type Form = { name: string; nome_fantasia: string; cnpj: string; telefone: string; email: string; website: string }
const empty: Form = { name: '', nome_fantasia: '', cnpj: '', telefone: '', email: '', website: '' }
const fields: { key: keyof Form; label: string; hint?: string }[] = [
  { key: 'name', label: 'Razão Social' },
  { key: 'nome_fantasia', label: 'Nome Fantasia', hint: 'Nome exibido no topo do sistema' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'website', label: 'Website' },
]

export default function CompanyDataSettingsPage() {
  const { user } = useAuth() as any
  const companyId: string | null = user?.companyId ?? null
  const canEdit = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.isAdmin
  const [form, setForm] = useState<Form>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    supabase.from('companies').select('name, nome_fantasia, cnpj, telefone, email, website').eq('id', companyId).single()
      .then(({ data, error }) => {
        if (error) toast.error('Não foi possível carregar os dados da empresa')
        else if (data) setForm(Object.fromEntries(Object.keys(empty).map(k => [k, (data as any)[k] ?? ''])) as Form)
        setLoading(false)
      })
  }, [companyId])

  const save = async () => {
    if (!companyId) return
    if (!form.name.trim()) { toast.error('Informe a Razão Social'); return }
    setSaving(true)
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]))
    const { error } = await supabase.from('companies').update(payload as any).eq('id', companyId)
    setSaving(false)
    if (error) { toast.error('Não foi possível salvar: ' + error.message); return }
    toast.success('Dados salvos. Atualizando o nome no topo...')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dados da Empresa</h1>
        <p className="text-sm text-muted-foreground">Informações de cadastro da empresa</p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium">{f.label}</label>
                  <input value={form[f.key]} disabled={!canEdit} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-70" />
                  {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
                </div>
              ))}
            </div>
            {canEdit ? (
              <div className="flex justify-end pt-4">
                <button onClick={save} disabled={saving} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-primary-foreground flex items-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                </button>
              </div>
            ) : <p className="text-xs text-muted-foreground">Somente administradores podem alterar estes dados.</p>}
          </>
        )}
      </div>
    </div>
  )
}
