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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exclui de vez um usuário DESATIVADO que nunca entrou no sistema (cadastro errado).
 * Quem já entrou fica só desativado: o histórico (coletas, laudos, auditoria) aponta para ele.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) return json({ error: "Sessão inválida ou expirada" }, 401);

    const { data: callerProfile } = await adminClient
      .from("profiles").select("role, company_id, is_active, is_admin").eq("id", caller.id).maybeSingle();
    if (!callerProfile || callerProfile.is_active === false) return json({ error: "Usuário sem permissão" }, 403);
    const isSuperAdmin = callerProfile.role === "super_admin";
    const isCompanyAdmin = callerProfile.role === "company_admin" || callerProfile.is_admin === true;
    if (!isSuperAdmin && !isCompanyAdmin) return json({ error: "Sem permissão para excluir usuários" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.user_id === "string" ? body.user_id : "";
    if (!UUID.test(userId)) return json({ error: "Usuário inválido" }, 400);
    if (userId === caller.id) return json({ error: "Você não pode excluir o próprio usuário" }, 400);

    const { data: alvo } = await adminClient
      .from("profiles").select("company_id, is_active, role").eq("id", userId).maybeSingle();
    if (!alvo || (!isSuperAdmin && alvo.company_id !== callerProfile.company_id)) {
      return json({ error: "Usuário não encontrado" }, 404);
    }
    if (alvo.role === "super_admin") return json({ error: "Sem permissão para excluir este usuário" }, 403);
    if (alvo.is_active !== false) return json({ error: "Desative o usuário antes de excluir" }, 409);

    const { data: authUser, error: getErr } = await adminClient.auth.admin.getUserById(userId);
    if (getErr || !authUser?.user) return json({ error: "Usuário não encontrado" }, 404);
    if (authUser.user.last_sign_in_at) {
      return json({
        error: "Este usuário já entrou no sistema e tem histórico. Ele não pode ser excluído; mantenha-o desativado.",
      }, 409);
    }

    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("delete-user:", delErr.message);
      return json({ error: "Este usuário tem registros ligados a ele e não pode ser excluído; mantenha-o desativado." }, 409);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("delete-user error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
