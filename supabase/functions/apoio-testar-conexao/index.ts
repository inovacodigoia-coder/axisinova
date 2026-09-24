import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Provisório: a chamada real ao Pardini entra no prompt 11.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const inicio = Date.now();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, motivo: "Não autenticado" }, 401);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ ok: false, motivo: "Sessão inválida" }, 401);
  const body = await req.json().catch(() => ({}));
  const apoioId = typeof body?.apoio_id === "string" ? body.apoio_id : "";
  const { data: lab } = await client.from("apoio_laboratorio").select("id, conector").eq("id", apoioId).maybeSingle();
  if (!lab) return json({ ok: false, motivo: "Laboratório de apoio não encontrado", tempo_ms: Date.now() - inicio }, 404);
  return json({ ok: false, motivo: "Integração ainda não configurada", tempo_ms: Date.now() - inicio });
});
