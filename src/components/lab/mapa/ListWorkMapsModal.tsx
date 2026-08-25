import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Map, Trash2, Calendar, User, Search, Eye } from 'lucide-react'
import { getWorkMaps, loadWorkMaps, deleteWorkMap, WorkMapRecord } from '@/mocks/work-map.mock'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface ListWorkMapsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

export function ListWorkMapsModal({ open, onOpenChange, onRefresh }: ListWorkMapsModalProps) {
  const navigate = useNavigate()
  const [maps, setMaps] = useState<WorkMapRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (open) {
      setMaps(getWorkMaps().sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()))
    }
  }, [open])

  const handleDelete = (code: string) => {
    if (window.confirm(`Deseja realmente excluir o mapa ${code}? Os exames voltarão para a fila de geração.`)) {
      deleteWorkMap(code)
      setMaps(getWorkMaps().sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()))
      toast.success(`Mapa ${code} excluído com sucesso.`)
      onRefresh?.()
    }
  }

  const filteredMaps = maps.filter(m => 
    m.code.includes(searchTerm) || 
    m.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.responsible.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Mapas de Trabalho Gerados
          </DialogTitle>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por código, bancada ou responsável..." 
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto mt-2 min-h-[300px]">
          {filteredMaps.length === 0 ? (
            <EmptyState
              icon={<Map className="h-10 w-10 text-muted-foreground" />}
              title="Nenhum mapa encontrado"
              description={searchTerm ? "Tente ajustar os termos da busca." : "Ainda não foram gerados mapas de trabalho."}
            />
          ) : (
            <div className="grid gap-3 p-1">
              {filteredMaps.map((map) => (
                <Card key={map.code} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">#{map.code}</span>
                      <Badge variant="outline" className="bg-primary/5">{map.sector}</Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(map.generatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {map.responsible}
                      </div>
                      <div className="font-semibold">
                        {map.itemsCount} exames
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => navigate(`/app/lab/mapa/${map.code}`)}
                    >
                      <Eye className="h-4 w-4" /> Visualizar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10 border-destructive/20"
                      onClick={() => handleDelete(map.code)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
