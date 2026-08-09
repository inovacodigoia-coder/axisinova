import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Filter, LayoutGrid, List, Edit2, Trash2, Beaker, AlertTriangle, ChevronLeft, ChevronRight, Upload, Download, Loader2 } from 'lucide-react'
import { ImportarPlanilhaModal } from '@/components/lab/catalog/ImportarPlanilhaModal'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useRegisters } from '@/context/RegistersContext'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function LabCatalogPage() {
  const navigate = useNavigate()
  const { exams: registeredExams, isLoading, removeExam, workbenches } = useRegisters()
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [search, setSearch] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<string | null>(null)
  
  // Pagination & Filtering state
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedWorkbench, setSelectedWorkbench] = useState<string>('all')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const exams = useMemo(() => {
    if (!registeredExams) return [];
    
    // Show only real exams from the database
    const labExams = registeredExams.filter(e => e && (String(e.type).toLowerCase() === 'lab' || String(e.type).toLowerCase() === 'laboratório' || String(e.type).toLowerCase() === 'laboratorio'));
    
    // Sort by created_at descending so new ones appear first
    const sortedExams = [...labExams].sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    
    return sortedExams.map(e => ({
      id: e.id,
      code: (e.internalCode || e.tussCode || 'S/C').toUpperCase(),
      name: e.name || 'Sem nome',
      material: e.defaultMaterial || 'Soro', 
      workbenchId: e.workbenchId,
      workbench: workbenches?.find(w => w.id === e.workbenchId)?.name || 'Sem Bancada',
      status: e.isActive ? 'active' : 'inactive'
    }));
  }, [registeredExams, workbenches])

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
        e.code.toLowerCase().includes(search.toLowerCase());
      
      const matchesWorkbench = selectedWorkbench === 'all' || e.workbenchId === selectedWorkbench;
      
      return matchesSearch && matchesWorkbench;
    });
  }, [exams, search, selectedWorkbench]);

  // Pagination logic
  const totalPages = Math.ceil(filteredExams.length / pageSize)
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredExams.slice(start, start + pageSize)
  }, [filteredExams, currentPage, pageSize])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedWorkbench, pageSize])

  const handleDelete = async () => {
    if (!examToDelete) return

    try {
      await removeExam(examToDelete)
      toast.success('Exame excluído com sucesso')
      setDeleteConfirmOpen(false)
      setExamToDelete(null)
    } catch (error) {
      console.error('Erro ao excluir exame:', error)
      toast.error('Erro ao excluir o exame')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      
      const labExams = registeredExams.filter(e => 
        e && (String(e.type).toLowerCase() === 'lab' || String(e.type).toLowerCase() === 'laboratório' || String(e.type).toLowerCase() === 'laboratorio')
      )

      if (labExams.length === 0) {
        toast.error('Não há exames para exportar')
        setIsExporting(false)
        return
      }

      // 1. Catálogo de Exames
      const catalogData = labExams.map(e => ({
        'Nome': e.name,
        'Código': e.internalCode || e.tussCode || '',
        'Materiais': (e.selectedMaterials || []).join(', '),
        'Bancada': workbenches?.find(w => w.id === e.workbenchId)?.name || '',
        'Prazo de Entrega': e.resultDeadlineDays || 0,
        'Status': e.isActive ? 'Ativo' : 'Inativo',
        'Unidade de Medida': e.measurementUnit || '',
        'Instruções de Preparo': e.preparationInstructions || '',
        'Duração Estimada (min)': e.estimatedDurationMinutes || 0,
        'Exige Autorização': e.requiresAuthorization ? 'Sim' : 'Não',
        'Metodologia': e.methodology || '',
        'Observações do Laudo': e.reportObservations || '',
        'Equipamento Interface': e.interfacingConfig?.equipmentCode || ''
      }))

      // 2. Parâmetros e Máscara
      const paramsData: any[] = []
      labExams.forEach(e => {
        if (e.parameters && Array.isArray(e.parameters)) {
          e.parameters.forEach((p: any) => {
            paramsData.push({
              'Código do Exame': e.internalCode || e.tussCode || '',
              'Nome do Exame': e.name,
              'Nome do Parâmetro': p.name || '',
              'Unidade': p.unit || '',
              'Tipo': p.type || 'numeric',
              'Fórmula': p.formula || ''
            })
          })
        }
      })

      // 3. Faixas de Referência
      const refsData: any[] = []
      labExams.forEach(e => {
        if (e.referenceValues && Array.isArray(e.referenceValues)) {
          e.referenceValues.forEach((r: any) => {
            refsData.push({
              'Código do Exame': e.internalCode || e.tussCode || '',
              'Nome do Exame': e.name,
              'Parâmetro': r.parameterName || '',
              'Sexo': r.gender || 'both',
              'Idade Mínima': r.ageMin || 0,
              'Idade Máxima': r.ageMax || 120,
              'Valor Mínimo': r.minValue || '',
              'Valor Máximo': r.maxValue || '',
              'Referência Texto': r.textRange || ''
            })
          })
        }
      })

      const wb = XLSX.utils.book_new()
      
      const wsCatalog = XLSX.utils.json_to_sheet(catalogData)
      XLSX.utils.book_append_sheet(wb, wsCatalog, "Catálogo de Exames")
      
      if (paramsData.length > 0) {
        const wsParams = XLSX.utils.json_to_sheet(paramsData)
        XLSX.utils.book_append_sheet(wb, wsParams, "Parâmetros")
      }
      
      if (refsData.length > 0) {
        const wsRefs = XLSX.utils.json_to_sheet(refsData)
        XLSX.utils.book_append_sheet(wb, wsRefs, "Faixas de Referência")
      }

      XLSX.writeFile(wb, `Catalogo_Exames_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Catálogo exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error('Erro ao exportar o catálogo')
    } finally {
      setIsExporting(false)
    }
  }

  const openDeleteConfirm = (id: string) => {
    setExamToDelete(id)
    setDeleteConfirmOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Exames</h1>
          <p className="text-sm text-muted-foreground">Gerencie os exames disponíveis no laboratório.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={isExporting}
            className="gap-2 border-slate-200 text-slate-700"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 
            Exportar Catálogo
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)} className="gap-2 border-slate-200 text-slate-700">
            <Upload className="h-4 w-4" /> Importar Planilha
          </Button>
          <Button onClick={() => navigate('novo')} className="gradient-bg text-white gap-2">
            <Plus className="h-4 w-4" /> Novo Exame
          </Button>
        </div>
      </div>

      <ImportarPlanilhaModal 
        isOpen={importModalOpen} 
        onClose={() => {
          setImportModalOpen(false);
          // Refresh data from Supabase/Context after import
          window.location.reload(); 
        }}
        existingCodes={exams.map(e => e.code)}
      />

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2", selectedWorkbench !== 'all' && "border-primary text-primary")}>
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar por Bancada</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={selectedWorkbench} onValueChange={setSelectedWorkbench}>
                <DropdownMenuRadioItem value="all">Todas as Bancadas</DropdownMenuRadioItem>
                {workbenches?.map(w => (
                  <DropdownMenuRadioItem key={w.id} value={w.id}>{w.name}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="space-y-4">
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
                  {paginatedExams.map((exam) => (
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDeleteConfirm(exam.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Mostrar</p>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">por página</p>
              </div>

              <div className="flex items-center gap-4">
                <p className="text-xs text-muted-foreground">
                  {filteredExams.length > 0 ? Math.min((currentPage - 1) * pageSize + 1, filteredExams.length) : 0} - {Math.min(currentPage * pageSize, filteredExams.length)} de {filteredExams.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                      .map((p, i, arr) => (
                        <div key={p} className="flex items-center">
                          {i > 0 && arr[i-1] !== p - 1 && <span className="text-muted-foreground mx-1 text-xs">...</span>}
                          <Button 
                            variant={currentPage === p ? "default" : "outline"} 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        </div>
                      ))
                    }
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedExams.map((exam) => (
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => openDeleteConfirm(exam.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination for Grid View */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Mostrar</p>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">por página</p>
              </div>

              <div className="flex items-center gap-4">
                <p className="text-xs text-muted-foreground">
                  {filteredExams.length > 0 ? Math.min((currentPage - 1) * pageSize + 1, filteredExams.length) : 0} - {Math.min(currentPage * pageSize, filteredExams.length)} de {filteredExams.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exame? Esta ação não poderá ser desfeita e removerá o exame do catálogo permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExamToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir Exame
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
