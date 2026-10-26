import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
export function VinculoPessoa({ tipo, value, companyId, onChange }: { tipo: 'paciente'|'profissional'; value: string; companyId: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const [label, setLabel] = useState('')
  const [options, setOptions] = useState<{id:string;name:string}[]>([])
  useEffect(() => {
    let live=true
    if (!value) {setLabel('');return}
    const fetchName=async()=>{
      if(tipo==='paciente') {const {data}=await supabase.from('patients').select('name').eq('company_id',companyId).eq('id',value).maybeSingle();if(live)setLabel(data?.name || 'Paciente vinculado')}
      else {const {data}=await supabase.from('doctors').select('full_name').eq('company_id',companyId).eq('id',value).maybeSingle();if(live)setLabel(data?.full_name || 'Profissional vinculado')}
    }
    void fetchName();return()=>{live=false}
  },[value,tipo,companyId])
  useEffect(()=>{
    let live=true
    if(search.trim().length<2){setOptions([]);return}
    const timer=setTimeout(async()=>{
      const pattern=`%${search.trim().replace(/[%_]/g,'')}%`
      if(tipo==='paciente'){const {data}=await supabase.from('patients').select('id,name').eq('company_id',companyId).ilike('name',pattern).limit(20);if(live)setOptions((data || []).map(x=>({id:x.id,name:x.name})))}
      else {const {data}=await supabase.from('doctors').select('id,full_name').eq('company_id',companyId).ilike('full_name',pattern).limit(20);if(live)setOptions((data || []).map(x=>({id:x.id,name:x.full_name})))}
    },250)
    return()=>{live=false;clearTimeout(timer)}
  },[search,tipo,companyId])
  return <div className="space-y-1 text-sm"><label htmlFor={`vinculo-${tipo}`}>{tipo==='paciente'?'Paciente (opcional)':'Profissional (opcional)'}</label>{value?<div className="flex justify-between items-center border border-input rounded-md p-2"><span>{label}</span><Button type="button" variant="ghost" size="icon" aria-label="Remover vínculo" onClick={()=>onChange('')}><X className="h-4 w-4"/></Button></div>:<><Input id={`vinculo-${tipo}`} value={search} placeholder="Buscar pelo nome" onChange={e=>setSearch(e.target.value)}/>{options.length>0 && <div className="max-h-36 overflow-y-auto border border-border rounded-md">{options.map(o=><Button className="w-full justify-start" type="button" key={o.id} variant="ghost" onClick={()=>{onChange(o.id);setSearch('');setOptions([])}}>{o.name}</Button>)}</div>}</>}</div>
}