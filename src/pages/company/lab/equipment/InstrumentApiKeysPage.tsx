import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, KeyRound, Plus, Copy, ShieldOff, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

type KeyRow = {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-instrument-result`

export default function InstrumentApiKeysPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [name, setName] = useState('ServidorAisaxius')
  const [newKey, setNewKey] = useState<string | null>(null)

  const fetchKeys = async () => {
    if (!user?.companyId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('instrument_integration_keys')
      .select('id, name, key_prefix, is_active, created_at, last_used_at, revoked_at')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar chaves de integração')
    setKeys((data as KeyRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchKeys()
  }, [user?.companyId])

  const handleCreate = async () => {
    if (!user?.companyId) {
      toast.error('Não foi possível identificar o laboratório do usuário')
      return
    }
    setCreating(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-company-api-key', {
        body: { name: name.trim() },
      })
      if (error) throw error
      if ((data as any)?.error) throw new Error((data as any).error)
      setNewKey((data as any).api_key)
      toast.success('Chave gerada! Copie agora — ela não será exibida novamente.')
      fetchKeys()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar chave')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Deseja revogar esta chave? O ServidorAisaxius deixará de enviar resultados.')) return
    const { error } = await supabase
      .from('instrument_integration_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return toast.error('Erro ao revogar chave')
    toast.success('Chave revogada')
    fetchKeys()
  }

  const copy = (value: string) => {
    navigator.clipboard.writeText(value)
    toast.success('Copiado para a área de transferência')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/cadastros/equipamentos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Integração de Equipamentos</h1>
          <p className="text-sm text-muted-foreground">
            Credenciais usadas pelo ServidorAisaxius para ler o catálogo/pedidos e enviar resultados.
          </p>
        </div>
      </div>

      <Tabs defaultValue="oauth" className="space-y-6">
        <TabsList>
          <TabsTrigger value="oauth">OAuth2 (recomendado)</TabsTrigger>
          <TabsTrigger value="apikey">API Key (legado)</TabsTrigger>
        </TabsList>

        <TabsContent value="oauth">
          <OAuthClientsSection />
        </TabsContent>

        <TabsContent value="apikey" className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-bold">Nova chave</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Identificação da chave</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: ServidorAisaxius - Matriz" />
          </div>
          <Button className="gradient-bg text-white gap-2" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Gerar chave
          </Button>
        </div>

        {newKey && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Copie agora — esta chave não será exibida novamente
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-background px-3 py-2 text-sm">{newKey}</code>
              <Button variant="outline" size="sm" onClick={() => copy(newKey)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-bold">Configuração do ServidorAisaxius</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 shrink-0">Endpoint</span>
            <code className="flex-1 break-all rounded-lg bg-muted px-3 py-2 text-xs">{ENDPOINT}</code>
            <Button variant="outline" size="sm" onClick={() => copy(ENDPOINT)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 shrink-0">Cabeçalho</span>
            <code className="rounded-lg bg-muted px-3 py-2 text-xs">X-API-Key: sua-chave</code>
          </div>
          <p className="text-xs text-muted-foreground">
            Envie <code>POST</code> com um resultado por chamada:{' '}
            <code>
              {`{ "idempotency_key", "sample_barcode", "equipment_id", "test_code", "value", "unit", "flag", "reference_range", "result_datetime" }`}
            </code>
            . O <code>sample_barcode</code> é o mesmo devolvido em <code>samples[].sample_barcode</code> de{' '}
            <code>/list-orders-for-integration</code>. Sucesso: <code>{`{ "success": true }`}</code>. Qualquer rejeição
            vem como <code>{`{ "success": false, "error": "motivo" }`}</code> com status 4xx.
          </p>

        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma chave gerada até o momento.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prefixo</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Criada em</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Último uso</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{k.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(k.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={k.is_active ? 'default' : 'outline'}>
                      {k.is_active ? 'Ativa' : 'Revogada'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {k.is_active && (
                      <Button variant="ghost" size="sm" className="text-red-600 gap-1" onClick={() => handleRevoke(k.id)}>
                        <ShieldOff className="h-3.5 w-3.5" /> Revogar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
