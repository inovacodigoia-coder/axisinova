import { supabase } from '@/integrations/supabase/client'

type ConsultaValor = () => PromiseLike<{ data: unknown; error: unknown }>
export async function consultarValorNumero(consulta: ConsultaValor = () => supabase.rpc('whatsapp_valor_numero')): Promise<number> {
  const { data, error } = await consulta()
  const valor = data === null ? NaN : Number(data)
  if (error || !Number.isFinite(valor) || valor < 0) throw new Error('Valor indisponível')
  return valor
}