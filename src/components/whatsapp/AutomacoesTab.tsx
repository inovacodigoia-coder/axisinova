// Etapa 11A — aba Automações (mensagens de ciclo do paciente). Regras ficam no banco; validação repetida no servidor.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Pencil, Plus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  VARIAVEIS_MODELO, AUTOMACOES_PADRAO, TIPO_AUTOMACAO_LABEL, type TipoAutomacao, textoCiclo, comCabecalho,
  variaveisDesconhecidas, descreverQuando, temMarcadorOrientacao, limparTexto,
  separarAvisoSaida, BOTAO_SAIR, VARIAVEIS_RELACIONAMENTO, renderLinks, linkFaltando, validarLink, ehDominioGoogle,
  CHAVES_LINK, type ChaveLink, type Links, TIPOS_POS,
} from '@/lib/whatsappModelo'

interface Regra {
  id: string; tipo: TipoAutomacao; nome: string; ativo: boolean; deslocamento_minutos: number; horario_fixo: string | null
  filtro_tipos_atendimento: string[] | null; filtro_medicos: string[] | null; texto: string; incluir_aviso_saida: boolean
  ordem: number; padrao: boolean
  filtro_primeira_vez: boolean | null; filtro_apenas_adultos: boolean | null; meses_sem_atendimento_max: number | null
  intervalo_minimo_dias: number | null; resposta_promotor: string | null; resposta_neutro: string | null; resposta_detrator: string | null
}
type Unidade = 'minutos' | 'horas' | 'dias'
const TIPOS: TipoAutomacao[] = ['inclusao_agenda', 'pre_atendimento', 'pos_atendimento', 'nps', 'avaliacao_google', 'aniversario', 'indicacao', 'atualizacao_cadastral', 'questionario']
const LINK_LABEL: Record<ChaveLink, string> = {
  link_google: 'Avaliação no Google', link_indicacao: 'Indicação', link_cadastro: 'Atualização cadastral', link_questionario: 'Questionário',
}
const RELAC = (t: TipoAutomacao) => !['inclusao_agenda', 'pre_atendimento'].includes(t)
const TIPOS_ATEND = ['Consulta', 'Retorno', 'Exame', 'Procedimento']
const DESCR: Record<TipoAutomacao, string> = {
  inclusao_agenda: 'Avisa o paciente logo depois que o agendamento é criado.',
  pre_atendimento: 'Lembrete com orientações antes do atendimento.',
  pos_atendimento: 'Mensagem de cuidado depois que o atendimento é finalizado.',
  nps: 'Pergunta a nota de 0 a 10 e responde conforme a nota. Notas baixas avisam os gestores no sino.',
  avaliacao_google: 'Convida o paciente a avaliar a clínica no Google.',
  aniversario: 'Parabéns no dia do aniversário, para pacientes atendidos recentemente.',
  indicacao: 'Convida o paciente a indicar a clínica.',
  atualizacao_cadastral: 'Envia o link para o paciente atualizar o cadastro.',
  questionario: 'Envia o link de um questionário.',
}
const EXEMPLO = { paciente: 'Maria Exemplo', tipo: 'Exame', primeiraVez: false, medico: 'Dra. Juliana Prado', dataHora: '2026-10-21T12:30:00Z' }

function emUnidade(min: number): { v: number; u: Unidade } {
  if (min > 0 && min % 1440 === 0) return { v: min / 1440, u: 'dias' }
  if (min > 0 && min % 60 === 0) return { v: min / 60, u: 'horas' }
  return { v: min, u: 'minutos' }
}
const paraMin = (v: number, u: Unidade) => Math.round(v * (u === 'dias' ? 1440 : u === 'horas' ? 60 : 1))
const msgErro = (e: any) => /Edite as orientações|Preencha o link/.test(e?.message ?? '') ? String(e.message) : 'Não foi possível salvar.'
const msgLink = (k: ChaveLink) => `Preencha o link de ${LINK_LABEL[k]} na seção Links antes de ativar.`

export function AutomacoesTab({ companyId }: { companyId: string }) {
  const [regras, setRegras] = useState<Regra[] | null>(null)
  const [medicos, setMedicos] = useState<{ id: string; name: string }[]>([])
  const [cfg, setCfg] = useState<{ pausado: boolean; limite_dia: number; limite_semana: number } | null>(null)
  const [editar, setEditar] = useState<Regra | 'novo' | null>(null)
  const [confPausa, setConfPausa] = useState<boolean | null>(null)
  const [lim, setLim] = useState({ dia: '1', semana: '3' })
  const [links, setLinks] = useState<Links>({})
  const [linksEd, setLinksEd] = useState<Record<ChaveLink, string>>({ link_google: '', link_indicacao: '', link_cadastro: '', link_questionario: '' })
  const [empresa, setEmpresa] = useState('')

  const load = useCallback(async () => {
    const [{ data: r }, { data: m }, { data: c }, { data: l }, { data: e }] = await Promise.all([
      supabase.from('whatsapp_automacoes' as any).select('*').eq('company_id', companyId).order('tipo').order('ordem').order('criado_em'),
      supabase.from('doctors').select('id, name').eq('company_id', companyId).order('name'),
      supabase.rpc('whatsapp_ciclo_config' as any, {}),
      supabase.rpc('whatsapp_links_config' as any, {}),
      supabase.from('companies').select('name, nome_fantasia').eq('id', companyId).maybeSingle(),
    ])
    const ll = l as any
    if (ll?.ok) {
      const v: Links = {}; const ed: any = {}
      for (const k of CHAVES_LINK) { v[k] = ll[k] ?? null; ed[k] = ll[k] ?? '' }
      setLinks(v); setLinksEd(ed)
    }
    setEmpresa(((e as any)?.nome_fantasia || (e as any)?.name || '').trim())
    setRegras(((r ?? []) as unknown) as Regra[])
    setMedicos(((m ?? []) as any[]).map(x => ({ id: x.id, name: x.name })))
    const cc = c as any
    if (cc?.ok) { setCfg(cc); setLim({ dia: String(cc.limite_dia), semana: String(cc.limite_semana) }) }
  }, [companyId])
  useEffect(() => { void load() }, [load])

  const alternar = async (r: Regra, ativo: boolean) => {
    if (ativo && temMarcadorOrientacao(r.texto)) { toast.error('Edite as orientações antes de ativar.'); return }
    const falta = ativo ? linkFaltando(r.texto, links) : null
    if (falta) { toast.error(msgLink(falta)); return }
    const { error } = await supabase.from('whatsapp_automacoes' as any).update({ ativo } as any).eq('id', r.id)
    if (error) toast.error(msgErro(error)); else { toast.success(ativo ? 'Regra ativada.' : 'Regra desativada.'); void load() }
  }
  const salvarCfg = async (patch: { p_pausado?: boolean; p_limite_dia?: number; p_limite_semana?: number }) => {
    const { data, error } = await supabase.rpc('whatsapp_ciclo_config' as any, patch as any)
    if (error || !(data as any)?.ok) { toast.error('Não foi possível salvar.'); return }
    setCfg(data as any); toast.success('Configuração salva.')
  }
  const salvarLinks = async () => {
    for (const k of CHAVES_LINK) { const er = validarLink(linksEd[k]); if (er) { toast.error(`${LINK_LABEL[k]}: ${er}`); return } }
    const { data, error } = await supabase.rpc('whatsapp_links_config' as any, { p_links: linksEd } as any)
    const d = data as any
    if (error || !d?.ok) {
      toast.error(d?.codigo === 'LINK_EM_USO' ? `O link de ${LINK_LABEL[d.campo as ChaveLink]} é usado por uma regra ativa. Desative a regra antes de apagar o link.`
        : d?.codigo === 'LINK_INVALIDO' ? 'O link precisa começar com https://' : 'Não foi possível salvar os links.')
      return
    }
    toast.success('Links salvos.'); void load()
  }
  const npsAtivo = regras?.some(r => r.tipo === 'nps' && r.ativo) ?? false
  const nomeMedico = (id: string) => medicos.find(m => m.id === id)?.name ?? 'Médico'

  if (!regras || !cfg) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">Pausar todas as automações de ciclo</p>
            <p className="text-xs text-muted-foreground">Com a pausa ligada, nada novo entra na fila e nada sai. O que já está programado volta a sair quando você reativar.</p>
          </div>
          <Switch checked={cfg.pausado} onCheckedChange={v => setConfPausa(v)} />
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <label className="text-xs text-muted-foreground">Relacionamento: máximo por telefone por dia
            <Input type="number" min={1} max={10} value={lim.dia} onChange={e => setLim(l => ({ ...l, dia: e.target.value }))} className="mt-1 h-10 w-24" />
          </label>
          <label className="text-xs text-muted-foreground">Máximo em 7 dias
            <Input type="number" min={1} max={30} value={lim.semana} onChange={e => setLim(l => ({ ...l, semana: e.target.value }))} className="mt-1 h-10 w-24" />
          </label>
          <Button variant="outline" className="h-10" disabled={String(cfg.limite_dia) === lim.dia && String(cfg.limite_semana) === lim.semana}
            onClick={() => {
              const d = Number(lim.dia), s = Number(lim.semana)
              if (!(d >= 1 && d <= 10) || !(s >= 1 && s <= 30)) { toast.error('Use de 1 a 10 por dia e de 1 a 30 em 7 dias.'); return }
              void salvarCfg({ p_limite_dia: d, p_limite_semana: s })
            }}>Salvar limites</Button>
          <p className="w-full text-[11px] text-muted-foreground">Somente mensagens de relacionamento contam. Inclusão na agenda, pré-atendimento, confirmações, respostas automáticas, InovaChat e testes não contam no limite.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="font-semibold text-foreground">Links</p>
          <p className="text-xs text-muted-foreground">Usados nas mensagens pelas variáveis {'{link_google}'}, {'{link_indicacao}'}, {'{link_cadastro}'} e {'{link_questionario}'}. Uma regra que usa um link só pode ser ativada com o link preenchido.</p>
        </div>
        {CHAVES_LINK.map(k => {
          const v = linksEd[k]; const er = validarLink(v)
          return (
            <div key={k}>
              <label className="text-xs text-muted-foreground">{LINK_LABEL[k]}</label>
              <div className="mt-1 flex gap-2">
                <Input value={v} maxLength={500} placeholder="https://" onChange={e => setLinksEd(x => ({ ...x, [k]: e.target.value }))} className="h-10" />
                <Button variant="outline" className="h-10 shrink-0" disabled={!v.trim() || !!er} onClick={() => window.open(v.trim(), '_blank', 'noopener,noreferrer')}>Testar link</Button>
              </div>
              {er && <p className="mt-1 text-xs text-destructive">{er}</p>}
              {!er && k === 'link_google' && v.trim() && !ehDominioGoogle(v) && <p className="mt-1 text-xs text-warning">Este endereço não parece ser do Google. Confira antes de salvar.</p>}
            </div>
          )
        })}
        <div className="flex justify-end">
          <Button variant="outline" className="h-10" disabled={CHAVES_LINK.every(k => (links[k] ?? '') === linksEd[k].trim())} onClick={() => void salvarLinks()}>Salvar links</Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setEditar('novo')} className="h-11 gradient-bg text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Nova regra</Button>
      </div>

      {TIPOS.map(t => (
        <section key={t} className="space-y-2">
          <div>
            <h3 className="font-semibold text-foreground">{TIPO_AUTOMACAO_LABEL[t]}</h3>
            <p className="text-xs text-muted-foreground">{DESCR[t]}</p>
          </div>
          {regras.filter(r => r.tipo === t).map(r => (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-foreground">{r.nome}{r.padrao && <span className="ml-2 rounded-full border border-border px-2 py-px text-[10px] text-muted-foreground">Padrão</span>}</p>
                <p className="text-sm text-muted-foreground">Envia {descreverQuando(r.tipo, r.deslocamento_minutos, r.horario_fixo)}</p>
                <div className="flex flex-wrap gap-1">
                  {(r.filtro_tipos_atendimento ?? []).map(x => <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">{x}</span>)}
                  {(r.filtro_medicos ?? []).map(x => <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">{nomeMedico(x)}</span>)}
                  {r.filtro_primeira_vez && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">Só 1ª vez</span>}
                  {r.tipo !== 'aniversario' && !r.filtro_tipos_atendimento?.length && !r.filtro_medicos?.length && <span className="text-[11px] text-muted-foreground">Todos os atendimentos</span>}
                  {r.incluir_aviso_saida && <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Botão para parar</span>}
                </div>
                {temMarcadorOrientacao(r.texto) && <p className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5" />Edite as orientações antes de ativar.</p>}
                {linkFaltando(r.texto, links) && <p className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5" />Falta o link de {LINK_LABEL[linkFaltando(r.texto, links)!]} para ativar.</p>}
                {r.tipo === 'avaliacao_google' && <p className={`text-xs ${npsAtivo ? 'text-warning' : 'text-muted-foreground'}`}>Quando a pesquisa de satisfação (NPS) estiver ativa para o mesmo atendimento, esta mensagem não é enviada: o convite ao Google vai só para quem dá nota 9 ou 10.</p>}
                {r.tipo === 'nps' && <p className="text-xs text-muted-foreground">No máximo 1 pesquisa a cada {r.intervalo_minimo_dias ?? 90} dias por paciente.</p>}
                {r.tipo === 'aniversario' && <p className="text-xs text-muted-foreground">{r.filtro_apenas_adultos !== false ? 'Só maiores de 18 anos, ' : ''}atendidos nos últimos {r.meses_sem_atendimento_max ?? 24} meses.</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">{r.ativo ? 'Ativa' : 'Desativada'}</span>
                <Switch checked={r.ativo} onCheckedChange={v => void alternar(r, v)} />
                <Button variant="outline" size="sm" className="h-10" onClick={() => setEditar(r)}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
              </div>
            </div>
          ))}
          {regras.filter(r => r.tipo === t).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma regra.</p>}
        </section>
      ))}

      <Editor alvo={editar} companyId={companyId} medicos={medicos} links={links} empresa={empresa} onClose={() => setEditar(null)} onSalvo={() => { setEditar(null); void load() }} />

      <AlertDialog open={confPausa !== null} onOpenChange={o => !o && setConfPausa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confPausa ? 'Pausar todas as automações?' : 'Reativar as automações?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confPausa ? 'Nenhuma mensagem de ciclo será programada nem enviada até você reativar. Confirmações de agendamento continuam normais.'
                : 'As mensagens de ciclo já programadas voltam a sair, respeitando a janela de horário.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { void salvarCfg({ p_pausado: !!confPausa }); setConfPausa(null) }}>{confPausa ? 'Pausar' : 'Reativar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Editor({ alvo, companyId, medicos, links, empresa, onClose, onSalvo }: {
  alvo: Regra | 'novo' | null; companyId: string; medicos: { id: string; name: string }[]; links: Links; empresa: string; onClose: () => void; onSalvo: () => void
}) {
  const { user } = useAuth() as any
  const responsavel: string = user?.name ?? user?.full_name ?? 'Seu nome'
  const [tipo, setTipo] = useState<TipoAutomacao | null>(null)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('0'); const [unid, setUnid] = useState<Unidade>('minutos')
  const [horario, setHorario] = useState('')
  const [fTipos, setFTipos] = useState<string[]>([]); const [fMed, setFMed] = useState<string[]>([])
  const [texto, setTexto] = useState(''); const [aviso, setAviso] = useState(false); const [ativo, setAtivo] = useState(false)
  const [salvando, setSalvando] = useState(false); const [excluir, setExcluir] = useState(false)
  const [foneTeste, setFoneTeste] = useState(''); const [enviando, setEnviando] = useState(false)
  const [primeiraVez, setPrimeiraVez] = useState(false); const [adultos, setAdultos] = useState(true); const [meses, setMeses] = useState('24')
  const [intervalo, setIntervalo] = useState('90')
  const [resp, setResp] = useState({ promotor: '', neutro: '', detrator: '' })
  const regra = alvo && alvo !== 'novo' ? alvo : null

  const preencher = useCallback((t: TipoAutomacao, r?: Regra | null) => {
    const p = AUTOMACOES_PADRAO[t]
    const min = r ? r.deslocamento_minutos : p.deslocamento
    const e = emUnidade(min)
    setTipo(t); setNome(r?.nome ?? `${p.nome} (nova)`); setValor(String(e.v)); setUnid(e.u)
    setHorario(String((r ? r.horario_fixo : p.horario) ?? '').slice(0, 5))
    setFTipos(r ? r.filtro_tipos_atendimento ?? [] : p.filtro ?? []); setFMed(r?.filtro_medicos ?? [])
    setTexto(r?.texto ?? p.texto); setAviso(r ? r.incluir_aviso_saida : p.aviso); setAtivo(r?.ativo ?? false)
    setPrimeiraVez(r ? !!r.filtro_primeira_vez : !!p.primeiraVez); setAdultos(r ? r.filtro_apenas_adultos !== false : true)
    setMeses(String(r?.meses_sem_atendimento_max ?? 24)); setIntervalo(String(r?.intervalo_minimo_dias ?? 90))
    setResp({ promotor: r?.resposta_promotor ?? p.promotor ?? '', neutro: r?.resposta_neutro ?? p.neutro ?? '', detrator: r?.resposta_detrator ?? p.detrator ?? '' })
  }, [])
  useEffect(() => {
    if (alvo && alvo !== 'novo') preencher(alvo.tipo, alvo)
    else { setTipo(null); setFoneTeste('') }
  }, [alvo, preencher])

  const minutos = paraMin(Number(valor), unid)
  const relac = tipo ? RELAC(tipo) : false
  const extras = useMemo(() => new Set<string>(VARIAVEIS_RELACIONAMENTO.map(v => v.chave)), [])
  const desconhecidas = useMemo(() => variaveisDesconhecidas(texto).filter(v => !(relac && extras.has(v))), [texto, relac, extras])
  const cab = tipo === 'aniversario' ? empresa : responsavel
  const preview = useMemo(() => comCabecalho(cab, separarAvisoSaida(textoCiclo(relac ? renderLinks(texto, empresa, links) : texto, EXEMPLO, aviso)).texto), [texto, aviso, cab, relac, empresa, links])
  const falta = linkFaltando(texto, links)
  const marcador = temMarcadorOrientacao(texto)

  const salvar = async () => {
    if (!tipo) return
    const t = limparTexto(texto)
    if (t.length < 1 || t.length > 1000) { toast.error('O texto deve ter de 1 a 1000 caracteres.'); return }
    if (!nome.trim()) { toast.error('Informe o nome da regra.'); return }
    if (!Number.isFinite(minutos) || minutos < 0 || minutos > 43200) { toast.error('O prazo deve ser de 0 a 30 dias.'); return }
    if (ativo && temMarcadorOrientacao(t)) { toast.error('Edite as orientações antes de ativar.'); return }
    if (ativo && falta) { toast.error(msgLink(falta)); return }
    const m = Number(meses), iv = Number(intervalo)
    if (tipo === 'aniversario' && !(m >= 1 && m <= 120)) { toast.error('Meses desde o último atendimento: de 1 a 120.'); return }
    if (tipo === 'nps' && !(iv >= 1 && iv <= 730)) { toast.error('Intervalo entre pesquisas: de 1 a 730 dias.'); return }
    if (tipo === 'nps' && Object.values(resp).some(x => !x.trim() || x.length > 1000)) { toast.error('Preencha as três respostas (até 1000 caracteres).'); return }
    const dados: any = {
      nome: nome.trim().slice(0, 80), ativo, deslocamento_minutos: minutos, horario_fixo: horario || null,
      filtro_tipos_atendimento: fTipos.length ? fTipos : null, filtro_medicos: fMed.length ? fMed : null,
      texto: t, incluir_aviso_saida: aviso,
      ...(tipo === 'aniversario' ? { filtro_apenas_adultos: adultos, meses_sem_atendimento_max: m, horario_fixo: horario || '09:00', deslocamento_minutos: 0, filtro_tipos_atendimento: null, filtro_medicos: null } : {}),
      ...(tipo && TIPOS_POS.includes(tipo) && tipo !== 'pos_atendimento' ? { filtro_primeira_vez: primeiraVez || null } : {}),
      ...(tipo === 'nps' ? { intervalo_minimo_dias: iv, resposta_promotor: limparTexto(resp.promotor), resposta_neutro: limparTexto(resp.neutro), resposta_detrator: limparTexto(resp.detrator) } : {}),
    }
    setSalvando(true)
    const { error } = regra
      ? await supabase.from('whatsapp_automacoes' as any).update(dados).eq('id', regra.id)
      : await supabase.from('whatsapp_automacoes' as any).insert({ ...dados, company_id: companyId, tipo, ordem: 10 })
    setSalvando(false)
    if (error) { toast.error(msgErro(error)); return }
    toast.success('Regra salva.'); onSalvo()
  }
  const restaurar = async () => {
    if (!regra) return
    const { data, error } = await supabase.rpc('whatsapp_automacao_restaurar' as any, { p_id: regra.id })
    if (error || data !== 'OK') { toast.error('Não foi possível restaurar.'); return }
    toast.success('Padrão restaurado (regra desativada).'); onSalvo()
  }
  const remover = async () => {
    if (!regra) return
    const { error } = await supabase.from('whatsapp_automacoes' as any).delete().eq('id', regra.id)
    if (error) toast.error('Não foi possível excluir.'); else { toast.success('Regra excluída.'); onSalvo() }
  }
  const testar = async () => {
    const num = foneTeste.replace(/\D/g, '')
    if (num.length < 10) { toast.error('Digite DDD + número.'); return }
    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('whatsapp-instancia', {
      body: { acao: 'enviar_teste', tipo_teste: 'regra', texto: limparTexto(texto), incluir_aviso_saida: aviso, numero_destino: num },
    })
    setEnviando(false)
    const d = data as any
    if (error || !d?.ok) toast.error(d?.mensagem ?? 'Não foi possível enviar o teste.')
    else toast.success(`Teste enviado por ${d.dados?.instancia_apelido ?? 'número conectado'}.`)
  }
  const inserirVar = (v: string) => setTexto(t => (t + (t.endsWith(' ') || !t ? '' : ' ') + v).slice(0, 1000))
  const toggle = (lst: string[], v: string) => lst.includes(v) ? lst.filter(x => x !== v) : [...lst, v]

  return (
    <Sheet open={!!alvo} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{regra ? 'Editar regra' : 'Nova regra'}</SheetTitle></SheetHeader>
        {!tipo ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Escolha o tipo da regra:</p>
            {TIPOS.map(t => (
              <button key={t} onClick={() => preencher(t)} className="w-full rounded-xl border border-border p-4 text-left hover:bg-muted">
                <p className="font-medium text-foreground">{TIPO_AUTOMACAO_LABEL[t]}</p>
                <p className="text-xs text-muted-foreground">{DESCR[t]}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-4 pb-6">
            <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium text-foreground">{TIPO_AUTOMACAO_LABEL[tipo]}</p></div>
            <label className="block text-sm text-foreground">Nome
              <Input value={nome} maxLength={80} onChange={e => setNome(e.target.value)} className="mt-1 h-11" />
            </label>
            {tipo === 'aniversario' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Horário de envio</span>
                  <Input type="time" value={horario || '09:00'} onChange={e => setHorario(e.target.value)} className="h-11 w-32" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Apenas maiores de 18 anos</span>
                  <Switch checked={adultos} onCheckedChange={setAdultos} />
                </div>
                <label className="block text-sm text-foreground">Atendido nos últimos (meses)
                  <Input type="number" min={1} max={120} value={meses} onChange={e => setMeses(e.target.value)} className="mt-1 h-11 w-28" />
                </label>
                <p className="text-xs text-muted-foreground">Uma vez por ano. Se não sair até 23:59 do dia, é cancelada.</p>
              </div>
            ) : <>
            <div>
              <p className="text-sm text-foreground">Quando enviar</p>
              <div className="mt-1 flex items-center gap-2">
                <Input type="number" min={0} value={valor} onChange={e => setValor(e.target.value)} className="h-11 w-24" />
                <select value={unid} onChange={e => setUnid(e.target.value as Unidade)} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="minutos">minutos</option><option value="horas">horas</option><option value="dias">dias</option>
                </select>
                <span className="text-sm text-muted-foreground">{tipo === 'pre_atendimento' ? 'antes do atendimento' : TIPOS_POS.includes(tipo) ? 'depois de finalizar' : 'depois de criar'}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Horário fixo (opcional)</span>
                <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} className="h-11 w-32" />
                {horario && <Button variant="ghost" size="sm" onClick={() => setHorario('')}>Limpar</Button>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Envia {Number.isFinite(minutos) ? descreverQuando(tipo, minutos, horario || null) : '—'} (horário de Fortaleza).</p>
            </div>
            <div>
              <p className="text-sm text-foreground">Tipos de atendimento <span className="text-xs text-muted-foreground">(nenhum = todos)</span></p>
              <div className="mt-1 flex flex-wrap gap-2">
                {TIPOS_ATEND.map(x => (
                  <button key={x} onClick={() => setFTipos(l => toggle(l, x))}
                    className={`h-9 rounded-full border px-3 text-sm ${fTipos.includes(x) ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>{x}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-foreground">Médicos <span className="text-xs text-muted-foreground">(nenhum = todos)</span></p>
              <div className="mt-1 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {medicos.map(m => (
                  <button key={m.id} onClick={() => setFMed(l => toggle(l, m.id))}
                    className={`h-9 rounded-full border px-3 text-sm ${fMed.includes(m.id) ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>{m.name}</button>
                ))}
                {medicos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum médico cadastrado.</p>}
              </div>
            </div>
            {TIPOS_POS.includes(tipo) && tipo !== 'pos_atendimento' && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Só para pacientes de 1ª vez</span>
                <Switch checked={primeiraVez} onCheckedChange={setPrimeiraVez} />
              </div>
            )}
            {tipo === 'nps' && (
              <label className="block text-sm text-foreground">Intervalo mínimo entre pesquisas (dias)
                <Input type="number" min={1} max={730} value={intervalo} onChange={e => setIntervalo(e.target.value)} className="mt-1 h-11 w-28" />
              </label>
            )}
            </>}
            <div>
              <p className="text-sm text-foreground">Texto</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {[...VARIAVEIS_MODELO, ...(relac ? VARIAVEIS_RELACIONAMENTO : [])].map(v => (
                  <button key={v.chave} title={v.desc} onClick={() => inserirVar(v.chave)} className="rounded-full bg-muted px-2 py-1 text-[11px] text-foreground">{v.chave}</button>
                ))}
              </div>
              <Textarea rows={6} maxLength={1000} value={texto} onChange={e => setTexto(e.target.value)} className="mt-2" />
              <p className="text-right text-[11px] text-muted-foreground">{texto.length}/1000</p>
              {desconhecidas.length > 0 && <p className="text-xs text-warning">Variável desconhecida: {desconhecidas.join(', ')} (será enviada como está).</p>}
              {marcador && <p className="text-xs text-warning">Edite as orientações antes de ativar.</p>}
              {falta && <p className="text-xs text-warning">Preencha o link de {LINK_LABEL[falta]} na seção Links antes de ativar.</p>}
            </div>
            {tipo === 'nps' && (
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">Respostas automáticas à nota</p>
                <p className="text-xs text-muted-foreground">Saem logo após a nota, sem contar no limite. A frase com {'{link_google}'} some quando não há link do Google.</p>
                {([['promotor', 'Nota 9 ou 10'], ['neutro', 'Nota 7 ou 8'], ['detrator', 'Nota de 0 a 6']] as const).map(([k, l]) => (
                  <label key={k} className="block text-xs text-muted-foreground">{l}
                    <Textarea rows={3} maxLength={1000} value={resp[k]} onChange={e => setResp(x => ({ ...x, [k]: e.target.value }))} className="mt-1 text-sm text-foreground" />
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Incluir botão para parar de receber</span>
              <Switch aria-label="Incluir botão para parar de receber" checked={aviso} onCheckedChange={setAviso} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Regra ativa</span>
              <Switch checked={ativo} onCheckedChange={v => { if (v && marcador) { toast.error('Edite as orientações antes de ativar.'); return } if (v && falta) { toast.error(msgLink(falta)); return } setAtivo(v) }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pré-visualização (dados de exemplo)</p>
              <div className="mt-1 rounded-xl bg-muted p-3">
                <div className="ml-auto max-w-[90%] whitespace-pre-wrap rounded-lg bg-background p-3 text-sm text-foreground shadow-sm">{preview}</div>
                {aviso && <Button type="button" variant="outline" tabIndex={-1} aria-disabled="true" className="mt-1 h-10 w-full cursor-default bg-background text-primary shadow-sm">{BOTAO_SAIR}</Button>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void salvar()} disabled={salvando} className="h-11 gradient-bg text-primary-foreground">{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              {regra?.padrao && <Button variant="outline" className="h-11" onClick={() => void restaurar()}><RotateCcw className="mr-2 h-4 w-4" />Restaurar padrão</Button>}
              {regra && !regra.padrao && <Button variant="ghost" className="h-11 text-destructive" onClick={() => setExcluir(true)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>}
            </div>
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-sm font-medium text-foreground">Enviar teste desta regra</p>
              <p className="text-xs text-muted-foreground">Usa dados fictícios (Maria Exemplo) e o texto atual, mesmo sem salvar.{tipo === 'nps' ? ' Responder ao teste não registra nota.' : ''}</p>
              <div className="flex gap-2">
                <Input inputMode="tel" placeholder="(84) 99999-9999" value={foneTeste} onChange={e => setFoneTeste(e.target.value)} className="h-11" />
                <Button variant="outline" className="h-11" disabled={enviando} onClick={() => void testar()}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              </div>
            </div>
          </div>
        )}
        <AlertDialog open={excluir} onOpenChange={setExcluir}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir esta regra?</AlertDialogTitle>
              <AlertDialogDescription>Mensagens já programadas continuam na fila.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => void remover()}>Excluir</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
