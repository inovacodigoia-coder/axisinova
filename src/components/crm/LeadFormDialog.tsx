import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ORIGENS, TEMPERATURAS, validarCelular, localParaIso, type CrmEtapa, type CrmTag, type CrmUsuario, type Temperatura } from '@/lib/crm'

export const selCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

interface Props {
  open: boolean
  onClose: () => void
  onCriado: (id: string) => void
  /** Criando a partir do InovaChat: contato já existe. Sem contato, pede o telefone. */
  contatoId?: string | null
  nomeInicial?: string
  usuarios?: CrmUsuario[]
  euId?: string | null
}

export function LeadFormDialog({ open, onClose, onCriado, contatoId, nomeInicial, usuarios, euId }: Props) {
  const [etapas, setEtapas] = useState<CrmEtapa[]>([])
  const [tags, setTags] = useState<CrmTag[]>([])
  const [f, setF] = useState({ nome: '', telefone: '', interesse: '', origem: 'whatsapp', temperatura: 'morno' as Temperatura, responsavel: '', etapa: '', proximo: '', valor: '', tags: [] as string[] })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setF({ nome: nomeInicial ?? '', telefone: '', interesse: '', origem: contatoId ? 'whatsapp' : 'telefone', temperatura: 'morno', responsavel: euId ?? '', etapa: '', proximo: '', valor: '', tags: [] })
    void supabase.from('crm_etapas' as any).select('*').eq('ativa', true).order('ordem').then(({ data }) => {
      const e = ((data ?? []) as unknown as CrmEtapa[]).filter(x => x.tipo === 'aberta')
      setEtapas(e)
      setF(p => ({ ...p, etapa: e.find(x => x.inicial)?.id ?? e[0]?.id ?? '' }))
    })
    void supabase.from('crm_tags' as any).select('*').eq('ativa', true).order('nome').then(({ data }) => setTags((data ?? []) as unknown as CrmTag[]))
  }, [open, nomeInicial, contatoId, euId])

  const salvar = async () => {
    if (!f.nome.trim()) { toast.error('Informe o nome.'); return }
    if (!contatoId) { const e = validarCelular(f.telefone); if (e) { toast.error(e); return } }
    setSalvando(true)
    const { data, error } = await supabase.rpc('crm_lead_criar' as any, { p: {
      contato_id: contatoId ?? null, telefone: contatoId ? null : f.telefone.replace(/\D/g, ''), nome: f.nome.trim(), interesse: f.interesse,
      origem: f.origem, temperatura: f.temperatura, responsavel_id: f.responsavel || null, etapa_id: f.etapa || null,
      proximo_contato_em: localParaIso(f.proximo), valor_estimado: f.valor ? Number(f.valor.replace(',', '.')) : null, tags: f.tags,
    } })
    setSalvando(false)
    if (error) { toast.error(error.message || 'Não foi possível criar o lead.'); return }
    toast.success('Lead criado.')
    onCriado(String(data))
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contatoId ? 'Criar lead' : 'Novo lead'}</DialogTitle>
          <DialogDescription>O lead entra no funil do CRM. Nada é enviado ao contato.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1"><Label>Nome *</Label><Input value={f.nome} maxLength={120} onChange={e => setF({ ...f, nome: e.target.value })} /></div>
          {!contatoId && (
            <div className="sm:col-span-2 space-y-1">
              <Label>Celular (WhatsApp) *</Label>
              <div className="flex">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">+55</span>
                <Input className="rounded-l-none" inputMode="numeric" placeholder="DDD + celular" maxLength={15}
                  value={f.telefone} onChange={e => setF({ ...f, telefone: e.target.value.replace(/[^\d() -]/g, '') })} />
              </div>
            </div>
          )}
          <div className="sm:col-span-2 space-y-1"><Label>Interesse</Label><Input value={f.interesse} maxLength={120} placeholder="Ex.: consulta de cardiologia" onChange={e => setF({ ...f, interesse: e.target.value })} /></div>
          <div className="space-y-1"><Label>Origem</Label>
            <select className={selCls} value={f.origem} onChange={e => setF({ ...f, origem: e.target.value })}>{ORIGENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className="space-y-1"><Label>Temperatura</Label>
            <select className={selCls} value={f.temperatura} onChange={e => setF({ ...f, temperatura: e.target.value as Temperatura })}>{TEMPERATURAS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className="space-y-1"><Label>Etapa</Label>
            <select className={selCls} value={f.etapa} onChange={e => setF({ ...f, etapa: e.target.value })}>{etapas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
          <div className="space-y-1"><Label>Responsável</Label>
            <select className={selCls} value={f.responsavel} onChange={e => setF({ ...f, responsavel: e.target.value })}>
              {(usuarios?.length ? usuarios : euId ? [{ id: euId, nome: 'Eu' }] : []).map(u => <option key={u.id} value={u.id}>{u.id === euId ? `${u.nome} (você)` : u.nome}</option>)}
            </select></div>
          <div className="space-y-1"><Label>Próximo contato</Label><Input type="datetime-local" value={f.proximo} onChange={e => setF({ ...f, proximo: e.target.value })} /></div>
          <div className="space-y-1"><Label>Valor estimado (R$)</Label><Input inputMode="decimal" value={f.valor} onChange={e => setF({ ...f, valor: e.target.value.replace(/[^\d,.]/g, '') })} /></div>
          {tags.length > 0 && (
            <div className="sm:col-span-2 space-y-1"><Label>Tags</Label>
              <div className="flex flex-wrap gap-2">{tags.map(t => {
                const on = f.tags.includes(t.id)
                return <button key={t.id} type="button" onClick={() => setF({ ...f, tags: on ? f.tags.filter(x => x !== t.id) : [...f.tags, t.id] })}
                  className={cn('min-h-[36px] rounded-full border px-3 text-xs', on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: t.cor }} />{t.nome}</button>
              })}</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void salvar()} disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
