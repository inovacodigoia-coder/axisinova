import { useEffect, useState } from 'react'
import { Pencil, X, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { CrmConfig } from '@/lib/crm'

export function CrmAutomationSettings({ onMudou }: { onMudou: () => void }) {
 const [c, setC] = useState<CrmConfig | null>(null)
 const [word, setWord] = useState(''); const [edit, setEdit] = useState<number | null>(null)
 const [saving, setSaving] = useState(false); const [error, setError] = useState(false)
 useEffect(() => { let live = true; void supabase.from('crm_config').select('*').maybeSingle().then(({ data, error }) => { if (live) { setC(data as CrmConfig | null); setError(!!error || !data) } }); return () => { live = false } }, [])
 if (error) return <p className="py-4 text-sm text-destructive">Não foi possível carregar as configurações.</p>
 if (!c) return <Loader2 className="m-6 h-5 w-5 animate-spin text-muted-foreground" />
 const add = () => { const w = word.trim(); if (!w) return; const words = [...c.palavras_quentes]; if (edit === null) words.push(w); else words[edit] = w; setC({ ...c, palavras_quentes: [...new Set(words)] }); setWord(''); setEdit(null) }
 return <div className="space-y-4 py-3">
  <Label>Temperatura</Label><div className="flex w-fit rounded-md border border-border" role="group" aria-label="Modo da temperatura">{(['manual', 'automatico'] as const).map(m => <Button key={m} variant={c.temperatura_modo === m ? 'secondary' : 'ghost'} aria-pressed={c.temperatura_modo === m} onClick={() => setC({ ...c, temperatura_modo: m })}>{m === 'manual' ? 'Manual' : 'Automático'}</Button>)}</div>
  <p className="text-xs text-muted-foreground">Manual: só os atendentes mudam a temperatura. Automático: o sistema ajusta pela conversa e pelas etapas, e o atendente ainda pode corrigir.</p>
  <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="crm-lock">Validade do ajuste manual (dias)</Label><Input id="crm-lock" type="number" min={0} max={365} value={c.travar_manual_dias} onChange={e => setC({ ...c, travar_manual_dias: Number(e.target.value) })} /></div><div className="space-y-1"><Label htmlFor="crm-cold">Esfriar após silêncio (dias)</Label><Input id="crm-cold" type="number" min={1} max={365} value={c.frio_apos_dias} onChange={e => setC({ ...c, frio_apos_dias: Number(e.target.value) })} /></div></div>
  <div className="space-y-2"><Label>Palavras e expressões quentes</Label><div className="flex flex-wrap gap-2">{c.palavras_quentes.map((w, i) => <span key={`${w}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs"><span className="break-words">{w}</span><Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" title={`Editar ${w}`} aria-label={`Editar ${w}`} onClick={() => { setEdit(i); setWord(w) }}><Pencil className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" title={`Remover ${w}`} aria-label={`Remover ${w}`} onClick={() => { setC({ ...c, palavras_quentes: c.palavras_quentes.filter((_, n) => n !== i) }); setEdit(null); setWord('') }}><X className="h-3 w-3" /></Button></span>)}</div><div className="flex gap-2"><Input aria-label="Palavra ou expressão" placeholder="Nova palavra ou expressão" value={word} maxLength={80} onChange={e => setWord(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} /><Button variant="outline" disabled={!word.trim()} onClick={add}><Plus className="mr-1 h-4 w-4" />{edit === null ? 'Adicionar' : 'Atualizar'}</Button></div></div>
  <label className="flex items-center justify-between gap-3 text-sm">Evolução automática do card<Switch checked={c.evolucao_automatica} onCheckedChange={v => setC({ ...c, evolucao_automatica: v })} /></label>
  <label className="flex items-center justify-between gap-3 text-sm">Avisar quando um lead ficar quente<Switch checked={c.alerta_lead_quente} onCheckedChange={v => setC({ ...c, alerta_lead_quente: v })} /></label>
  <Button disabled={saving || !Number.isInteger(c.travar_manual_dias) || c.travar_manual_dias < 0 || c.travar_manual_dias > 365 || !Number.isInteger(c.frio_apos_dias) || c.frio_apos_dias < 1 || c.frio_apos_dias > 365} onClick={async () => { setSaving(true); const { error } = await supabase.rpc('crm_config_salvar', { p: { ...c } }); setSaving(false); if (error) { toast.error(error.message); return } toast.success('Configurações salvas.'); onMudou() }}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar configurações</Button>
 </div>
}
