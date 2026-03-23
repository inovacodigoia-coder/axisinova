import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { OutlineButton } from '@/components/ui/OutlineButton'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso não permitido</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">Você não tem permissão para acessar esta página. Entre em contato com o administrador se acredita que isso é um erro.</p>
        <Link to="/">
          <OutlineButton variant="gray">Voltar ao início</OutlineButton>
        </Link>
      </div>
    </div>
  )
}
