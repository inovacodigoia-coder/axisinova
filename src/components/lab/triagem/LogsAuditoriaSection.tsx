import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MODULOS: Record<string, string> = {
  apoio: 'Terceirização / Apoio', apoio_integracao: 'Integração com o apoio', triagem: 'Triagem Lab e Coleta',
  permissoes: 'Permissões e usuários', cadastros: 'Cadastros do laboratório', suporte: 'Quadros de suporte',
  acesso_externo: 'Acesso externo', leitos: 'Leitos',
}
const TABELAS: Record<string, string> = {
  origins: 'Origem / unidade', triagem_condicao_transporte: 'Condição de transporte', triagem_rota: 'Rota de malote',
  lab_motivo_coleta: 'Motivo de coleta', coleta_horario: 'Horário de coleta', access_profiles: 'Perfil de acesso',
  profiles: 'Usuário', user_roles: 'Papel do usuário', sector_users: 'Usuário no setor', apoio_remessa: 'Remessa',
  apoio_recipiente: 'Tubo do apoio', apoio_pedido_exame: 'Exame no apoio', apoio_laboratorio: 'Laboratório de apoio',
  apoio_depara_exame: 'De-para de exame', apoio_depara_analito: 'De-para de analito', apoio_catalogo_exame: 'Catálogo do apoio',
  apoio_chamada_log: 'Chamada ao apoio', apoio_erro: 'Erro do apoio', apoio_preco: 'Preço do apoio', exams: 'Exame',
  exam_laudos: 'Laudo', lab_exam_parameters: 'Parâmetro do laudo', support_cards: 'Card de suporte', companies: 'Empresa',
}
const ACOES: Record<string, string> = { insert: 'Criou', update: 'Alterou', delete: 'Excluiu', correcao: 'Corrigiu', confirmacao: 'Confirmou', status: 'Mudou status', acesso_usuario: 'Mudou acesso' }
const POR_PAGINA = 50
const inputCls = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

/** Logs de Auditoria de todo o sistema (lidos pela função auditoria_lista) */
export default function LogsAuditoriaSection() {
  const [logs, setLogs] = useState<any[] | null>(null)
  const [total, setTotal] = useState(0)
  const [modulo, setModulo] = useState('')
  const [usuario, setUsuario] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [usuarios, setUsuarios] = useState<{ id: string; full_name: string }[]>([])
  const [aberto, setAberto] = useState<string | null>(null)

  useEffect(() => { supabase.from('profiles').select('id, full_name').order('full_name').then(({ data }) => setUsuarios((data as any) ?? [])) }, [])

  const carregar = useCallback(async (offset = 0) => {
    if (offset === 0) setLogs(null)
    const fimDia = ate ? new Date(new Date(`${ate}T00:00:00`).getTime() + 86400000).toISOString() : null
    const { data } = await supabase.rpc('auditoria_lista' as any, {
      _modulo: modulo || null, _usuario: usuario || null, _de: de ? new Date(`${de}T00:00:00`).toISOString() : null, _ate: fimDia,
      _limite: POR_PAGINA, _offset: offset,
    })
    const linhas = (data as any[]) ?? []
    setTotal(Number(linhas[0]?.total ?? (offset ? total : 0)))
    setLogs(prev => offset === 0 ? linhas : [...(prev ?? []), ...linhas])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulo, usuario, de, ate])
  useEffect(() => { carregar(0) }, [carregar])

  const resumo = (l: any) => {
    const d = l.depois ?? l.antes ?? {}
    if (l.tabela === 'coleta_horario') return `${d.collectedAt ? new Date(d.collectedAt).toLocaleString('pt-BR') : ''}${d.justificativa ? ` — ${d.justificativa}` : ''}`
    if (l.fonte === 'apoio_chamada_log') return [d.origem, d.http_status && `HTTP ${d.http_status}`, d.erro, d.observacao].filter(Boolean).join(' · ')
    if (l.acao === 'status') return `${l.antes?.status ?? '—'} → ${d.status ?? '—'}${d.motivo ? ` — ${d.motivo}` : ''}`
    return d.nome || d.descricao || d.name || d.cod_lote_lab || d.justificativa || d.forcar || d.campo || ''
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Logs de Auditoria</h3>
        <p className="text-xs text-muted-foreground">Todos os registros de auditoria da empresa, incluindo Terceirização/Apoio, Triagem Lab, permissões e integrações.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div><Label className="text-xs">Módulo</Label><select className={inputCls} value={modulo} onChange={e => setModulo(e.target.value)}><option value="">Todos</option>{Object.entries(MODULOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><Label className="text-xs">Usuário</Label><select className={inputCls} value={usuario} onChange={e => setUsuario(e.target.value)}><option value="">Todos</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
        <div><Label className="text-xs">De</Label><Input type="date" className="h-9" value={de} onChange={e => setDe(e.target.value)} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" className="h-9" value={ate} onChange={e => setAte(e.target.value)} /></div>
      </div>
      {logs === null ? <Skeleton className="h-40 w-full" /> : logs.length === 0 ? <p className="py-8 text-center text-sm italic text-muted-foreground">Nenhum registro com esses filtros.</p> : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{total} registro(s)</p>
          {logs.map(l => (
            <div key={l.fonte + l.id} className="rounded-lg border bg-muted/20 p-3 text-xs">
              <button className="flex w-full items-center gap-4 text-left" onClick={() => setAberto(a => a === l.fonte + l.id ? null : l.fonte + l.id)}>
                <span className="whitespace-nowrap font-mono text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</span>
                <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px]">{MODULOS[l.modulo] || l.modulo}</span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold">{l.usuario_nome || 'Sistema'}</span>
                  <span className="text-muted-foreground"> · {ACOES[l.acao] || l.acao} {TABELAS[l.tabela] || l.tabela}</span>
                  <p className="truncate text-muted-foreground">{resumo(l)}</p>
                </div>
              </button>
              {aberto === l.fonte + l.id && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <pre className="max-h-60 overflow-auto rounded bg-background p-2 text-[10px]">Antes: {JSON.stringify(l.antes, null, 2)}</pre>
                  <pre className="max-h-60 overflow-auto rounded bg-background p-2 text-[10px]">Depois: {JSON.stringify(l.depois, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
          {logs.length < total && <div className="flex justify-center"><Button size="sm" variant="outline" onClick={() => carregar(logs.length)}>Mostrar mais</Button></div>}
        </div>
      )}
    </div>
  )
}
