import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Eye, MailWarning, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { mensagemErroFuncao } from '@/lib/erroFuncao'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface CadastroPendente {
  company_id: string
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string | null
  segmento: string | null
  telefone: string | null
  email: string | null
  cidade: string | null
  estado: string | null
  plano: string | null
  criado_em: string
  admin_nome: string | null
  admin_email: string | null
  admin_email_confirmado: boolean | null
}

/** Novos cadastros feitos pela tela de login, aguardando o Super Admin liberar o acesso. */
export function CadastrosPendentesPanel({ onAprovado }: { onAprovado?: () => void }) {
  const navigate = useNavigate()
  const [lista, setLista] = useState<CadastroPendente[]>([])
  const [alvo, setAlvo] = useState<CadastroPendente | null>(null)
  const [aprovando, setAprovando] = useState(false)
  const [excluirAlvo, setExcluirAlvo] = useState<CadastroPendente | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function excluir() {
    if (!excluirAlvo || excluindo) return
    setExcluindo(true)
    const { data, error } = await supabase.functions.invoke('delete-company', {
      body: { companyId: excluirAlvo.company_id, apenasPendente: true },
    })
    setExcluindo(false)
    if (error) {
      toast.error(await mensagemErroFuncao(error, 'Não foi possível excluir o cadastro.', data))
      return
    }
    toast.success(`Cadastro "${excluirAlvo.nome_fantasia || excluirAlvo.razao_social}" excluído.`)
    setExcluirAlvo(null)
    await carregar()
    onAprovado?.()
  }

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('empresa_cadastros_pendentes')
    if (error) {
      console.error('cadastros pendentes', error)
      toast.error('Não foi possível carregar os novos cadastros.')
      return
    }
    setLista((data ?? []) as CadastroPendente[])
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  async function aprovar() {
    if (!alvo || aprovando) return
    setAprovando(true)
    const { error } = await supabase.rpc('empresa_aprovar_cadastro', { _company_id: alvo.company_id })
    setAprovando(false)
    if (error) {
      toast.error(error.message || 'Não foi possível aprovar o cadastro.')
      return
    }
    toast.success(`Acesso liberado para "${alvo.nome_fantasia || alvo.razao_social}".`)
    setAlvo(null)
    await carregar()
    onAprovado?.()
  }

  if (lista.length === 0) return null

  return (
    <section className="rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-[hsl(var(--warning))]" />
        <h2 className="text-base font-bold text-foreground">Novos cadastros aguardando aprovação</h2>
        <span className="rounded-full bg-[hsl(var(--warning))]/15 px-2 py-0.5 text-xs font-bold text-[hsl(var(--warning))]">{lista.length}</span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Empresas que se cadastraram pela tela de login. Elas só entram no sistema depois que você aprovar.
      </p>
      <ul className="space-y-2">
        {lista.map((c) => (
          <li key={c.company_id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-semibold text-foreground">{c.nome_fantasia || c.razao_social}</p>
              <p className="text-xs text-muted-foreground">
                {c.cnpj}{c.cidade ? ` · ${c.cidade}${c.estado ? `/${c.estado}` : ''}` : ''} · Plano {c.plano || 'Pro'} · cadastrada em {new Date(c.criado_em).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.admin_nome || c.admin_email
                  ? <>Responsável: <span className="font-medium text-foreground">{c.admin_nome || '—'}</span>{c.admin_email ? ` · ${c.admin_email}` : ''}</>
                  : 'Sem administrador — o cadastro não foi concluído.'}
              </p>
              {c.admin_email && c.admin_email_confirmado === false && (
                <p className="flex items-center gap-1 text-xs text-[hsl(var(--warning))]">
                  <MailWarning className="h-3.5 w-3.5" /> E-mail ainda não confirmado pelo responsável.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => navigate(`/superadmin/empresas/${c.company_id}`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                <Eye className="h-4 w-4" /> Ver detalhes
              </button>
              <button
                onClick={() => setExcluirAlvo(c)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Excluir cadastro
              </button>
              <button
                onClick={() => setAlvo(c)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <CheckCircle2 className="h-4 w-4" /> Aprovar e liberar acesso
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmModal
        open={!!alvo}
        onClose={() => setAlvo(null)}
        onConfirm={aprovar}
        title="Liberar acesso ao sistema"
        description={`A empresa "${alvo?.nome_fantasia || alvo?.razao_social}" (CNPJ ${alvo?.cnpj}) ficará ativa e o responsável${alvo?.admin_email ? ` (${alvo.admin_email})` : ''} poderá entrar no sistema.`}
        confirmLabel="Aprovar"
        variant="warning"
        isLoading={aprovando}
      />
      <ConfirmModal
        open={!!excluirAlvo}
        onClose={() => setExcluirAlvo(null)}
        onConfirm={excluir}
        title="Excluir cadastro aguardando aprovação"
        description={`O cadastro "${excluirAlvo?.nome_fantasia || excluirAlvo?.razao_social}" (CNPJ ${excluirAlvo?.cnpj}) e o login do responsável serão apagados. O CNPJ e o e-mail ficam livres para um novo cadastro. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        isLoading={excluindo}
      />
    </section>
  )
}
