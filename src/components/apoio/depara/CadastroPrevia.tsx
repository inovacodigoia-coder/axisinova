import { useState } from 'react'
import { toast } from 'sonner'
import { db, norm } from './deparaUtils'

export const CHIPS = ['Sangue Total', 'Soro', 'Plasma', 'Urina', 'Fezes', 'Secreção', 'Líquor', 'Swab']
const NOVO = '__novo'

export interface Cadastro {
  materiais_exame: string[]
  catalogo: { materiais: string[]; conservantes: string[]; info_comp: string[] } | null
  metodos: { codigo_formato: string; metodo: string | null; ultima_liberacao: string | null }[]
  metodologias: { id: string; name: string; description: string | null }[]
  prazo: { prazo_dias: number | null; ficticio: boolean } | null
  /** Cadastro de Materiais e De/Para de material do apoio (carregado no cliente) */
  ctx?: MatCtx
}
export interface MatCtx {
  materiais: { id: string; nome: string; recipiente_id: string | null; ativo: boolean }[]
  recipientes: { id: string; nome: string; sigla: string; aditivo: string | null; ativo: boolean }[]
  depara: { material_apoio: string; material_id: string }[]
}
export interface MatLinha { pardini: string; alvo: string; novo: string; novoRec: string; incluir: boolean; jaTem: boolean; semEquivalente: boolean; materialId: string | null; viaDepara: boolean }

/** Carrega o cadastro de Materiais + De/Para de material do apoio. */
export async function carregarMatCtx(companyId: string, apoioId: string): Promise<MatCtx> {
  const [m, r, d] = await Promise.all([
    db.from('lab_material').select('id, nome, recipiente_id, ativo').eq('company_id', companyId),
    db.from('lab_recipiente').select('id, nome, sigla, aditivo, ativo').eq('company_id', companyId).order('ordem'),
    db.from('apoio_depara_material').select('material_apoio, material_id').eq('apoio_id', apoioId),
  ])
  return { materiais: m.data ?? [], recipientes: r.data ?? [], depara: d.data ?? [] }
}

/** Tubo sugerido pelo CONSERVANTE do Pardini (só sugestão). */
export function sugerirRecipiente(ctx: MatCtx | undefined, conservantes: string[] = []): string {
  if (!ctx) return ''
  for (const c of conservantes) {
    const n = norm(c); if (!n) continue
    const r = ctx.recipientes.find(x => x.ativo && [x.nome, x.sigla, x.aditivo ?? ''].some(t => { const tt = norm(t); return tt && (tt.includes(n) || n.includes(tt)) }))
    if (r) return r.id
  }
  return ''
}

/** Cria materiais novos (com tubo) e grava o De/Para de material. Devolve os nomes a adicionar no laudo. */
export async function gravarMateriais(companyId: string, apoioId: string, ls: MatLinha[], ctx?: MatCtx): Promise<string[]> {
  const nomes: string[] = []
  for (const l of ls) {
    if (!(l.incluir || l.jaTem)) continue
    let id = l.materialId, nome = l.alvo
    if (l.alvo === NOVO) {
      nome = l.novo.trim()
      const ja = ctx?.materiais.find(m => norm(m.nome) === norm(nome))
      if (ja) id = ja.id
      else {
        const { data, error } = await db.from('lab_material').insert({ company_id: companyId, nome, recipiente_id: l.novoRec }).select('id').single()
        if (error) throw new Error(`[AJUSTE] Falha ao gravar o material ${nome}`)
        id = data.id
      }
    } else if (!id) id = ctx?.materiais.find(m => norm(m.nome) === norm(nome))?.id ?? null
    if (id && !l.viaDepara) {
      await db.from('apoio_depara_material').upsert({ company_id: companyId, apoio_id: apoioId, material_apoio: l.pardini, material_id: id }, { onConflict: 'apoio_id,material_apoio', ignoreDuplicates: true })
    }
    if (l.incluir && !l.jaTem && nome) nomes.push(nome)
  }
  return nomes
}
export interface MetEstado { sugerido: string; outros: string[]; casada: string | null; incluir: boolean; opcao: '' | 'criar' | 'existente' | 'nao'; existente: string; nome: string; desc: string; aberto: boolean }

export function montarMateriais(c: Cadastro): MatLinha[] {
  const exame = Array.isArray(c.materiais_exame) ? c.materiais_exame : []
  const cadMats = c.ctx?.materiais.filter(m => m.ativo) ?? []
  const sug = sugerirRecipiente(c.ctx, c.catalogo?.conservantes ?? [])
  return (c.catalogo?.materiais ?? []).map(p => {
    const dp = c.ctx?.depara.find(d => norm(d.material_apoio) === norm(p))
    const viaDp = dp ? c.ctx!.materiais.find(m => m.id === dp.material_id) : undefined
    const porNome = viaDp ?? cadMats.find(m => norm(m.nome) === norm(p))
    const alvo = porNome?.nome ?? (c.ctx ? '' : (CHIPS.find(o => norm(o) === norm(p)) ?? ''))
    const jaTem = !!alvo && exame.some(e => norm(e) === norm(alvo))
    return { pardini: p, alvo, novo: '', novoRec: sug, incluir: !!alvo && !jaTem, jaTem, semEquivalente: !alvo, materialId: porNome?.id ?? null, viaDepara: !!viaDp }
  })
}

const nomeCurto = (t: string) => {
  if (t.length <= 60) return t
  const corte = t.split(/\s[-–(,;]\s?|\s\(/)[0]
  return (corte.length <= 60 ? corte : t.slice(0, 60).replace(/\s\S*$/, '')).trim()
}

export function montarMetodo(c: Cadastro): MetEstado | null {
  const rec = c.metodos[0]
  const sugerido = (rec?.metodo || '').trim()
  if (!sugerido) return null
  const outros = [...new Set(c.metodos.map(m => (m.metodo || '').trim()).filter(m => m && norm(m) !== norm(sugerido)))]
  const casada = c.metodologias.find(m => norm(m.name) === norm(sugerido))?.name ?? null
  return { sugerido, outros, casada, incluir: !!casada, opcao: '', existente: '', nome: nomeCurto(sugerido), desc: sugerido.length > 60 ? sugerido : '', aberto: false }
}

/** Metodologia escolhida (null = não preencher). undefined = falta decidir. */
export function metodoFinal(m: MetEstado | null): string | null | undefined {
  if (!m) return null
  if (m.casada) return m.incluir ? m.casada : null
  if (m.opcao === 'nao') return null
  if (m.opcao === 'existente') return m.existente || undefined
  return undefined
}

export function materiaisFinal(ls: MatLinha[]) {
  return ls.filter(l => l.incluir && !l.jaTem).map(l => (l.alvo === NOVO ? l.novo.trim() : l.alvo)).filter(Boolean)
}

/** Mensagem de pendência de material (undefined = ok). */
export function faltaMaterial(ls: MatLinha[]): string | undefined {
  const l = ls.find(m => m.incluir && m.alvo === NOVO && (!m.novo.trim() || !m.novoRec))
  if (l) return !l.novo.trim() ? 'Dê um nome ao material novo' : `Escolha o tubo do material ${l.novo.trim()}`
}

export function CadastroPrevia({ cad, companyId, mats, setMats, met, setMet, onMetodologiaCriada }: {
  cad: Cadastro; companyId: string; mats: MatLinha[]; setMats: (f: (l: MatLinha[]) => MatLinha[]) => void
  met: MetEstado | null; setMet: (m: MetEstado | null) => void; onMetodologiaCriada: (m: { id: string; name: string; description: string | null }) => void
}) {
  const [salvando, setSalvando] = useState(false)
  const opcoes = cad.ctx ? cad.ctx.materiais.filter(x => x.ativo).map(x => x.nome) : [...new Set([...CHIPS, ...(cad.materiais_exame || [])])]
  const setMat = (i: number, p: Partial<MatLinha>) => setMats(ls => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const m = met

  const criarMetodologia = async () => {
    if (!m || !m.nome.trim()) return toast.error('Dê um nome à metodologia')
    setSalvando(true)
    const existente = cad.metodologias.find(x => norm(x.name) === norm(m.nome))
    if (existente) { setMet({ ...m, opcao: 'existente', existente: existente.name, aberto: false }); setSalvando(false); return }
    const { data, error } = await db.from('lab_methods').insert({ company_id: companyId, name: m.nome.trim(), description: m.desc.trim() || null, is_active: true }).select('id, name, description').single()
    setSalvando(false)
    if (error) return toast.error('Não foi possível criar a metodologia', { description: error.message })
    onMetodologiaCriada(data)
    setMet({ ...m, opcao: 'existente', existente: data.name, aberto: false })
    toast.success('Metodologia criada em Configurações › Metodologias')
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="bg-muted/50 px-3 py-2 font-semibold">Dados do cadastro vindos do Pardini</div>
      <div className="space-y-3 p-3">
        <div>
          <p className="mb-1 font-medium">Materiais aceitos (só adiciona; nunca remove os que o exame já aceita)</p>
          {!mats.length ? <p className="text-muted-foreground">O catálogo do Pardini não tem material para este exame.</p> : (
            <div className="space-y-1.5">
              {mats.map((l, i) => (
                <div key={l.pardini} className={`flex flex-wrap items-center gap-2 ${!l.incluir && !l.jaTem ? 'opacity-60' : ''}`}>
                  <input type="checkbox" disabled={l.jaTem} checked={l.jaTem || l.incluir} onChange={e => setMat(i, { incluir: e.target.checked })} aria-label="Aplicar" />
                  <span className="font-medium">{l.pardini}</span>
                  {l.jaTem ? <span className="text-muted-foreground">→ {l.alvo} (já aceito)</span>
                    : !l.semEquivalente ? <span className="text-muted-foreground">→ adicionar {l.alvo}{l.viaDepara ? ' (De/Para de material)' : ''}</span>
                    : <>
                        <span className="text-warning">sem equivalente:</span>
                        <select value={l.alvo} onChange={e => setMat(i, { alvo: e.target.value, incluir: !!e.target.value, materialId: cad.ctx?.materiais.find(x => x.nome === e.target.value)?.id ?? null })} className="rounded border border-input bg-background px-2 py-1">
                          <option value="">— usar material existente —</option>
                          {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
                          <option value={NOVO}>Criar material…</option>
                        </select>
                        {l.alvo === NOVO && <>
                          <input value={l.novo} onChange={e => setMat(i, { novo: e.target.value })} placeholder="Nome do material" className="rounded border border-input bg-background px-2 py-1" />
                          <select value={l.novoRec} onChange={e => setMat(i, { novoRec: e.target.value })} className="rounded border border-input bg-background px-2 py-1">
                            <option value="">— tubo (obrigatório) —</option>
                            {(cad.ctx?.recipientes ?? []).filter(r => r.ativo).map(r => <option key={r.id} value={r.id}>{r.nome} ({r.sigla})</option>)}
                          </select>
                        </>}
                      </>}
                </div>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-muted-foreground">
            Conservante: {cad.catalogo?.conservantes?.length ? cad.catalogo.conservantes.join(', ') : '—'} · Informações complementares: {cad.catalogo?.info_comp?.length ? cad.catalogo.info_comp.join(', ') : '—'}
          </p>
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-1 font-medium">Metodologia analítica (no laudo do Pardini)</p>
          {!m ? <p className="text-muted-foreground">O Pardini não informa método no formato mais recente; nada será sugerido.</p> : m.casada ? (
            <label className="flex items-center gap-2"><input type="checkbox" checked={m.incluir} onChange={e => setMet({ ...m, incluir: e.target.checked })} />{m.casada} <span className="text-muted-foreground">(já cadastrada)</span></label>
          ) : (
            <div className="space-y-1.5">
              <p>Metodologia nova: <span className="font-medium">{m.sugerido}</span></p>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5"><input type="radio" checked={m.opcao === 'criar'} onChange={() => setMet({ ...m, opcao: 'criar', aberto: true })} />Criar</label>
                <label className="flex items-center gap-1.5"><input type="radio" checked={m.opcao === 'existente'} onChange={() => setMet({ ...m, opcao: 'existente', aberto: false })} />Usar uma existente</label>
                <label className="flex items-center gap-1.5"><input type="radio" checked={m.opcao === 'nao'} onChange={() => setMet({ ...m, opcao: 'nao', aberto: false })} />Não preencher</label>
              </div>
              {m.opcao === 'criar' && (
                <div className="space-y-1.5 rounded-lg border border-border p-2">
                  <input value={m.nome} onChange={e => setMet({ ...m, nome: e.target.value })} placeholder="Nome" className="w-full rounded border border-input bg-background px-2 py-1" />
                  <textarea value={m.desc} onChange={e => setMet({ ...m, desc: e.target.value })} placeholder="Descrição" rows={2} className="w-full rounded border border-input bg-background px-2 py-1" />
                  <button onClick={criarMetodologia} disabled={salvando} className="rounded-lg border border-primary px-3 py-1 font-medium text-primary disabled:opacity-50">Salvar metodologia</button>
                </div>
              )}
              {m.opcao === 'existente' && (
                <select value={m.existente} onChange={e => setMet({ ...m, existente: e.target.value })} className="rounded border border-input bg-background px-2 py-1">
                  <option value="">— escolher —</option>
                  {cad.metodologias.map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                </select>
              )}
            </div>
          )}
          {m && m.outros.length > 0 && <p className="mt-1 text-muted-foreground">Outros formatos usam: {m.outros.join(' · ')}. No laudo impresso vale o método que vier no resultado.</p>}
        </div>

        <div className="border-t border-border pt-3">
          <p><span className="font-medium">Prazo do apoio:</span> {cad.prazo?.prazo_dias != null ? `${cad.prazo.prazo_dias} dia(s)${cad.prazo.ficticio ? ' — tabela fictícia' : ''}` : 'sem prazo cadastrado'}. <span className="text-muted-foreground">Só informativo: o "Prazo entrega" do exame não muda (a bancada do Pardini usa prazo do apoio + transporte).</span></p>
          <p className="mt-1"><span className="font-medium">Orientações ao paciente:</span> o Pardini não envia; confira o preparo no manual de exames do Pardini e preencha manualmente.</p>
        </div>
      </div>
    </div>
  )
}
