import { useState } from 'react'
import { AttendanceCadastroModal } from '@/components/reception/attendance/AttendanceCadastroModal'
import { useCompanyContext } from '@/context/CompanyContext'
import { Building2 } from 'lucide-react'

export default function DirectCadastroPage() {
  const { activeSector } = useCompanyContext()
  const [open, setOpen] = useState(true)

  // Se não tiver setor selecionado, mostramos um aviso (embora o layout já deva garantir isso)
  if (!activeSector) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
          <h2 className="mt-4 text-lg font-semibold">Selecione um setor</h2>
          <p className="text-sm text-muted-foreground">Você precisa selecionar um setor para realizar o cadastro.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
      <div className="text-center">
        <Building2 className="mx-auto h-12 w-12 text-primary opacity-20" />
        <h2 className="mt-4 text-lg font-semibold">Cadastro Direto</h2>
        <p className="mb-6 text-sm text-muted-foreground">Clique no botão abaixo para iniciar o processo de cadastro.</p>
        <button 
          onClick={() => setOpen(true)}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
        >
          Abrir Cadastro de Atendimento
        </button>
      </div>

      <AttendanceCadastroModal
        open={open}
        onClose={() => setOpen(false)}
        unitId={activeSector.id}
        unitName={activeSector.name}
      />
    </div>
  )
}
