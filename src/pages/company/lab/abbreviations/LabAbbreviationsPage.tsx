import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Edit2, Trash2, Type, CheckCircle2 } from 'lucide-react'
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

export default function LabAbbreviationsPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const abbreviations = [
    { id: '1', shortcut: 'N', expansion: 'Normal', active: true },
    { id: '2', shortcut: 'A', expansion: 'Alterado', active: true },
    { id: '3', shortcut: 'NR', expansion: 'Não Reagente', active: true },
    { id: '4', shortcut: 'R', expansion: 'Reagente', active: true },
    { id: '5', shortcut: 'I', expansion: 'Indeterminado', active: true },
  ]

  const filtered = abbreviations.filter(a => 
    a.shortcut.toLowerCase().includes(search.toLowerCase()) || 
    a.expansion.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abreviaturas</h1>
          <p className="text-sm text-muted-foreground">Atalhos de digitação para agilizar a inserção de resultados técnicos.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Nova Abreviatura
        </Button>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar por abreviatura ou expansão..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <Type className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-bold text-lg">Nenhuma abreviatura encontrada</h3>
            <p className="text-muted-foreground">Cadastre atalhos para os resultados mais comuns.</p>
          </div>
        ) : (
          <Card className="overflow-hidden border-border">
             <table className="w-full text-left text-sm">
               <thead className="bg-muted/50 border-b">
                 <tr>
                   <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Abreviatura</th>
                   <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Expansão</th>
                   <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Status</th>
                   <th className="px-6 py-3 text-right"></th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {filtered.map((item) => (
                   <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                     <td className="px-6 py-4">
                        <Badge variant="outline" className="font-black text-primary bg-primary/5 px-2 py-1">
                          {item.shortcut}
                        </Badge>
                     </td>
                     <td className="px-6 py-4 font-medium text-foreground">
                        {item.expansion}
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs">Ativo</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
            <DialogTitle>Nova Abreviatura</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shortcut">Abreviatura (Atalho) *</Label>
              <Input id="shortcut" placeholder="Ex: N" maxLength={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expansion">Expansão (Texto completo) *</Label>
              <Input id="expansion" placeholder="Ex: Normal" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Ativo</Label>
              <Switch defaultChecked />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={() => {
              toast.success('Abreviatura cadastrada!')
              setIsModalOpen(false)
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
