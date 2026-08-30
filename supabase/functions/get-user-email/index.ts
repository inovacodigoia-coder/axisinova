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

    const body = (await req.json().catch(() => ({}))) ?? {};
    const singleId: string | undefined = body.user_id;
    const bulkIds: string[] | undefined = Array.isArray(body.user_ids)
      ? body.user_ids.filter((v: unknown) => typeof v === "string")
      : undefined;

    if (!singleId && (!bulkIds || bulkIds.length === 0)) {
      return json({ error: "Informe o usuário" }, 400);
    }
    if (bulkIds && bulkIds.length > 200) {
      return json({ error: "Máximo de 200 usuários por requisição" }, 400);
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
      .select("role, company_id, is_active")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.is_active === false) {
      return json({ error: "Sem permissão" }, 403);
    }

    const isSuperAdmin = callerProfile.role === "super_admin";
    const targetIds = bulkIds ?? [singleId!];

    // Load all target profiles in one query and enforce scoping
    const { data: targets } = await admin
      .from("profiles")
      .select("id, company_id")
      .in("id", targetIds);

    const found = new Map((targets ?? []).map((t) => [t.id as string, t.company_id as string | null]));

    const allowedIds = targetIds.filter((id) => {
      if (!found.has(id)) return false;
      if (isSuperAdmin) return true;
      const companyId = found.get(id);
      return !!callerProfile.company_id && callerProfile.company_id === companyId;
    });

    if (allowedIds.length === 0) {
      return json(
        singleId
          ? { error: found.has(singleId) ? "Sem permissão para visualizar este usuário" : "Usuário não encontrado" }
          : { emails: {} },
        singleId ? (found.has(singleId) ? 403 : 404) : 200,
      );
    }

    const emails: Record<string, string | null> = {};
    await Promise.all(
      allowedIds.map(async (id) => {
        try {
          const { data, error } = await admin.auth.admin.getUserById(id);
          emails[id] = error ? null : (data.user?.email ?? null);
        } catch {
          emails[id] = null;
        }
      }),
    );

    if (singleId) {
      if (!(singleId in emails)) {
        return json({ error: "Não foi possível obter o e-mail" }, 400);
      }
      return json({ email: emails[singleId] });
    }

    return json({ emails });
  } catch (err) {
    console.error("get-user-email error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
