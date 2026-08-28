import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { ShieldAlert, ShieldCheck, Lock, Globe, RefreshCw, Plus, Trash2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoginAttempt {
  id: string
  user_identifier: string
  ip_address: string | null
  user_agent: string | null
  success: boolean
  company_id: string | null
  attempted_at: string
}

interface Lockout {
  id: string
  lock_type: 'identifier' | 'ip'
  lock_key: string
  reason: string
  failed_count: number
  locked_at: string
  expires_at: string
}

interface AllowlistEntry {
  id: string
  ip_address: string
  label: string | null
  created_at: string
}

type TabKey = 'attempts' | 'users' | 'ips'

const TABS: { key: TabKey; label: string; icon: typeof Lock }[] = [
  { key: 'attempts', label: 'Tentativas de login', icon: Search },
  { key: 'users', label: 'Usuários bloqueados', icon: Lock },
  { key: 'ips', label: 'IPs bloqueados', icon: Globe },
]

function fmt(dt: string) {
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function remaining(expires: string) {
  const ms = new Date(expires).getTime() - Date.now()
  if (ms <= 0) return 'expirando'
  return `${Math.ceil(ms / 60000)} min`
}

export default function LoginAuditPage() {
  const [tab, setTab] = useState<TabKey>('attempts')
  const [loading, setLoading] = useState(true)
  const [attempts, setAttempts] = useState<LoginAttempt[]>([])
  const [lockouts, setLockouts] = useState<Lockout[]>([])
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'fail'>('all')

  const [newIp, setNewIp] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [a, l, w, c] = await Promise.all([
      supabase.from('login_attempts').select('*').order('attempted_at', { ascending: false }).limit(300),
      supabase.from('auth_lockouts').select('*').is('released_at', null).order('expires_at', { ascending: false }),
      supabase.from('ip_allowlist').select('*').order('created_at', { ascending: false }),
      supabase.from('companies').select('id, name').order('name'),
    ])
    setAttempts((a.data as LoginAttempt[]) ?? [])
    setLockouts((l.data as Lockout[]) ?? [])
    setAllowlist((w.data as AllowlistEntry[]) ?? [])
    setCompanies((c.data as { id: string; name: string }[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filteredAttempts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return attempts.filter((a) => {
      if (companyFilter !== 'all' && a.company_id !== companyFilter) return false
      if (resultFilter === 'success' && !a.success) return false
      if (resultFilter === 'fail' && a.success) return false
      if (q && !a.user_identifier.includes(q) && !(a.ip_address ?? '').includes(q)) return false
      return true
    })
  }, [attempts, search, companyFilter, resultFilter])

  const userLocks = lockouts.filter((l) => l.lock_type === 'identifier')
  const ipLocks = lockouts.filter((l) => l.lock_type === 'ip')

  const unlock = async (id: string) => {
    const { error } = await supabase.rpc('auth_release_lockout', { _lockout_id: id })
    if (error) { toast.error('Não foi possível desbloquear'); return }
    toast.success('Desbloqueado com sucesso')
    void load()
  }

  const addAllowlist = async () => {
    const ip = newIp.trim()
    if (!ip) return
    const { error } = await supabase.from('ip_allowlist').insert({ ip_address: ip, label: newLabel.trim() || null })
    if (error) { toast.error('Não foi possível adicionar o IP'); return }
    setNewIp(''); setNewLabel('')
    toast.success('IP liberado')
    void load()
  }

  const removeAllowlist = async (id: string) => {
    const { error } = await supabase.from('ip_allowlist').delete().eq('id', id)
    if (error) { toast.error('Não foi possível remover'); return }
    void load()
  }

  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria de Login</h1>
          <p className="text-sm text-muted-foreground">Tentativas de acesso, bloqueios ativos e IPs suspeitos</p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Tentativas (últimas 300)</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{attempts.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Usuários bloqueados</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{userLocks.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" /> IPs bloqueados</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{ipLocks.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attempts' && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por e-mail ou IP"
              className="h-10 flex-1 min-w-[200px] rounded-lg border border-input bg-background px-3 text-sm"
            />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todas as empresas</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as 'all' | 'success' | 'fail')}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos os resultados</option>
              <option value="success">Sucesso</option>
              <option value="fail">Falha</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data/Hora</th>
                  <th className="px-4 py-3">Identificador</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-2.5">{fmt(a.attempted_at)}</td>
                    <td className="px-4 py-2.5">{a.user_identifier}</td>
                    <td className="px-4 py-2.5">{a.ip_address ?? '—'}</td>
                    <td className="px-4 py-2.5">{companyName(a.company_id)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        a.success ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-destructive/10 text-destructive'
                      )}>
                        {a.success ? 'Sucesso' : 'Falha'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredAttempts.length && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Nenhuma tentativa registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(tab === 'users' || tab === 'ips') && (
        <section className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{tab === 'users' ? 'Usuário' : 'IP'}</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Falhas</th>
                  <th className="px-4 py-3">Bloqueado em</th>
                  <th className="px-4 py-3">Expira em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'users' ? userLocks : ipLocks).map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium">{l.lock_key}</td>
                    <td className="px-4 py-2.5">{l.reason === 'suspected_brute_force' ? 'Suspeita de força bruta' : 'Muitas tentativas'}</td>
                    <td className="px-4 py-2.5">{l.failed_count}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{fmt(l.locked_at)}</td>
                    <td className="px-4 py-2.5">{remaining(l.expires_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => void unlock(l.id)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        Desbloquear
                      </button>
                    </td>
                  </tr>
                ))}
                {!(tab === 'users' ? userLocks : ipLocks).length && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nenhum bloqueio ativo</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {tab === 'ips' && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">IPs liberados (whitelist)</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                IPs de unidades físicas nunca são bloqueados automaticamente.
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Endereço IP"
                  className="h-10 w-48 rounded-lg border border-input bg-background px-3 text-sm"
                />
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Identificação (ex.: Recepção Matriz)"
                  className="h-10 flex-1 min-w-[200px] rounded-lg border border-input bg-background px-3 text-sm"
                />
                <button
                  onClick={() => void addAllowlist()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </div>
              <ul className="divide-y divide-border">
                {allowlist.map((w) => (
                  <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                    <span><span className="font-medium">{w.ip_address}</span>{w.label ? ` — ${w.label}` : ''}</span>
                    <button onClick={() => void removeAllowlist(w.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {!allowlist.length && <li className="py-3 text-sm text-muted-foreground">Nenhum IP liberado</li>}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
