import { useEffect, useMemo, useState } from 'react'
import { Search, Check, Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import type { ExternalAccessInput, ExternalAccessType, ExternalAccessRecord } from '@/hooks/useExternalAccesses'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType: ExternalAccessType
  companyId: string | null
  onCreate: (input: ExternalAccessInput) => Promise<ExternalAccessRecord>
  onCreated: (record: ExternalAccessRecord) => void
}

interface OptionRow {
  id: string
  label: string
  sub?: string
}

function maskCpf(cpf?: string | null) {
  const digits = (cpf || '').replace(/\D/g, '')
  if (digits.length !== 11) return cpf || '—'
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`
}

const TYPE_LABEL: Record<ExternalAccessType, string> = {
  parceiro: 'Parceiro',
  local: 'Local',
  medico: 'Médico',
  paciente: 'Paciente',
}

export function NewAccessModal({ open, onOpenChange, defaultType, companyId, onCreate, onCreated }: Props) {
  const [type, setType] = useState<ExternalAccessType>(defaultType)
  const [name, setName] = useState('')
  const { user } = useAuth()
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.isAdmin === true
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [savingOrigin, setSavingOrigin] = useState(false)
  const [showNewOrigin, setShowNewOrigin] = useState(false)
  const [newOriginName, setNewOriginName] = useState('')
  const [newOriginCode, setNewOriginCode] = useState('')
  const [creatingOrigin, setCreatingOrigin] = useState(false)
  const [email, setEmail] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [partnerType, setPartnerType] = useState('laboratorio')
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<OptionRow[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedPartnerOrigins, setSelectedPartnerOrigins] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setType(defaultType)
      setName(''); setEmail(''); setResponsibleName(''); setCnpj('')
      setSearch(''); setSelectedId(null); setSelectedPartnerOrigins([])
    }
  }, [open, defaultType])

  useEffect(() => {
    if (!open || !companyId) return
    let cancelled = false
    const load = async () => {
      setLoadingOptions(true)
      let rows: OptionRow[] = []
      if (type === 'medico') {
        const { data } = await supabase
          .from('doctors').select('id, full_name, crm, crm_state')
          .eq('company_id', companyId).eq('is_active', true).order('full_name')
        rows = (data || []).map((d) => ({ id: d.id, label: d.full_name, sub: `CRM ${d.crm}/${d.crm_state}` }))
      } else if (type === 'paciente') {
        const term = search.trim()
        let q = supabase.from('patients').select('id, name, cpf, birth_date').eq('company_id', companyId).order('name').limit(30)
        if (term) q = q.or(`name.ilike.%${term}%,cpf.ilike.%${term.replace(/\D/g, '')}%`)
        const { data } = await q
        rows = (data || []).map((p) => ({
          id: p.id,
          label: p.name,
          sub: `${maskCpf(p.cpf)} · ${p.birth_date ? new Date(p.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}`,
        }))
      } else {
        const { data } = await supabase
          .from('origins').select('id, name, internal_code').eq('company_id', companyId).order('name')
        rows = (data || []).map((o) => ({ id: o.id, label: o.name, sub: o.internal_code || undefined }))
      }
      if (!cancelled) { setOptions(rows); setLoadingOptions(false) }
    }
    const t = setTimeout(load, type === 'paciente' ? 300 : 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, companyId, type, search])

  const visibleOptions = useMemo(() => {
    if (type === 'paciente') return options
    const term = search.trim().toLowerCase()
    if (!term) return options
    return options.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(term))
  }, [options, search, type])

  const linkValid = type === 'parceiro' ? selectedPartnerOrigins.length > 0 : !!selectedId
  const canSave = name.trim().length > 1 && linkValid

  const selectOption = (id: string) => {
    if (type === 'parceiro') {
      setSelectedPartnerOrigins((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      return
    }
    setSelectedId(id)
    const opt = options.find((o) => o.id === id)
    if (opt && !name.trim()) setName(opt.label)
  }

  const saveOriginEdit = async () => {
    if (!editingId || !isAdmin) return
    setSavingOrigin(true)
    try {
      const nome = editName.trim().toUpperCase()
      const codigo = editCode.trim() || null
      const { error } = await supabase.rpc('portal_origem_editar', { p_origem_id: editingId, p_nome: nome, p_codigo: codigo || '' })
      if (error) throw new Error(error.message)
      setOptions((prev) => prev.map((x) => (x.id === editingId ? { ...x, label: nome, sub: codigo || undefined } : x)))
      setEditingId(null)
      toast.success('Origem atualizada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar origem')
    } finally {
      setSavingOrigin(false)
    }
  }

  const deleteOrigin = async (id: string, label: string) => {
    if (!isAdmin) return
    if (!window.confirm(`Excluir a origem "${label}"? Isso não pode ser desfeito.`)) return
    const { error } = await (supabase as any).from('origins').delete().eq('id', id)
    if (error) {
      toast.error(/foreign|violates|referenc/i.test(error.message)
        ? 'Esta origem já tem atendimentos ou acessos ligados e não pode ser excluída.'
        : error.message)
      return
    }
    setOptions((prev) => prev.filter((x) => x.id !== id))
    setSelectedPartnerOrigins((prev) => prev.filter((x) => x !== id))
    if (selectedId === id) setSelectedId(null)
    toast.success('Origem excluída')
  }

  const createOrigin = async () => {
    if (!companyId || newOriginName.trim().length < 2) return
    setCreatingOrigin(true)
    try {
      const nome = newOriginName.trim().toUpperCase()
      const codigo = newOriginCode.trim() || null
      // Cria a unidade; o banco gera a origem correspondente automaticamente.
      const { data: est, error: estErr } = await (supabase as any)
        .from('establishments').insert([{ company_id: companyId, name: nome, internal_code: codigo }])
        .select('id').single()
      if (estErr || !est) throw new Error(estErr?.message || 'Falha ao criar unidade')
      const { data: matriz } = await (supabase as any)
        .from('origins').select('id').eq('company_id', companyId).eq('papel_laboratorio', true)
        .order('created_at').limit(1).maybeSingle()
      const { data: origem, error: oErr } = await (supabase as any)
        .from('origins')
        .update({ papel_coleta: true, laboratorio_destino_id: matriz?.id ?? null })
        .eq('establishment_id', est.id).select('id, name, internal_code').single()
      if (oErr || !origem) throw new Error(oErr?.message || 'Falha ao criar origem')
      setOptions((prev) => [...prev, { id: origem.id, label: origem.name, sub: origem.internal_code || undefined }])
      selectOption(origem.id)
      if (type === 'local') setSelectedId(origem.id)
      if (!name.trim()) setName(origem.name)
      setShowNewOrigin(false); setNewOriginName(''); setNewOriginCode('')
      toast.success('Origem criada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar origem')
    } finally {
      setCreatingOrigin(false)
    }
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const doctor = type === 'medico' ? options.find((o) => o.id === selectedId) : null
      const record = await onCreate({
        type,
        name: name.trim(),
        email: email.trim() || null,
        status: 'active',
        patient_id: type === 'paciente' ? selectedId : null,
        doctor_id: type === 'medico' ? selectedId : null,
        origin_id: type === 'local' ? selectedId : null,
        partner_origin_ids: type === 'parceiro' ? selectedPartnerOrigins : [],
        partner_type: type === 'parceiro' ? partnerType : null,
        cnpj: type === 'parceiro' ? cnpj.trim() || null : null,
        responsible_name: responsibleName.trim() || null,
        phone: null,
        crm: doctor?.sub?.replace('CRM ', '') || null,
        specialty: null,
      })
      onOpenChange(false)
      onCreated(record)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar acesso')
    } finally {
      setSaving(false)
    }
  }

  const searchPlaceholder =
    type === 'medico' ? 'Buscar por nome ou CRM...'
      : type === 'paciente' ? 'Buscar por nome ou CPF...'
        : 'Buscar origem/unidade...'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Acesso</DialogTitle>
          <DialogDescription>
            O código de acesso e a senha são gerados automaticamente ao salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Tipo de acesso</Label>
            <Select value={type} onValueChange={(v) => { setType(v as ExternalAccessType); setSelectedId(null); setSelectedPartnerOrigins([]) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABEL) as ExternalAccessType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {type === 'parceiro' ? 'Origens do parceiro *' : type === 'local' ? 'Origem / Unidade *' : `${TYPE_LABEL[type]} vinculado *`}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
              {loadingOptions ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : visibleOptions.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p>
              ) : (
                visibleOptions.map((o) => {
                  const active = type === 'parceiro' ? selectedPartnerOrigins.includes(o.id) : selectedId === o.id
                  const isOrigin = type === 'parceiro' || type === 'local'
                  if (isOrigin && editingId === o.id) {
                    return (
                      <div key={o.id} className="space-y-2 bg-muted/40 p-2">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Input className="sm:col-span-2" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" />
                          <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="Código" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                          <Button type="button" size="sm" disabled={editName.trim().length < 2 || savingOrigin} onClick={saveOriginEdit}>Salvar</Button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={o.id} className={cn('flex items-center gap-1 pr-2 hover:bg-muted', active && 'bg-primary/10')}>
                      <button
                        type="button"
                        onClick={() => selectOption(o.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{o.label}</span>
                          {o.sub && <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>}
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                      {isOrigin && isAdmin && (
                        <>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Editar ${o.label}`}
                            onClick={() => { setEditingId(o.id); setEditName(o.label); setEditCode(o.sub || '') }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={`Excluir ${o.label}`}
                            onClick={() => deleteOrigin(o.id, o.label)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {type === 'parceiro' && selectedPartnerOrigins.length > 0 && (
              <Badge variant="secondary">{selectedPartnerOrigins.length} origem(ns) selecionada(s)</Badge>
            )}
            {(type === 'parceiro' || type === 'local') && (
              showNewOrigin ? (
                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <p className="text-xs font-semibold">Nova origem (ponto de coleta)</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input className="sm:col-span-2" placeholder="Nome do ponto de coleta" value={newOriginName} onChange={(e) => setNewOriginName(e.target.value)} />
                    <Input placeholder="Código" value={newOriginCode} onChange={(e) => setNewOriginCode(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setShowNewOrigin(false); setNewOriginName(''); setNewOriginCode('') }}>Cancelar</Button>
                    <Button type="button" size="sm" disabled={newOriginName.trim().length < 2 || creatingOrigin} onClick={createOrigin}>
                      {creatingOrigin ? 'Criando...' : 'Criar origem'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setShowNewOrigin(true)}>
                  <Plus className="h-4 w-4" /> Nova origem
                </Button>
              )
            )}
            {!linkValid && <p className="text-xs text-muted-foreground">O vínculo é obrigatório para gerar o acesso.</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome exibido *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do acesso" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} />
            </div>
            {type === 'parceiro' && (
              <>
                <div className="space-y-2">
                  <Label>Tipo de parceiro</Label>
                  <Select value={partnerType} onValueChange={setPartnerType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laboratorio">Laboratório</SelectItem>
                      <SelectItem value="posto_coleta">Posto de Coleta</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="clinica">Clínica</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!canSave || saving} onClick={handleSave}>
            {saving ? 'Salvando...' : 'Salvar e gerar acesso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
