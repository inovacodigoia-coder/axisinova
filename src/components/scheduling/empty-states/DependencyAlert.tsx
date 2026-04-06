import { useNavigate } from 'react-router-dom'

interface Props {
  icon?: string
  message: string
  actionLabel?: string
  actionRoute?: string
  variant?: 'warning' | 'info' | 'error'
}

const variants = {
  warning: { bg: 'bg-yellow-50', border: 'border-l-yellow-400', text: 'text-yellow-800' },
  info: { bg: 'bg-blue-50', border: 'border-l-blue-400', text: 'text-blue-800' },
  error: { bg: 'bg-red-50', border: 'border-l-red-400', text: 'text-red-800' },
}

export function DependencyAlert({ icon = '⚠️', message, actionLabel, actionRoute, variant = 'warning' }: Props) {
  const navigate = useNavigate()
  const v = variants[variant]

  return (
    <div className={`rounded-lg border-l-[3px] ${v.border} ${v.bg} px-4 py-3 flex items-start gap-2`}>
      <span className="text-base">{icon}</span>
      <div className="flex-1">
        <p className={`text-sm ${v.text}`}>{message}</p>
        {actionLabel && actionRoute && (
          <button onClick={() => navigate(actionRoute)}
            className="mt-1 text-xs font-medium text-primary hover:underline">
            → {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
