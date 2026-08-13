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

    const body = await req.json().catch(() => ({}));
    const { user_id, password, company_id } = body ?? {};

    if (!user_id || typeof password !== "string" || password.length < 6) {
      return json({ error: "Informe o usuário e uma senha com no mínimo 6 caracteres" }, 400);
    }

    // Identify caller (JWT preferred, fallback to company_id for mock-auth admins)
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
    const isCompanyAdmin =
      (callerRole === "company_admin" || !callerRole) && effectiveCompanyId === target.company_id;

    if (!isSuperAdmin && !isCompanyAdmin) {
      return json({ error: "Sem permissão para alterar a senha deste usuário" }, 403);
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(user_id, { password });
    if (updErr) return json({ error: updErr.message }, 400);

    await admin.from("profiles").update({ must_change_password: true }).eq("id", user_id);

    return json({ success: true });
  } catch (err) {
    console.error("set-user-password error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
