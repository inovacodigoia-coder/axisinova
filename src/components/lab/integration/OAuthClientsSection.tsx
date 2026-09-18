import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ShieldCheck, Plus, Copy, ShieldOff, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

type ClientRow = {
  id: string
  name: string
  client_id: string
  scopes: string[]
  is_active: boolean
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

const TOKEN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-token`

export default function OAuthClientsSection() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [name, setName] = useState('ServidorAisaxius (OAuth2)')
  const [created, setCreated] = useState<{ client_id: string; client_secret: string } | null>(null)

  const fetchClients = async () => {
    if (!user?.companyId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('integration_oauth_clients')
      .select('id, name, client_id, scopes, is_active, created_at, last_used_at, revoked_at')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar credenciais OAuth2')
    setClients((data as ClientRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [user?.companyId])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-oauth-client', {
        body: { name: name.trim() },
      })
      if (error) {
        const res = (error as any)?.context as Response | undefined
        const detail = res ? await res.clone().json().catch(() => null) : null
        throw new Error(detail?.error || error.message)
      }
      if ((data as any)?.error) throw new Error((data as any).error)
      setCreated({ client_id: (data as any).client_id, client_secret: (data as any).client_secret })
      toast.success('Credenciais geradas! Copie o client_secret agora — ele não será exibido novamente.')
      fetchClients()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar credenciais')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Deseja revogar estas credenciais? Novos tokens deixarão de ser emitidos.')) return
    const { error } = await supabase
      .from('integration_oauth_clients')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return toast.error('Erro ao revogar credenciais')
    toast.success('Credenciais revogadas')
    fetchClients()
  }

  const copy = (value: string) => {
    navigator.clipboard.writeText(value)
    toast.success('Copiado para a área de transferência')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-bold">OAuth2 — client credentials (recomendado)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          O servidor troca <code>client_id</code> + <code>client_secret</code> por um token de acesso de curta duração
          (1 hora) e envia esse token em <code>Authorization: Bearer</code>. O segredo nunca trafega nas chamadas de
          dados.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Identificação do client</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: ServidorAisaxius - Matriz" />
          </div>
          <Button className="gradient-bg text-white gap-2" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Gerar credenciais
          </Button>
        </div>

        {created && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Copie agora — o client_secret não será exibido novamente
            </p>
            {[
              { label: 'client_id', value: created.client_id },
              { label: 'client_secret', value: created.client_secret },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">{f.label}</span>
                <div className="flex items-start gap-2">
                  <code className="flex-1 break-all rounded-lg bg-background px-3 py-2 text-sm">{f.value}</code>
                  <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => copy(f.value)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-bold">Como obter o token</h2>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-muted-foreground w-24 shrink-0">Token URL</span>
          <code className="flex-1 break-all rounded-lg bg-muted px-3 py-2 text-xs">{TOKEN_ENDPOINT}</code>
          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => copy(TOKEN_ENDPOINT)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
{`POST ${TOKEN_ENDPOINT}
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=...&client_secret=...&scope=exams:read orders:read results:write

200 { "access_token": "...", "token_type": "Bearer", "expires_in": 3600, "scope": "..." }
401 { "error": "invalid_client", "error_description": "..." }`}
        </pre>
        <p className="text-xs text-muted-foreground">
          Depois, envie <code>Authorization: Bearer &lt;access_token&gt;</code> nos endpoints de catálogo, pedidos e
          envio de resultados. As API Keys <code>X-API-Key</code> continuam funcionando como legado.
        </p>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma credencial OAuth2 gerada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client ID</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Escopos</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Último uso</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-6 py-4 font-mono text-xs break-all">{c.client_id}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{(c.scopes || []).join(', ')}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.last_used_at ? new Date(c.last_used_at).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={c.is_active ? 'default' : 'outline'}>{c.is_active ? 'Ativo' : 'Revogado'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.is_active && (
                        <Button variant="ghost" size="sm" className="text-red-600 gap-1" onClick={() => handleRevoke(c.id)}>
                          <ShieldOff className="h-3.5 w-3.5" /> Revogar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
