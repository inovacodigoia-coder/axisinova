import { useState, useEffect, useMemo } from 'react'
import type { PermissionsMap, SystemModule, PermissionAction } from '@/types/permissions.types'
import { SYSTEM_MODULES, ALL_ACTIONS, ACTION_LABELS, RESULT_ENTRY_PERMISSIONS, APOIO_PERMISSIONS, TRIAGEM_PERMISSIONS, WHATSAPP_PERMISSIONS, INOVACHAT_PERMISSIONS, CRM_PERMISSIONS, COLETA_PERMISSIONS } from '@/types/permissions.types'
import { Progress } from '@/components/ui/progress'
import { FINANCEIRO_PERMISSIONS } from '@/lib/financeiro'

interface PermissionsMatrixProps {
  permissions: PermissionsMap
  onChange: (p: PermissionsMap) => void
}

export function PermissionsMatrix({ permissions, onChange }: PermissionsMatrixProps) {
  const [perms, setPerms] = useState<PermissionsMap>(permissions)

  useEffect(() => { onChange(perms) }, [perms])

  const hasAction = (mod: SystemModule, act: PermissionAction) => perms[mod]?.includes(act) || false

  const toggleAction = (mod: SystemModule, act: PermissionAction) => {
    setPerms(prev => {
      const current = [...(prev[mod] || [])]
      let next: PermissionAction[]

      if (current.includes(act)) {
        // Removing
        if (act === 'view') {
          next = [] // Remove all when removing view
        } else {
          next = current.filter(a => a !== act)
        }
      } else {
        // Adding
        next = [...current, act]
        // Auto-add view
        if (!next.includes('view')) next.push('view')
        // Delete implies edit
        if (act === 'delete' && !next.includes('edit')) next.push('edit')
      }

      return { ...prev, [mod]: next }
    })
  }

  const toggleModule = (mod: SystemModule) => {
    setPerms(prev => {
      const current = prev[mod] || []
      if (current.length === ALL_ACTIONS.length) {
        return { ...prev, [mod]: [] }
      }
      return { ...prev, [mod]: [...ALL_ACTIONS] }
    })
  }

  const toggleColumn = (act: PermissionAction) => {
    const allHave = SYSTEM_MODULES.every(m => hasAction(m.key, act))
    setPerms(prev => {
      const next = { ...prev }
      SYSTEM_MODULES.forEach(m => {
        const current = [...(next[m.key] || [])]
        if (allHave) {
          if (act === 'view') next[m.key] = []
          else next[m.key] = current.filter(a => a !== act)
        } else {
          if (!current.includes(act)) current.push(act)
          if (!current.includes('view')) current.push('view')
          next[m.key] = current
        }
      })
      return next
    })
  }

  const toggleAll = () => {
    const total = SYSTEM_MODULES.length * ALL_ACTIONS.length
    const current = SYSTEM_MODULES.reduce((sum, m) => sum + (perms[m.key]?.length || 0), 0)
    if (current === total) {
      setPerms({})
    } else {
      const all: PermissionsMap = {}
      SYSTEM_MODULES.forEach(m => { all[m.key] = [...ALL_ACTIONS] })
      setPerms(all)
    }
  }

  const totalPerms = SYSTEM_MODULES.length * ALL_ACTIONS.length
  const activePerms = SYSTEM_MODULES.reduce((sum, m) => sum + (perms[m.key]?.length || 0), 0)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2">
                <input type="checkbox" checked={activePerms === totalPerms} onChange={toggleAll} className="accent-primary" />
              </th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Módulo</th>
              {ALL_ACTIONS.map(act => (
                <th key={act} className="text-center py-2 px-1">
                  <button onClick={() => toggleColumn(act)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                    {ACTION_LABELS[act]}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SYSTEM_MODULES.map(mod => {
              const modPerms = perms[mod.key] || []
              return (
                <tr key={mod.key} className="border-b border-border hover:bg-muted/20">
                  <td className="py-2 px-2">
                    <input type="checkbox" checked={modPerms.length === ALL_ACTIONS.length} onChange={() => toggleModule(mod.key)} className="accent-primary" />
                  </td>
                  <td className="py-2 px-2 font-medium text-foreground text-xs">{mod.label}</td>
                  {ALL_ACTIONS.map(act => (
                    <td key={act} className="py-2 px-1 text-center">
                      <input type="checkbox" checked={hasAction(mod.key, act)} onChange={() => toggleAction(mod.key, act)} className="accent-primary" />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Digitação de Resultados</p>
          <p className="text-[11px] text-muted-foreground">Permissões específicas da tela de digitação. Quando desmarcado, o botão não aparece para o usuário.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {RESULT_ENTRY_PERMISSIONS.map(p => (
            <label key={p.action} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary mt-0.5"
                checked={perms.result_entry?.includes(p.action) || false}
                onChange={() => setPerms(prev => {
                  const current = prev.result_entry || []
                  const next = current.includes(p.action)
                    ? current.filter(a => a !== p.action)
                    : [...current, p.action]
                  return { ...prev, result_entry: next }
                })}
              />
              <span>
                <span className="block text-xs font-medium text-foreground">{p.label}</span>
                <span className="block text-[10px] text-muted-foreground">{p.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Apoio / Terceirização</p>
            <p className="text-[11px] text-muted-foreground">Com pelo menos uma permissão marcada, o menu APOIO aparece para o usuário.</p>
          </div>
          <button
            type="button"
            className="text-[11px] font-medium text-primary hover:underline"
            onClick={() => setPerms(prev => {
              const cur = ((prev as any).apoio || []) as string[]
              const all = cur.length === APOIO_PERMISSIONS.length
              return { ...prev, apoio: (all ? [] : APOIO_PERMISSIONS.map(p => p.code)) as any }
            })}
          >
            {(((perms as any).apoio || []) as string[]).length === APOIO_PERMISSIONS.length ? 'Desmarcar todas' : 'Marcar todas'}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {APOIO_PERMISSIONS.map(p => {
            const cur = ((perms as any).apoio || []) as string[]
            return (
              <label key={p.code} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5"
                  checked={cur.includes(p.code)}
                  onChange={() => setPerms(prev => {
                    const c = ((prev as any).apoio || []) as string[]
                    const next = c.includes(p.code) ? c.filter(x => x !== p.code) : [...c, p.code]
                    return { ...prev, apoio: next as any }
                  })}
                />
                <span>
                  <span className="block text-xs font-medium text-foreground">{p.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Triagem Lab</p>
            <p className="text-[11px] text-muted-foreground">Com pelo menos uma permissão marcada, o item Setor Técnico › Triagem Lab aparece para o usuário.</p>
          </div>
          <button
            type="button"
            className="text-[11px] font-medium text-primary hover:underline"
            onClick={() => setPerms(prev => {
              const cur = ((prev as any).triagem || []) as string[]
              const all = cur.length === TRIAGEM_PERMISSIONS.length
              return { ...prev, triagem: (all ? [] : TRIAGEM_PERMISSIONS.map(p => p.code)) as any }
            })}
          >
            {(((perms as any).triagem || []) as string[]).length === TRIAGEM_PERMISSIONS.length ? 'Desmarcar todas' : 'Marcar todas'}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRIAGEM_PERMISSIONS.map(p => {
            const cur = ((perms as any).triagem || []) as string[]
            return (
              <label key={p.code} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5"
                  checked={cur.includes(p.code)}
                  onChange={() => setPerms(prev => {
                    const c = ((prev as any).triagem || []) as string[]
                    const next = c.includes(p.code) ? c.filter(x => x !== p.code) : [...c, p.code]
                    return { ...prev, triagem: next as any }
                  })}
                />
                <span>
                  <span className="block text-xs font-medium text-foreground">{p.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Coleta</p>
          <p className="text-[11px] text-muted-foreground">Somente perfis marcados podem programar coleta para data futura.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {COLETA_PERMISSIONS.map(p => {
            const cur = ((perms as any).coleta || []) as string[]
            return (
              <label key={p.code} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5"
                  checked={cur.includes(p.code)}
                  onChange={() => setPerms(prev => {
                    const c = ((prev as any).coleta || []) as string[]
                    const next = c.includes(p.code) ? c.filter(x => x !== p.code) : [...c, p.code]
                    return { ...prev, coleta: next as any }
                  })}
                />
                <span>
                  <span className="block text-xs font-medium text-foreground">{p.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">WhatsApp</p>
          <p className="text-[11px] text-muted-foreground">O administrador da empresa já tem todas.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {WHATSAPP_PERMISSIONS.map(p => {
            const cur = ((perms as any).whatsapp || []) as string[]
            return (
              <label key={p.code} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5"
                  checked={cur.includes(p.code)}
                  onChange={() => setPerms(prev => {
                    const c = ((prev as any).whatsapp || []) as string[]
                    const next = c.includes(p.code) ? c.filter(x => x !== p.code) : [...c, p.code]
                    return { ...prev, whatsapp: next as any }
                  })}
                />
                <span>
                  <span className="block text-xs font-medium text-foreground">{p.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">InovaChat</p>
          <p className="text-[11px] text-muted-foreground">O administrador da empresa já tem todas.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {INOVACHAT_PERMISSIONS.map(p => {
            const cur = ((perms as any).inovachat || []) as string[]
            return (
              <label key={p.code} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5"
                  checked={cur.includes(p.code)}
                  onChange={() => setPerms(prev => {
                    const c = ((prev as any).inovachat || []) as string[]
                    const next = c.includes(p.code) ? c.filter(x => x !== p.code) : [...c, p.code]
                    return { ...prev, inovachat: next as any }
                  })}
                />
                <span>
                  <span className="block text-xs font-medium text-foreground">{p.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">CRM</p>
          <p className="text-[11px] text-muted-foreground">O administrador da empresa já tem todas.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CRM_PERMISSIONS.map(p => {
            const cur = ((perms as any).crm || []) as string[]
            return (
              <label key={p.code} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5"
                  checked={cur.includes(p.code)}
                  onChange={() => setPerms(prev => {
                    const c = ((prev as any).crm || []) as string[]
                    const next = c.includes(p.code) ? c.filter(x => x !== p.code) : [...c, p.code]
                    return { ...prev, crm: next as any }
                  })}
                />
                <span>
                  <span className="block text-xs font-medium text-foreground">{p.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>




      <div className="flex items-center gap-3">
        <fieldset className="border border-border rounded-lg p-4 space-y-3">
          <legend className="text-sm font-semibold">Financeiro</legend>
          {FINANCEIRO_PERMISSIONS.map(p => <label key={p.code} className="flex gap-2 text-sm"><input type="checkbox" checked={(perms.financeiro || []).includes(p.code)} onChange={() => setPerms(prev => { const cur = prev.financeiro || []; return { ...prev, financeiro: cur.includes(p.code) ? cur.filter(x => x !== p.code) : [...cur, p.code] } })} />{p.label}</label>)}
        </fieldset>
        <Progress value={(activePerms / totalPerms) * 100} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{activePerms} de {totalPerms} permissões</span>
      </div>
    </div>
  )
}
