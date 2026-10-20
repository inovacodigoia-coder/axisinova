import { useState } from 'react'
import { toast } from 'sonner'
import { GripVertical, Plus, RotateCcw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CORES, type CrmEtapa, type CrmLead, type CrmMotivo, type CrmTag, type TipoEtapa } from '@/lib/crm'
import { selCls } from './LeadFormDialog'

const TIPOS: Record<TipoEtapa, string> = { aberta: 'Aberta', ganho: 'Ganho', perdido: 'Perdido' }

interface Props { open: boolean; onClose: () => void; etapas: CrmEtapa[]; tags: CrmTag[]; motivos: CrmMotivo[]; leads: CrmLead[]; onMudou: () => void }

async function rpc(fn: string, args: Record<string, unknown>, ok?: string) {
  const { data, error } = await supabase.rpc(fn as any, args as any)
  if (error) { toast.error(error.message || 'Não foi possível salvar.'); return null }
  if (ok) toast.success(ok)
  return data ?? true
}

function Cores({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return <div className="flex flex-wrap gap-1">{CORES.map(c => (
    <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => onChange(c)}
      className={`h-7 w-7 rounded-full border-2 ${valor === c ? 'border-foreground' : 'border-transparent'}`} style={{ background: c }} />
  ))}</div>
}

export function CrmConfigDialog({ open, onClose, etapas, tags, motivos, leads, onMudou }: Props) {
  const ativas = etapas.filter(e => e.ativa).sort((a, b) => a.ordem - b.ordem)
  const [edit, setEdit] = useState<Partial<CrmEtapa> | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [desativar, setDesativar] = useState<CrmEtapa | null>(null)
  const [destino, setDestino] = useState('')
  const [tagEdit, setTagEdit] = useState<Partial<CrmTag> | null>(null)
  const [motEdit, setMotEdit] = useState<Partial<CrmMotivo> | null>(null)

  const soltar = async (alvo: string) => {
    if (!arrastando || arrastando === alvo) return
    const ids = ativas.map(e => e.id).filter(i => i !== arrastando)
    ids.splice(ids.indexOf(alvo), 0, arrastando)
    setArrastando(null)
    if (await rpc('crm_etapas_ordenar', { p_ids: ids })) onMudou()
  }
  const nLeads = (id: string) => leads.filter(l => l.etapa_id === id).length

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Configurar CRM</DialogTitle><DialogDescription>Etapas do funil, tags e motivos de perda.</DialogDescription></DialogHeader>
        <Tabs defaultValue="etapas">
          <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="etapas">Etapas</TabsTrigger><TabsTrigger value="tags">Tags</TabsTrigger><TabsTrigger value="motivos">Motivos de perda</TabsTrigger></TabsList>

          <TabsContent value="etapas" className="space-y-2">
            <p className="text-xs text-muted-foreground">Arraste para reordenar. Sempre há uma etapa inicial, uma de ganho e uma de perda.</p>
            {ativas.map(e => (
              <div key={e.id} draggable onDragStart={() => setArrastando(e.id)} onDragOver={ev => ev.preventDefault()} onDrop={() => void soltar(e.id)}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                <span className="h-3 w-3 rounded-full" style={{ background: e.cor }} />
                <span className="flex-1 text-sm font-medium text-foreground">{e.nome}</span>
                <span className="text-xs text-muted-foreground">{TIPOS[e.tipo]}{e.inicial ? ' · inicial' : ''} · {nLeads(e.id)} lead(s)</span>
                <Button size="sm" variant="outline" onClick={() => setEdit(e)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setDesativar(e); setDestino('') }}>Desativar</Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => setEdit({ nome: '', cor: CORES[0], tipo: 'aberta', inicial: false })}><Plus className="mr-1 h-4 w-4" />Nova etapa</Button>
              <Button size="sm" variant="outline" disabled={leads.length > 0} title={leads.length > 0 ? 'Disponível apenas sem leads' : undefined}
                onClick={async () => { if (await rpc('crm_funil_restaurar', {}, 'Funil padrão restaurado.')) onMudou() }}><RotateCcw className="mr-1 h-4 w-4" />Restaurar funil padrão</Button>
            </div>
          </TabsContent>

          <TabsContent value="tags" className="space-y-2">
            {tags.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="h-3 w-3 rounded-full" style={{ background: t.cor }} /><span className="flex-1 text-sm">{t.nome}</span>
                {!t.ativa && <span className="text-xs text-muted-foreground">Desativada</span>}
                <Button size="sm" variant="outline" onClick={() => setTagEdit(t)}>Editar</Button>
              </div>
            ))}
            <Button size="sm" onClick={() => setTagEdit({ nome: '', cor: CORES[2], ativa: true })}><Plus className="mr-1 h-4 w-4" />Nova tag</Button>
          </TabsContent>

          <TabsContent value="motivos" className="space-y-2">
            {motivos.map(m => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="flex-1 text-sm">{m.nome}</span>{!m.ativo && <span className="text-xs text-muted-foreground">Desativado</span>}
                <Button size="sm" variant="outline" onClick={() => setMotEdit(m)}>Editar</Button>
              </div>
            ))}
            <Button size="sm" onClick={() => setMotEdit({ nome: '', ativo: true })}><Plus className="mr-1 h-4 w-4" />Novo motivo</Button>
          </TabsContent>
        </Tabs>

        {/* editar etapa */}
        <Dialog open={!!edit} onOpenChange={v => { if (!v) setEdit(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{edit?.id ? 'Editar etapa' : 'Nova etapa'}</DialogTitle></DialogHeader>
            {edit && <div className="space-y-3">
              <div className="space-y-1"><Label>Nome</Label><Input value={edit.nome ?? ''} maxLength={40} onChange={e => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cor</Label><Cores valor={edit.cor ?? ''} onChange={c => setEdit({ ...edit, cor: c })} /></div>
              <div className="space-y-1"><Label>Tipo</Label><select className={selCls} value={edit.tipo} onChange={e => setEdit({ ...edit, tipo: e.target.value as TipoEtapa })}>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              {edit.tipo === 'aberta' && <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.inicial} onCheckedChange={v => setEdit({ ...edit, inicial: v })} />Etapa inicial (novos leads entram aqui)</label>}
            </div>}
            <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
              <Button disabled={!edit?.nome?.trim()} onClick={async () => {
                if (!edit) return
                if (await rpc('crm_etapa_salvar', { p_id: edit.id ?? null, p_nome: edit.nome, p_cor: edit.cor, p_tipo: edit.tipo, p_inicial: edit.tipo === 'aberta' && !!edit.inicial }, 'Etapa salva.')) { setEdit(null); onMudou() }
              }}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* desativar com migração */}
        <Dialog open={!!desativar} onOpenChange={v => { if (!v) setDesativar(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Desativar “{desativar?.nome}”?</DialogTitle>
              <DialogDescription>{desativar && nLeads(desativar.id) > 0 ? `Esta etapa tem ${nLeads(desativar.id)} lead(s). Escolha para onde movê-los.` : 'A etapa sai do quadro.'}</DialogDescription></DialogHeader>
            {desativar && nLeads(desativar.id) > 0 && (
              <select className={selCls} value={destino} onChange={e => setDestino(e.target.value)}>
                <option value="">Mover leads para…</option>
                {ativas.filter(e => e.id !== desativar.id && e.tipo === desativar.tipo).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setDesativar(null)}>Cancelar</Button>
              <Button variant="destructive" disabled={!!desativar && nLeads(desativar.id) > 0 && !destino} onClick={async () => {
                if (!desativar) return
                if (await rpc('crm_etapa_desativar', { p_id: desativar.id, p_destino: destino || null }, 'Etapa desativada.')) { setDesativar(null); onMudou() }
              }}>Desativar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* tag */}
        <Dialog open={!!tagEdit} onOpenChange={v => { if (!v) setTagEdit(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{tagEdit?.id ? 'Editar tag' : 'Nova tag'}</DialogTitle></DialogHeader>
            {tagEdit && <div className="space-y-3">
              <div className="space-y-1"><Label>Nome</Label><Input value={tagEdit.nome ?? ''} maxLength={30} onChange={e => setTagEdit({ ...tagEdit, nome: e.target.value })} /></div>
              <Cores valor={tagEdit.cor ?? ''} onChange={c => setTagEdit({ ...tagEdit, cor: c })} />
              <label className="flex items-center gap-2 text-sm"><Switch checked={tagEdit.ativa !== false} onCheckedChange={v => setTagEdit({ ...tagEdit, ativa: v })} />Ativa</label>
            </div>}
            <DialogFooter><Button disabled={!tagEdit?.nome?.trim()} onClick={async () => {
              if (tagEdit && await rpc('crm_tag_salvar', { p_id: tagEdit.id ?? null, p_nome: tagEdit.nome, p_cor: tagEdit.cor, p_ativa: tagEdit.ativa !== false }, 'Tag salva.')) { setTagEdit(null); onMudou() }
            }}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* motivo */}
        <Dialog open={!!motEdit} onOpenChange={v => { if (!v) setMotEdit(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{motEdit?.id ? 'Editar motivo' : 'Novo motivo'}</DialogTitle></DialogHeader>
            {motEdit && <div className="space-y-3">
              <div className="space-y-1"><Label>Nome</Label><Input value={motEdit.nome ?? ''} maxLength={60} onChange={e => setMotEdit({ ...motEdit, nome: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={motEdit.ativo !== false} onCheckedChange={v => setMotEdit({ ...motEdit, ativo: v })} />Ativo</label>
            </div>}
            <DialogFooter><Button disabled={!motEdit?.nome?.trim()} onClick={async () => {
              if (motEdit && await rpc('crm_motivo_salvar', { p_id: motEdit.id ?? null, p_nome: motEdit.nome, p_ativo: motEdit.ativo !== false }, 'Motivo salvo.')) { setMotEdit(null); onMudou() }
            }}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
