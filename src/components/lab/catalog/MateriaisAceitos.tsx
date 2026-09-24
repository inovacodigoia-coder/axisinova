import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Plus, Star } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useMateriaisTubos, recarregarTubos, normMat } from '@/lib/tubos'
import { RecipienteSelect } from '@/components/lab/settings/MateriaisTubosSection'

type Tubos = Record<string, { recipiente_id?: string | null; volume_ml?: number | null }>

export function MateriaisAceitos({ selecionados, padrao, tubos, onToggle, onPadrao, onTubos }: {
  selecionados: string[]; padrao: string; tubos: Tubos
  onToggle: (nome: string) => void; onPadrao: (nome: string) => void; onTubos: (t: Tubos) => void
}) {
  const { user } = useAuth()
  const cad = useMateriaisTubos(user?.companyId)
  const [novo, setNovo] = useState<{ nome: string; rec: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const marcado = (nome: string) => selecionados.some(s => normMat(s) === normMat(nome))
  const ativos = cad.materiais.filter(m => m.ativo || marcado(m.nome))
  // Textos marcados que ainda não estão no cadastro continuam visíveis
  const soltos = selecionados.filter(s => !cad.materiais.some(m => normMat(m.nome) === normMat(s)))
  const rec = (id?: string | null) => cad.recipientes.find(r => r.id === id)
  const semTubo = ativos.filter(m => marcado(m.nome) && !rec(tubos[m.id]?.recipiente_id) && !rec(m.recipiente_id))

  const criar = async () => {
    if (!novo?.nome.trim()) return toast.error('Informe o nome do material')
    if (!novo.rec) return toast.error('Escolha o tubo/recipiente do material')
    if (cad.materiais.some(m => normMat(m.nome) === normMat(novo.nome))) return toast.error('Já existe um material com esse nome')
    setSalvando(true)
    const { error } = await (supabase as any).from('lab_material').insert({ company_id: user?.companyId, nome: novo.nome.trim(), recipiente_id: novo.rec })
    setSalvando(false)
    if (error) return toast.error('Não foi possível criar o material')
    await recarregarTubos(user?.companyId)
    onToggle(novo.nome.trim()); setNovo(null)
    toast.success('Material criado em Materiais e Tubos')
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Materiais Aceitos</Label>
      <div className="flex flex-wrap gap-2">
        {ativos.map(m => {
          const on = marcado(m.nome)
          const nome = selecionados.find(s => normMat(s) === normMat(m.nome)) ?? m.nome
          const r = rec(tubos[m.id]?.recipiente_id) ?? rec(m.recipiente_id)
          const chip = (
            <button type="button" onClick={on ? undefined : () => onToggle(m.nome)}
              className={cn('px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center gap-2',
                on ? 'bg-primary/5 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/50')}>
              {padrao && normMat(padrao) === normMat(m.nome) && <Star className="h-3 w-3 fill-primary text-primary" />}
              {m.nome}{on && <span className="text-xs opacity-80">· {r ? r.sigla : 'tubo?'}</span>}
            </button>
          )
          if (!on) return <span key={m.id}>{chip}</span>
          const t = tubos[m.id] ?? {}
          return (
            <Popover key={m.id}>
              <PopoverTrigger asChild>{chip}</PopoverTrigger>
              <PopoverContent className="w-72 space-y-3">
                <p className="text-sm font-semibold">{m.nome}</p>
                <div className="space-y-1">
                  <Label className="text-xs">Tubo/recipiente neste exame</Label>
                  <RecipienteSelect value={t.recipiente_id ?? ''} recipientes={cad.recipientes}
                    vazio={rec(m.recipiente_id) ? `Padrão do material (${rec(m.recipiente_id)!.sigla})` : 'Padrão do material (definir)'}
                    onChange={v => onTubos({ ...tubos, [m.id]: { ...t, recipiente_id: v || null } })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Volume (mL)</Label>
                  <Input type="number" min={0} value={t.volume_ml ?? ''} onChange={e => onTubos({ ...tubos, [m.id]: { ...t, volume_ml: e.target.value === '' ? null : Number(e.target.value) } })} />
                </div>
                <div className="flex justify-between gap-2">
                  <Button size="sm" variant="outline" onClick={() => onPadrao(nome)}>Material padrão</Button>
                  <Button size="sm" variant="outline" onClick={() => onToggle(nome)}>Desmarcar</Button>
                </div>
              </PopoverContent>
            </Popover>
          )
        })}
        {soltos.map(s => (
          <button key={s} type="button" onClick={() => onToggle(s)} className="px-4 py-2 rounded-full border border-primary bg-primary/5 text-sm font-medium text-primary">
            {s} <span className="text-xs opacity-80">· fora do cadastro</span>
          </button>
        ))}
        <Popover open={!!novo} onOpenChange={o => setNovo(o ? { nome: '', rec: '' } : null)}>
          <PopoverTrigger asChild>
            <button type="button" className="px-4 py-2 rounded-full border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 flex items-center gap-1"><Plus className="h-3 w-3" />Novo material</button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2">
            <Input placeholder="Nome do material" value={novo?.nome ?? ''} onChange={e => setNovo(n => ({ ...(n ?? { rec: '' }), nome: e.target.value }))} />
            <RecipienteSelect value={novo?.rec ?? ''} recipientes={cad.recipientes} vazio="— tubo (obrigatório) —" onChange={v => setNovo(n => ({ ...(n ?? { nome: '' }), rec: v }))} />
            <Button size="sm" className="w-full" onClick={criar} disabled={salvando}>Criar e marcar</Button>
          </PopoverContent>
        </Popover>
      </div>
      {semTubo.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-warning"><AlertTriangle className="h-3.5 w-3.5" />Recipiente: definir em {semTubo.map(m => m.nome).join(', ')}. Configure em Configurações › Materiais e Tubos.</p>
      )}
    </div>
  )
}
