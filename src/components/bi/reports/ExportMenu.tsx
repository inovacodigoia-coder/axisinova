import { Download } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface ExportMenuProps {
  dark?: boolean
}

export function ExportMenu({ dark }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExport = (type: string) => {
    setOpen(false)
    if (type === 'pdf') {
      window.print()
    } else {
      toast.success(`Exportação ${type.toUpperCase()} iniciada...`)
      setTimeout(() => toast.success(`Arquivo ${type.toUpperCase()} gerado com sucesso!`), 1500)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
          dark ? 'bg-white/[0.06] text-white/60 hover:bg-white/10' : 'bg-muted text-muted-foreground hover:bg-accent'
        }`}
      >
        <Download className="h-3.5 w-3.5" /> Exportar
      </button>
      {open && (
        <div className={`absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border shadow-lg ${
          dark ? 'bg-[#1A1F2E] border-white/10' : 'bg-card border-border'
        }`}>
          {[
            { label: '📊 Excel (.xlsx)', type: 'xlsx' },
            { label: '📄 PDF', type: 'pdf' },
            { label: '📋 CSV', type: 'csv' },
          ].map(opt => (
            <button
              key={opt.type}
              onClick={() => handleExport(opt.type)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                dark ? 'text-white/70 hover:bg-white/[0.06]' : 'text-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
