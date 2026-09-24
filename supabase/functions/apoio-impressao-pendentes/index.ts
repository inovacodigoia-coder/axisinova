// ServidorAisaxius busca até 20 trabalhos de impressão pendentes da empresa.
// Autenticação: X-API-Key (chave do servidor da empresa) ou Bearer OAuth2.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { authenticateIntegration } from '../_shared/integrationAuth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') return json({ error: 'Método não permitido' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const auth = await authenticateIntegration(req, supabase)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const { data, error } = await supabase.rpc('apoio_impressao_pegar', { _empresa: auth.companyId, _limite: 20 })
  if (error) return json({ error: error.message }, 500)

  const trabalhos = (data || []).map((t: any) => ({
    id: t.id, tipo: t.tipo, impressora: t.impressora, unidade_id: t.unidade_id,
    conteudo: t.conteudo, referencia: t.referencia, tentativas: t.tentativas, criado_em: t.created_at,
  }))
  return json({ trabalhos })
})
