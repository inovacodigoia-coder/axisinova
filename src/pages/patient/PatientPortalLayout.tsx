import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import type { PatientPortalSession } from '@/types/patient-portal.types'
import { LogOut } from 'lucide-react'

export default function PatientPortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<PatientPortalSession | null>(() => {
    const raw = sessionStorage.getItem('axis_patient_session')
    return raw ? JSON.parse(raw) : null
  })

  // Inject manifest & meta tags for PWA
  useEffect(() => {
    const manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    manifestLink.href = '/manifest.patient.json'
    manifestLink.id = 'patient-manifest'
    document.head.appendChild(manifestLink)

    const metas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Meus Resultados' },
    ]
    metas.forEach(({ name, content }) => {
      const meta = document.createElement('meta')
      meta.name = name
      meta.content = content
      meta.setAttribute('data-patient-portal', 'true')
      document.head.appendChild(meta)
    })

    // Add apple touch icon
    const icon = document.createElement('link')
    icon.rel = 'apple-touch-icon'
    icon.href = '/icons/pwa-192.png'
    icon.setAttribute('data-patient-portal', 'true')
    document.head.appendChild(icon)

    return () => {
      document.getElementById('patient-manifest')?.remove()
      document.querySelectorAll('[data-patient-portal]').forEach(el => el.remove())
    }
  }, [])

  // Online/offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); setShowReconnected(true); setTimeout(() => setShowReconnected(false), 3000) }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  const logout = () => {
    sessionStorage.removeItem('axis_patient_session')
    setSession(null)
    navigate('/resultado')
  }

  const login = (s: PatientPortalSession) => {
    sessionStorage.setItem('axis_patient_session', JSON.stringify(s))
    setSession(s)
    navigate('/resultado/exames')
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)' }}>
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-white text-center py-2 text-sm font-medium">
          📡 Você está sem internet. Mostrando dados em cache.
        </div>
      )}
      {showReconnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--success))] text-white text-center py-2 text-sm font-medium">
          ✅ Conexão restaurada!
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              <span className="text-foreground">Axis</span>
              <span className="gradient-text"> Inova</span>
            </span>
            <span className="text-xs text-muted-foreground">· Portal de Resultados</span>
          </div>
          {session && (
            <button onClick={logout} className="rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted flex items-center gap-1">
              <LogOut className="h-3 w-3" /> Sair
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {location.pathname === '/resultado' || location.pathname === '/resultado/' ? (
          <PatientLoginContent onLogin={login} />
        ) : session ? (
          <PatientResultsContent session={session} />
        ) : (
          <PatientLoginContent onLogin={login} />
        )}
      </main>
    </div>
  )
}

// Inline login since it's small
import { MOCK_PATIENTS } from '@/mocks/scheduling.mock'
import { PWAInstallPrompt } from '@/components/patient-portal/PWAInstallPrompt'

function PatientLoginContent({ onLogin }: { onLogin: (s: PatientPortalSession) => void }) {
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanCpf = cpf.replace(/\D/g, '')
    const patient = MOCK_PATIENTS.find(p => {
      const pCpf = p.cpf?.replace(/\D/g, '') || ''
      return pCpf === cleanCpf && p.birthDate === birthDate
    })
    if (patient) {
      onLogin({
        patientId: patient.id,
        patientName: patient.fullName,
        patientBirthDate: patient.birthDate,
        accessToken: `mock_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      })
    } else {
      setError('CPF ou data de nascimento não encontrados. Verifique os dados e tente novamente.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="text-4xl">🏥</div>
        <h1 className="text-xl font-bold text-foreground">Portal de Resultados</h1>
        <p className="text-sm text-muted-foreground">Acesse seus exames com segurança e praticidade</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">CPF</label>
          <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00"
            className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-base" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Data de Nascimento</label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-base" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" className="w-full gradient-bg rounded-xl py-3 text-sm font-bold text-white">
          🔓 Acessar meus resultados
        </button>
      </form>

      <PWAInstallPrompt />

      <p className="text-center text-[10px] text-muted-foreground">
        Dica: Use CPF 123.456.789-00 e nascimento 1983-05-14 para testar
      </p>
    </div>
  )
}

// Patient results page (inline)
import { MOCK_RESULTS } from '@/mocks/results.mock'
import { format } from 'date-fns'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  requested: { label: 'Exame solicitado — aguardando coleta', color: 'text-[hsl(var(--warning))]' },
  collected: { label: 'Amostra coletada — em análise', color: 'text-primary' },
  in_analysis: { label: 'Em análise no laboratório', color: 'text-[hsl(var(--secondary))]' },
  available: { label: '✅ Resultado disponível', color: 'text-[hsl(var(--success))]' },
  delivered: { label: '✅ Entregue', color: 'text-[hsl(var(--success))]' },
}

function PatientResultsContent({ session }: { session: PatientPortalSession }) {
  const results = MOCK_RESULTS.filter(r => r.patientId === session.patientId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Olá, {session.patientName.split(' ')[0]}! 👋</h2>
        <p className="text-sm text-muted-foreground">Seus exames e resultados</p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-medium text-foreground">Nenhum resultado encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Quando seus exames estiverem prontos, aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(r => {
            const status = STATUS_LABELS[r.status] || STATUS_LABELS.requested
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔬</span>
                  <span className="text-sm font-bold text-foreground">{r.examName}</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.doctorName}</p>
                <p className="text-xs text-muted-foreground">Solicitado: {format(new Date(r.requestedAt), 'dd/MM/yyyy')}</p>
                <div className="border-t border-border pt-2">
                  <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
                  {r.deliveredAt && <p className="text-[10px] text-muted-foreground">Disponível desde: {format(new Date(r.deliveredAt), 'dd/MM/yyyy')}</p>}
                </div>
                {(r.status === 'available' || r.status === 'delivered') && (
                  <div className="flex gap-2 pt-1">
                    <button className="rounded-lg gradient-bg px-3 py-2 text-xs font-semibold text-white flex-1">📄 Ver resultado</button>
                    <button onClick={() => import('sonner').then(m => m.toast.info('Baixando resultado...'))}
                      className="rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted flex-1">⬇️ Baixar PDF</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <PWAInstallPrompt />
    </div>
  )
}
