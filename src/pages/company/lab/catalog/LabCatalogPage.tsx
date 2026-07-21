import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Filter, LayoutGrid, List, MoreVertical, Edit2, Trash2, Beaker } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useRegisters } from '@/context/RegistersContext'

export default function LabCatalogPage() {
  const navigate = useNavigate()
  const { exams: registeredExams, isLoading } = useRegisters()
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [search, setSearch] = useState('')

  const exams = useMemo(() => {
    if (isLoading) return []
    
    if (registeredExams.length > 0) {
      return registeredExams
        .filter(e => e.type === 'lab')
        .map(e => ({
          id: e.id,
          code: e.internalCode || e.tussCode || 'S/C',
          name: e.name,
          material: 'Soro', // Padrão se não houver no cadastro
          workbench: 'Bioquímica',
          status: e.isActive ? 'active' : 'inactive'
        }))
    }
    
    return [
      { id: '1', code: 'VITD', name: '25-Hidroxivitamina D', material: 'Soro', workbench: 'Bioquímica', status: 'active' },
      { id: '2', code: 'ACU', name: 'Ácido Úrico', material: 'Soro', workbench: 'Bioquímica', status: 'active' },
      { id: '3', code: 'HEM', name: 'Hemograma Completo', material: 'Sangue Total EDTA', workbench: 'Hematologia', status: 'active' },
      { id: '4', code: 'GL', name: 'Glicose', material: 'Soro/Plasma Fluoretado', workbench: 'Bioquímica', status: 'active' },
      { id: '5', code: 'TSH', name: 'Hormônio Tireoestimulante', material: 'Soro', workbench: 'Imunologia', status: 'active' },
    ]
  }, [registeredExams, isLoading])

  const filteredExams = exams.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Exames</h1>
          <p className="text-sm text-muted-foreground">Gerencie os exames disponíveis no laboratório.</p>
        </div>
        <Button onClick={() => navigate('novo')} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Novo Exame
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
            placeholder="Buscar por nome, código ou material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setView('list')}
              className={cn("rounded-none px-3", view === 'list' && "bg-muted")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setView('grid')}
              className={cn("rounded-none px-3", view === 'grid' && "bg-muted")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))
        ) : filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-bold text-lg">Nenhum exame encontrado</h3>
            <p className="text-muted-foreground">Ajuste sua busca ou cadastre um novo exame.</p>
          </div>
        ) : view === 'list' ? (
          <Card className="overflow-hidden border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Exame</th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Código</th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Material</th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Bancada</th>
                  <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">{exam.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-mono text-[10px]">{exam.code}</Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{exam.material}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-1 bg-primary/5 text-primary rounded-md">{exam.workbench}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs">Ativo</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`${exam.id}/editar`)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => (
              <Card key={exam.id} className="p-4 hover:border-primary/30 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Beaker className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="font-mono">{exam.code}</Badge>
                </div>
                <h3 className="font-bold text-foreground mb-1">{exam.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{exam.material}</p>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{exam.workbench}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`${exam.id}/editar`)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
