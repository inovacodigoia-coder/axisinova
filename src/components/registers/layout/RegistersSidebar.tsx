import { NavLink, useLocation } from 'react-router-dom'
import { Stethoscope, Heart, FlaskConical, Scissors, ArrowLeft, Sparkles, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRegisters } from '@/context/RegistersContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

const NAV_ITEMS = [
  { path: '/app/cadastros/pacientes', label: 'Pacientes', icon: Users, countKey: 'patients' as const },
  { path: '/app/cadastros/medicos', label: 'Médicos', icon: Stethoscope, countKey: 'doctors' as const },
  { path: '/app/cadastros/especialidades', label: 'Especialidades', icon: Sparkles, countKey: 'specialties' as const, indent: true },
  { path: '/app/cadastros/convenios', label: 'Convênios', icon: Heart, countKey: 'convenios' as const },
  { path: '/app/cadastros/convenios/anexos', label: 'Regras de Anexos', icon: Heart, countKey: null, indent: true },
  { path: '/app/cadastros/exames', label: 'Exames', icon: FlaskConical, countKey: 'exams' as const },
  { path: '/app/cadastros/procedimentos', label: 'Procedimentos', icon: Scissors, countKey: 'procedures' as const },
]

function usePatientsCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!user?.companyId) return
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('company_id', user.companyId)
      .then(({ count: c }) => setCount(c || 0))
  }, [user?.companyId])
  return count
}

export function RegistersSidebar() {
  const location = useLocation()
  const reg = useRegisters()
  const patientsCount = usePatientsCount()

  const getCount = (key: string | null) => {
    if (!key) return null
    const map: Record<string, number> = {
      patients: patientsCount,
      doctors: reg.doctors.length,
      specialties: reg.specialties.length,
      convenios: reg.convenios.length,
      exams: reg.exams.length,
      procedures: reg.procedures.length,
    }
    return map[key] ?? null
  }

  return (
    <aside className="w-[220px] shrink-0 hidden lg:block">
      <div className="sticky top-20 space-y-1">
        <p className="px-3 mb-3 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">Cadastros</p>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path
          const count = getCount(item.countKey)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                item.indent && 'ml-4 text-[13px]',
                active
                  ? 'gradient-bg text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {count !== null && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[20px] text-center',
                  active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {count}
                </span>
              )}
            </NavLink>
          )
        })}
        <div className="my-3 border-t border-border" />
        <NavLink to="/app/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Menu
        </NavLink>
      </div>
    </aside>
  )
}

export function RegistersMobileNav() {
  const location = useLocation()
  const reg = useRegisters()
  const getCount = (key: string | null) => {
    if (!key) return null
    const map: Record<string, number> = { doctors: reg.doctors.length, specialties: reg.specialties.length, convenios: reg.convenios.length, exams: reg.exams.length, procedures: reg.procedures.length }
    return map[key] ?? null
  }
  const current = NAV_ITEMS.find(i => location.pathname === i.path)

  return (
    <div className="lg:hidden mb-4">
      <select
        value={location.pathname}
        onChange={e => window.location.href = e.target.value}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      >
        {NAV_ITEMS.filter(i => !i.indent).map(item => {
          const count = getCount(item.countKey)
          return <option key={item.path} value={item.path}>{item.label} {count !== null ? `(${count})` : ''}</option>
        })}
      </select>
    </div>
  )
}
