import { cn } from '@/lib/utils'

interface OccupancyGaugeProps { value: number; total: number; occupied: number; dark?: boolean }

export function OccupancyGauge({ value, total, occupied, dark }: OccupancyGaugeProps) {
  const getColor = (v: number) => {
    if (v < 50) return '#FC8181'
    if (v < 70) return '#F6AD55'
    if (v < 85) return '#38A169'
    return '#00D4FF'
  }

  const angle = (value / 100) * 180
  const color = getColor(value)

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} strokeWidth="16" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251.3} 251.3`}
        />
        <text x="100" y="90" textAnchor="middle" className="text-3xl font-bold" fill={dark ? 'white' : '#1a202c'} fontSize="36">{value}%</text>
      </svg>
      <p className={cn('text-xs mt-2', dark ? 'text-white/50' : 'text-muted-foreground')}>
        {occupied} slots ocupados de {total} disponíveis
      </p>
    </div>
  )
}
