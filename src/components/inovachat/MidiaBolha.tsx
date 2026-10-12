import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2, Pause, Play, AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export interface MidiaInfo {
  id: string; tipo: string; midia_status: string | null; midia_nome: string | null; midia_tamanho: number | null; duracao_seg: number | null; midia_mime: string | null
}

async function urlAssinada(id: string, baixar = false): Promise<string | null> {
  const { data } = await supabase.functions.invoke('inovachat-midia', { body: { acao: 'url', mensagem_id: id, baixar } })
  return (data as any)?.ok ? (data as any).url : null
}
const tamanho = (b: number | null) => !b ? '' : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1).replace('.', ',')} MB`
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Mídia da bolha: só abre por URL assinada curta, pedida ao servidor quando aparece. */
export function MidiaBolha({ m }: { m: MidiaInfo }) {
  const st = m.midia_status
  if (st === 'pendente') return <p className="flex items-center gap-1.5 text-xs opacity-80"><Loader2 className="h-3.5 w-3.5 animate-spin" />Baixando…</p>
  if (st === 'grande_demais') return <p className="flex items-center gap-1.5 text-xs opacity-80"><AlertTriangle className="h-3.5 w-3.5" />Arquivo acima de 16 MB — não foi baixado. Veja no celular.</p>
  if (st === 'nao_suportado' || m.tipo === 'outro') return <p className="flex items-center gap-1.5 text-xs opacity-80"><AlertTriangle className="h-3.5 w-3.5" />Arquivo não suportado</p>
  if (st === 'falha') return <p className="flex items-center gap-1.5 text-xs opacity-80"><AlertTriangle className="h-3.5 w-3.5" />Não foi possível baixar o arquivo</p>
  if (st !== 'baixada') return <p className="text-xs opacity-80">{m.tipo === 'audio' ? 'Áudio' : m.tipo === 'imagem' ? 'Imagem' : m.tipo === 'video' ? 'Vídeo' : m.tipo === 'figurinha' ? 'Figurinha' : 'Documento'}</p>
  if (m.tipo === 'audio') return <Audio m={m} />
  if (m.tipo === 'imagem' || m.tipo === 'figurinha') return <Imagem m={m} />
  if (m.tipo === 'video') return <VideoM m={m} />
  return <Documento m={m} />
}

function useUrl(id: string) {
  const [url, setUrl] = useState<string | null>(null)
  const [erro, setErro] = useState(false)
  useEffect(() => { let vivo = true; void urlAssinada(id).then(u => { if (vivo) { setUrl(u); setErro(!u) } }); return () => { vivo = false } }, [id])
  return { url, erro }
}

function Audio({ m }: { m: MidiaInfo }) {
  const { url, erro } = useUrl(m.id)
  const ref = useRef<HTMLAudioElement>(null)
  const [tocando, setTocando] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(m.duracao_seg ?? 0)
  const [vel, setVel] = useState(1)
  if (erro) return <p className="text-xs opacity-80">Áudio indisponível</p>
  return (
    <div className="flex w-64 max-w-full items-center gap-2">
      <audio ref={ref} src={url ?? undefined} preload="metadata"
        onLoadedMetadata={e => { const d = e.currentTarget.duration; if (isFinite(d)) setDur(d) }}
        onTimeUpdate={e => setT(e.currentTarget.currentTime)} onEnded={() => { setTocando(false); setT(0) }} />
      <button type="button" disabled={!url} aria-label={tocando ? 'Pausar' : 'Reproduzir'}
        onClick={() => { const a = ref.current; if (!a) return; if (a.paused) { a.playbackRate = vel; void a.play(); setTocando(true) } else { a.pause(); setTocando(false) } }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {!url ? <Loader2 className="h-4 w-4 animate-spin" /> : tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <input type="range" min={0} max={dur || 1} step={0.1} value={t} aria-label="Progresso"
          onChange={e => { const a = ref.current; if (a) { a.currentTime = Number(e.target.value); setT(a.currentTime) } }}
          className="w-full accent-primary" />
        <p className="text-[10px] opacity-80">{mmss(tocando || t ? t : dur)}</p>
      </div>
      <button type="button" className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
        onClick={() => { const n = vel === 1 ? 1.5 : vel === 1.5 ? 2 : 1; setVel(n); if (ref.current) ref.current.playbackRate = n }}>
        {String(vel).replace('.', ',')}x
      </button>
    </div>
  )
}

function Imagem({ m }: { m: MidiaInfo }) {
  const { url, erro } = useUrl(m.id)
  const [aberta, setAberta] = useState(false)
  if (erro) return <p className="text-xs opacity-80">Imagem indisponível</p>
  if (!url) return <div className="flex h-40 w-56 items-center justify-center rounded bg-muted/50"><Loader2 className="h-5 w-5 animate-spin" /></div>
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} aria-label="Ampliar imagem">
        <img src={url} alt="Imagem recebida" className={m.tipo === 'figurinha' ? 'h-32 w-32 object-contain' : 'max-h-64 max-w-[16rem] rounded object-cover'} />
      </button>
      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent className="max-w-4xl p-2">
          <DialogTitle className="sr-only">Imagem</DialogTitle>
          <img src={url} alt="Imagem ampliada" className="max-h-[80vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

function VideoM({ m }: { m: MidiaInfo }) {
  const { url, erro } = useUrl(m.id)
  if (erro) return <p className="text-xs opacity-80">Vídeo indisponível</p>
  if (!url) return <div className="flex h-40 w-56 items-center justify-center rounded bg-muted/50"><Loader2 className="h-5 w-5 animate-spin" /></div>
  return <video src={url} controls preload="metadata" className="max-h-64 max-w-[16rem] rounded" />
}

function Documento({ m }: { m: MidiaInfo }) {
  const [baixando, setBaixando] = useState(false)
  const baixar = async () => {
    setBaixando(true)
    const u = await urlAssinada(m.id, true)
    setBaixando(false)
    if (u) window.open(u, '_blank', 'noopener')
  }
  const ext = (m.midia_nome?.split('.').pop() ?? '').toUpperCase()
  return (
    <div className="flex w-64 max-w-full items-center gap-2 rounded-md bg-muted/40 p-2">
      <FileText className="h-8 w-8 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{m.midia_nome || 'Documento'}</p>
        <p className="text-[10px] opacity-70">{[ext, tamanho(m.midia_tamanho)].filter(Boolean).join(' · ')}</p>
      </div>
      <button type="button" onClick={() => void baixar()} aria-label="Baixar" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
        {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
    </div>
  )
}
