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
    const { user_id, password } = body ?? {};

    if (!user_id || typeof password !== "string" || password.length < 6) {
      return json({ error: "Informe o usuário e uma senha com no mínimo 6 caracteres" }, 400);
    }

    // Authentication is mandatory — company_id from the body is never trusted.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) return json({ error: "Sessão inválida ou expirada" }, 401);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, company_id, is_active, is_admin")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.is_active === false) {
      return json({ error: "Sem permissão" }, 403);
    }

    const { data: target } = await admin
      .from("profiles")
      .select("id, company_id")
      .eq("id", user_id)
      .maybeSingle();

    if (!target) return json({ error: "Usuário não encontrado" }, 404);

    const isSuperAdmin = callerProfile.role === "super_admin";
    const isCompanyAdmin =
      (callerProfile.role === "company_admin" || callerProfile.is_admin === true) &&
      !!callerProfile.company_id &&
      callerProfile.company_id === target.company_id;

    if (!isSuperAdmin && !isCompanyAdmin) {
      return json({ error: "Sem permissão para alterar a senha deste usuário" }, 403);
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(user_id, { password });
    if (updErr) {
      const m = (updErr.message || "").toLowerCase();
      let msg = "Não foi possível definir a senha. Tente novamente.";
      if (m.includes("weak") || m.includes("pwned") || m.includes("easy to guess"))
        msg = "Esta senha é muito comum e foi encontrada em vazamentos de dados. Escolha uma senha mais forte (letras maiúsculas, minúsculas, números e símbolos).";
      else if (m.includes("at least") && m.includes("characters"))
        msg = "A senha é muito curta. Use no mínimo 8 caracteres.";
      else if (m.includes("different from the old"))
        msg = "A nova senha deve ser diferente da senha atual.";
      return json({ error: msg }, 400);
    }

    await admin.from("profiles").update({ must_change_password: true }).eq("id", user_id);

    return json({ success: true });
  } catch (err) {
    console.error("set-user-password error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
