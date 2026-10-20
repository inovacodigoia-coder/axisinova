import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KanbanSquare, Plus } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useCrmSinais } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { tempInfo, type CrmAcesso } from '@/lib/crm'
import { LeadFormDialog } from './LeadFormDialog'

export interface LeadAberto { id: string; contato_id: string; etapa: string; temperatura: string }

/** Leads abertos por contato (para etiquetas no InovaChat). */
export function useLeadsAbertos(acesso: CrmAcesso | null) {
  const [mapa, setMapa] = useState<Record<string, LeadAberto>>({})
  const ativo = !!(acesso?.ver || acesso?.criar)
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('crm_leads' as any).select('id, contato_id, temperatura, etapa:crm_etapas(nome)').is('fechado_em', null)
    setMapa(Object.fromEntries(((data ?? []) as any[]).map(l => [l.contato_id, { id: l.id, contato_id: l.contato_id, etapa: l.etapa?.nome ?? '', temperatura: l.temperatura }])))
  }, [])
  useEffect(() => { if (ativo) void carregar() }, [ativo, carregar])
  useCrmSinais(ativo, carregar)
  return { mapa, recarregar: carregar }
}

export const rotuloLead = (l: LeadAberto) => `Lead · ${l.etapa} · ${tempInfo(l.temperatura).label}`

export function CrmLeadAcoes({ acesso, lead, contatoId, nome, temPaciente, onMudou, compacto }: {
  acesso: CrmAcesso | null; lead?: LeadAberto; contatoId: string; nome: string; temPaciente: boolean; onMudou: () => void; compacto?: boolean
}) {
  const navigate = useNavigate()
  const [aviso, setAviso] = useState(false)
  const [form, setForm] = useState(false)
  if (!acesso) return null
  if (lead) return (
    <div className="flex flex-wrap items-center gap-1">
      {!compacto && <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[11px] text-secondary">{rotuloLead(lead)}</span>}
      {acesso.ver && <Button size="sm" variant="outline" className="h-10" onClick={() => navigate(`/app/crm?lead=${lead.id}`)}><KanbanSquare className="mr-1 h-4 w-4" />Ver no CRM</Button>}
    </div>
  )
  if (!acesso.criar) return null
  return (
    <>
      <Button size="sm" variant="outline" className="h-10" onClick={() => temPaciente ? setAviso(true) : setForm(true)}><Plus className="mr-1 h-4 w-4" />Criar lead</Button>
      <AlertDialog open={aviso} onOpenChange={setAviso}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Este contato já é paciente.</AlertDialogTitle><AlertDialogDescription>Criar lead mesmo assim?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { setAviso(false); setForm(true) }}>Criar lead</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LeadFormDialog open={form} onClose={() => setForm(false)} contatoId={contatoId} nomeInicial={nome} euId={acesso.usuario_id}
        onCriado={() => { setForm(false); onMudou() }} />
    </>
  )
}
