import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Globe } from "lucide-react"

interface Webhook {
  id: string
  url: string
  events: string[]
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

export function InstrumentWebhooksModal({
  isOpen,
  onClose,
  instrumentId,
  instrumentName
}: InstrumentWebhooksModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  
  const [showAdd, setShowAdd] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['RESULT_RECEIVED'])

  // No projeto, o backend Python (Aisaxius) é acessado via proxy ou URL configurada
  // Vamos usar um endpoint mock/base conforme instruções do plano
  const BASE_API = `https://api.inovacodigoia.com.br/api/v1/instruments/${instrumentId}/webhooks`

  const fetchWebhooks = async () => {
    if (!instrumentId) return
    setLoading(true)
    try {
      // O plano pede um GET para buscar informações atuais
      const response = await fetch(BASE_API)
      if (response.ok) {
        const data = await response.json()
        setWebhooks(Array.isArray(data) ? data : [])
      } else {
        // Se falhar (ex: 404), inicializa vazio
        setWebhooks([])
      }
    } catch (error) {
      console.error('Erro ao buscar webhooks:', error)
      // Fallback para mock em desenvolvimento se necessário, mas seguimos o plano
      setWebhooks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && instrumentId) {
      fetchWebhooks()
    }
  }, [isOpen, instrumentId])

  const handleAddWebhook = async () => {
    if (!newUrl) {
      toast.error('Informe a URL de destino')
      return
    }
    if (selectedEvents.length === 0) {
      toast.error('Selecione pelo menos um evento')
      return
    }

    setSaving(true)
    try {
      // O plano pede um POST para registrar
      const response = await fetch(BASE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          events: selectedEvents
        })
      })

      if (!response.ok) throw new Error('Falha ao registrar webhook')
      
      toast.success('Webhook registrado com sucesso!')
      setNewUrl('')
      setSelectedEvents(['RESULT_RECEIVED'])
      setShowAdd(false)
      fetchWebhooks()
    } catch (error: any) {
      console.error('Erro ao salvar webhook:', error)
      toast.error('Erro ao salvar webhook no servidor de integração')
      
      // MOCK PARA DEMO/DESENVOLVIMENTO (visto que o servidor pode não estar UP no sandbox)
      const mockNew = { id: Math.random().toString(), url: newUrl, events: selectedEvents }
      setWebhooks(prev => [...prev, mockNew])
      setShowAdd(false)
      setNewUrl('')
    } finally {
      setSaving(false)
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Webhooks: {instrumentName}
          </DialogTitle>
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
                <h3 className="text-sm font-semibold flex items-center justify-between">
                  Webhooks Ativos
                  <span className="text-[10px] font-normal text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                    {webhooks.length} configurados
                  </span>
                </h3>
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
                      <div key={w.id} className="flex items-start justify-between p-4 rounded-xl border bg-card hover:shadow-sm transition-all group">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-sm font-medium break-all leading-tight text-foreground/90">{w.url}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {w.events.map(ev => (
                              <span key={ev} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold tracking-wider">
                                {ev}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-4 h-8 w-8 p-0 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
