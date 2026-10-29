import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { CaixaAcesso } from '@/lib/caixa'
export function useCaixaAcesso() {
 const {user}=useAuth();const [acesso,setAcesso]=useState<CaixaAcesso|null>(null)
 useEffect(()=>{let active=true;setAcesso(null);void supabase.rpc('financeiro_caixa_acesso').then(({data})=>{if(active)setAcesso(data as unknown as CaixaAcesso)});return()=>{active=false}},[user?.id,user?.companyId])
 return acesso
}