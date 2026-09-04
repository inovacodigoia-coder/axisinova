import { useMemo, useState } from 'react'
import { ChevronDown, Copy, Check, Search, Building2, Globe, ArrowLeft, Handshake, FlaskConical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { API_BASES, API_GROUPS, API_INFO, type ApiEndpoint, type HttpMethod, type Scope } from '@/data/apiDocs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DEMO_EXAMS, DEMO_SPECIALTIES } from '@/mocks/registers.mock'

const SCOPE_META: Record<Scope, { label: string; description: string; icon: typeof Building2; className?: string }> = {
  company: { label: 'Empresa', description: 'Escopo por empresa (RLS company_id)', icon: Building2 },
  system: { label: 'Sistema', description: 'Escopo global do sistema', icon: Globe },
  partner: { label: 'Parceiro', description: 'Chamado por sistemas externos parceiros (OAuth2)', icon: Handshake, className: 'border-[#7B2FF7]/40 text-[#7B2FF7]' },
}

function ScopeBadge({ scope, withDescription }: { scope: Scope; withDescription?: boolean }) {
  const meta = SCOPE_META[scope]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn('shrink-0 gap-1 text-[10px]', meta.className)}>
      <Icon className="h-3 w-3" />
      {withDescription ? meta.description : meta.label}
    </Badge>
  )
}

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  POST: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  PUT: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  PATCH: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  DELETE: 'bg-destructive/15 text-destructive border-destructive/30',
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copiar"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function EndpointRow({ ep }: { ep: ApiEndpoint }) {
  const [open, setOpen] = useState(false)
  const base = ep.path.startsWith('/rpc/') || ep.path.startsWith('/auth') || ep.path.startsWith('/storage')
    ? API_BASES.rest.replace('/rest/v1', '')
    : ep.path.startsWith('/') && ep.id.startsWith('fn-')
      ? API_BASES.functions
      : API_BASES.rest
  const fullUrl = `${base}${ep.path}`

  return (
    <div className={cn('rounded-lg border overflow-hidden transition-colors', open ? 'border-primary/40' : 'border-border')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 bg-muted/40 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
      >
        <span className={cn('shrink-0 rounded border px-2 py-0.5 text-xs font-bold tracking-wide', METHOD_STYLES[ep.method])}>
          {ep.method}
        </span>
        <code className="truncate font-mono text-xs sm:text-sm">{ep.path}</code>
        <span className="hidden flex-1 truncate text-xs text-muted-foreground sm:block">{ep.summary}</span>
        <div className="hidden shrink-0 sm:flex">
          <ScopeBadge scope={ep.scope} />
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t bg-background p-4 text-sm">
          <p className="font-medium sm:hidden">{ep.summary}</p>
          {ep.description && <p className="text-muted-foreground">{ep.description}</p>}

          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <code className="flex-1 break-all font-mono text-xs">{fullUrl}</code>
            <CopyButton value={fullUrl} />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">Auth: {ep.auth}</Badge>
            <ScopeBadge scope={ep.scope} withDescription />
          </div>

          {ep.params?.length ? (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parâmetros</h4>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left font-medium">Nome</th>
                      <th className="p-2 text-left font-medium">Local</th>
                      <th className="p-2 text-left font-medium">Tipo</th>
                      <th className="p-2 text-left font-medium">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.params.map((p) => (
                      <tr key={p.name} className="border-t">
                        <td className="p-2 font-mono">
                          {p.name}
                          {p.required && <span className="ml-1 text-destructive">*</span>}
                        </td>
                        <td className="p-2">{p.in}</td>
                        <td className="p-2 text-muted-foreground">{p.type}</td>
                        <td className="p-2 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {ep.requestExample && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requisição</h4>
              <pre className="overflow-x-auto rounded-md bg-foreground/95 p-3 text-xs text-background">{ep.requestExample}</pre>
            </div>
          )}
          {ep.responseExample && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resposta</h4>
              <pre className="overflow-x-auto rounded-md bg-foreground/95 p-3 text-xs text-background">{ep.responseExample}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DocsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | Scope>('all')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return API_GROUPS.map((g) => ({
      ...g,
      endpoints: g.endpoints.filter(
        (e) =>
          (scope === 'all' || e.scope === scope) &&
          (!q || e.path.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q) || g.tag.includes(q)),
      ),
    })).filter((g) => g.endpoints.length > 0)
  }, [query, scope])

  const total = API_GROUPS.reduce((n, g) => n + g.endpoints.length, 0)

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{API_INFO.title}</h1>
            <Badge variant="secondary">{API_INFO.version}</Badge>
            <Badge variant="outline">OAS 3.1</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{API_INFO.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {total} endpoints · atualizado em {API_INFO.updatedAt}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar endpoint, rota ou grupo…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {([
              ['all', 'Todos'],
              ['company', 'Empresa'],
              ['system', 'Sistema'],
              ['partner', 'Parceiro'],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={scope === value ? 'default' : 'outline'}
                onClick={() => setScope(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {groups.map((group) => (
          <section key={group.tag} className="rounded-xl border bg-background p-4 sm:p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold capitalize">{group.tag}</h2>
              <span className="text-xs text-muted-foreground">{group.endpoints.length} endpoints</span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{group.description}</p>
            <div className="space-y-2">
              {group.endpoints.map((ep) => (
                <EndpointRow key={ep.id} ep={ep} />
              ))}
            </div>
          </section>
        ))}

        {groups.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Nenhum endpoint encontrado.</p>
        )}
      </div>
    </div>
  )
}
