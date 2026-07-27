import { useState, useEffect } from 'react'
import { MapPin, Building2, Plus, Edit2, Trash2, ShieldCheck, Globe } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Establishment } from '@/types/company-portal.types'
import { useAuth } from '@/context/AuthContext'

export default function EstablishmentsSettingsPage() {
  const { user } = useAuth()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEstablishment, setEditingEstablishment] = useState<Establishment | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    city: '',
    is_main_branch: false
  })

  const loadEstablishments = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('establishments')
      .select(`
        *,
        origins (*)
      `)
      .order('created_at', { ascending: true })
    
    if (error) {
      toast.error('Erro ao carregar estabelecimentos')
    } else {
      setEstablishments(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadEstablishments()
  }, [])

  const handleOpenModal = (establishment?: Establishment) => {
    if (establishment) {
      setEditingEstablishment(establishment)
      setFormData({
        name: establishment.name,
        cnpj: establishment.cnpj || '',
        city: establishment.city || '',
        is_main_branch: establishment.is_main_branch
      })
    } else {
      setEditingEstablishment(null)
      setFormData({ name: '', cnpj: '', city: '', is_main_branch: false })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório')
      return
    }

    const payload = {
      ...formData,
      company_id: user?.companyId
    }

    let error
    if (editingEstablishment) {
      const { error: err } = await supabase
        .from('establishments')
        .update(payload)
        .eq('id', editingEstablishment.id)
      error = err
    } else {
      const { error: err } = await supabase
        .from('establishments')
        .insert([payload])
      error = err
    }

    if (error) {
      toast.error('Erro ao salvar estabelecimento')
    } else {
      toast.success(editingEstablishment ? 'Atualizado com sucesso' : 'Criado com sucesso')
      setIsModalOpen(false)
      loadEstablishments()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('establishments')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Excluído com sucesso')
      loadEstablishments()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estabelecimentos e Origem</h1>
          <p className="text-sm text-muted-foreground">Gerencie as unidades físicas e pontos de atendimento da sua empresa</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Adicionar Estabelecimento
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : establishments.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">Nenhum estabelecimento cadastrado.</p>
          </div>
        ) : (
          establishments.map(e => (
            <div key={e.id} className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${e.is_main_branch ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {e.is_main_branch ? <ShieldCheck className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{e.name}</p>
                    {e.is_main_branch && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider border border-primary/20">
                        Matriz
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {e.cnpj || 'Sem CNPJ'}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.city || 'Cidade não informada'}</span>
                    {(e as any).origins?.length > 0 && (
                      <span className="flex items-center gap-1 bg-primary/5 px-1.5 py-0.5 rounded text-primary font-medium">
                        {(e as any).origins.length} {(e as any).origins.length === 1 ? 'Origem' : 'Origens'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(e)} className="hover:text-primary">
                  <Edit2 className="h-4 w-4" />
                </Button>
                {!e.is_main_branch && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEstablishment ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Estabelecimento</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Unidade Centro ou Matriz"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_main"
                checked={formData.is_main_branch}
                onChange={e => setFormData({ ...formData, is_main_branch: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="is_main" className="text-sm font-normal">Este é o estabelecimento Matriz</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="gradient-bg text-white">Salvar Estabelecimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
