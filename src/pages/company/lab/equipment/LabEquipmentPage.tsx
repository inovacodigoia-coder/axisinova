import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit2, Trash2, Monitor, AlertCircle, CheckCircle2, MoreVertical } from 'lucide-react'
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

export default function LabEquipmentPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const equipment = [
    { id: '1', name: 'Analisador Bioquímico AU680', identifier: 'BIO-AU680', type: 'Bioquímico', brand: 'Beckman Coulter', status: 'active' },
    { id: '2', name: 'Analisador Hematológico XN-1000', identifier: 'HEM-XN1000', type: 'Hematológico', brand: 'Sysmex', status: 'active' },
    { id: '3', name: 'Centrífuga Teste PW', identifier: 'CENT-PW-01', type: 'Centrífuga', brand: 'Fanem', status: 'active' },
    { id: '4', name: 'Hematológico Icounter 5D', identifier: 'Icounter5D', type: 'Hematológico', brand: 'Icounter', status: 'active' },
  ]

  const filtered = equipment.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.identifier.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os equipamentos conectados e cadastrados no laboratório.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Novo Equipamento
        </Button>
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
                            <p className="text-[10px] text-muted-foreground">{item.type}</p>
                          </div>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <Badge variant="outline" className="font-mono text-[10px]">{item.identifier}</Badge>
                     </td>
                     <td className="px-6 py-4 text-muted-foreground">{item.brand}</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs">Ativo</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toast.info('Editar equipamento')}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600">
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
            <DialogTitle>Novo Equipamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Equipamento *</Label>
              <Input id="name" placeholder="Ex: Analisador Bioquímico" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifier">Identificador (ID de Interface) *</Label>
              <Input id="identifier" placeholder="Ex: BIO-01" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className="w-full h-10 px-3 rounded-lg border bg-background text-sm outline-none">
                  <option>Bioquímico</option>
                  <option>Hematológico</option>
                  <option>Centrífuga</option>
                  <option>Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Marca / Modelo</Label>
                <Input placeholder="Ex: Beckman" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Ativo</Label>
              <Switch defaultChecked />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={() => {
              toast.success('Equipamento cadastrado!')
              setIsModalOpen(false)
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
