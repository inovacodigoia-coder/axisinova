import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { getWorkMap } from '@/mocks/work-map.mock'

export default function LabMapaViewPage() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const map = codigo ? getWorkMap(codigo) : undefined

  return (
    <div className="space-y-5">
      <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/app/lab/mapa')}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="text-xl font-bold">Mapa gerado com sucesso</h1>
        <p className="text-sm text-muted-foreground">
          Mapa <span className="font-mono font-bold">{codigo}</span>
          {map && <> — {map.itemsCount} exame(s), setor {map.sector}, responsável {map.responsible}</>}
        </p>
        <p className="text-xs text-muted-foreground">Visualização completa na próxima etapa.</p>
      </Card>
    </div>
  )
}
