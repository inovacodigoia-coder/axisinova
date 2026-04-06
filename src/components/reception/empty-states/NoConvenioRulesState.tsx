import { Info, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  convenioName: string
}

export function NoConvenioRulesState({ convenioName }: Props) {
  const navigate = useNavigate()
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-blue-800">Nenhuma regra de anexo configurada</p>
          <p className="text-blue-600 mt-1">
            O convênio "<strong>{convenioName}</strong>" não possui regras de documentos configuradas.
            O check-in pode ser concluído normalmente.
          </p>
          <button
            onClick={() => navigate('/app/cadastros/convenios')}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" /> Configurar anexos do convênio
          </button>
        </div>
      </div>
    </div>
  )
}
