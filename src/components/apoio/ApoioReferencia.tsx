import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, BookOpen, Download, FileUp, History, Loader2, RefreshCw, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const db = supabase as any
const brl = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataHora = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const dataBR = (s: string) => s.split('-').reverse().join('/')

async function paginar<T>(q: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

interface Resumo { catalogo_total: number; catalogo_atualizado_em: string | null; preco_vigente_desde: string | null; preco_ficticio: boolean; alertas_abertos: number }

/* ------------------------------ Catálogo ------------------------------ */

export interface CatalogoInfo { ultima: { created_at: string; total_arquivo: number; auto: boolean; usuario: string | null } | null; falha: { motivo: string; em: string } | null }

export async function carregarCatalogoInfo(apoioIds: string[]): Promise<Record<string, CatalogoInfo>> {
  const out: Record<string, CatalogoInfo> = {}
  if (!apoioIds.length) return out
  const [{ data: syncs }, { data: curs }] = await Promise.all([
    supabase.from('apoio_catalogo_sincronizacao').select('apoio_id, created_at, total_arquivo, executado_por').in('apoio_id', apoioIds).order('created_at', { ascending: false }).limit(200),
    supabase.from('apoio_cursor').select('apoio_id, ultimo_erro, ultimo_erro_em, ultimo_sucesso').eq('rotina', 'catalogo').in('apoio_id', apoioIds),
  ])
  const uids = [...new Set((syncs || []).map((s: any) => s.executado_por).filter(Boolean))]
  const { data: profs } = uids.length ? await supabase.from('profiles').select('id, full_name').in('id', uids) : { data: [] as any[] }
  const nome = new Map((profs || []).map((p: any) => [p.id, p.full_name]))
  for (const id of apoioIds) {
    const s: any = (syncs || []).find((x: any) => x.apoio_id === id)
    const c: any = (curs || []).find((x: any) => x.apoio_id === id)
    out[id] = {
      ultima: s ? { created_at: s.created_at, total_arquivo: s.total_arquivo, auto: !s.executado_por, usuario: s.executado_por ? (nome.get(s.executado_por) || 'usuário') : null } : null,
      falha: c?.ultimo_erro && (!c.ultimo_sucesso || String(c.ultimo_erro_em) > String(c.ultimo_sucesso)) ? { motivo: c.ultimo_erro, em: c.ultimo_erro_em } : null,
    }
  }
  return out
}

export function CatalogoInfoLinha({ info }: { info?: CatalogoInfo }) {
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>Atualização automática: todo dia às 02:00</p>
      <p>Última atualização: {info?.ultima ? `${dataHora(info.ultima.created_at)} — ${info.ultima.auto ? 'automática' : `manual por ${info.ultima.usuario}`} — ${info.ultima.total_arquivo.toLocaleString('pt-BR')} exames` : 'nunca'}</p>
      {info?.falha && <span title={info.falha.motivo} className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-foreground"><AlertTriangle className="h-3 w-3 text-warning" />Última atualização automática falhou: {info.falha.motivo}</span>}
    </div>
  )
}

type ResCat = { atualizado_em: string; total: number; novos?: number; alterados?: number; desativados?: number; terceirizados_afetados: number; alertas: string[] }

export function CatalogoUploadDialog({ apoio, open, onClose, onDone }: { apoio: { id: string; nome: string } | null; open: boolean; onClose: () => void; onDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<'auto' | 'manual' | null>(null)
  const [res, setRes] = useState<ResCat | null>(null)
  const [podeAuto, setPodeAuto] = useState<boolean | null>(null)
  const [info, setInfo] = useState<CatalogoInfo | undefined>()
  const trava = useRef(false)

  const carregarInfo = useCallback(async () => {
    if (!apoio) return
    const m = await carregarCatalogoInfo([apoio.id]); setInfo(m[apoio.id])
  }, [apoio])

  useEffect(() => {
    if (!open || !apoio) return
    setFile(null); setRes(null); setPodeAuto(null); void carregarInfo()
    ;(async () => {
      const { data } = await supabase.from('apoio_laboratorio').select('conector, cod_lab, senha_secret_id, senha_cifrada').eq('id', apoio.id).maybeSingle()
      const d: any = data
      setPodeAuto(!!d && d.conector === 'pardini' && !!d.cod_lab && !!(d.senha_secret_id || d.senha_cifrada))
    })()
  }, [open, apoio, carregarInfo])

  const concluir = (data: ResCat) => {
    setRes(data)
    toast.success(`Catálogo atualizado: ${data.total.toLocaleString('pt-BR')} exames lidos`, { description: `${data.novos ?? 0} novos, ${data.alterados ?? 0} alterados, ${data.desativados ?? 0} desativados` })
    void carregarInfo(); onDone?.()
  }
  const erroDe = async (data: any, error: any, padrao: string) => {
    let msg = data?.error
    try { msg = msg || (await error?.context?.json())?.error } catch { /* */ }
    return msg || padrao
  }

  const baixar = async () => {
    if (!apoio || trava.current) return
    trava.current = true; setBusy('auto')
    try {
      const { data, error } = await supabase.functions.invoke('apoio-catalogo', { body: { apoio_id: apoio.id } })
      if (error || !data?.ok) throw new Error(await erroDe(data, error, 'Não foi possível baixar do Pardini agora. Tente de novo ou envie o arquivo manualmente.'))
      concluir(data)
    } catch (e: any) {
      toast.error(e.message); void carregarInfo()
    } finally { trava.current = false; setBusy(null) }
  }

  const enviar = async () => {
    if (!file || !apoio || trava.current) return
    trava.current = true; setBusy('manual')
    try {
      const fd = new FormData()
      fd.append('apoio_id', apoio.id)
      fd.append('file', file)
      const { data, error } = await supabase.functions.invoke('apoio-catalogo-sincronizar', { body: fd })
      if (error || !data?.ok) throw new Error(await erroDe(data, error, 'Falha ao atualizar o catálogo'))
      concluir(data)
    } catch (e: any) {
      toast.error('Não foi possível atualizar o catálogo', { description: e.message })
    } finally { trava.current = false; setBusy(null) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Atualizar catálogo do apoio — {apoio?.nome}</DialogTitle></DialogHeader>
        {!res ? (
          <div className="space-y-4 text-sm">
            <CatalogoInfoLinha info={info} />
            <div className="space-y-2 rounded-xl border border-border p-4">
              <p className="font-medium text-foreground">Baixar do Pardini agora</p>
              <p className="text-xs text-muted-foreground">Baixa o tabexalhpV2.xml direto do Pardini usando o código e a senha da integração deste apoio. Só leitura.</p>
              <button onClick={baixar} disabled={!podeAuto || !!busy} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy === 'auto' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {busy === 'auto' ? 'Baixando…' : 'Baixar do Pardini agora'}
              </button>
              {podeAuto === false && <p className="text-xs text-muted-foreground">Cadastre o código e a senha do Pardini na integração deste apoio.</p>}
            </div>
            <div className="space-y-2 rounded-xl border border-border p-4">
              <p className="font-medium text-foreground">Enviar arquivo manualmente</p>
              <p className="text-xs text-muted-foreground">Use quando o Pardini estiver fora do ar ou o apoio não tiver integração. Exames que sumirem do arquivo ficam inativos (nunca apagados).</p>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-4 text-primary hover:bg-muted/40">
                <FileUp className="h-5 w-5" /> {file ? file.name : 'Escolher arquivo XML'}
                <input type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <button onClick={enviar} disabled={!file || !!busy} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-60">{busy === 'manual' && <Loader2 className="h-4 w-4 animate-spin" />} Enviar arquivo</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="font-medium">Catálogo atualizado em {dataHora(res.atualizado_em)}.</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {([['Lidos', res.total], ['Novos', res.novos ?? 0], ['Alterados', res.alterados ?? 0], ['Desativados', res.desativados ?? 0]] as const).map(([l, v]) => (
                <div key={l} className="rounded-xl border border-border p-2"><p className="text-lg font-bold text-foreground">{Number(v).toLocaleString('pt-BR')}</p><p className="text-xs text-muted-foreground">{l}</p></div>
              ))}
            </div>
            <p className="text-muted-foreground">{res.terceirizados_afetados} exames terceirizados afetados.</p>
            {res.alertas.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
                {res.alertas.map((a, i) => <li key={i} className="flex gap-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />{a}</li>)}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <button onClick={onClose} disabled={!!busy} className="rounded-xl border border-border px-4 py-2 text-sm">{res ? 'Fechar' : 'Cancelar'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------ Preços ------------------------------ */

interface LinhaOk { codigo: string; preco: number; prazo: number | null; inicio: string; fim: string | null; ficticio: boolean }
interface LinhaErro { linha: number; codigo: string; motivo: string }
interface Previa {
  total: number; ok: LinhaOk[]; erros: LinhaErro[]; ficticio: boolean
  novosPrecos: { exame: string; codigo: string; antes: number | null; depois: number }[]
  semPreco: { exame: string; codigo: string }[]
}

function splitCsv(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true
    else if (c === ';') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(s => s.trim())
}
function parseData(s: string): string | null | 'invalida' {
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) { const b = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (b) m = [s, b[3], b[2], b[1]] as any }
  if (!m) return 'invalida'
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  return isNaN(Date.parse(iso)) ? 'invalida' : iso
}
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function PrecoImportDialog({ apoio, open, onClose, onDone }: { apoio: { id: string; nome: string; company_id: string } | null; open: boolean; onClose: () => void; onDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [confFict, setConfFict] = useState(false)
  useEffect(() => { if (open) { setFile(null); setPrevia(null); setConfFict(false) } }, [open])

  const analisar = async (f: File) => {
    if (!apoio) return
    setFile(f); setBusy(true); setPrevia(null)
    try {
      const txt = (await f.text()).replace(/^\uFEFF/, '')
      const linhas = txt.split(/\r?\n/)
      const head = splitCsv(linhas[0] || '').map(h => h.toLowerCase())
      const idx = (n: string) => head.indexOf(n)
      if (idx('codigo_apoio') < 0 || idx('preco') < 0) throw new Error('Cabeçalho inválido: esperado codigo_apoio;descricao;material;origem_admissivel;preco;prazo_dias_uteis;vigencia_inicio;vigencia_fim;FICTICIO')

      const [cat, dps, abertos] = await Promise.all([
        paginar<{ codigo: string }>((a, b) => db.from('apoio_catalogo_exame').select('codigo').eq('apoio_id', apoio.id).eq('ativo', true).range(a, b)),
        db.from('apoio_depara_exame').select('codigo_apoio, exame_id, exams(name)').eq('apoio_id', apoio.id).eq('ativo', true).then((r: any) => r.data || []),
        paginar<{ codigo: string; preco: number; vigencia_inicio: string }>((a, b) => db.from('apoio_preco').select('codigo, preco, vigencia_inicio').eq('apoio_id', apoio.id).is('vigencia_fim', null).range(a, b)),
      ])
      const codigos = new Set(cat.map(c => c.codigo))
      const atual = new Map(abertos.map(p => [p.codigo, p]))
      const ok: LinhaOk[] = []; const erros: LinhaErro[] = []; const vistos = new Set<string>()
      let total = 0
      for (let i = 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue
        total++
        const c = splitCsv(linhas[i])
        const get = (n: string) => (idx(n) >= 0 ? c[idx(n)] ?? '' : '')
        const codigo = get('codigo_apoio').toUpperCase()
        const err = (motivo: string) => erros.push({ linha: i + 1, codigo, motivo })
        if (!codigo) { err('Código vazio'); continue }
        if (codigos.size === 0) { err('Catálogo do apoio vazio: atualize o catálogo antes'); continue }
        if (!codigos.has(codigo)) { err('Código não existe no catálogo do apoio'); continue }
        if (vistos.has(codigo)) { err('Código repetido no arquivo'); continue }
        const preco = Number(get('preco').replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
        if (!get('preco') || !isFinite(preco) || preco < 0) { err('Preço inválido'); continue }
        const pz = (get('prazo_dias') || get('prazo_dias_uteis'))
        const prazo = pz ? Number(pz) : null
        if (pz && (!Number.isInteger(prazo) || (prazo as number) < 0)) { err('Prazo inválido'); continue }
        const ini = parseData(get('vigencia_inicio')); const fim = parseData(get('vigencia_fim'))
        if (ini === 'invalida') { err('Data de início da vigência inválida'); continue }
        if (fim === 'invalida') { err('Data de fim da vigência inválida'); continue }
        const inicio = ini || hojeISO()
        if (fim && fim < inicio) { err('Fim da vigência antes do início'); continue }
        const ant = atual.get(codigo)
        if (ant && ant.vigencia_inicio >= inicio) { err(`Já existe preço vigente desde ${dataBR(ant.vigencia_inicio)}; a nova vigência precisa começar depois`); continue }
        vistos.add(codigo)
        ok.push({ codigo, preco, prazo, inicio, fim, ficticio: get('ficticio').toUpperCase() === 'SIM' })
      }
      const okMap = new Map(ok.map(o => [o.codigo, o]))
      const novosPrecos: Previa['novosPrecos'] = []; const semPreco: Previa['semPreco'] = []
      for (const d of dps as any[]) {
        const exame = d.exams?.name || 'Exame'
        const o = okMap.get(d.codigo_apoio)
        if (o) novosPrecos.push({ exame, codigo: d.codigo_apoio, antes: atual.get(d.codigo_apoio)?.preco ?? null, depois: o.preco })
        else semPreco.push({ exame, codigo: d.codigo_apoio })
      }
      setPrevia({ total, ok, erros, ficticio: ok.some(o => o.ficticio), novosPrecos, semPreco })
    } catch (e: any) {
      toast.error('Não foi possível ler a tabela', { description: e.message })
      setFile(null)
    } finally { setBusy(false) }
  }

  const confirmar = async () => {
    if (!apoio || !previa || !file) return
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: imp, error } = await db.from('apoio_preco_importacao').insert({
        company_id: apoio.company_id, apoio_id: apoio.id, arquivo_nome: file.name.slice(0, 200),
        linhas_total: previa.total, linhas_ok: previa.ok.length, linhas_erro: previa.erros.length,
        erros: previa.erros, ficticia: previa.ficticio, importado_por: user?.id,
      }).select('id').single()
      if (error) throw error
      const rows = previa.ok.map(o => ({ company_id: apoio.company_id, apoio_id: apoio.id, codigo: o.codigo, preco: o.preco, prazo_dias: o.prazo, vigencia_inicio: o.inicio, vigencia_fim: o.fim, ficticio: o.ficticio, importacao_id: imp.id }))
      for (let k = 0; k < rows.length; k += 500) {
        const { error: e2 } = await db.from('apoio_preco').insert(rows.slice(k, k + 500))
        if (e2) throw e2
      }
      toast.success(`Tabela importada: ${rows.length} preços gravados`)
      onDone?.(); onClose()
    } catch (e: any) {
      const msg = String(e?.message || '')
      toast.error('Falha na importação', { description: msg.includes('row-level security') ? 'Você não tem permissão para esta ação.' : msg })
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar tabela de preços — {apoio?.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">CSV separado por <b>;</b> (UTF-8): codigo_apoio;descricao;material;origem_admissivel;preco;prazo_dias_uteis (ou prazo_dias);vigencia_inicio;vigencia_fim;FICTICIO. Cada preço vira uma nova vigência; a anterior é fechada, nunca sobrescrita.</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-4 text-primary hover:bg-muted/40">
            {busy && !previa ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />} {file ? file.name : 'Escolher arquivo CSV'}
            <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) analisar(f); e.target.value = '' }} />
          </label>
          {previa && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border p-2"><p className="text-lg font-semibold">{previa.total}</p><p className="text-[11px] text-muted-foreground">linhas</p></div>
                <div className="rounded-xl border border-border p-2"><p className="text-lg font-semibold text-success">{previa.ok.length}</p><p className="text-[11px] text-muted-foreground">válidas</p></div>
                <div className="rounded-xl border border-border p-2"><p className="text-lg font-semibold text-destructive">{previa.erros.length}</p><p className="text-[11px] text-muted-foreground">com erro</p></div>
              </div>
              <div>
                <p className="font-medium">Exames terceirizados com preço novo: {previa.novosPrecos.length}</p>
                {previa.novosPrecos.length > 0 && <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border text-xs">{previa.novosPrecos.map((p, i) => <li key={i} className="flex justify-between border-b border-border px-3 py-1.5 last:border-0"><span>{p.exame} <span className="text-muted-foreground">({p.codigo})</span></span><span>{brl(p.antes)} → <b>{brl(p.depois)}</b></span></li>)}</ul>}
              </div>
              <div>
                <p className="font-medium">Exames terceirizados <b>sem preço</b> nesta tabela: {previa.semPreco.length}</p>
                {previa.semPreco.length > 0 && <ul className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border text-xs">{previa.semPreco.map((p, i) => <li key={i} className="border-b border-border px-3 py-1.5 last:border-0">{p.exame} <span className="text-muted-foreground">({p.codigo})</span></li>)}</ul>}
              </div>
              {previa.erros.length > 0 && (
                <div>
                  <p className="font-medium text-destructive">Erros (não serão gravados)</p>
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-destructive/30 text-xs">{previa.erros.map((e, i) => <li key={i} className="border-b border-border px-3 py-1.5 last:border-0">Linha {e.linha} · {e.codigo || '(vazio)'} — {e.motivo}</li>)}</ul>
                </div>
              )}
              {previa.ficticio && (
                <label className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs">
                  <input type="checkbox" className="mt-0.5 accent-primary" checked={confFict} onChange={e => setConfFict(e.target.checked)} />
                  <span><b>TABELA FICTÍCIA.</b> Esta tabela contém preços marcados como fictícios. Confirmo que sei que estes valores não são reais.</span>
                </label>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={confirmar} disabled={!previa || busy || previa.ok.length === 0 || (previa.ficticio && !confFict)} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy && previa && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar importação
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------ Histórico ------------------------------ */

function baixarErros(imp: any) {
  const linhas = ['linha;codigo;motivo', ...((imp.erros || []) as LinhaErro[]).map(e => `${e.linha};${e.codigo};"${String(e.motivo).replace(/"/g, '""')}"`)]
  const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `erros_${(imp.arquivo_nome || 'importacao').replace(/\.csv$/i, '')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ------------------------------ Seção do drawer ------------------------------ */

export function ReferenciaSection({ apoio, podeGerenciar, moduloLiberado }: { apoio: { id: string; nome: string; company_id: string; conector: string }; podeGerenciar: boolean; moduloLiberado: boolean }) {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [imps, setImps] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [dlg, setDlg] = useState<'cat' | 'preco' | null>(null)
  const [verHist, setVerHist] = useState(false)
  const [remover, setRemover] = useState<{ txt: string; busy: boolean; bloq: any[] | null } | null>(null)

  const load = useCallback(async () => {
    const [r, i, a] = await Promise.all([
      db.rpc('apoio_referencia_resumo', { _apoio_id: apoio.id }),
      db.from('apoio_preco_importacao').select('id, arquivo_nome, linhas_total, linhas_ok, linhas_erro, erros, ficticia, removida_em, created_at').eq('apoio_id', apoio.id).order('created_at', { ascending: false }).limit(20),
      db.from('apoio_catalogo_alerta').select('id, mensagem, created_at').eq('apoio_id', apoio.id).eq('lido', false).order('created_at', { ascending: false }).limit(20),
    ])
    setResumo(r.data); setImps(i.data || []); setAlertas(a.data || [])
  }, [apoio.id])
  useEffect(() => { load() }, [load])

  const marcarLido = async (id: string) => { await db.from('apoio_catalogo_alerta').update({ lido: true }).eq('id', id); load() }
  const pode = podeGerenciar && moduloLiberado
  const removerFicticia = async () => {
    if (!remover) return
    setRemover({ ...remover, busy: true })
    const { data, error } = await db.rpc('apoio_remover_tabela_ficticia', { _apoio_id: apoio.id })
    if (error) { toast.error('Não foi possível remover', { description: error.message }); setRemover({ ...remover, busy: false }); return }
    if (!data?.ok) { setRemover({ ...remover, busy: false, bloq: data?.exames || [] }); return }
    toast.success(`Tabela fictícia removida: ${data.precos_removidos} preços apagados`)
    setRemover(null); load()
  }
  const btn = 'flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50'

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Referência do apoio</h3>
      {resumo?.preco_ficticio && <div className="rounded-lg bg-warning/20 px-3 py-2 text-center text-xs font-bold tracking-wide text-warning-foreground border border-warning/50">TABELA FICTÍCIA</div>}
      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" />Catálogo: {resumo ? `${resumo.catalogo_total.toLocaleString('pt-BR')} exames` : '…'}{resumo?.catalogo_atualizado_em ? `, atualizado em ${dataHora(resumo.catalogo_atualizado_em)}` : resumo ? ', nunca atualizado' : ''}</p>
        <p className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" />Tabela de preços: {resumo?.preco_vigente_desde ? `vigente desde ${dataBR(resumo.preco_vigente_desde)}` : 'nenhuma importada'}</p>
      </div>
      {alertas.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
          {alertas.map(a => <li key={a.id} className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" /><span className="flex-1">{a.mensagem}</span>{pode && <button type="button" onClick={() => marcarLido(a.id)} className="text-primary hover:underline">Ciente</button>}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {apoio.conector === 'pardini' && <button type="button" disabled={!pode} onClick={() => setDlg('cat')} className={btn}><RefreshCw className="h-3.5 w-3.5" />Atualizar catálogo do apoio</button>}
        <button type="button" disabled={!pode} onClick={() => setDlg('preco')} className={btn}><FileUp className="h-3.5 w-3.5" />Importar tabela de preços</button>
        {resumo?.preco_ficticio && <button type="button" disabled={!pode} onClick={() => setRemover({ txt: '', busy: false, bloq: null })} className={btn + ' text-destructive'}><Trash2 className="h-3.5 w-3.5" />Remover tabela fictícia</button>}
        <button type="button" onClick={() => setVerHist(v => !v)} className={btn}><History className="h-3.5 w-3.5" />Histórico de importações ({imps.length})</button>
      </div>
      {verHist && (
        imps.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma importação de preços.</p> : (
          <ul className="divide-y divide-border rounded-lg border border-border text-xs">
            {imps.map(i => (
              <li key={i.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{i.arquivo_nome || 'arquivo'} {i.ficticia && <span className="ml-1 rounded bg-warning/20 px-1.5 text-[10px] font-bold">FICTÍCIA</span>}{i.removida_em && <span className="ml-1 rounded bg-muted px-1.5 text-[10px] font-bold">REMOVIDA em {dataHora(i.removida_em)}</span>}</p>
                  <p className="text-muted-foreground">{dataHora(i.created_at)} · {i.linhas_ok}/{i.linhas_total} gravadas · {i.linhas_erro} erros</p>
                </div>
                {i.linhas_erro > 0 && <a href="#" onClick={e => { e.preventDefault(); baixarErros(i) }} className="flex items-center gap-1 text-primary hover:underline"><Download className="h-3.5 w-3.5" />Erros</a>}
              </li>
            ))}
          </ul>
        )
      )}
      <Dialog open={!!remover} onOpenChange={o => !o && !remover?.busy && setRemover(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Remover tabela fictícia?</DialogTitle></DialogHeader>
          {remover?.bloq ? (
            <div className="space-y-2 text-sm">
              <p className="text-destructive font-medium">Remoção bloqueada: estes exames já transmitidos usaram preço fictício sem a marcação de fictício.</p>
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-border text-xs">{remover.bloq.map((b: any) => <li key={b.id} className="border-b border-border px-3 py-1.5 last:border-0">{b.exame || 'Exame'} ({b.codigo}) · {brl(b.custo)} · {b.status}</li>)}</ul>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">Apaga somente os preços marcados como fictícios deste apoio. O histórico de importações é mantido (marcado como removido) e os custos já gravados como fictícios continuam como estão.</p>
              <div><label className="text-xs font-medium text-muted-foreground">Digite REMOVER para confirmar</label><input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={remover?.txt || ''} onChange={e => remover && setRemover({ ...remover, txt: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setRemover(null)} disabled={remover?.busy} className="rounded-xl border border-border px-4 py-2 text-sm">{remover?.bloq ? 'Fechar' : 'Cancelar'}</button>
            {!remover?.bloq && <button onClick={removerFicticia} disabled={remover?.txt !== 'REMOVER' || remover?.busy} className="flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60">{remover?.busy && <Loader2 className="h-4 w-4 animate-spin" />} Remover</button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CatalogoUploadDialog apoio={apoio} open={dlg === 'cat'} onClose={() => setDlg(null)} onDone={load} />
      <PrecoImportDialog apoio={apoio} open={dlg === 'preco'} onClose={() => setDlg(null)} onDone={load} />
    </section>
  )
}
