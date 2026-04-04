import { useState, useMemo } from 'react'
import { CornerDownLeft, Paperclip, CheckCircle, AlertTriangle } from 'lucide-react'
import { MOCK_GUIDES } from '@/mocks/billing.mock'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function CorrectionQueuePage() {
  const [guides, setGuides] = useState(() => MOCK_GUIDES.filter(g => g.status === 'returned_reception'))
  const [correctionNote, setCorrectionNote] = useState<Record<string, string>>({})

  const handleMarkCorrected = (id: string) => {
    if (!correctionNote[id] || correctionNote[id].length < 10) {
      toast.error('Descreva o que foi corrigido (mínimo 10 caracteres)')
      return
    }
    setGuides(prev => prev.filter(g => g.id !== id))
    toast.success('Guia marcada como corrigida. Faturamento notificado.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Correções Pendentes</h1>
          {guides.length > 0 && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">{guides.length}</span>
          )}
        </div>
      </div>

      {guides.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Nenhuma correção pendente</h3>
          <p className="text-sm text-muted-foreground">Todas as guias estão em dia!</p>
        </div>
      ) : (
        <AnimatePresence>
          {guides.map(g => (
            <motion.div key={g.id} layout exit={{ x: -300, opacity: 0 }} transition={{ duration: 0.3 }} className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CornerDownLeft className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-bold text-foreground">AGUARDANDO CORREÇÃO</span>
                </div>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800">URGENTE</span>
              </div>

              <div className="text-sm space-y-1 mb-4">
                <p className="text-foreground font-medium">{g.patientName} · {new Date(g.attendanceDate).toLocaleDateString('pt-BR')}</p>
                <p className="text-muted-foreground">Guia: {g.tissGuideNumber} · {g.convenioName}</p>
                <p className="text-muted-foreground">Devolvida por: <span className="text-foreground">{g.returnedBy}</span> (Faturamento)</p>
              </div>

              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 p-4 mb-4">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-400 mb-1">PROBLEMA: {g.returnedReason}</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">"{g.billerNotes}"</p>
              </div>

              <div className="flex gap-2 mb-4">
                <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors">
                  <Paperclip className="h-4 w-4" /> Anexar Documentos
                </button>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <textarea value={correctionNote[g.id] || ''} onChange={e => setCorrectionNote(prev => ({ ...prev, [g.id]: e.target.value }))} placeholder="Descreva o que foi corrigido..." className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={() => handleMarkCorrected(g.id)} className="flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors">
                  <CheckCircle className="h-4 w-4" /> Marcar como Corrigido
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
