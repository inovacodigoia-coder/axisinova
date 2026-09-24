import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Grava a senha do conector no Vault. A senha nunca é devolvida em nenhuma resposta.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sessão inválida" }, 401);

    const body = await req.json().catch(() => ({}));
    const apoioId = typeof body?.apoio_id === "string" ? body.apoio_id : "";
    const senha = typeof body?.senha === "string" ? body.senha : "";
    if (!/^[0-9a-f-]{36}$/i.test(apoioId) || senha.length < 1 || senha.length > 500) {
      return json({ error: "Dados inválidos" }, 400);
    }

    // O laboratório precisa ser visível ao usuário (mesma empresa) e ele precisa da permissão.
    const { data: lab } = await userClient.from("apoio_laboratorio").select("id").eq("id", apoioId).maybeSingle();
    if (!lab) return json({ error: "Laboratório de apoio não encontrado" }, 404);
    const { data: pode } = await userClient.rpc("apoio_tem_permissao", { _perm: "apoio.laboratorio.gerenciar" });
    if (!pode) return json({ error: "Sem permissão para gerenciar laboratórios de apoio" }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Alternativa sem Vault (sempre gravada): cifrada com a chave que só existe nas Edge Functions.
    const chave = Deno.env.get("APOIO_CRYPTO_KEY");
    const cif = chave ? await admin.rpc("apoio_senha_gravar_cifrada", { _apoio_id: apoioId, _senha: senha, _chave: chave }) : { error: new Error("sem chave") };
    const vault = await admin.rpc("apoio_set_senha", { _apoio_id: apoioId, _senha: senha });
    if (cif.error && vault.error) return json({ error: "Não foi possível guardar a senha" }, 500);
    return json({ ok: true });
  } catch (_e) {
    return json({ error: "Erro inesperado" }, 500);
  }
});
