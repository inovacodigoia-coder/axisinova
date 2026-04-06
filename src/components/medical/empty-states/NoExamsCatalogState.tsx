import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'

export function NoExamsCatalogState() {
  const navigate = useNavigate()
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Nenhum exame ou procedimento cadastrado</p>
          <p className="text-xs text-blue-700 mt-1">
            Para solicitar exames, cadastre-os em Cadastros → Exames e Cadastros → Procedimentos.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => navigate('/app/cadastros/exames')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              🔬 Cadastrar Exames
            </button>
            <button
              onClick={() => navigate('/app/cadastros/procedimentos')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              ⚕️ Cadastrar Procedimentos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
