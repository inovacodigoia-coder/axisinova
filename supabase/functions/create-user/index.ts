import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Try JWT auth first
    const authHeader = req.headers.get("Authorization");
    let callerCompanyId: string | null = null;
    let callerRole: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await anonClient.auth.getUser();
      if (caller) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("role, company_id")
          .eq("id", caller.id)
          .single();
        if (profile) {
          callerRole = profile.role;
          callerCompanyId = profile.company_id;
        }
      }
    }

    const body = await req.json();
    const { email, password, full_name, cpf, role, company_id, badge_code } = body;

    // If no JWT auth succeeded, use the company_id from the body (for mock-auth users)
    const effectiveCompanyId = callerCompanyId || company_id;

    if (!effectiveCompanyId) {
      return new Response(JSON.stringify({ error: "Empresa não identificada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, senha, nome completo e função" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with admin client
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        cpf: cpf || null,
        role,
        company_id: effectiveCompanyId,
        badge_code: badge_code || null,
      },
    });

    if (createError) {
      const msg = createError.message.includes("already been registered")
        ? "Este e-mail já está cadastrado"
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Força a redefinição de senha no primeiro acesso
    await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", newUser.user.id);

    return new Response(JSON.stringify({ user: { id: newUser.user.id, email: newUser.user.email } }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-user error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
