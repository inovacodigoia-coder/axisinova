import { useNavigate } from 'react-router-dom'
import { GradientButton } from '@/components/ui/GradientButton'
import { OutlineButton } from '@/components/ui/OutlineButton'

export function NoDoctorsState() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <span className="text-5xl">📅</span>
      <h2 className="text-xl font-bold text-foreground">Nenhum médico cadastrado ainda</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Para usar o agendamento você precisa cadastrar ao menos um médico.
      </p>
      <div className="flex gap-3">
        <GradientButton onClick={() => navigate('/app/cadastros/medicos')}>
          👨‍⚕️ Cadastrar Médico
        </GradientButton>
        <OutlineButton onClick={() => navigate('/app/cadastros')}>
          ← Ir para Cadastros
        </OutlineButton>
      </div>
    </div>
  )
}
