import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Edit2, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useTriagemPermissions } from '@/hooks/useTriagem'

export const TIPOS_MOTIVO = [
  { v: 'cancelar', l: 'Cancelar', cls: 'bg-destructive text-destructive-foreground' },
  { v: 'adiar', l: 'Adiar', cls: 'bg-warning text-warning-foreground' },
  { v: 'rejeitar', l: 'Rejeitar (triagem)', cls: 'bg-destructive/80 text-destructive-foreground' },
  { v: 'ressalva', l: 'Ressalva (triagem)', cls: 'bg-primary text-primary-foreground' },
] as const
export const CATEGORIAS = [
  ['hemolise', 'Hemólise'], ['coagulo', 'Coágulo'], ['volume', 'Volume insuficiente'], ['identificacao', 'Identificação (ilegível/ausente/divergente)'],
  ['tubo_errado', 'Tubo/material errado'], ['vazamento', 'Vazamento/tubo quebrado'], ['temperatura', 'Temperatura fora da faixa'],
  ['estabilidade', 'Estabilidade vencida'], ['lipemia', 'Lipemia'], ['ictericia', 'Icterícia'], ['outros', 'Outros'],
] as const

type Motivo = { id?: string; tipo: string; descricao: string; categoria: string | null; gera_recoleta: boolean; texto_ressalva: string | null; exige_justificativa: boolean; ativo: boolean; ordem?: number }
const db = supabase as any
const POR_PAGINA = 20

export default function MotivosColetaSection() {
  const { user } = useAuth()
  const { has } = useTriagemPermissions()
  const pode = has('triagem.config')
  const [lista, setLista] = useState<Motivo[] | null>(null)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [limite, setLimite] = useState(POR_PAGINA)
  const [edit, setEdit] = useState<Motivo | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [excluir, setExcluir] = useState<Motivo | null>(null)

  const carregar = async () => {
    const { data, error } = await db.from('lab_motivo_coleta').select('*').order('tipo').order('ordem').order('descricao')
    if (error) { toast.error('Não foi possível carregar os motivos'); setLista([]); return }
    if (!data?.length && pode) { await db.rpc('triagem_semear_padroes'); return carregar() }
    setLista(data ?? [])
  }
  useEffect(() => { if (user?.companyId) carregar() }, [user?.companyId])

  const visiveis = useMemo(() => (lista ?? [])
    .filter(m => mostrarInativos || m.ativo)
    .filter(m => tipo === 'todos' || m.tipo === tipo)
    .filter(m => !busca || m.descricao.toLowerCase().includes(busca.toLowerCase())), [lista, busca, tipo, mostrarInativos])

  const novo = () => { setErros({}); setEdit({ tipo: 'rejeitar', descricao: '', categoria: null, gera_recoleta: true, texto_ressalva: null, exige_justificativa: false, ativo: true }) }
  const mudarTipo = (t: string) => edit && setEdit({ ...edit, tipo: t, gera_recoleta: t === 'rejeitar', exige_justificativa: t === 'ressalva' })

  const salvar = async () => {
    if (!edit) return
    const e: Record<string, string> = {}
    if (edit.descricao.trim().length < 3) e.descricao = 'Informe a descrição (mínimo 3 caracteres)'
    if ((edit.tipo === 'rejeitar' || edit.tipo === 'ressalva') && !edit.categoria) e.categoria = 'Escolha a categoria para o indicador'
    if (edit.tipo === 'ressalva' && !edit.texto_ressalva?.trim()) e.texto_ressalva = 'Informe o texto que vai no laudo'
    if ((lista ?? []).some(m => m.id !== edit.id && m.tipo === edit.tipo && m.descricao.trim().toLowerCase() === edit.descricao.trim().toLowerCase())) e.descricao = 'Já existe um motivo com essa descrição neste tipo'
    setErros(e); if (Object.keys(e).length) return
    setSalvando(true)
    const row = { company_id: user?.companyId, tipo: edit.tipo, descricao: edit.descricao.trim(), categoria: edit.categoria || null, gera_recoleta: edit.gera_recoleta,
      texto_ressalva: edit.tipo === 'ressalva' ? edit.texto_ressalva?.trim() : (edit.texto_ressalva?.trim() || null), exige_justificativa: edit.exige_justificativa, ativo: edit.ativo }
    const { error } = edit.id ? await db.from('lab_motivo_coleta').update(row).eq('id', edit.id) : await db.from('lab_motivo_coleta').insert(row)
    setSalvando(false)
    if (error) { toast.error(error.message?.includes('row-level') ? 'Você não tem a permissão "Configurar unidades, rotas e critérios"' : 'Não foi possível salvar o motivo'); return }
    toast.success(edit.id ? 'Motivo atualizado' : 'Motivo cadastrado'); setEdit(null); carregar()
  }

  const confirmarExcluir = async () => {
    if (!excluir?.id) return
    const { error } = await db.from('lab_motivo_coleta').delete().eq('id', excluir.id)
    if (error) {
      if (error.code === '23503') {
        const r = await db.from('lab_motivo_coleta').update({ ativo: false }).eq('id', excluir.id)
        r.error ? toast.error('Não foi possível inativar o motivo') : toast.info('Motivo em uso: foi inativado em vez de excluído')
      } else toast.error(error.message?.includes('row-level') ? 'Você não tem permissão para excluir' : 'Não foi possível excluir o motivo')
    } else toast.success('Motivo excluído')
    setExcluir(null); carregar()
  }

  const Erro = ({ k }: { k: string }) => erros[k] ? <p className="mt-1 text-xs text-destructive">{erros[k]}</p> : null
  const tipoInfo = (t: string) => TIPOS_MOTIVO.find(x => x.v === t)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Motivos de Coleta</h3>
          <p className="text-xs text-muted-foreground">Cancelar/Adiar na coleta; Rejeitar/Ressalva na Triagem Lab (critérios de aceitação e rejeição).</p>
        </div>
        {pode && <Button size="sm" className="gradient-bg text-primary-foreground gap-2" onClick={novo}><Plus className="h-4 w-4" /> Novo Motivo</Button>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar motivo..." value={busca} onChange={e => { setBusca(e.target.value); setLimite(POR_PAGINA) }} /></div>
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>{TIPOS_MOTIVO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} />Mostrar inativos</label>
      </div>
      <div className="space-y-2">
        {lista === null ? [0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
          : visiveis.length === 0 ? <p className="py-8 text-center text-sm italic text-muted-foreground">Nenhum motivo encontrado.</p>
          : visiveis.slice(0, limite).map(r => (
            <div key={r.id} className={cn('flex items-center justify-between rounded-xl border bg-card p-3', !r.ativo && 'opacity-60')}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-black uppercase', tipoInfo(r.tipo)?.cls)}>{tipoInfo(r.tipo)?.l}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{r.descricao}{!r.ativo && <span className="ml-2 text-[10px] font-normal text-muted-foreground">(inativo)</span>}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[r.categoria && CATEGORIAS.find(c => c[0] === r.categoria)?.[1], r.gera_recoleta && 'gera recoleta', r.exige_justificativa && 'exige justificativa', r.texto_ressalva && `laudo: "${r.texto_ressalva}"`].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {pode && <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setErros({}); setEdit({ ...r }) }}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setExcluir(r)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
              </div>}
            </div>
          ))}
        {visiveis.length > limite && <div className="flex justify-center gap-2"><Button variant="outline" size="sm" onClick={() => setLimite(l => l + POR_PAGINA)}>Mostrar mais</Button><Button variant="ghost" size="sm" onClick={() => setLimite(visiveis.length)}>Mostrar todos</Button></div>}
      </div>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? 'Editar motivo' : 'Novo motivo'}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div><Label>Tipo *</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={edit.tipo} onChange={e => mudarTipo(e.target.value)}>
                {TIPOS_MOTIVO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select></div>
            <div><Label>Descrição *</Label><Input value={edit.descricao} onChange={e => setEdit({ ...edit, descricao: e.target.value })} /><Erro k="descricao" /></div>
            <div><Label>Categoria (indicador){(edit.tipo === 'rejeitar' || edit.tipo === 'ressalva') && ' *'}</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={edit.categoria ?? ''} onChange={e => setEdit({ ...edit, categoria: e.target.value || null })}>
                <option value="">—</option>{CATEGORIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select><Erro k="categoria" /></div>
            {edit.tipo === 'ressalva' && <div><Label>Texto da ressalva no laudo *</Label><Input value={edit.texto_ressalva ?? ''} onChange={e => setEdit({ ...edit, texto_ressalva: e.target.value })} placeholder="Amostra hemolisada; o resultado pode estar alterado." /><Erro k="texto_ressalva" /></div>}
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.gera_recoleta} onChange={e => setEdit({ ...edit, gera_recoleta: e.target.checked })} />Gera recoleta</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.exige_justificativa} onChange={e => setEdit({ ...edit, exige_justificativa: e.target.checked })} />Exige justificativa</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.ativo} onChange={e => setEdit({ ...edit, ativo: e.target.checked })} />Ativo</label>
            </div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir motivo?</AlertDialogTitle>
            <AlertDialogDescription>"{excluir?.descricao}". Se o motivo já estiver em uso, ele será inativado em vez de excluído.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmarExcluir} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
