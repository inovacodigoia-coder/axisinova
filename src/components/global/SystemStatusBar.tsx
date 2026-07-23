import { SYSTEM_VERSION } from '@/utils/version'

export function SystemStatusBar() {
  return (
    <div className="h-6 flex-none flex items-center justify-center gap-3 bg-foreground px-4 text-[11px] text-background/70">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))] animate-pulse" />
        Online
      </span>
      <span>·</span>
      <span>Última sync: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      <span>·</span>
      <span>Versão {SYSTEM_VERSION.formatted}</span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden sm:inline">© 2025 Axis Inova</span>
    </div>
  )
}

