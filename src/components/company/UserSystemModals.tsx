import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Info, Keyboard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UserSystemModalsProps {
  type: 'about' | 'shortcuts' | null
  onClose: () => void
}

export function UserSystemModals({ type, onClose }: UserSystemModalsProps) {
  return (
    <>
      <Dialog open={type === 'about'} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <div className="gradient-bg p-8 flex flex-col items-center text-center text-white space-y-4">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl font-black">AI</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Axis Inova</h2>
              <p className="text-sm text-white/70 font-medium tracking-wide">Patient Health Record Information System</p>
            </div>
          </div>
          <div className="p-8 bg-card space-y-6 text-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Versão</p>
                <p className="text-sm font-bold">1.0.0</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">REF</p>
                <p className="text-sm font-bold">100001</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">LOT</p>
                <p className="text-sm font-bold">1.0.0.001</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Quantity</p>
                <p className="text-sm font-bold">1</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground italic">
                © 2025 InovaCódigoIA. Todos os direitos reservados.
              </p>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
                Este software é licenciado para uso exclusivo de instituições de saúde autorizadas.
                A reprodução não autorizada é estritamente proibida.
              </p>
            </div>
            <div className="pt-4 flex flex-col items-center gap-1">
              <p className="text-[10px] font-bold text-primary tracking-widest uppercase">Natal, RN — Brasil</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={type === 'shortcuts'} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl p-0 h-[80vh] flex flex-col overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 border-b bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Atalhos de Teclado</DialogTitle>
                <p className="text-xs text-muted-foreground">Otimize sua navegação no Axis Inova</p>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background">
            <ShortcutGroup title="Geral">
              <ShortcutItem keys={['Ctrl', 'K']} label="Busca global / Command Palette" />
              <ShortcutItem keys={['Ctrl', 'Shift', 'L']} label="Tela de bloqueio" />
              <ShortcutItem keys={['Ctrl', 'Alt', 'L']} label="Sair do sistema" />
            </ShortcutGroup>

            <ShortcutGroup title="Tela de cadastro (DBPanel)">
              <ShortcutItem keys={['Ctrl', 'S']} label="Salvar registro" />
              <ShortcutItem keys={['Ctrl', 'Alt', 'N']} label="Adicionar novo" />
              <ShortcutItem keys={['Alt', 'Shift', 'D']} label="Inativar registro" />
              <ShortcutItem keys={['Ctrl', 'Shift', 'S']} label="Liberar / Concluir" />
              <ShortcutItem keys={['Ctrl', 'Alt', 'V']} label="Visualizar" />
              <ShortcutItem keys={['Ctrl', 'D']} label="Duplicar" />
              <ShortcutItem keys={['Ctrl', 'Delete']} label="Deletar selecionados" />
            </ShortcutGroup>

            <ShortcutGroup title="Formulários">
              <ShortcutItem keys={['Tab']} label="Próximo campo" />
              <ShortcutItem keys={['Shift', 'Tab']} label="Campo anterior" />
              <ShortcutItem keys={['Ctrl', 'L']} label="Abre o localizador do campo" />
              <ShortcutItem keys={['Shift', 'F1']} label="Ajuda contextual" />
            </ShortcutGroup>

            <ShortcutGroup title="Grids & Listas">
              <ShortcutItem keys={['Ctrl', 'Alt', 'F']} label="Alternar filtros" />
              <ShortcutItem keys={['↑']} label="Registro acima" />
              <ShortcutItem keys={['↓']} label="Registro abaixo" />
              <ShortcutItem keys={['Ctrl', 'R']} label="Atualizar consulta" />
              <ShortcutItem keys={['F2']} label="Editar linha selecionada" />
              <ShortcutItem keys={['Ctrl', 'E']} label="Exportar para Excel" />
            </ShortcutGroup>

            <ShortcutGroup title="Editor de Texto">
              <ShortcutItem keys={['Ctrl', 'B']} label="Negrito" />
              <ShortcutItem keys={['Ctrl', 'I']} label="Itálico" />
              <ShortcutItem keys={['Ctrl', 'U']} label="Sublinhado" />
            </ShortcutGroup>
          </div>
          <div className="p-4 border-t bg-muted/30 flex justify-end">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ShortcutGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary ml-1">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  )
}

function ShortcutItem({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm group hover:border-primary/30 transition-colors">
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd key={i} className="px-1.5 py-0.5 min-w-[20px] text-center text-[10px] font-bold bg-muted border border-border rounded-md shadow-sm">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  )
}
