import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, MessageCircle, Plus, RefreshCw, Link2, Unlink, Clock, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MensagensTab } from '@/components/whatsapp/MensagensTab'
import { JanelaEnvio } from '@/components/whatsapp/JanelaEnvio'

interface Inst {
  id: string; apelido: string | null; status: string; numero_conectado: string | null; nome_perfil: string | null
  foto_perfil_url: string | null; status_atualizado_em: string | null; ultimo_motivo_desconexao: string | null
  ativo_no_rodizio: boolean; limite_diario: number | null
}
interface Solic { status: string; motivo_recusa: string | null; criado_em: string }

const MSG: Record<string, string> = {
  WHATSAPP_NAO_LIBERADO: 'A conexão de WhatsApp precisa ser liberada pela equipe Axis Inova.',
  COTA_NUMEROS_ESGOTADA: 'Todos os números autorizados já estão em uso. Solicite um novo número.',
  TOKEN_INSTANCIA_INVALIDO: 'A chave deste número não é mais aceita pelo servidor. Exclua este número e adicione outro.',
}

/** Chama a função do servidor. A tela nunca fala com a uazapi direto. */
async function chamar(body: Record<string, unknown>): Promise<{ ok: boolean; codigo?: string; mensagem?: string; dados?: any }> {
  const { data, error } = await supabase.functions.invoke('whatsapp-instancia', { body })
  if (!error) return data
  try {
    const j = await (error as any).context?.json?.()
    if (j) return j
  } catch { /* ignora */ }
  return { ok: false, codigo: 'ERRO', mensagem: 'Não foi possível falar com o servidor. Tente de novo.' }
}
function avisarErro(r: { codigo?: string; mensagem?: string }) {
  const m = (r.codigo === 'SERVIDOR_OCUPADO' ? r.mensagem : r.codigo && MSG[r.codigo]) || r.mensagem || 'Algo deu errado. Tente de novo.'
  toast.error(m)
}

function formatarNumero(n: string | null) {
  if (!n) return ''
  const d = n.replace(/\D/g, '')
  const m = d.match(/^(55)(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `+${m[1]} ${m[2]} ${m[3]}-${m[4]}` : `+${d}`
}
const qrSrc = (q: string) => (q.startsWith('data:') ? q : `data:image/png;base64,${q}`)

const STATUS: Record<string, { label: string; cls: string }> = {
  connected: { label: 'Conectado', cls: 'bg-success/15 text-success' },
  connecting: { label: 'Conectando', cls: 'bg-warning/15 text-warning animate-pulse' },
  disconnected: { label: 'Desconectado', cls: 'bg-destructive/15 text-destructive' },
  hibernated: { label: 'Hibernada', cls: 'bg-muted text-muted-foreground' },
  nao_configurada: { label: 'Não configurado', cls: 'bg-secondary text-secondary-foreground' },
}

export default function WhatsappSettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [estado, setEstado] = useState<'carregando' | 'sem_permissao' | 'nao_liberado' | 'ok'>('carregando')
  const [autorizados, setAutorizados] = useState(0)
  const [insts, setInsts] = useState<Inst[]>([])
  const [solic, setSolic] = useState<Solic | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [pedirAberto, setPedirAberto] = useState(false)
  const [qrInst, setQrInst] = useState<Inst | null>(null)

  const companyId = user?.companyId ?? null
  type Aba = 'numeros' | 'mensagens' | 'fila'
  const [aba, setAba] = useState<Aba>('numeros')
  const [podeConfig, setPodeConfig] = useState(false)
  const [podeFila, setPodeFila] = useState(false)
  const [msgDirty, setMsgDirty] = useState(false)
  const trocarAba = (a: Aba) => {
    if (aba === 'mensagens' && a !== aba && msgDirty && !window.confirm('Há alterações não salvas nas mensagens. Sair mesmo assim?')) return
    setAba(a)
  }
  const voltar = () => {
    if (msgDirty && !window.confirm('Há alterações não salvas nas mensagens. Sair mesmo assim?')) return
    navigate('/app/configuracoes')
  }

  const load = useCallback(async () => {
    if (!companyId) return
    const [{ data: perm }, { data: permFila }] = await Promise.all([
      supabase.rpc('whatsapp_tem_permissao' as any, { _perm: 'configuracoes.whatsapp' }),
      supabase.rpc('whatsapp_tem_permissao' as any, { _perm: 'whatsapp.fila' }),
    ])
    setPodeConfig(!!perm); setPodeFila(!!permFila)
    if (!perm && !permFila) { setEstado('sem_permissao'); return }
    if (!perm) setAba('fila')
    const [{ data: c }, { data: i }, { data: s }] = await Promise.all([
      supabase.from('companies').select('whatsapp_habilitado, whatsapp_numeros_autorizados').eq('id', companyId).maybeSingle(),
      supabase.from('whatsapp_instancias').select('*').eq('company_id', companyId).order('criado_em'),
      supabase.from('whatsapp_solicitacoes_numero').select('status, motivo_recusa, criado_em').eq('company_id', companyId)
        .order('criado_em', { ascending: false }).limit(1),
    ])
    if (!c?.whatsapp_habilitado) { setEstado('nao_liberado'); return }
    setAutorizados(c.whatsapp_numeros_autorizados ?? 0)
    setInsts((i ?? []) as Inst[])
    setSolic((s?.[0] as Solic) ?? null)
    setEstado('ok')
  }, [companyId])

  useEffect(() => { void load() }, [load])

  const pendente = solic?.status === 'pendente'
  const temCota = insts.length < autorizados

  const onAdicionar = () => (temCota ? setNovoAberto(true) : setPedirAberto(true))

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={voltar} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Números de WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Números de envio e mensagens automáticas</p>
        </div>
      </div>

      {estado === 'carregando' && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {(estado === 'nao_liberado' || estado === 'sem_permissao') && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{estado === 'nao_liberado' ? 'Recurso não liberado' : 'Sem permissão'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {estado === 'nao_liberado' ? 'A conexão de WhatsApp precisa ser liberada pela equipe Axis Inova.' : 'Seu perfil não pode configurar o WhatsApp.'}
          </p>
        </div>
      )}

      {estado === 'ok' && (
        <>
          {podeConfig && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground"><strong>{insts.length}</strong> de <strong>{autorizados}</strong> números em uso</p>
            <Button onClick={onAdicionar} disabled={pendente && !temCota} className="h-11 gradient-bg text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Adicionar número
            </Button>
          </div>}

          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {([...(podeConfig ? ['numeros', 'mensagens'] : []), ...(podeFila ? ['fila'] : [])] as Aba[]).map(a => (
              <button key={a} onClick={() => trocarAba(a)}
                className={`h-11 shrink-0 px-4 text-sm ${aba === a ? 'border-b-2 border-primary font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {a === 'numeros' ? 'Números' : a === 'mensagens' ? 'Mensagens' : 'Fila de envios'}
              </button>
            ))}
          </div>

          {aba === 'fila' && podeFila && companyId && <FilaEnviosTab companyId={companyId} />}
          {aba === 'mensagens' && podeConfig && companyId && <MensagensTab companyId={companyId} onDirtyChange={setMsgDirty} />}

          {aba === 'numeros' && podeConfig && <>
          {pendente && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
              <Clock className="h-4 w-4 text-warning" /> Solicitação de novo número aguardando aprovação
            </div>
          )}
          {solic?.status === 'recusada' && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
              Sua última solicitação foi recusada{solic.motivo_recusa ? `: ${solic.motivo_recusa}` : '.'}
            </div>
          )}

          {insts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Nenhum número criado ainda. Clique em "Adicionar número".
            </div>
          )}

          <div className="grid gap-4">
            {insts.map(i => <NumeroCard key={i.id} inst={i} onChange={load} onConectar={() => setQrInst(i)} />)}
          </div>

          {insts.length > 0 && <JanelaEnvio />}
          {insts.length > 0 && <TesteEnvio insts={insts} companyId={companyId} onEnviado={load} />}
          </>}
        </>
      )}

      <NovoNumeroDialog open={novoAberto} onOpenChange={setNovoAberto}
        onCriado={async (inst) => { await load(); setQrInst(inst) }} />
      <SolicitarDialog open={pedirAberto} onOpenChange={setPedirAberto} companyId={companyId} pendente={pendente} onEnviado={load} />
      {qrInst && <QrDialog inst={qrInst} onClose={() => { setQrInst(null); void load() }} />}
    </div>
  )
}

function NumeroCard({ inst, onChange, onConectar }: { inst: Inst; onChange: () => void; onConectar: () => void }) {
  const [apelido, setApelido] = useState(inst.apelido ?? '')
  const [limite, setLimite] = useState(inst.limite_diario?.toString() ?? '')
  const [travado, setTravado] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const st = STATUS[inst.status] ?? STATUS.nao_configurada

  const atualizar = async (campos: Record<string, unknown>) => {
    setSalvando(true)
    const r = await chamar({ acao: 'atualizar_numero', instancia_id: inst.id, ...campos })
    setSalvando(false)
    if (!r.ok) { avisarErro(r); return false }
    onChange(); return true
  }
  const salvarApelido = () => {
    const a = apelido.trim()
    if (a === (inst.apelido ?? '')) return
    if (!a || a.length > 60) { toast.error('Apelido de 1 a 60 caracteres.'); setApelido(inst.apelido ?? ''); return }
    void atualizar({ apelido: a })
  }
  const salvarLimite = () => {
    const v = limite.trim()
    const n = v === '' ? null : Number(v)
    if (n === inst.limite_diario) return
    if (n !== null && !(Number.isInteger(n) && n >= 1)) { toast.error('Limite diário deve ser 1 ou mais, ou vazio.'); setLimite(inst.limite_diario?.toString() ?? ''); return }
    void atualizar({ limite_diario: n })
  }
  const atualizarStatus = async () => {
    setTravado(true); setTimeout(() => setTravado(false), 3000)
    const r = await chamar({ acao: 'status', instancia_id: inst.id })
    if (!r.ok) avisarErro(r)
    onChange()
  }
  const desconectar = async () => {
    setConfirmar(false); setSalvando(true)
    const r = await chamar({ acao: 'desconectar', instancia_id: inst.id })
    setSalvando(false)
    if (!r.ok) { avisarErro(r); return }
    toast.success('Número desconectado.'); onChange()
  }
  const excluir = async () => {
    setConfirmarExcluir(false); setSalvando(true)
    const r = await chamar({ acao: 'excluir_numero', instancia_id: inst.id })
    setSalvando(false)
    if (!r.ok) { avisarErro(r); return }
    toast.success('Número excluído. Você já pode adicionar outro.'); onChange()
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {inst.status === 'connected' && inst.foto_perfil_url
            ? <img src={inst.foto_perfil_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"><MessageCircle className="h-6 w-6 text-primary" /></div>}
          <div className="min-w-0">
            <Input value={apelido} onChange={e => setApelido(e.target.value)} onBlur={salvarApelido} maxLength={60}
              className="h-9 border-transparent px-1 text-base font-semibold hover:border-border focus:border-border" aria-label="Apelido" />
            {inst.status === 'connected' && (
              <p className="px-1 text-sm text-muted-foreground truncate">
                {inst.nome_perfil ? `${inst.nome_perfil} · ` : ''}{formatarNumero(inst.numero_conectado)}
              </p>
            )}
          </div>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Última verificação: {inst.status_atualizado_em ? new Date(inst.status_atualizado_em).toLocaleString('pt-BR') : '—'}</p>
        {inst.ultimo_motivo_desconexao && inst.status !== 'connected' && <p>Último motivo de desconexão: {inst.ultimo_motivo_desconexao}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
          <span className="text-sm text-foreground">Participa do rodízio de envio</span>
          <Switch checked={inst.ativo_no_rodizio} disabled={salvando} onCheckedChange={v => void atualizar({ ativo_no_rodizio: v })} />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3">
          <span className="text-sm text-foreground">Limite diário de mensagens</span>
          <Input type="number" min={1} step={1} placeholder="Sem limite" value={limite} onChange={e => setLimite(e.target.value)}
            onBlur={salvarLimite} disabled={salvando} className="h-9 w-28" />
        </label>
      </div>
      {(inst.limite_diario == null || inst.limite_diario > 100) && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
          Atenção: manter o limite em até 100 mensagens por dia por número reduz o risco de bloqueio pelo WhatsApp.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" onClick={atualizarStatus} disabled={travado}>
          <RefreshCw className={`mr-2 h-4 w-4 ${travado ? 'animate-spin' : ''}`} /> Atualizar status
        </Button>
        {inst.status === 'connected'
          ? <Button variant="outline" className="h-11 text-destructive" onClick={() => setConfirmar(true)} disabled={salvando}>
              <Unlink className="mr-2 h-4 w-4" /> Desconectar
            </Button>
          : <Button className="h-11 gradient-bg text-primary-foreground" onClick={onConectar} disabled={salvando}>
              <Link2 className="mr-2 h-4 w-4" /> Conectar número
            </Button>}
        <Button variant="outline" className="h-11 text-destructive" onClick={() => setConfirmarExcluir(true)} disabled={salvando}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir número
        </Button>
      </div>

      <AlertDialog open={confirmarExcluir} onOpenChange={setConfirmarExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este número?</AlertDialogTitle>
            <AlertDialogDescription>
              O número "{inst.apelido ?? 'sem apelido'}" será removido do servidor e do sistema. Esta ação não pode ser desfeita. Você poderá adicionar outro número em seguida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir número</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar este número?</AlertDialogTitle>
            <AlertDialogDescription>Este número deixará de enviar mensagens até reconectar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={desconectar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desconectar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function NovoNumeroDialog({ open, onOpenChange, onCriado }: { open: boolean; onOpenChange: (v: boolean) => void; onCriado: (i: Inst) => void }) {
  const [apelido, setApelido] = useState('')
  const [salvando, setSalvando] = useState(false)
  const criar = async () => {
    const a = apelido.trim()
    if (!a || a.length > 60) { toast.error('Informe um apelido de até 60 caracteres.'); return }
    setSalvando(true)
    const r = await chamar({ acao: 'criar_numero', apelido: a })
    setSalvando(false)
    if (!r.ok) { avisarErro(r); return }
    setApelido(''); onOpenChange(false)
    onCriado({ ...r.dados, ativo_no_rodizio: true, limite_diario: null } as Inst)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar número</DialogTitle>
          <DialogDescription>Dê um apelido para reconhecer este número (ex.: Recepção).</DialogDescription>
        </DialogHeader>
        <Input value={apelido} onChange={e => setApelido(e.target.value)} maxLength={60} placeholder="Apelido" className="h-11" autoFocus />
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-11 gradient-bg text-primary-foreground" onClick={criar} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar e conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SolicitarDialog({ open, onOpenChange, companyId, pendente, onEnviado }: {
  open: boolean; onOpenChange: (v: boolean) => void; companyId: string | null; pendente: boolean; onEnviado: () => void
}) {
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { user } = useAuth()
  const enviar = async () => {
    if (!companyId) return
    setSalvando(true)
    const { error } = await supabase.from('whatsapp_solicitacoes_numero')
      .insert({ company_id: companyId, observacao_empresa: obs.trim() || null, solicitado_por: user?.id } as any)
    setSalvando(false)
    if (error) { toast.error(error.code === '23505' ? 'Já existe uma solicitação aguardando aprovação.' : 'Não foi possível enviar a solicitação.'); return }
    toast.success('Solicitação enviada. A equipe Axis Inova vai avaliar.')
    setObs(''); onOpenChange(false); onEnviado()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar novo número</DialogTitle>
          <DialogDescription>Cada número adicional custa R$ 100,00 e precisa ser autorizado pela equipe Axis Inova.</DialogDescription>
        </DialogHeader>
        <Textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Observação (opcional)" maxLength={500} />
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-11 gradient-bg text-primary-foreground" onClick={enviar} disabled={salvando || pendente}>Enviar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** QR só em memória; consulta o status a cada 4 s por até 2 min. */
function QrDialog({ inst, onClose }: { inst: Inst; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [fase, setFase] = useState<'gerando' | 'aguardando' | 'expirado'>('gerando')
  const timer = useRef<number | null>(null)
  const ativo = useRef(true)
  const fluxo = useRef(false)

  const parar = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }

  const iniciar = useCallback(async () => {
    if (fluxo.current) return
    fluxo.current = true
    parar(); setQr(null); setFase('gerando')
    const r = await chamar({ acao: 'conectar', instancia_id: inst.id })
    if (!ativo.current) return
    if (!r.ok) { avisarErro(r); fluxo.current = false; setFase('expirado'); return }
    if (r.dados?.status === 'connected') { toast.success('WhatsApp conectado!'); onClose(); return }
    setQr(r.dados?.qrcode ?? null); setFase('aguardando')
    const inicio = Date.now()
    timer.current = window.setInterval(async () => {
      if (Date.now() - inicio > 120_000) { parar(); fluxo.current = false; setQr(null); setFase('expirado'); return }
      const s = await chamar({ acao: 'status', instancia_id: inst.id })
      if (!ativo.current) return
      const status = s.dados?.status
      if (status === 'connected') { parar(); toast.success('WhatsApp conectado!'); onClose() }
      else if (status === 'disconnected' || status === 'nao_configurada') { parar(); fluxo.current = false; setQr(null); setFase('expirado') }
      else if (s.dados?.qrcode) setQr(s.dados.qrcode)
    }, 4000)
  }, [inst.id, onClose])

  useEffect(() => {
    ativo.current = true
    void iniciar()
    return () => { ativo.current = false; parar() }
  }, [iniciar])

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar {inst.apelido ?? 'número'}</DialogTitle>
          <DialogDescription>Escaneie o QR Code com o WhatsApp do celular.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <div className="flex h-[264px] w-[264px] items-center justify-center rounded-xl border border-border bg-card p-3">
            {fase === 'gerando' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {fase === 'aguardando' && qr && <img src={qrSrc(qr)} alt="QR Code do WhatsApp" className="h-[240px] w-[240px]" />}
            {fase === 'aguardando' && !qr && <p className="text-center text-sm text-muted-foreground">Aguardando o QR Code…</p>}
            {fase === 'expirado' && (
              <div className="text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">QR Code expirado</p>
                <Button className="h-11 gradient-bg text-primary-foreground" onClick={() => void iniciar()}>Gerar novo QR Code</Button>
              </div>
            )}
          </div>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
          <li>Abra o WhatsApp no celular</li>
          <li>Menu ou Configurações &gt; Aparelhos conectados</li>
          <li>Conectar um aparelho</li>
          <li>Aponte a câmera para o QR</li>
        </ol>
      </DialogContent>
    </Dialog>
  )
}

const TEXTO_PADRAO = 'Olá! Este é um teste de envio do sistema Axis Inova. Se você recebeu esta mensagem, a conexão do WhatsApp está funcionando.'
const MSG_TESTE: Record<string, string> = {
  INSTANCIA_DESCONECTADA: 'O número escolhido não está conectado. Conecte-o e tente de novo.',
  NUMERO_INVALIDO: 'Número de destino inválido. Confira o DDD e o número.',
  LIMITE_DE_TESTES: 'Limite de 5 testes por minuto atingido. Aguarde um pouco.',
  RESULTADO_INCERTO: 'Não sabemos se a mensagem saiu. Confira o celular de destino antes de tentar de novo.',
}

function mascaraFone(v: string) {
  let d = v.replace(/\D/g, '')
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  d = d.slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  const corte = d.length === 11 ? 7 : 6
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`
}
function normalizar(v: string) {
  let d = v.replace(/\D/g, '')
  if (!d.startsWith('55') || d.length <= 11) d = '55' + d
  return /^55[1-9]{2}\d{8,9}$/.test(d) ? d : null
}

interface Hist { id: string; criado_em: string; telefone_mascarado: string; instancia_id: string | null; status: string; texto_resumo: string }

function TesteEnvio({ insts, companyId, onEnviado }: { insts: Inst[]; companyId: string | null | undefined; onEnviado: () => void }) {
  const conectados = insts.filter(i => i.status === 'connected')
  const [via, setVia] = useState('rodizio')
  const [fone, setFone] = useState('')
  const [texto, setTexto] = useState(TEXTO_PADRAO)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [hist, setHist] = useState<Hist[]>([])
  const desab = conectados.length === 0

  const carregarHist = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase.from('whatsapp_fila_envios_v' as any)
      .select('id, criado_em, telefone_mascarado, instancia_id, status, texto_resumo')
      .eq('company_id', companyId).eq('tipo', 'teste').order('criado_em', { ascending: false }).limit(10)
    setHist((data as any) ?? [])
  }, [companyId])
  useEffect(() => { void carregarHist() }, [carregarHist])

  const pedir = () => {
    if (!texto.trim() || texto.length > 500) { toast.error('A mensagem deve ter de 1 a 500 caracteres.'); return }
    const n = normalizar(fone)
    if (!n) { toast.error(MSG_TESTE.NUMERO_INVALIDO); return }
    setConfirmar(n)
  }
  const enviar = async () => {
    if (!confirmar || enviando) return
    setEnviando(true)
    const r = await chamar({ acao: 'enviar_teste', numero_destino: confirmar, texto, ...(via !== 'rodizio' ? { instancia_id: via } : {}) })
    setEnviando(false); setConfirmar(null)
    if (r.ok) toast.success(`Mensagem enviada pelo WhatsApp (número: ${r.dados?.instancia_apelido}). Confirme o recebimento no celular de destino.`, { duration: 8000 })
    else if (r.codigo && MSG_TESTE[r.codigo]) toast.error(MSG_TESTE[r.codigo])
    else avisarErro(r)
    void carregarHist(); onEnviado()
  }
  const apelido = (id: string | null) => insts.find(i => i.id === id)?.apelido ?? '—'
  const badge: Record<string, string> = { enviada: 'bg-success/15 text-success', falha: 'bg-destructive/15 text-destructive' }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Teste de envio</h3>
        {desab && <p className="text-sm text-muted-foreground">Conecte um número para testar o envio.</p>}
      </div>
      <fieldset disabled={desab} className={`grid gap-3 ${desab ? 'opacity-60' : ''}`}>
        <label className="grid gap-1 text-sm">Enviar por
          <select value={via} onChange={e => setVia(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
            <option value="rodizio">Rodízio automático</option>
            {conectados.map(i => <option key={i.id} value={i.id}>{i.apelido} — {formatarNumero(i.numero_conectado)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Número de destino
          <Input inputMode="tel" className="h-11" placeholder="(84) 99999-9999" value={fone} onChange={e => setFone(mascaraFone(e.target.value))} />
        </label>
        <label className="grid gap-1 text-sm">Mensagem
          <Textarea rows={4} maxLength={500} value={texto} onChange={e => setTexto(e.target.value)} />
          <span className="text-right text-xs text-muted-foreground">{texto.length}/500</span>
        </label>
        <Button onClick={pedir} disabled={enviando || !fone} className="h-11 gradient-bg text-primary-foreground">
          {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />} Enviar mensagem de teste
        </Button>
      </fieldset>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Últimos testes</h4>
        {hist.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum teste enviado ainda.</p> : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {hist.map(h => (
              <li key={h.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:gap-3">
                <span className="text-muted-foreground">{new Date(h.criado_em).toLocaleString('pt-BR')}</span>
                <span className="font-mono">{h.telefone_mascarado}</span>
                <span>por {apelido(h.instancia_id)}</span>
                <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${badge[h.status] ?? 'bg-muted text-muted-foreground'}`}>{h.status === 'enviada' ? 'Enviada' : h.status === 'falha' ? 'Falha' : h.status}</span>
                <span className="truncate text-muted-foreground sm:flex-1">{h.texto_resumo}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!confirmar} onOpenChange={(v) => { if (!v && !enviando) setConfirmar(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar teste?</AlertDialogTitle>
            <AlertDialogDescription>A mensagem será enviada de verdade para <strong>{confirmar && formatarNumero(confirmar)}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={enviando} onClick={(e) => { e.preventDefault(); void enviar() }}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
