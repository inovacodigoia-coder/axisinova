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

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const identifier = String(body?.identifier ?? "").trim().toLowerCase();

    if (!identifier || identifier.length > 320) {
      return json({ error: "Requisição inválida" }, 400);
    }

    // IP and user agent are always derived from the request, never from the client body.
    const ip = clientIp(req);
    const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);

    if (action === "check") {
      const { data, error } = await admin.rpc("auth_check_lockout", {
        _identifier: identifier,
        _ip: ip,
      });
      if (error) {
        console.error("auth_check_lockout failed");
        return json({ locked: false });
      }
      return json(data);
    }

    if (action === "record") {
      const success = body?.success === true;

      // Company is only resolved from a verified session token, never from the body.
      let companyId: string | null = null;
      const authHeader = req.headers.get("Authorization");
      if (success && authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: userData } = await admin.auth.getUser(token);
        if (userData?.user) {
          const { data: profile } = await admin
            .from("profiles")
            .select("company_id")
            .eq("id", userData.user.id)
            .maybeSingle();
          companyId = profile?.company_id ?? null;
        }
      }

      const { data, error } = await admin.rpc("auth_record_attempt", {
        _identifier: identifier,
        _ip: ip,
        _user_agent: userAgent,
        _success: success,
        _company_id: companyId,
      });
      if (error) {
        console.error("auth_record_attempt failed");
        return json({ locked: false });
      }
      return json(data);
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("auth-guard error");
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
