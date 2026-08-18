import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Globe, Send } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/AuthContext"

interface Webhook {
  id: string
  url: string
  events: string[]
  last_test_at?: string | null
  last_test_status?: number | null
  last_test_response?: string | null
}

interface InstrumentWebhooksModalProps {
  isOpen: boolean
  onClose: () => void
  instrumentId: string
  instrumentName: string
}

const AVAILABLE_EVENTS = [
  { id: 'RESULT_RECEIVED', label: 'RESULT_RECEIVED' },
  { id: 'STATUS_CHANGED', label: 'STATUS_CHANGED' },
  { id: 'COMMUNICATION_ERROR', label: 'COMMUNICATION_ERROR' },
]

const METHODS = ['GET', 'POST'] as const

export function InstrumentWebhooksModal({
  isOpen,
  onClose,
  instrumentId,
  instrumentName
}: InstrumentWebhooksModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testMethod, setTestMethod] = useState<typeof METHODS[number]>('GET')
  const [webhooks, setWebhooks] = useState<Webhook[]>([])

  const [showAdd, setShowAdd] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['RESULT_RECEIVED'])

  const fetchWebhooks = async () => {
    if (!instrumentId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('instrument_webhooks' as any)
        .select('*')
        .eq('equipment_id', instrumentId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setWebhooks((data as any[]) || [])
    } catch (error: any) {
      console.error('Erro ao buscar webhooks:', error)
      toast.error('Não foi possível carregar os webhooks')
      setWebhooks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && instrumentId) {
      setShowAdd(false)
      fetchWebhooks()
    }
  }, [isOpen, instrumentId])

  const handleAddWebhook = async () => {
    if (!newUrl.trim()) {
      toast.error('Informe a URL de destino')
      return
    }
    if (!/^https?:\/\//i.test(newUrl.trim())) {
      toast.error('A URL deve começar com http:// ou https://')
      return
    }
    if (selectedEvents.length === 0) {
      toast.error('Selecione pelo menos um evento')
      return
    }
    if (!user?.companyId) {
      toast.error('Empresa não identificada')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('instrument_webhooks' as any)
        .insert([{
          company_id: user.companyId,
          equipment_id: instrumentId,
          url: newUrl.trim(),
          events: selectedEvents,
        }])

      if (error) throw error

      toast.success('Webhook registrado com sucesso!')
      setNewUrl('')
      setSelectedEvents(['RESULT_RECEIVED'])
      setShowAdd(false)
      fetchWebhooks()
    } catch (error: any) {
      console.error('Erro ao salvar webhook:', error)
      toast.error(error?.message || 'Erro ao salvar webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('instrument_webhooks' as any)
        .delete()
        .eq('id', id)
      if (error) throw error
      toast.success('Webhook removido')
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch (error: any) {
      console.error('Erro ao remover webhook:', error)
      toast.error('Erro ao remover webhook')
    }
  }

  const handleTest = async (w: Webhook) => {
    setTestingId(w.id)
    try {
      const { data: eq } = await supabase
        .from('lab_equipments')
        .select('id, name, serial_number, connection_type, model, manufacturer')
        .eq('id', instrumentId)
        .maybeSingle()

      const instrument = {
        id: instrumentId,
        name: (eq as any)?.name ?? instrumentName,
        identifier: (eq as any)?.serial_number ?? null,
        type: (eq as any)?.connection_type ?? null,
        brand_model: [(eq as any)?.manufacturer, (eq as any)?.model].filter(Boolean).join(' / ') || null,
        manufacturer: (eq as any)?.manufacturer ?? null,
        model: (eq as any)?.model ?? null,
      }

      const { data, error } = await supabase.functions.invoke('test-instrument-webhook', {
        body: {
          url: w.url,
          method: testMethod,
          event: w.events[0] || 'TEST_EVENT',
          instrument_id: instrumentId,
          instrument_name: instrument.name,
          instrument,
        }
      })
      if (error) throw error

      const res = data as any
      if (res?.ok) {
        toast.success(`Servidor respondeu ${res.status} em ${res.duration_ms}ms`)
      } else {
        toast.error(`Falha no teste: ${res?.error || `HTTP ${res?.status}`}`)
      }

      await supabase
        .from('instrument_webhooks' as any)
        .update({
          last_test_at: new Date().toISOString(),
          last_test_status: res?.status ?? 0,
          last_test_response: (res?.response || res?.error || '').slice(0, 500),
        })
        .eq('id', w.id)

      setWebhooks(prev => prev.map(item => item.id === w.id ? {
        ...item,
        last_test_at: new Date().toISOString(),
        last_test_status: res?.status ?? 0,
        last_test_response: (res?.response || res?.error || '').slice(0, 500),
      } : item))
    } catch (error: any) {
      console.error('Erro ao testar webhook:', error)
      toast.error(error?.message || 'Erro ao executar o teste')
    } finally {
      setTestingId(null)
    }
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Webhooks: {instrumentName}
          </DialogTitle>
          <DialogDescription>
            Configure as URLs que receberão os eventos deste equipamento e teste a conexão.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Buscando webhooks...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Webhooks Ativos</h3>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Método de teste</Label>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-xs outline-none"
                      value={testMethod}
                      onChange={(e) => setTestMethod(e.target.value as typeof METHODS[number])}
                    >
                      {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <span className="text-[10px] font-normal text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                      {webhooks.length} configurados
                    </span>
                  </div>
                </div>

                {webhooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl bg-muted/5">
                    <Globe className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum webhook configurado para este equipamento.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {webhooks.map((w) => (
                      <div key={w.id} className="p-4 rounded-xl border bg-card hover:shadow-sm transition-all space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium break-all leading-tight text-foreground/90 min-w-0 flex-1">{w.url}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => handleTest(w)}
                              disabled={testingId === w.id}
                            >
                              {testingId === w.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Send className="h-3.5 w-3.5" />}
                              Testar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              onClick={() => handleDelete(w.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(w.events || []).map(ev => (
                            <span key={ev} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold tracking-wider">
                              {ev}
                            </span>
                          ))}
                        </div>
                        {w.last_test_at && (
                          <p className="text-[10px] text-muted-foreground break-all">
                            Último teste: {new Date(w.last_test_at).toLocaleString('pt-BR')} — HTTP {w.last_test_status || 'erro'}
                            {w.last_test_response ? ` · ${w.last_test_response.slice(0, 120)}` : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!showAdd ? (
                <Button variant="outline" className="w-full gap-2" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4" /> Adicionar Novo Webhook
                </Button>
              ) : (
                <div className="space-y-4 p-4 border rounded-xl bg-card">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">URL de Destino</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://sua-api.com/webhooks"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Eventos para assinar</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {AVAILABLE_EVENTS.map((event) => (
                        <div key={event.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`event-${event.id}`}
                            checked={selectedEvents.includes(event.id)}
                            onCheckedChange={() => toggleEvent(event.id)}
                          />
                          <label
                            htmlFor={`event-${event.id}`}
                            className="text-sm font-medium leading-none"
                          >
                            {event.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
                    <Button size="sm" className="gradient-bg text-white" onClick={handleAddWebhook} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Salvar Webhook
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
