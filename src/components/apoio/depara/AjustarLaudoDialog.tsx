import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { db } from './deparaUtils'
import { montarAjuste, montarPayload, type Acao, type FormatoAjuste, type Linha, type Modo } from './ajusteLaudo'
import { CadastroPrevia, montarMateriais, montarMetodo, materiaisFinal, metodoFinal, type Cadastro, type MatLinha, type MetEstado } from './CadastroPrevia'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'

interface Laudo { id: string; code: string; name: string; padrao: boolean; parameters: any[]; bancadas: { id: string; name: string; tipo: string; apoio_id: string | null }[]; com_historico: string[] }
interface Dados { pode: boolean; bancada_apoio: { id: string; name: string } | null; laudos: Laudo[] }

const GRUPOS: { acao: Acao; titulo: string }[] = [
  { acao: 'reaproveitar', titulo: 'Reaproveitar' }, { acao: 'ajustar', titulo: 'Ajustar' }, { acao: 'criar', titulo: 'Criar' },
  { acao: 'excluir', titulo: 'Excluir' }, { acao: 'inativar', titulo: 'Inativar (tem histórico)' },
]
const NOVO = '__novo'

export function AjustarLaudoDialog({ open, deparaId, apoioId, formatos, onClose, onDone }: {
  open: boolean; deparaId: string; apoioId: string; formatos: FormatoAjuste[]; onClose: () => void; onDone: () => void
}) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [escolha, setEscolha] = useState('')
  const [nomeNovo, setNomeNovo] = useState('Laudo Pardini')
  const [compartilhado, setCompartilhado] = useState<'copia' | 'continuar'>('copia')
  const [confirmo, setConfirmo] = useState(false)
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [verReap, setVerReap] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cad, setCad] = useState<Cadastro | null>(null)
  const [mats, setMats] = useState<MatLinha[]>([])
  const [met, setMet] = useState<MetEstado | null>(null)
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId) || ''

  useEffect(() => {
    if (!open) return
    setDados(null); setLinhas(null); setConfirmo(false); setCompartilhado('copia'); setVerReap(false); setCad(null)
    db.rpc('apoio_laudo_ajuste_dados', { _depara: deparaId }).then(({ data, error }: any) => {
      if (error) { toast.error('Não foi possível carregar os laudos do exame'); onClose(); return }
      const d = data as Dados
      setDados(d)
      const doApoio = d.laudos.find(l => l.bancadas.some(b => b.apoio_id === apoioId))
      const sugerirNovo = d.laudos.length === 1 && d.laudos[0].code === 'L001' && doApoio?.id === d.laudos[0].id
      setEscolha(sugerirNovo || !d.laudos.length ? NOVO : (doApoio ?? d.laudos[0]).id)
    })
    db.rpc('apoio_laudo_ajuste_cadastro', { _depara: deparaId }).then(({ data }: any) => { if (data) setCad(data as Cadastro) })
  }, [open, deparaId, apoioId, onClose])

  const laudo = dados?.laudos.find(l => l.id === escolha)
  const internas = laudo?.bancadas.filter(b => b.tipo !== 'apoio') ?? []
  const modo: Modo = escolha === NOVO ? 'novo' : internas.length && compartilhado === 'copia' ? 'copia' : 'usar'
  const sugeriuNovo = dados && dados.laudos.length === 1 && dados.laudos[0].code === 'L001' && dados.laudos[0].bancadas.some(b => b.apoio_id === apoioId)
  const podePrevia = !!dados?.pode && (escolha === NOVO ? !!nomeNovo.trim() : !!laudo) && !(internas.length && compartilhado === 'continuar' && !confirmo)

  const verPrevia = () => {
    const params = laudo ? (Array.isArray(laudo.parameters) ? laudo.parameters : []) : []
    const l = montarAjuste(formatos, params, new Set(laudo?.com_historico.map(String) ?? []), modo)
    if (!l.length) return toast.info('Nenhum modelo do Pardini carregado para este exame')
    if (cad) { setMats(montarMateriais(cad)); setMet(montarMetodo(cad)) }
    setLinhas(l)
  }

  const set = (key: string, patch: Partial<Linha>) => setLinhas(ls => ls && ls.map(l => l.key === key ? { ...l, ...patch } : l))
  const cont = useMemo(() => Object.fromEntries(GRUPOS.map(g => [g.acao, linhas?.filter(l => l.acao === g.acao).length ?? 0])), [linhas])

  const confirmar = async () => {
    if (!linhas) return
    if (linhas.some(l => l.incluir && !l.sobra && !l.nome.trim())) return toast.error('Dê um nome a todos os parâmetros')
    const metodologia = metodoFinal(met)
    if (metodologia === undefined) return toast.error('Decida a metodologia nova: criar, usar uma existente ou não preencher')
    if (mats.some(m => m.incluir && m.alvo === '__novo' && !m.novo.trim())) return toast.error('Dê um nome ao material novo')
    setBusy(true)
    try {
      const { params, mapas } = montarPayload(linhas, modo)
      const nome = modo === 'copia' ? `${laudo!.name} (Pardini)` : nomeNovo
      const _extras = { materiais: materiaisFinal(mats), metodologia }
      const { data, error } = await db.rpc('apoio_laudo_ajustar', { _depara: deparaId, _laudo: laudo?.id ?? null, _modo: modo, _nome: nome, _params: params, _mapas: mapas, _extras })
      if (error) throw error
      toast.success('Laudo ajustado ao modelo do Pardini', { description: `${data.criados} criado(s) · ${data.ajustados} ajustado(s) · ${data.reaproveitados} reaproveitado(s) · ${data.excluidos} excluído(s) · ${data.inativados} inativado(s)` })
      onDone(); onClose()
    } catch (e: any) {
      console.error(e)
      toast.error('Não foi possível ajustar o laudo. Nada foi alterado.', { description: /permiss/i.test(e?.message || '') ? e.message : 'Tente novamente. Se continuar, avise o suporte.' })
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ajustar laudo ao modelo do Pardini</DialogTitle></DialogHeader>
        {!dados ? <Loader2 className="h-5 w-5 animate-spin" /> : !linhas ? (
          <div className="space-y-4 text-sm">
            {!dados.pode && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">Para ajustar o laudo você precisa das duas permissões: gerenciar De/Para do apoio e editar cadastros do laboratório.</p>}
            <label className="block space-y-1">
              <span className="text-xs font-medium">Qual laudo ajustar?</span>
              <select value={escolha} onChange={e => { setEscolha(e.target.value); setConfirmo(false) }} className="w-full rounded-lg border border-input bg-background px-3 py-2">
                {dados.laudos.map(l => (
                  <option key={l.id} value={l.id}>{l.code} · {l.name}{l.bancadas.some(b => b.apoio_id === apoioId) ? ' (bancada do Pardini)' : ''}</option>
                ))}
                <option value={NOVO}>Criar laudo novo para o Pardini</option>
              </select>
            </label>
            {escolha === NOVO && (
              <label className="block space-y-1">
                <span className="text-xs font-medium">Nome do laudo novo</span>
                <input value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
                {sugeriuNovo && <span className="text-xs text-muted-foreground">Sugestão: o exame só tem o Laudo Padrão e ele também é usado pelo Pardini. O laudo novo passa a ser o laudo da bancada do Pardini.</span>}
                {!dados.bancada_apoio && <span className="block text-xs text-warning">Não há bancada de apoio do Pardini cadastrada; o laudo novo não será ligado a uma bancada.</span>}
              </label>
            )}
            {internas.length > 0 && (
              <div className="space-y-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs">
                <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" />Este laudo também é usado pela bancada {internas.map(b => b.name).join(', ')}. Ajustar vai mudar o laudo interno.</p>
                <label className="flex items-center gap-2"><input type="radio" checked={compartilhado === 'copia'} onChange={() => setCompartilhado('copia')} />Criar uma cópia só para o Pardini (recomendado)</label>
                <label className="flex items-center gap-2"><input type="radio" checked={compartilhado === 'continuar'} onChange={() => setCompartilhado('continuar')} />Continuar mesmo assim</label>
                {compartilhado === 'continuar' && <label className="ml-5 flex items-center gap-2"><input type="checkbox" checked={confirmo} onChange={e => setConfirmo(e.target.checked)} />Confirmo que quero mudar o laudo usado pela bancada interna</label>}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={verPrevia} disabled={!podePrevia} className="gradient-bg rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Ver prévia</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              {modo === 'novo' ? `Laudo novo "${nomeNovo}"` : modo === 'copia' ? `Cópia de ${laudo!.code} só para o Pardini` : `${laudo!.code} · ${laudo!.name}`} — nada é gravado até você confirmar. Desmarque o que não quiser aplicar.
            </p>
            {cad && <CadastroPrevia cad={cad} companyId={companyId} mats={mats} setMats={setMats} met={met} setMet={setMet}
              onMetodologiaCriada={m => setCad(c => c && { ...c, metodologias: [...c.metodologias, m] })} />}
            <div className="flex flex-wrap gap-2">
              {GRUPOS.map(g => <span key={g.acao} className="rounded-full border border-border px-2.5 py-1 font-medium">{g.titulo}: {cont[g.acao]}</span>)}
            </div>
            {GRUPOS.filter(g => cont[g.acao]).map(g => (
              <div key={g.acao} className="rounded-xl border border-border">
                <div className="flex items-center justify-between bg-muted/50 px-3 py-2 font-semibold">
                  <span>{g.acao === 'excluir' && modo === 'copia' ? 'Não copiar' : g.titulo} ({cont[g.acao]})</span>
                  {g.acao === 'reaproveitar' && <button onClick={() => setVerReap(v => !v)} className="text-primary underline">{verReap ? 'Esconder' : 'Mostrar'}</button>}
                </div>
                {(g.acao !== 'reaproveitar' || verReap) && (
                  <table className="w-full">
                    <thead className="text-left text-muted-foreground"><tr><th className="w-8 px-3 py-1.5" /><th className="px-3 py-1.5">Parâmetro</th><th className="px-3 py-1.5">Unid.</th><th className="px-3 py-1.5">Tipo</th><th className="px-3 py-1.5">Obrig.</th><th className="px-3 py-1.5">Detalhe</th></tr></thead>
                    <tbody>
                      {linhas.filter(l => l.acao === g.acao).map(l => (
                        <tr key={l.key} className={`border-t border-border ${!l.incluir ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-1.5"><input type="checkbox" checked={l.incluir} onChange={e => set(l.key, { incluir: e.target.checked })} aria-label="Aplicar" /></td>
                          <td className="px-3 py-1.5">
                            {l.sobra || l.acao === 'reaproveitar' ? <span className="font-medium">{l.nome}</span>
                              : <input value={l.nome} onChange={e => set(l.key, { nome: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1" />}
                            {!l.sobra && !l.nomeApoio && <span className="block text-[10px] text-muted-foreground">sem nome no Pardini (nome sugerido)</span>}
                          </td>
                          <td className="px-3 py-1.5">{l.unidade || '—'}</td>
                          <td className="px-3 py-1.5">{l.tipo === 'numerical' ? `Numérico${l.casas != null ? ` · ${l.casas} casas` : ''}` : (l.tamanho ?? 0) > 255 ? `Texto longo (${l.tamanho})` : `Texto${l.tamanho ? ` (${l.tamanho})` : ''}`}</td>
                          <td className="px-3 py-1.5">{l.sobra ? '—' : l.obrigatorio ? 'Sim' : 'Não'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {l.acao === 'ajustar' ? l.mudancas.join(' · ') : l.acao === 'inativar' ? 'Tem resultado gravado: fica oculto, laudos antigos abrem iguais' : l.acao === 'excluir' ? (modo === 'copia' ? 'Não vai para a cópia' : 'Sem resultado gravado') : l.acao === 'criar' && !l.obrigatorio ? 'Só em alguns formatos' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button onClick={() => setLinhas(null)} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm">Voltar</button>
              <button onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={confirmar} disabled={busy} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar ajuste</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
