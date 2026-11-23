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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Authentication is mandatory — no client-supplied identity is trusted.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) return json({ error: "Sessão inválida ou expirada" }, 401);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, company_id, is_active, is_admin")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.is_active === false) {
      return json({ error: "Usuário sem permissão" }, 403);
    }

    const callerRole = callerProfile.role as string | null;
    const isSuperAdmin = callerRole === "super_admin";
    const isCompanyAdmin = callerRole === "company_admin" || callerProfile.is_admin === true;

    if (!isSuperAdmin && !isCompanyAdmin) {
      return json({ error: "Sem permissão para criar usuários" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, full_name, cpf, role, company_id, badge_code } = body ?? {};

    // Company is derived from the verified caller; super admins may target another company.
    const effectiveCompanyId = isSuperAdmin
      ? (company_id || callerProfile.company_id)
      : callerProfile.company_id;

    if (!effectiveCompanyId) {
      return json({ error: "Empresa não identificada" }, 400);
    }

    if (!email || !password || !full_name || !role) {
      return json({ error: "Campos obrigatórios: email, senha, nome completo e função" }, 400);
    }

    // Only super admins can mint other super admins.
    if (role === "super_admin" && !isSuperAdmin) {
      return json({ error: "Sem permissão para atribuir esta função" }, 403);
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // Marca de criação pelo sistema: só com ela o banco aceita empresa e função do user_metadata.
      app_metadata: { provisionado: true },
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
        : "Não foi possível criar o usuário";
      return json({ error: msg }, 400);
    }

    // O gatilho de cadastro não enxerga app_metadata na inserção; empresa, função e ativo são gravados aqui.
    const { error: provError } = await adminClient.rpc("usuario_provisionar", {
      p_user: newUser.user.id,
      p_company: effectiveCompanyId,
      p_role: role,
      p_badge: badge_code || null,
    });
    if (provError) {
      console.error("create-user provisionar:", provError.message);
      await adminClient.auth.admin.deleteUser(newUser.user.id).catch(() => {});
      return json({ error: "Não foi possível vincular o usuário à empresa. Tente de novo." }, 500);
    }

    return json({ user: { id: newUser.user.id, email: newUser.user.email } }, 201);
  } catch (err) {
    console.error("create-user error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
