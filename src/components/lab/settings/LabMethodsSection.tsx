import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Beaker, Plus, Edit2, Trash2, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export default function LabMethodsSection() {
  const [methods, setMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  // Atribuição em massa por bancada
  const [workbenches, setWorkbenches] = useState<any[]>([])
  const [selectedBench, setSelectedBench] = useState<string>('')
  const [benchExams, setBenchExams] = useState<any[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([])
  const [loadingExams, setLoadingExams] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const fetchWorkbenches = async () => {
    const { data } = await supabase
      .from('lab_workbenches' as any)
      .select('id, name')
      .eq('company_id', user?.companyId)
      .order('name')
    setWorkbenches((data as any[]) || [])
  }

  const fetchBenchExams = async (benchId: string) => {
    if (!benchId) { setBenchExams([]); setSelectedExamIds([]); return }
    try {
      setLoadingExams(true)
      const { data, error } = await supabase
        .from('exams' as any)
        .select('id, name, internal_code, methodology')
        .eq('company_id', user?.companyId)
        .eq('workbench_id', benchId)
        .order('name')
      if (error) throw error
      setBenchExams((data as any[]) || [])
      setSelectedExamIds([])
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar exames da bancada')
    } finally {
      setLoadingExams(false)
    }
  }

  const applyMethodology = async (methodName: string, silent = false) => {
    if (!methodName || selectedExamIds.length === 0) return true
    const { data, error } = await supabase
      .from('exams' as any)
      .update({ methodology: methodName })
      .eq('company_id', user?.companyId)
      .in('id', selectedExamIds)
      .select('id')
    if (error) {
      console.error(error)
      toast.error(`Erro ao atribuir metodologia: ${error.message}`)
      return false
    }
    const count = (data as any[])?.length ?? 0
    if (count === 0) {
      toast.error('Nenhum exame foi atualizado (verifique as permissões).')
      return false
    }
    if (!silent) toast.success(`Metodologia atribuída a ${count} exame(s)`)
    return true
  }

  const handleAssignMethodology = async () => {
    if (!editingMethod) return
    try {
      setAssigning(true)
      const ok = await applyMethodology(editingMethod.name)
      if (ok) await fetchBenchExams(selectedBench)
    } finally {
      setAssigning(false)
    }
  }

  useEffect(() => {
    if (user?.companyId) {
      fetchMethods()
    }
  }, [user?.companyId])

  const fetchMethods = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('lab_methods' as any)
        .select('*')
        .eq('company_id', user?.companyId)
        .order('name')
      
      if (error) throw error

      if (!data || data.length === 0) {
        // Insert defaults if empty
        const defaults = [
          { name: 'Colorimétrico', description: 'Método colorimétrico clássico', company_id: user?.companyId },
          { name: 'Glicose-oxidase', description: 'Método enzimático GOD-PAP', company_id: user?.companyId },
          { name: 'Hexoquinase', description: 'Método enzimático Hexoquinase', company_id: user?.companyId },
          { name: 'Quimioluminescência', description: 'Imunoensaio quimioluminescente', company_id: user?.companyId }
        ]
        
        const { data: inserted, error: insertError } = await supabase
          .from('lab_methods' as any)
          .insert(defaults)
          .select()
        
        if (insertError) throw insertError
        setMethods(inserted || [])
      } else {
        setMethods(data)
      }
    } catch (error) {
      console.error('Error fetching methods:', error)
      toast.error('Erro ao carregar metodologias')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (method: any = null) => {
    setEditingMethod(method)
    setFormData({
      name: method ? method.name : '',
      description: method ? method.description || '' : ''
    })
    setSelectedBench('')
    setBenchExams([])
    setSelectedExamIds([])
    setIsDialogOpen(true)
    if (method) fetchWorkbenches()
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome da metodologia é obrigatório')
      return
    }

    try {
      setSaving(true)
      const payload = {
        ...formData,
        company_id: user?.companyId,
        updated_at: new Date().toISOString()
      }

      if (editingMethod) {
        const { error } = await supabase
          .from('lab_methods' as any)
          .update(payload)
          .eq('id', editingMethod.id)
        
        if (error) throw error
        toast.success('Metodologia atualizada com sucesso')
      } else {
        const { error } = await supabase
          .from('lab_methods' as any)
          .insert(payload)
        
        if (error) throw error
        toast.success('Metodologia criada com sucesso')
      }

      setIsDialogOpen(false)
      fetchMethods()
    } catch (error) {
      console.error('Error saving method:', error)
      toast.error('Erro ao salvar metodologia')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta metodologia?')) return

    try {
      const { error } = await supabase
        .from('lab_methods' as any)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Metodologia excluída com sucesso')
      fetchMethods()
    } catch (error) {
      console.error('Error deleting method:', error)
      toast.error('Erro ao excluir metodologia')
    }
  }

  const filteredMethods = methods.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Metodologias Analíticas</h3>
          <p className="text-xs text-muted-foreground">Gerencie as metodologias utilizadas nos exames laboratoriais.</p>
        </div>
        <Button size="sm" onClick={() => handleOpenDialog()} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Nova Metodologia
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar metodologia..." 
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMethods.map(m => (
            <div key={m.id} className="p-4 border rounded-xl bg-card flex items-center justify-between group hover:border-primary/30 transition-all border-border shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.description || 'Sem descrição'}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(m)} className="h-8 w-8 p-0">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {filteredMethods.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
              <Beaker className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma metodologia encontrada.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Editar Metodologia' : 'Nova Metodologia'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da metodologia analítica.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Metodologia *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ex: Colorimétrico, HPLC, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição / Observações</Label>
              <textarea 
                className="w-full h-24 p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none" 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Descreva detalhes do método..."
              />
            </div>

            {editingMethod && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label className="text-sm font-bold">Atribuir a exames por bancada</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione uma bancada e os exames que devem receber a metodologia <strong>{editingMethod.name}</strong>.
                  </p>
                </div>

                <select
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedBench}
                  onChange={(e) => { setSelectedBench(e.target.value); fetchBenchExams(e.target.value) }}
                >
                  <option value="">Selecione a bancada...</option>
                  {workbenches.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                {loadingExams ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : selectedBench ? (
                  benchExams.length > 0 ? (
                    <div className="border rounded-lg">
                      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedExamIds.length === benchExams.length}
                            onChange={(e) => setSelectedExamIds(e.target.checked ? benchExams.map(x => x.id) : [])}
                          />
                          Selecionar todos ({benchExams.length})
                        </label>
                        <span className="text-[11px] text-muted-foreground">{selectedExamIds.length} selecionado(s)</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto divide-y">
                        {benchExams.map(ex => (
                          <label key={ex.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-muted/30">
                            <input
                              type="checkbox"
                              checked={selectedExamIds.includes(ex.id)}
                              onChange={(e) => setSelectedExamIds(prev => e.target.checked ? [...prev, ex.id] : prev.filter(id => id !== ex.id))}
                            />
                            <span className="flex-1 truncate font-medium">
                              {ex.internal_code ? `${ex.internal_code} — ` : ''}{ex.name}
                            </span>
                            {ex.methodology && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded",
                                ex.methodology === editingMethod.name ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                              )}>
                                {ex.methodology}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-3 text-center border rounded-lg">Nenhum exame nesta bancada.</p>
                  )
                ) : null}

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={selectedExamIds.length === 0 || assigning}
                  onClick={handleAssignMethodology}
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Beaker className="h-4 w-4 mr-2" />}
                  Atribuir metodologia aos exames selecionados
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button className="gradient-bg text-white px-8" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
