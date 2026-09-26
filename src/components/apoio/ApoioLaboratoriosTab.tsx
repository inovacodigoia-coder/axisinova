import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Plus, Search, Building2, Loader2, CheckCircle2, XCircle, Pencil, Plug, Hand, Power, Trash2, RefreshCw, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useApoioPermissions } from '@/hooks/useApoio'
import { maskCnpj } from '@/lib/cnpj'
import { ApoioLaboratorioDrawer, type ApoioLab } from './ApoioLaboratorioDrawer'
import { CatalogoUploadDialog, PrecoImportDialog, CatalogoInfoLinha, carregarCatalogoInfo, type CatalogoInfo } from './ApoioReferencia'

const diasAte = (d: string) => Math.floor((new Date(d + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)

export function LicencaBadge({ validade }: { validade: string | null }) {
  if (!validade) return <span className="text-muted-foreground">—</span>
  const dias = diasAte(validade)
  const txt = new Date(validade + 'T00:00:00').toLocaleDateString('pt-BR')
  if (dias < 0) return <Badge variant="destructive">{txt} · vencida</Badge>
  if (dias <= 30) return <Badge className="bg-[hsl(38,92%,50%)] text-foreground hover:bg-[hsl(38,92%,50%)]">{txt} · vence em {dias}d</Badge>
  return <span className="text-foreground">{txt}</span>
}

export function ApoioLaboratoriosTab({ moduloLiberado, onChanged }: { moduloLiberado: boolean; onChanged: () => void }) {
  const { has } = useApoioPermissions()
  const podeGerenciar = has('apoio.laboratorio.gerenciar') && moduloLiberado
  const podeCatalogo = has('apoio.catalogo.gerenciar') && moduloLiberado
  const [refDlg, setRefDlg] = useState<{ tipo: 'cat' | 'preco'; lab: ApoioLab } | null>(null)
  const [labs, setLabs] = useState<ApoioLab[]>([])
  const [erros, setErros] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [catInfo, setCatInfo] = useState<Record<string, CatalogoInfo>>({})
  const [busca, setBusca] = useState('')
  const [fConector, setFConector] = useState<'todos' | 'pardini' | 'manual'>('todos')
  const [fAtivo, setFAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const [drawer, setDrawer] = useState<{ open: boolean; lab: ApoioLab | null }>({ open: false, lab: null })
  const [confirmModo, setConfirmModo] = useState<ApoioLab | null>(null)
  const [excluir, setExcluir] = useState<{ lab: ApoioLab; bloqueio: string | null } | null>(null)
  const [teste, setTeste] = useState<{ nome: string; loading: boolean; ok?: boolean; motivo?: string; ms?: number } | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('apoio_laboratorio')
      .select('id, company_id, nome, cnpj, conector, cod_lab, senha_secret_id, endpoint_url, ambiente, modo_contingencia, opcoes, dias_transporte, prazo_contagem, guardar_pdf_sempre, licenca_sanitaria, licenca_validade, licenca_arquivo_path, contato_nome, contato_email, contato_telefone, ativo, horarios_motoboy, conservacao_textos, alerta_guarda_min')
      .order('nome')
    if (error) toast.error('Erro ao carregar laboratórios de apoio')
    setLabs(((data || []) as any[]).map(r => ({ ...r, senha_definida: !!r.senha_secret_id, senha_secret_id: undefined })))
    const { data: cur } = await supabase.from('apoio_cursor').select('apoio_id, ultimo_erro')
    const e: Record<string, boolean> = {}
    ;(cur || []).forEach((c: any) => { if (c.ultimo_erro) e[c.apoio_id] = true })
    setErros(e)
    setCatInfo(await carregarCatalogoInfo(((data || []) as any[]).filter(r => r.conector === 'pardini').map(r => r.id)))
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const refresh = () => { void load(); onChanged() }

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const qd = q.replace(/\D/g, '')
    return labs.filter(l => {
      if (fConector !== 'todos' && l.conector !== fConector) return false
      if (fAtivo === 'ativos' && !l.ativo) return false
      if (fAtivo === 'inativos' && l.ativo) return false
      if (!q) return true
      return l.nome.toLowerCase().includes(q) || (!!qd && (l.cnpj || '').includes(qd))
    })
  }, [labs, busca, fConector, fAtivo])

  const testar = async (l: ApoioLab) => {
    setTeste({ nome: l.nome, loading: true })
    const t0 = performance.now()
    const { data, error } = await supabase.functions.invoke('apoio-testar-conexao', { body: { apoio_id: l.id } })
    const ms = Math.round(performance.now() - t0)
    setTeste({ nome: l.nome, loading: false, ok: !!data?.ok, motivo: error ? 'Não foi possível contatar o servidor' : data?.motivo, ms })
  }

  const alternarModo = async (l: ApoioLab) => {
    const { error } = await supabase.from('apoio_laboratorio').update({ modo_contingencia: !l.modo_contingencia }).eq('id', l.id)
    if (error) return toast.error('Não foi possível alterar o modo', { description: error.message })
    toast.success(l.modo_contingencia ? 'Voltou ao modo automático' : 'Modo manual ativado')
    refresh()
  }

  const alternarAtivo = async (l: ApoioLab) => {
    const { error } = await supabase.from('apoio_laboratorio').update({ ativo: !l.ativo }).eq('id', l.id)
    if (error) return toast.error('Não foi possível alterar', { description: error.message })
    toast.success(l.ativo ? 'Laboratório inativado' : 'Laboratório reativado')
    refresh()
  }

  const pedirExclusao = async (l: ApoioLab) => {
    const [dp, rm, pe] = await Promise.all([
      supabase.from('apoio_depara_exame').select('id', { count: 'exact', head: true }).eq('apoio_id', l.id),
      supabase.from('apoio_remessa').select('id', { count: 'exact', head: true }).eq('apoio_id', l.id),
      supabase.from('apoio_pedido_exame').select('id', { count: 'exact', head: true }).eq('apoio_id', l.id),
    ])
    const nDp = dp.count || 0, nRm = rm.count || 0, nPe = pe.count || 0
    const bloqueio = nDp + nRm + nPe > 0
      ? `Este apoio tem ${nDp} De/Para e ${nPe} exames enviados${nRm ? ` (${nRm} remessas)` : ''}. Inative em vez de excluir.`
      : null
    setExcluir({ lab: l, bloqueio })
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    const l = excluir.lab
    await supabase.from('apoio_certificacao').delete().eq('apoio_id', l.id)
    const { error } = await supabase.from('apoio_laboratorio').delete().eq('id', l.id)
    setExcluir(null)
    if (error) return toast.error('Não foi possível excluir', { description: error.message })
    toast.success('Laboratório de apoio excluído')
    refresh()
  }

  const select = 'rounded-lg border border-input bg-background px-3 py-2 text-sm'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={fConector} onChange={e => setFConector(e.target.value as any)} className={select}>
          <option value="todos">Todos os conectores</option>
          <option value="pardini">Pardini</option>
          <option value="manual">Manual</option>
        </select>
        <select value={fAtivo} onChange={e => setFAtivo(e.target.value as any)} className={select}>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
        <button
          disabled={!podeGerenciar}
          title={!podeGerenciar ? (moduloLiberado ? 'Sem permissão para gerenciar laboratórios de apoio' : 'Módulo não liberado') : undefined}
          onClick={() => setDrawer({ open: true, lab: null })}
          className="gradient-bg flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Novo laboratório de apoio
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>
        ) : lista.length === 0 ? (
          <EmptyState icon={<Building2 className="h-10 w-10" />} title="Nenhum laboratório de apoio" description={labs.length ? 'Nenhum resultado para os filtros.' : 'Cadastre o primeiro laboratório de apoio.'} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CNPJ</th>
                <th className="px-4 py-3 font-medium">Conector</th>
                <th className="px-4 py-3 font-medium">Ambiente</th>
                <th className="px-4 py-3 font-medium">Integração</th>
                <th className="px-4 py-3 font-medium">Licença sanitária</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lista.map(l => {
                const cor = l.modo_contingencia ? 'bg-[hsl(38,92%,50%)]' : erros[l.id] ? 'bg-destructive' : 'bg-[hsl(var(--success))]'
                const txt = l.modo_contingencia ? 'Modo manual' : erros[l.id] ? 'Falha' : 'OK'
                return (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{l.nome}{l.conector === 'pardini' && <div className="mt-1 font-normal"><CatalogoInfoLinha info={catInfo[l.id]} /></div>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.cnpj ? maskCnpj(l.cnpj) : '—'}</td>
                    <td className="px-4 py-3"><Badge variant={l.conector === 'pardini' ? 'default' : 'secondary'}>{l.conector === 'pardini' ? 'Pardini' : 'Manual'}</Badge></td>
                    <td className="px-4 py-3 text-xs">{l.conector === 'pardini' ? (l.ambiente === 'producao' ? 'Produção' : 'Homologação') : '—'}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-2 text-xs"><span className={`h-2.5 w-2.5 rounded-full ${cor}`} />{txt}</span></td>
                    <td className="px-4 py-3 text-xs"><LicencaBadge validade={l.licenca_validade} /></td>
                    <td className="px-4 py-3 text-xs">{l.ativo ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDrawer({ open: true, lab: l })}><Pencil className="mr-2 h-4 w-4" />{podeGerenciar ? 'Editar' : 'Ver detalhes'}</DropdownMenuItem>
                          <DropdownMenuItem disabled={!moduloLiberado} onClick={() => testar(l)}><Plug className="mr-2 h-4 w-4" />Testar conexão</DropdownMenuItem>
                          {l.conector === 'pardini' && <DropdownMenuItem disabled={!podeCatalogo} onClick={() => setRefDlg({ tipo: 'cat', lab: l })}><RefreshCw className="mr-2 h-4 w-4" />Atualizar catálogo do apoio</DropdownMenuItem>}
                          <DropdownMenuItem disabled={!podeCatalogo} onClick={() => setRefDlg({ tipo: 'preco', lab: l })}><FileUp className="mr-2 h-4 w-4" />Importar tabela de preços</DropdownMenuItem>
                          <DropdownMenuItem disabled={!podeGerenciar} onClick={() => setConfirmModo(l)}><Hand className="mr-2 h-4 w-4" />{l.modo_contingencia ? 'Voltar ao automático' : 'Ativar modo manual'}</DropdownMenuItem>
                          <DropdownMenuItem disabled={!podeGerenciar} onClick={() => alternarAtivo(l)}><Power className="mr-2 h-4 w-4" />{l.ativo ? 'Inativar' : 'Reativar'}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled={!podeGerenciar} onClick={() => pedirExclusao(l)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ApoioLaboratorioDrawer
        open={drawer.open}
        lab={drawer.lab}
        readOnly={!podeGerenciar}
        podeCatalogo={podeCatalogo}
        moduloLiberado={moduloLiberado}
        onClose={() => setDrawer({ open: false, lab: null })}
        onSaved={() => { setDrawer({ open: false, lab: null }); refresh() }}
      />

      <CatalogoUploadDialog apoio={refDlg?.tipo === 'cat' ? refDlg.lab : null} open={refDlg?.tipo === 'cat'} onClose={() => setRefDlg(null)} onDone={() => void load()} />
      <PrecoImportDialog apoio={refDlg?.tipo === 'preco' ? refDlg.lab : null} open={refDlg?.tipo === 'preco'} onClose={() => setRefDlg(null)} />

      <AlertDialog open={!!confirmModo} onOpenChange={o => !o && setConfirmModo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmModo?.modo_contingencia ? 'Voltar ao modo automático?' : 'Ativar modo manual?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmModo?.modo_contingencia
                ? 'A integração automática com este apoio volta a funcionar.'
                : 'Enquanto estiver em modo manual, nada será enviado nem buscado automaticamente neste apoio.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmModo) void alternarModo(confirmModo); setConfirmModo(null) }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{excluir?.bloqueio ? 'Não é possível excluir' : `Excluir "${excluir?.lab.nome}"?`}</AlertDialogTitle>
            <AlertDialogDescription>{excluir?.bloqueio || 'Esta ação não pode ser desfeita.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{excluir?.bloqueio ? 'Fechar' : 'Cancelar'}</AlertDialogCancel>
            {!excluir?.bloqueio && <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!teste} onOpenChange={o => !o && setTeste(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Testar conexão — {teste?.nome}</DialogTitle></DialogHeader>
          {teste?.loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Testando…</p>
          ) : (
            <div className="flex items-start gap-3">
              {teste?.ok ? <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" /> : <XCircle className="h-6 w-6 text-destructive" />}
              <div>
                <p className="font-medium text-foreground">{teste?.ok ? 'Conexão OK' : 'Falha na conexão'}</p>
                {teste?.motivo && <p className="text-sm text-muted-foreground">{teste.motivo}</p>}
                <p className="text-xs text-muted-foreground mt-1">Tempo de resposta: {teste?.ms} ms</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
