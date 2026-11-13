import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { queryClient } from '@/lib/queryClient'
import { gravacoesEmAndamento } from '@/lib/requisicoesPendentes'
import {
  CHAVE_ULTIMA_ATIVIDADE, INATIVIDADE_GRAVAR_A_CADA_MS, faseInatividade, podeEncerrar,
  rotaAutenticada, sortearDesvioSeg, tempoLimiteMs,
} from '@/lib/sessaoInatividade'

export const MOTIVO_LOGOUT_INATIVIDADE = 'inatividade'
export const CHAVE_MOTIVO_LOGOUT = 'axis-logout-motivo'
const CANAL_ABAS = 'axis-sessao-atividade'
const EVENTOS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const

function lerUltimaAtividade(): number {
  try { return Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)) || 0 } catch { return 0 }
}

/** Desvio por sessão: sorteado uma vez e mantido na aba (recarregar a página não muda). */
function desvioDaSessao(userId: string): number {
  const chave = `axis-idle-desvio-${userId}`
  try {
    const salvo = sessionStorage.getItem(chave)
    if (salvo != null && salvo !== '') return Number(salvo)
    const novo = sortearDesvioSeg()
    sessionStorage.setItem(chave, String(novo))
    return novo
  } catch { return sortearDesvioSeg() }
}

/**
 * Logout por inatividade escalonado (30/45/60 min por usuário + 0–120 s por sessão).
 * Montado uma única vez no App; só age em rotas autenticadas.
 */
export function useIdleLogout() {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const ativo = isAuthenticated && !!user?.id && rotaAutenticada(location.pathname)

  const [limiteEmpresaMin, setLimiteEmpresaMin] = useState<number | null>(null)
  const [aviso, setAviso] = useState<number | null>(null)
  const ultimaRef = useRef(Date.now())
  const gravadoEmRef = useRef(0)
  const esperandoDesdeRef = useRef<number | null>(null)
  const encerrandoRef = useRef(false)
  const canalRef = useRef<BroadcastChannel | null>(null)

  const limiteMs = useMemo(
    () => (user?.id ? tempoLimiteMs(user.id, desvioDaSessao(user.id), limiteEmpresaMin) : 0),
    [user?.id, limiteEmpresaMin],
  )

  // Tempo de sessão configurado pela empresa (só vale se for menor que o escalonado).
  useEffect(() => {
    if (!ativo || !user?.companyId) { setLimiteEmpresaMin(null); return }
    let vivo = true
    void supabase.from('companies').select('session_timeout').eq('id', user.companyId).maybeSingle()
      .then(({ data }) => { if (vivo) setLimiteEmpresaMin((data as any)?.session_timeout ?? null) })
    return () => { vivo = false }
  }, [ativo, user?.companyId])

  const registrarAtividade = useCallback((em: number, propagar: boolean) => {
    if (em <= ultimaRef.current) return
    ultimaRef.current = em
    esperandoDesdeRef.current = null
    setAviso(null)
    if (propagar && em - gravadoEmRef.current >= INATIVIDADE_GRAVAR_A_CADA_MS) {
      gravadoEmRef.current = em
      try { localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(em)) } catch { /* sem armazenamento */ }
      canalRef.current?.postMessage({ tipo: 'atividade', em })
    }
  }, [])

  const continuar = useCallback(() => {
    gravadoEmRef.current = 0
    registrarAtividade(Date.now(), true)
  }, [registrarAtividade])

  const encerrar = useCallback(async (propagar: boolean) => {
    if (encerrandoRef.current) return
    encerrandoRef.current = true
    if (propagar) canalRef.current?.postMessage({ tipo: 'expirou' })
    setAviso(null)
    try { await supabase.removeAllChannels() } catch { /* segue */ }
    // Só esta sessão do navegador: outros aparelhos do usuário não caem junto.
    try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* segue */ }
    queryClient.clear()
    try { sessionStorage.setItem(CHAVE_MOTIVO_LOGOUT, MOTIVO_LOGOUT_INATIVIDADE) } catch { /* segue */ }
    logout()
    navigate(`/login?motivo=${MOTIVO_LOGOUT_INATIVIDADE}`, { replace: true })
  }, [logout, navigate])

  // Atividade local + compartilhada entre abas (BroadcastChannel e evento storage).
  useEffect(() => {
    if (!ativo) return
    encerrandoRef.current = false
    const agora = Date.now()
    ultimaRef.current = Math.max(agora, lerUltimaAtividade())
    gravadoEmRef.current = 0
    registrarAtividade(agora + 1, true)

    const aoAgir = (e: Event) => {
      // Os botões do aviso tratam o clique (senão o aviso some antes do "Sair agora").
      if ((e.target as Element | null)?.closest?.('[data-idle-botoes]')) return
      registrarAtividade(Date.now(), true)
    }
    EVENTOS.forEach(e => document.addEventListener(e, aoAgir, { capture: true, passive: true }))
    const aoStorage = (e: StorageEvent) => {
      if (e.key === CHAVE_ULTIMA_ATIVIDADE && e.newValue) registrarAtividade(Number(e.newValue) || 0, false)
    }
    window.addEventListener('storage', aoStorage)
    let canal: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      canal = new BroadcastChannel(CANAL_ABAS)
      canal.onmessage = (ev) => {
        const msg = ev.data as { tipo?: string; em?: number }
        if (msg?.tipo === 'atividade' && msg.em) registrarAtividade(msg.em, false)
        else if (msg?.tipo === 'expirou') void encerrar(false)
      }
      canalRef.current = canal
    }
    return () => {
      EVENTOS.forEach(e => document.removeEventListener(e, aoAgir, { capture: true } as EventListenerOptions))
      window.removeEventListener('storage', aoStorage)
      if (canal) { canal.close(); if (canalRef.current === canal) canalRef.current = null }
    }
  }, [ativo, registrarAtividade, encerrar])

  // Checagem a cada segundo (contagem do aviso).
  useEffect(() => {
    if (!ativo || !limiteMs) { setAviso(null); return }
    const t = setInterval(() => {
      const agora = Date.now()
      // Outra aba pode ter registrado atividade sem aviso (navegador sem BroadcastChannel).
      const outra = lerUltimaAtividade()
      if (outra > ultimaRef.current) registrarAtividade(outra, false)
      const f = faseInatividade(agora, ultimaRef.current, limiteMs)
      if (f.fase === 'ativo') { setAviso(null); return }
      if (f.fase === 'aviso') { setAviso(f.segundos); return }
      // Expirou: se há salvamento em andamento, espera ele terminar (com limite).
      const emAndamento = gravacoesEmAndamento() > 0
      if (emAndamento && esperandoDesdeRef.current == null) esperandoDesdeRef.current = agora
      if (!podeEncerrar(emAndamento, esperandoDesdeRef.current, agora)) { setAviso(0); return }
      void encerrar(true)
    }, 1000)
    return () => clearInterval(t)
  }, [ativo, limiteMs, registrarAtividade, encerrar])

  return { aviso: ativo ? aviso : null, continuar, sairAgora: () => void encerrar(true) }
}

/** Monta o logout por inatividade e o aviso (uma vez, no App). */
export function IdleLogoutGuard() {
  const { aviso, continuar, sairAgora } = useIdleLogout()
  if (aviso == null) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50" role="alertdialog" aria-modal="true" aria-labelledby="idle-titulo">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <h3 id="idle-titulo" className="text-lg font-bold text-foreground">
            Sua sessão vai expirar por inatividade em {aviso}s
          </h3>
          <p className="text-sm text-muted-foreground">
            {aviso > 0 ? 'Clique em continuar para seguir conectado.' : 'Aguardando terminar o salvamento em andamento…'}
          </p>
          <div className="flex w-full gap-3 mt-2" data-idle-botoes>
            <button
              onClick={sairAgora}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Sair agora
            </button>
            <button
              onClick={continuar}
              className="flex-1 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
            >
              Continuar conectado
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
