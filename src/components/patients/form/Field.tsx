// =====================================================================
// Field — wrapper minimalista para inputs do form de Pacientes
// =====================================================================
import * as React from 'react'
import { useFormContext, get } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface FieldProps {
  name: string
  label?: string
  required?: boolean
  hint?: string
  className?: string
  children: React.ReactNode
}

export function Field({ name, label, required, hint, className, children }: FieldProps) {
  const { formState: { errors } } = useFormContext()
  const error = get(errors, name)
  const id = `f-${name}`
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id,
            'aria-required': required,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined,
          })
        : children}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-[11px] font-medium text-destructive">
          {String((error as any).message ?? 'Campo inválido')}
        </p>
      )}
    </div>
  )
}

interface SectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function FormSection({ title, description, children }: SectionProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
