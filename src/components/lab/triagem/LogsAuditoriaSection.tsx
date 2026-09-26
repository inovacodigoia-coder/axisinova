import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

const TABELAS: Record<string, string> = {
  origins: 'Origem / unidade', triagem_condicao_transporte: 'Condição de transporte', triagem_rota: 'Rota de malote',
  lab_motivo_coleta: 'Motivo de coleta', coleta_horario: 'Horário de coleta',
}
const ACOES: Record<string, string> = { insert: 'Criou', update: 'Alterou', delete: 'Excluiu', correcao: 'Corrigiu', confirmacao: 'Confirmou' }
const POR_PAGINA = 30

/** Logs de Auditoria dos cadastros do laboratório (mesma trilha do Apoio) */
export default function LogsAuditoriaSection() {
  const [logs, setLogs] = useState<any[] | null>(null)
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [limite, setLimite] = useState(POR_PAGINA)
  useEffect(() => {
    ;(async () => {
      const { data } = await (supabase as any).from('apoio_auditoria').select('id, tabela, registro_id, acao, antes, depois, usuario_id, created_at')
        .in('tabela', Object.keys(TABELAS)).order('created_at', { ascending: false }).limit(300)
      setLogs(data ?? [])
      const ids = [...new Set((data ?? []).map((l: any) => l.usuario_id).filter(Boolean))]
      if (ids.length) {
        const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids as string[])
        setNomes(Object.fromEntries((ps ?? []).map((p: any) => [p.id, p.full_name])))
      }
    })()
  }, [])
  const resumo = (l: any) => {
    const d = l.depois ?? l.antes ?? {}
    if (l.tabela === 'coleta_horario') {
      const novo = d.collectedAt ? new Date(d.collectedAt).toLocaleString('pt-BR') : ''
      return `${novo}${d.justificativa ? ` — ${d.justificativa}` : ''}`
    }
    return d.nome || d.descricao || d.name || ''
  }
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Logs de Auditoria</h3>
      {logs === null ? <Skeleton className="h-40 w-full" /> : logs.length === 0 ? <p className="py-8 text-center text-sm italic text-muted-foreground">Nenhum registro ainda.</p> : (
        <div className="space-y-2">
          {logs.slice(0, limite).map(l => (
            <div key={l.id} className="flex items-center gap-4 rounded-lg border bg-muted/20 p-3 text-xs">
              <span className="whitespace-nowrap font-mono text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</span>
              <div className="min-w-0 flex-1">
                <span className="font-bold">{nomes[l.usuario_id] || 'Sistema'}</span>
                <span className="text-muted-foreground"> · {ACOES[l.acao] || l.acao} {TABELAS[l.tabela]}</span>
                <p className="truncate text-muted-foreground">{resumo(l)}</p>
              </div>
            </div>
          ))}
          {logs.length > limite && <div className="flex justify-center"><Button size="sm" variant="outline" onClick={() => setLimite(x => x + POR_PAGINA)}>Mostrar mais</Button></div>}
        </div>
      )}
    </div>
  )
}
