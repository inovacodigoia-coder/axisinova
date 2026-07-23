import { useState, useMemo } from 'react'
import { Plus, Trash2, Search, DollarSign } from 'lucide-react'
import { useRegisters } from '@/context/RegistersContext'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface ExamPrice {
  examId: string
  price: number
}

interface ExamPricesModalProps {
  convenioName: string
  examPrices: ExamPrice[]
  onClose: () => void
  onSave: (prices: ExamPrice[]) => void
}

export function ExamPricesModal({ convenioName, examPrices: initialPrices, onClose, onSave }: ExamPricesModalProps) {
  const { exams } = useRegisters()
  const [prices, setPrices] = useState<ExamPrice[]>([...initialPrices])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const activeExams = useMemo(() => exams.filter(e => e.isActive), [exams])

  const filteredExamsForSelection = useMemo(() => {
    // Only show exams that don't already have a price
    const existingIds = new Set(prices.map(p => p.examId))
    return activeExams.filter(e => !existingIds.has(e.id))
  }, [activeExams, prices])

  const addPrice = () => {
    if (!selectedExamId) {
      toast.error('Selecione um exame')
      return
    }
    const val = parseFloat(newPrice.replace(',', '.'))
    if (isNaN(val) || val < 0) {
      toast.error('Preço inválido')
      return
    }

    setPrices(prev => [...prev, { examId: selectedExamId, price: val }])
    setSelectedExamId('')
    setNewPrice('')
    setShowAdd(false)
  }

  const removePrice = (examId: string) => {
    setPrices(prev => prev.filter(p => p.examId !== examId))
  }

  const updatePriceValue = (examId: string, value: string) => {
    const val = parseFloat(value.replace(',', '.'))
    if (!isNaN(val)) {
      setPrices(prev => prev.map(p => p.examId === examId ? { ...p, price: val } : p))
    }
  }

  const getExamName = (id: string) => {
    return exams.find(e => e.id === id)?.name || 'Exame desconhecido'
  }

  const filteredPrices = useMemo(() => {
    if (!search) return prices
    return prices.filter(p => getExamName(p.examId).toLowerCase().includes(search.toLowerCase()))
  }, [prices, search, exams])

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Tabela de Preços — {convenioName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exame na tabela..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAdd(true)} className="gradient-bg text-white gap-2">
              <Plus className="h-4 w-4" /> Adicionar Exame
            </Button>
          </div>

          {showAdd && (
            <div className="p-4 border border-primary/20 rounded-xl bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Exame</Label>
                  <select
                    value={selectedExamId}
                    onChange={e => setSelectedExamId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione um exame...</option>
                    {filteredExamsForSelection.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.tussCode || 'S/C'})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Preço (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newPrice}
                      onChange={e => setNewPrice(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
                <Button size="sm" onClick={addPrice} className="gradient-bg text-white">Adicionar à Tabela</Button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-bold uppercase text-[10px] text-muted-foreground tracking-wider">Exame</th>
                  <th className="px-4 py-3 text-left font-bold uppercase text-[10px] text-muted-foreground tracking-wider">Preço (R$)</th>
                  <th className="px-4 py-3 text-right font-bold uppercase text-[10px] text-muted-foreground tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPrices.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                      {search ? 'Nenhum exame encontrado na busca.' : 'Nenhum preço configurado para este convênio.'}
                    </td>
                  </tr>
                ) : (
                  filteredPrices.map(p => (
                    <tr key={p.examId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-xs">
                        {getExamName(p.examId)}
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          {exams.find(e => e.id === p.examId)?.internalCode || exams.find(e => e.id === p.examId)?.tussCode || ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={p.price.toFixed(2)}
                            onBlur={(e) => updatePriceValue(p.examId, e.target.value)}
                            className="w-full pl-7 pr-2 py-1 bg-transparent border-b border-transparent focus:border-primary focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePrice(p.examId)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" className="font-bold text-xs" onClick={onClose}>CANCELAR</Button>
          <Button onClick={() => onSave(prices)} className="gradient-bg text-white px-8 font-bold text-xs uppercase">Salvar Tabela</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
