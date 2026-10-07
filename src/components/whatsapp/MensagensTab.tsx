import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { AlertTriangle, Info, Loader2, RotateCcw } from 'lucide-react'
import { VARIAVEIS_MODELO, MODELOS_PADRAO, RESPOSTAS_PADRAO, renderModelo, variaveisDesconhecidas, limparTexto, comCabecalho, textoNumerado } from '@/lib/whatsappModelo'
import { useAuth } from '@/context/AuthContext'

interface Modelo { id: string; posicao: number; texto: string; ativo: boolean }

type Formato = 'botoes' | 'texto_numerado'
const EXEMPLO_BASE = { paciente: 'Danielle Beatriz', tipo: 'Consulta', primeiraVez: true, medico: 'Dra. Juliana Prado', dataHora: '2026-10-06T13:40:00Z' }

export function MensagensTab({ companyId, onDirtyChange }: { companyId: string; onDirtyChange: (d: boolean) => void }) {
  const [modelos, setModelos] = useState<Modelo[] | null>(null)
  const [proximo, setProximo] = useState<number | null>(null)
  const [rascunho, setRascunho] = useState<Record<string, { texto: string; ativo: boolean }>>({})
  const [formato, setFormato] = useState<Formato>('botoes')
  const [salvandoFmt, setSalvandoFmt] = useState(false)
  const { user } = useAuth() as any
  const responsavel: string = user?.name ?? user?.full_name ?? user?.user_metadata?.full_name ?? 'Seu nome'

  const load = useCallback(async () => {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('whatsapp_modelos_mensagem').select('id, posicao, texto, ativo')
        .eq('company_id', companyId).eq('tipo', 'confirmacao_agendamento').order('posicao'),
      supabase.from('whatsapp_config_empresa').select('proximo_modelo, formato_confirmacao').eq('company_id', companyId).maybeSingle(),
    ])
    const lista = (m ?? []) as Modelo[]
    setModelos(lista)
    setProximo((c as any)?.proximo_modelo ?? null)
    setFormato((c as any)?.formato_confirmacao === 'texto_numerado' ? 'texto_numerado' : 'botoes')
    setRascunho(Object.fromEntries(lista.map(x => [x.id, { texto: x.texto, ativo: x.ativo }])))
  }, [companyId])

  useEffect(() => { void load() }, [load])

  const dirty = (modelos ?? []).some(m => rascunho[m.id] && (rascunho[m.id].texto !== m.texto || rascunho[m.id].ativo !== m.ativo))
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  if (!modelos) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  if (modelos.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Nenhum modelo de mensagem encontrado.</div>

  const ativosRascunho = modelos.filter(m => rascunho[m.id]?.ativo).length
  const ativosSalvos = modelos.filter(m => m.ativo).sort((a, b) => a.posicao - b.posicao)
  const proxPos = ativosSalvos.find(m => m.posicao >= (proximo ?? 1))?.posicao ?? ativosSalvos[0]?.posicao

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
        <Info className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p>As mensagens são enviadas em sequência entre os modelos ativos (1, 2, 3, 1...), para que pacientes diferentes recebam textos diferentes.</p>
          <p className="mt-1 text-muted-foreground">Próxima da sequência: <strong className="text-foreground">{proxPos ? `Mensagem ${proxPos}` : '—'}</strong></p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Formato da confirmação</h3>
        <div className="flex flex-wrap gap-2">
          {([['botoes', 'Botões'], ['texto_numerado', 'Texto numerado']] as const).map(([v, l]) => (
            <Button key={v} type="button" variant={formato === v ? 'default' : 'outline'} className="h-10" disabled={salvandoFmt}
              onClick={async () => {
                if (formato === v) return
                setSalvandoFmt(true)
                const { error } = await supabase.rpc('whatsapp_formato_salvar' as any, { p_formato: v })
                setSalvandoFmt(false)
                if (error) { toast.error(error.message); return }
                setFormato(v); toast.success(`Formato alterado para ${l}`)
              }}>{l}</Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Botões: o paciente toca em CONFIRMAR, REMARCAR ou CANCELAR. Texto numerado: o paciente responde 1, 2 ou 3. Use texto numerado se os botões não aparecerem no celular do paciente.</p>
      </div>
      {modelos.map(m => (
        <ModeloCard key={m.id} modelo={m} valor={rascunho[m.id]} formato={formato} responsavel={responsavel}
          ultimoAtivo={rascunho[m.id]?.ativo && ativosRascunho === 1}
          onChange={v => setRascunho(r => ({ ...r, [m.id]: v }))}
          onSalvo={load} />
      ))}
      <RespostasAutomaticas companyId={companyId} responsavel={responsavel} />
    </div>
  )
}

const RESPOSTAS = [
  { tipo: 'resposta_confirmar', titulo: 'Confirmação', desc: 'Enviada quando o paciente confirma.' },
  { tipo: 'resposta_remarcar', titulo: 'Remarcação', desc: 'Enviada quando o paciente pede para remarcar.' },
  { tipo: 'resposta_cancelar', titulo: 'Cancelamento', desc: 'Enviada quando o paciente pede para cancelar.' },
]
interface Resposta { id: string; tipo: string; texto: string; ativo: boolean }

function RespostasAutomaticas({ companyId, responsavel }: { companyId: string; responsavel: string }) {
  const [lista, setLista] = useState<Resposta[] | null>(null)
  const load = useCallback(async () => {
    const { data } = await supabase.from('whatsapp_modelos_mensagem').select('id, tipo, texto, ativo')
      .eq('company_id', companyId).in('tipo', RESPOSTAS.map(r => r.tipo))
    setLista((data ?? []) as Resposta[])
  }, [companyId])
  useEffect(() => { void load() }, [load])
  if (!lista) return null
  return (
    <div className="space-y-3 pt-2">
      <div>
        <h3 className="text-base font-bold text-foreground">Respostas automáticas</h3>
        <p className="text-xs text-muted-foreground">Enviadas em poucos segundos quando o paciente responde à confirmação. Desligada: a resposta do paciente é registrada, mas nada é enviado a ele.</p>
      </div>
      {RESPOSTAS.map(r => {
        const m = lista.find(x => x.tipo === r.tipo)
        return m ? <RespostaCard key={m.id} modelo={m} titulo={r.titulo} desc={r.desc} responsavel={responsavel} onSalvo={load} /> : null
      })}
    </div>
  )
}

function RespostaCard({ modelo, titulo, desc, responsavel, onSalvo }: { modelo: Resposta; titulo: string; desc: string; responsavel: string; onSalvo: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [texto, setTexto] = useState(modelo.texto)
  const [ativo, setAtivo] = useState(modelo.ativo)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { setTexto(modelo.texto); setAtivo(modelo.ativo) }, [modelo])
  const alterado = texto !== modelo.texto || ativo !== modelo.ativo
  const vazio = texto.trim().length === 0
  const desconhecidas = variaveisDesconhecidas(texto)
  const inserir = (v: string) => {
    const el = ref.current
    const ini = el?.selectionStart ?? texto.length
    const fim = el?.selectionEnd ?? ini
    setTexto((texto.slice(0, ini) + v + texto.slice(fim)).slice(0, 600))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + v.length, ini + v.length) })
  }
  const salvar = async () => {
    setSalvando(true)
    const { error } = await supabase.rpc('whatsapp_modelo_salvar' as any, { p_id: modelo.id, p_texto: limparTexto(texto), p_ativo: ativo })
    setSalvando(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Resposta de ${titulo.toLowerCase()} salva`)
    onSalvo()
  }
  const final = comCabecalho(responsavel, renderModelo(texto, { ...EXEMPLO_BASE, responsavel }))
  const [cab, ...resto] = final.split('\n')
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-foreground">{titulo}</h4>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">Ativo <Switch checked={ativo} onCheckedChange={setAtivo} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {VARIAVEIS_MODELO.map(v => (
          <button key={v.chave} type="button" onClick={() => inserir(v.chave)} title={v.desc}
            className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary hover:bg-primary/20">{v.chave}</button>
        ))}
      </div>
      <div>
        <Textarea ref={ref} value={texto} maxLength={600} rows={4} onChange={e => setTexto(e.target.value)} />
        <p className={`mt-1 text-right text-xs ${texto.length >= 600 ? 'text-destructive' : 'text-muted-foreground'}`}>{texto.length}/600</p>
      </div>
      {vazio && <p className="text-xs text-destructive">O texto não pode ficar vazio.</p>}
      {desconhecidas.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Variáveis desconhecidas: {desconhecidas.join(', ')}
        </div>
      )}
      <div className="rounded-xl bg-muted p-3">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Pré-visualização</p>
        <div className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-success/15 px-3 py-2 text-sm text-foreground shadow-sm">
          {cab.startsWith('*') && cab.endsWith('*:') ? <><strong>{cab.slice(1, -2)}</strong>:{'\n'}{resto.join('\n')}</> : final}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-10" onClick={() => {
          if (window.confirm(`Restaurar o texto padrão da resposta de ${titulo.toLowerCase()}? (você ainda precisa clicar em Salvar)`)) setTexto(RESPOSTAS_PADRAO[modelo.tipo] ?? texto)
        }}><RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão</Button>
        <Button className="h-10 gradient-bg text-primary-foreground" disabled={!alterado || vazio || salvando} onClick={salvar}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
    </div>
  )
}

function ModeloCard({ modelo, valor, ultimoAtivo, onChange, onSalvo, formato, responsavel }: {
  formato: Formato; responsavel: string
  modelo: Modelo; valor: { texto: string; ativo: boolean }; ultimoAtivo: boolean
  onChange: (v: { texto: string; ativo: boolean }) => void; onSalvo: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [salvando, setSalvando] = useState(false)
  const alterado = valor.texto !== modelo.texto || valor.ativo !== modelo.ativo
  const desconhecidas = variaveisDesconhecidas(valor.texto)
  const vazio = valor.texto.trim().length === 0

  const inserir = (v: string) => {
    const el = ref.current
    const ini = el?.selectionStart ?? valor.texto.length
    const fim = el?.selectionEnd ?? ini
    const novo = (valor.texto.slice(0, ini) + v + valor.texto.slice(fim)).slice(0, 600)
    onChange({ ...valor, texto: novo })
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + v.length, ini + v.length) })
  }

  const restaurar = () => {
    if (!window.confirm(`Restaurar o texto padrão da Mensagem ${modelo.posicao}? O texto atual será substituído (você ainda precisa clicar em Salvar).`)) return
    onChange({ ...valor, texto: MODELOS_PADRAO[modelo.posicao] ?? valor.texto })
  }

  const salvar = async () => {
    setSalvando(true)
    const { error } = await supabase.rpc('whatsapp_modelo_salvar' as any, { p_id: modelo.id, p_texto: limparTexto(valor.texto), p_ativo: valor.ativo })
    setSalvando(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Mensagem ${modelo.posicao} salva`)
    onSalvo()
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">Mensagem {modelo.posicao}</h3>
        <label className="flex items-center gap-2 text-sm text-foreground" title={ultimoAtivo ? 'Mantenha ao menos uma mensagem ativa.' : undefined}>
          Ativo
          <Switch checked={valor.ativo} disabled={ultimoAtivo} onCheckedChange={a => onChange({ ...valor, ativo: a })} />
        </label>
      </div>
      {ultimoAtivo && <p className="text-xs text-muted-foreground">Mantenha ao menos uma mensagem ativa.</p>}

      <div className="flex flex-wrap items-center gap-2">
        {VARIAVEIS_MODELO.map(v => (
          <button key={v.chave} type="button" onClick={() => inserir(v.chave)} title={v.desc}
            className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary hover:bg-primary/20">
            {v.chave}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{VARIAVEIS_MODELO.map(v => `${v.chave} ${v.desc}`).join(' · ')}</p>

      <div>
        <Textarea ref={ref} value={valor.texto} maxLength={600} rows={4}
          onChange={e => onChange({ ...valor, texto: e.target.value })} />
        <p className={`mt-1 text-right text-xs ${valor.texto.length >= 600 ? 'text-destructive' : 'text-muted-foreground'}`}>{valor.texto.length}/600</p>
      </div>

      {vazio && <p className="text-xs text-destructive">O texto não pode ficar vazio.</p>}
      {desconhecidas.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Variáveis desconhecidas: {desconhecidas.join(', ')}
        </div>
      )}
      {!vazio && !valor.texto.includes('{data_hora}') && (
        <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> Recomendamos incluir a data e hora do agendamento.
        </div>
      )}

      <div className="rounded-xl bg-muted p-3">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Pré-visualização</p>
        {/* Texto puro: React escapa o conteúdo; nada é interpretado como HTML. */}
        <div className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-success/15 px-3 py-2 text-sm text-foreground shadow-sm">
          {(() => {
            const corpo = comCabecalho(responsavel, renderModelo(valor.texto, { ...EXEMPLO_BASE, responsavel }))
            const final = formato === 'texto_numerado' ? textoNumerado(corpo) : corpo
            const [cab, ...resto] = final.split('\n')
            return cab.startsWith('*') && cab.endsWith('*:') ? <><strong>{cab.slice(1, -2)}</strong>:{'\n'}{resto.join('\n')}</> : final
          })()}
        </div>
        {formato === 'botoes' && (
          <div className="ml-auto mt-1 grid max-w-[85%] gap-1">
            {['CONFIRMAR', 'REMARCAR', 'CANCELAR'].map(b => (
              <div key={b} className="rounded-lg bg-card px-3 py-1.5 text-center text-sm font-medium text-primary shadow-sm">{b}</div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-10" onClick={restaurar}><RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão</Button>
        <Button className="h-10 gradient-bg text-primary-foreground" disabled={!alterado || vazio || salvando} onClick={salvar}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
    </div>
  )
}
