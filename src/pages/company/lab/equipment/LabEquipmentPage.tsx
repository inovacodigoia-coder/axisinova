import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit2, Trash2, Monitor, Loader2, KeyRound, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { InstrumentWebhooksModal } from '@/components/lab/equipment/InstrumentWebhooksModal'

export default function LabEquipmentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [equipment, setEquipment] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  
  const [webhookModal, setWebhookModal] = useState<{ open: boolean, id: string, name: string }>({
    open: false,
    id: '',
    name: ''
  })

  const [formData, setFormData] = useState({
    name: '',
    identifier: '',
    type: 'Bioquímico',
    brand: '',
    is_active: true
  })

  const fetchEquipment = async () => {
    if (!user?.companyId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lab_equipments' as any)
        .select('*')
        .eq('company_id', user.companyId)
        .order('name')
      
      if (error) throw error
      setEquipment(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar equipamentos:', error)
      toast.error('Erro ao carregar equipamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipment()
  }, [user?.companyId])

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        identifier: item.serial_number || '',
        type: item.connection_type || 'Bioquímico',
        brand: item.manufacturer || item.model || '',
        is_active: item.is_active ?? true
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        identifier: '',
        type: 'Bioquímico',
        brand: '',
        is_active: true
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.identifier) {
      toast.error('Nome e Identificador são obrigatórios')
      return
    }

    setSaving(true)
    try {
      if (!user?.companyId) {
        toast.error('Não foi possível identificar a empresa do usuário')
        return
      }

      const payload = {
        company_id: user.companyId,
        name: formData.name.trim(),
        serial_number: formData.identifier.trim(),
        connection_type: formData.type,
        manufacturer: formData.brand.trim() || null,
        is_active: formData.is_active
      }

      if (editingItem) {
        const { error } = await supabase
          .from('lab_equipments' as any)
          .update(payload)
          .eq('id', editingItem.id)
        
        if (error) throw error
        toast.success('Equipamento atualizado!')
      } else {
        const { error } = await supabase
          .from('lab_equipments' as any)
          .insert([payload])
        
        if (error) throw error
        toast.success('Equipamento cadastrado!')
      }

      setIsModalOpen(false)
      fetchEquipment()
    } catch (error: any) {
      console.error('Erro ao salvar equipamento:', error)
      toast.error(error?.message || 'Erro ao salvar equipamento')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este equipamento?')) return

    try {
      const { error } = await supabase
        .from('lab_equipments' as any)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Equipamento excluído!')
      fetchEquipment()
    } catch (error: any) {
      console.error('Erro ao excluir equipamento:', error)
      toast.error('Erro ao excluir equipamento')
    }
  }


  const filtered = equipment.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    (e.serial_number || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os equipamentos conectados e cadastrados no laboratório.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/app/cadastros/equipamentos/integracao')}>
            <KeyRound className="h-4 w-4" /> Integração / API Key
          </Button>
          <Button onClick={() => handleOpenModal()} className="gradient-bg text-white gap-2">
            <Plus className="h-4 w-4" /> Novo Equipamento
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar por nome ou identificador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-bold text-lg">Nenhum equipamento encontrado</h3>
            <p className="text-muted-foreground">Adicione seu primeiro equipamento de análise.</p>
          </div>
        ) : (
          <Card className="overflow-hidden border-border">
             <table className="w-full text-left text-sm">
               <thead className="bg-muted/50 border-b">
                 <tr>
                   <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Equipamento</th>
                   <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Identificador</th>
                   <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Marca/Modelo</th>
                   <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Status</th>
                   <th className="px-6 py-3 text-right"></th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {filtered.map((item) => (
                   <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Monitor className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold">{item.name}</p>
                             <p className="text-[10px] text-muted-foreground">{item.connection_type}</p>
                          </div>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                         <Badge variant="outline" className="font-mono text-[10px]">{item.serial_number}</Badge>
                     </td>
                      <td className="px-6 py-4 text-muted-foreground">{item.manufacturer || item.model}</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("h-1.5 w-1.5 rounded-full", item.is_active ? "bg-emerald-500" : "bg-red-500")} />
                          <span className="text-xs">{item.is_active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenModal(item)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </Card>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Equipamento *</Label>
              <Input 
                id="name" 
                placeholder="Ex: Analisador Bioquímico" 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifier">Identificador (ID de Interface) *</Label>
              <Input 
                id="identifier" 
                placeholder="Ex: BIO-01" 
                value={formData.identifier}
                onChange={(e) => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option>Bioquímico</option>
                  <option>Hematológico</option>
                  <option>Centrífuga</option>
                  <option>Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Marca / Modelo</Label>
                <Input 
                  placeholder="Ex: Beckman" 
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Ativo</Label>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(val) => setFormData(prev => ({ ...prev, is_active: val }))}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <div>
              {editingItem && (
                <Button 
                  type="button"
                  variant="outline" 
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => {
                    setIsModalOpen(false)
                    setWebhookModal({ open: true, id: editingItem.id, name: editingItem.name })
                  }}
                >
                  <Globe className="h-4 w-4" /> Webhooks
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
              <Button className="gradient-bg text-white" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingItem ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InstrumentWebhooksModal 
        isOpen={webhookModal.open}
        onClose={() => setWebhookModal(prev => ({ ...prev, open: false }))}
        instrumentId={webhookModal.id}
        instrumentName={webhookModal.name}
      />
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}

