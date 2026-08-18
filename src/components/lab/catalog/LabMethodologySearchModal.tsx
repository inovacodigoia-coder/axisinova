import React, { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Beaker, Loader2, X, Check } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface LabMethodologySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: any) => void;
  currentValue?: string;
}

export default function LabMethodologySearchModal({ 
  isOpen, 
  onClose, 
  onSelect,
  currentValue 
}: LabMethodologySearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [methods, setMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && user?.companyId) {
      fetchMethods()
    }
  }, [isOpen, user?.companyId])

  const fetchMethods = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('lab_methods' as any)
        .select('*')
        .eq('company_id', user?.companyId)
        .order('name')
      
      if (error) throw error
      setMethods(data || [])
    } catch (error) {
      console.error('Error fetching methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMethods = methods.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Buscar Metodologia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Digite para buscar..." 
              className="pl-9 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
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

          <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredMethods.length > 0 ? (
              filteredMethods.map((method) => {
                const isSelected = currentValue === method.name;
                return (
                  <button
                    key={method.id}
                    onClick={() => {
                      onSelect(method);
                      onClose();
                    }}
                    className={cn(
                      "w-full flex flex-col items-start p-3 rounded-xl transition-all text-left border border-transparent",
                      isSelected 
                        ? "bg-primary/5 border-primary/20" 
                        : "hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={cn("font-bold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                        {method.name}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    {method.description && (
                      <span className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                        {method.description}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma metodologia encontrada.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Configure metodologias em Configurações &gt; Laboratório.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
