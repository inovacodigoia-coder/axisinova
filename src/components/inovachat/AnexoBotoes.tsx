import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Paperclip, Send, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { paraMp3 } from '@/lib/gravarAudioMp3'

const ACEITOS = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip'
const MAX_AUDIO = 300

async function erroDe(data: any, error: any) {
  let msg = data?.mensagem as string | undefined
  if (!msg && error) { try { msg = (await error.context?.json?.())?.mensagem } catch { /* */ } }
  return msg ?? 'Não foi possível enviar.'
}

/** Sobe o arquivo por upload assinado e pede o envio. O servidor valida tipo, tamanho e permissão. */
async function enviarArquivo(conversaId: string, arquivo: Blob, nome: string, legenda: string, duracao?: number) {
  const mime = arquivo.type || 'application/octet-stream'
  const { data: up, error: ue } = await supabase.functions.invoke('inovachat-midia', { body: { acao: 'upload', conversa_id: conversaId, nome, mime, tamanho: arquivo.size } })
  if (!(up as any)?.ok) throw new Error(await erroDe(up, ue))
  const { error: se } = await supabase.storage.from('inovachat-midia').uploadToSignedUrl((up as any).path, (up as any).token, arquivo, { contentType: mime })
  if (se) throw new Error('Falha ao subir o arquivo.')
  const { data, error } = await supabase.functions.invoke('inovachat-enviar', {
    body: { conversa_id: conversaId, texto: legenda, midia: { path: (up as any).path, nome, duracao } },
  })
  const r = (data ?? {}) as any
  if (!r.ok) { const e = new Error(await erroDe(r, error)); (e as any).registrada = !!r.mensagem_id; throw e }
}

export function AnexoBotoes({ conversaId, onEnviado, onGravando }: { conversaId: string; onEnviado: () => void; onGravando: (v: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [arq, setArq] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [legenda, setLegenda] = useState('')
  const [enviando, setEnviando] = useState(false)
  // gravação
  const rec = useRef<MediaRecorder | null>(null)
  const partes = useRef<Blob[]>([])
  const cancelar = useRef(false)
  const [seg, setSeg] = useState<number | null>(null)
  const inicio = useRef(0)

  useEffect(() => { if (seg === null) return; const t = setInterval(() => {
    const s = Math.floor((Date.now() - inicio.current) / 1000); setSeg(s); if (s >= MAX_AUDIO) parar(false)
  }, 250); return () => clearInterval(t) }, [seg !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = (f: File | undefined) => {
    if (!f) return
    const img = f.type.startsWith('image/')
    if (f.size > (img ? 10 : 20) * 1048576) { toast.error(`Arquivo acima do limite (${img ? 10 : 20} MB).`); return }
    setArq(f); setLegenda(''); setPreview(img ? URL.createObjectURL(f) : null)
  }
  const fechar = () => { if (preview) URL.revokeObjectURL(preview); setArq(null); setPreview(null) }
  const enviarAnexo = async () => {
    if (!arq) return
    setEnviando(true)
    try { await enviarArquivo(conversaId, arq, arq.name, legenda.trim()); fechar() }
    catch (e: any) { toast.error(e.message); if (e.registrada) fechar() }
    finally { setEnviando(false); onEnviado() }
  }

  const gravar = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast.error('Este navegador não permite gravar áudio.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      partes.current = []; cancelar.current = false
      r.ondataavailable = e => { if (e.data.size) partes.current.push(e.data) }
      r.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const dur = Math.max(1, Math.round((Date.now() - inicio.current) / 1000))
        setSeg(null); onGravando(false)
        if (cancelar.current) return
        setEnviando(true)
        try {
          const mp3 = await paraMp3(new Blob(partes.current, { type: r.mimeType }))
          await enviarArquivo(conversaId, mp3, `audio-${Date.now()}.mp3`, '', Math.min(dur, MAX_AUDIO))
        } catch (e: any) { toast.error(e.message || 'Não foi possível enviar o áudio.') }
        finally { setEnviando(false); onEnviado() }
      }
      rec.current = r; inicio.current = Date.now(); r.start(); setSeg(0); onGravando(true)
    } catch { toast.error('Permita o uso do microfone para gravar.') }
  }
  const parar = (cancel: boolean) => { cancelar.current = cancel; if (rec.current?.state === 'recording') rec.current.stop() }

  if (seg !== null) {
    return (
      <div className="flex flex-1 items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-destructive" onClick={() => parar(true)} aria-label="Cancelar gravação"><Trash2 className="h-5 w-5" /></Button>
        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-border px-3 text-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
          Gravando {Math.floor(seg / 60)}:{String(seg % 60).padStart(2, '0')} <span className="text-xs text-muted-foreground">/ 5:00</span>
        </div>
        <Button type="button" onClick={() => parar(false)} className="h-11 w-11 shrink-0 gradient-bg p-0 text-primary-foreground" aria-label="Enviar áudio"><Send className="h-5 w-5" /></Button>
      </div>
    )
  }
  return (
    <>
      <input ref={input} type="file" accept={ACEITOS} className="hidden" onChange={e => { escolher(e.target.files?.[0]); e.target.value = '' }} />
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" disabled={enviando} onClick={() => input.current?.click()} aria-label="Anexar arquivo" title="Anexar imagem ou documento">
        {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" disabled={enviando} onClick={() => void gravar()} aria-label="Gravar áudio" title="Gravar áudio">
        <Mic className="h-5 w-5" />
      </Button>
      <Dialog open={!!arq} onOpenChange={v => { if (!v && !enviando) fechar() }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar arquivo</DialogTitle><DialogDescription>Seu nome vai na primeira linha da legenda.</DialogDescription></DialogHeader>
          {preview ? <img src={preview} alt="Pré-visualização" className="max-h-72 w-full rounded object-contain" />
            : <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><FileText className="h-6 w-6 text-primary" /><span className="truncate">{arq?.name}</span></div>}
          <Textarea value={legenda} onChange={e => setLegenda(e.target.value)} maxLength={1000} placeholder="Legenda (opcional)" rows={2} />
          <DialogFooter>
            <Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button>
            <Button onClick={() => void enviarAnexo()} disabled={enviando} className="gradient-bg text-primary-foreground">
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
