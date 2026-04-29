import { memo } from 'react'
import { Eye, Pencil, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Patient } from '@/types/patient.types'
import { STATUS_LABELS, STATUS_COLORS } from '@/types/patient.types'
import { calculateAge, formatPhoneDisplay, maskCPFPrivate } from '@/utils/patient.validators'
import { formatRelativeTime } from '@/utils/formatters'

interface Props {
  patients: Patient[]
  onView: (p: Patient) => void
  onEdit: (p: Patient) => void
  onQuickView: (p: Patient) => void
}

function Table({ patients, onView, onEdit, onQuickView }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-3 text-left w-10">#</th>
            <th className="px-3 py-3 text-left">Nome</th>
            <th className="px-3 py-3 text-left">Nascimento</th>
            <th className="px-3 py-3 text-left">CPF</th>
            <th className="px-3 py-3 text-left">Telefone</th>
            <th className="px-3 py-3 text-left">Convênio</th>
            <th className="px-3 py-3 text-left">Último Atend.</th>
            <th className="px-3 py-3 text-left">Status</th>
            <th className="px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p, idx) => {
            const age = calculateAge(p.birthDate)
            const conv = p.convenios[0]
            return (
              <tr
                key={p.id}
                onClick={() => onQuickView(p)}
                className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                <td className="px-3 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-bg text-white text-xs font-bold">
                      {p.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{p.fullName}</p>
                      {p.socialName && (
                        <p className="text-[11px] text-muted-foreground truncate">({p.socialName})</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-foreground text-xs">
                  {p.birthDate ? new Date(p.birthDate).toLocaleDateString('pt-BR') : '—'}
                  {age !== undefined && <span className="text-muted-foreground"> · {age}a</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-foreground">{maskCPFPrivate(p.cpf)}</td>
                <td className="px-3 py-2.5 text-xs text-foreground">{formatPhoneDisplay(p.phone1)}</td>
                <td className="px-3 py-2.5">
                  {conv ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {conv.convenioName}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground" title={p.lastAttendance || ''}>
                  {p.lastAttendance ? formatRelativeTime(p.lastAttendance) : 'Nunca'}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_COLORS[p.status])}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <IconBtn title="Ver perfil" onClick={() => onView(p)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Editar" onClick={() => onEdit(p)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Mais"><MoreVertical className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
      {children}
    </button>
  )
}

export const PatientTable = memo(Table)
