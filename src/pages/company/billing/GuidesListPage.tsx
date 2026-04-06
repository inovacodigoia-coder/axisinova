import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Zap, Search } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import type { GuideStatus } from '@/types/billing.types'

const STATUS_CONFIG: Record<GuideStatus, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-muted text-muted-foreground' },
  pending_docs: { label: 'Ag. Documentos', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  pending_authorization: { label: 'Ag. Autorização', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  authorized: { label: 'Autorizada', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  submitted: { label: 'Enviada', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  processing: { label: 'Processando', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  paid: { label: 'Paga', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  partial_glosa: { label: 'Glosa Parcial', cls: 'bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300' },
  total_glosa: { label: 'Glosa Total', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  returned_reception: { label: 'Devolvida', cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

export default function GuidesListPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guias de Faturamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie as guias TISS de faturamento</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Plus className="h-4 w-4" /> Nova Guia Manual
          </button>
          <GradientButton><Zap className="h-4 w-4 mr-2" /> Gerar Guias do Dia</GradientButton>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma guia de faturamento</h3>
        <p className="text-sm text-muted-foreground mb-4">
          As guias serão geradas automaticamente após a finalização de atendimentos médicos ou podem ser criadas manualmente.
        </p>
        <div className="flex gap-2 justify-center">
          <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Plus className="h-4 w-4" /> Nova Guia Manual
          </button>
        </div>
      </div>
    </div>
  )
}
