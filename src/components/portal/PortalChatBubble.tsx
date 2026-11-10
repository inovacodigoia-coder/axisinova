import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface PortalChatMensagem {
  id: string
  externo: boolean
  autor_nome: string
  conteudo: string | null
  anexo_nome: string | null
  apagada: boolean
  criado_em: string
}

interface PortalChatPayload {
  ok: boolean
  error?: string
  nome?: string
  nao_lidas?: number
  mensagens?: PortalChatMensagem[]
}

const ERROS: Record<string, string> = {
  empty: 'Escreva uma mensagem.',
  too_long: 'A mensagem passa de 4000 caracteres.',
  locked: 'Muitas tentativas incorretas. Aguarde 5 minutos.',
  inactive: 'Este acesso está inativo.',
}

/** Intervalos de atualização (o portal não tem login do sistema, então consulta de tempos em tempos). */
const INTERVALO_ABERTO_MS = 5000
const INTERVALO_FECHADO_MS = 20000

function hora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

/**
 * Balão "Falar com o laboratório" do Portal Externo (parceiro, local e médico).
 * Conversa com o grupo do Chat Interno criado para este acesso; validação de código e senha no servidor.
 */
export default function PortalChatBubble({ code, password }: { code: string; password: string }) {
  const [disponivel, setDisponivel] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<PortalChatMensagem[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const abertoRef = useRef(aberto)
  abertoRef.current = aberto

  const carregar = useCallback(async (marcarLida: boolean) => {
    const { data, error } = await supabase.rpc('portal_chat_abrir', {
      p_code: code, p_password: password, p_marcar_lida: marcarLida,
    } as never)
    if (error) return
    const r = data as unknown as PortalChatPayload
    if (!r?.ok) {
      setDisponivel(false)
      return
    }
    setDisponivel(true)
    setMensagens(r.mensagens ?? [])
    setNaoLidas(marcarLida ? 0 : r.nao_lidas ?? 0)
  }, [code, password])

  useEffect(() => {
    void carregar(aberto)
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void carregar(abertoRef.current)
    }, aberto ? INTERVALO_ABERTO_MS : INTERVALO_FECHADO_MS)
    return () => clearInterval(t)
  }, [aberto, carregar])

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aberto, mensagens.length])

  const enviar = async () => {
    const conteudo = texto.trim()
    if (!conteudo || enviando) return
    setEnviando(true)
    setErro(null)
    const { data, error } = await supabase.rpc('portal_chat_enviar', {
      p_code: code, p_password: password, p_conteudo: conteudo,
    } as never)
    const r = data as unknown as PortalChatPayload | null
    if (error || !r?.ok) {
      setErro(ERROS[r?.error ?? ''] ?? 'Não foi possível enviar. Tente novamente.')
    } else {
      setTexto('')
      await carregar(true)
    }
    setEnviando(false)
  }

  if (!disponivel) return null

  return (
    <>
      {aberto && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[min(520px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Falar com o laboratório</p>
              <p className="truncate text-xs opacity-80">Sua mensagem chega à equipe pelo Chat Interno</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setAberto(false)} aria-label="Fechar conversa">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {mensagens.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Envie uma mensagem para a equipe do laboratório.
              </p>
            )}
            {mensagens.map((m) => (
              <div key={m.id} className={cn('flex', m.externo ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                  m.externo ? 'bg-primary text-primary-foreground' : 'border bg-background')}>
                  <p className="mb-0.5 text-xs font-semibold opacity-70">{m.externo ? 'Você' : m.autor_nome}</p>
                  {m.apagada ? (
                    <p className="italic opacity-60">mensagem apagada</p>
                  ) : (
                    <>
                      {m.anexo_nome && (
                        <p className="mb-1 flex items-center gap-1 text-xs opacity-80">
                          <Paperclip className="h-3 w-3" /> {m.anexo_nome} (arquivo disponível só no laboratório)
                        </p>
                      )}
                      {m.conteudo && <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>}
                    </>
                  )}
                  <p className="mt-1 text-right text-[10px] opacity-60">{hora(m.criado_em)}</p>
                </div>
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          <div className="border-t p-2">
            {erro && <p className="mb-1 px-1 text-xs text-destructive">{erro}</p>}
            <div className="flex items-end gap-2">
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar() } }}
                placeholder="Escreva uma mensagem…"
                maxLength={4000}
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none"
              />
              <Button size="icon" onClick={() => void enviar()} disabled={enviando || !texto.trim()} aria-label="Enviar mensagem">
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105"
        aria-label={aberto ? 'Fechar conversa com o laboratório' : 'Falar com o laboratório'}
        title="Falar com o laboratório"
      >
        {aberto ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!aberto && naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>
    </>
  )
}
