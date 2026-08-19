import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { user_id, company_id } = (await req.json().catch(() => ({}))) ?? {};
    if (!user_id) return json({ error: "Informe o usuário" }, 400);

    let callerRole: string | null = null;
    let callerCompanyId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await anonClient.auth.getUser();
      if (caller) {
        const { data: p } = await admin.from("profiles").select("role, company_id").eq("id", caller.id).single();
        callerRole = p?.role ?? null;
        callerCompanyId = p?.company_id ?? null;
      }
    }

    const { data: target } = await admin
      .from("profiles")
      .select("id, company_id")
      .eq("id", user_id)
      .single();

    if (!target) return json({ error: "Usuário não encontrado" }, 404);

    const effectiveCompanyId = callerCompanyId || company_id;
    const isSuperAdmin = callerRole === "super_admin";
    const isSameCompany = effectiveCompanyId === target.company_id;

    if (!isSuperAdmin && !isSameCompany) {
      return json({ error: "Sem permissão para visualizar este usuário" }, 403);
    }

    const { data, error } = await admin.auth.admin.getUserById(user_id);
    if (error) return json({ error: "Não foi possível obter o e-mail" }, 400);

    return json({ email: data.user?.email ?? null });
  } catch (err) {
    console.error("get-user-email error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
