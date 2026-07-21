import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-customer-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated and is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is super_admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Apenas Super Admin pode excluir empresas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Enforce a broad cleanup of all potential related tables
    const tablesToDelete = [
      "tiss_guides",
      "medical_records",
      "appointments",
      "patients",
      "specialties",
      "doctors",
      "procedures",
      "exams",
      "company_branding",
      "queue_tickets",
      "convenios",
      "queue_totems",
      "queue_units",
      "queue_guiches",
      "queue_lines",
      "queue_tvs",
      "lab_results",
      "lab_attendances",
      "lab_exams",
      "lab_budgets",
      "lab_stock_movements",
      "lab_stock_lots",
      "lab_stock_items",
      "lab_pharmacy_dispensations",
      "lab_pharmacy_meds",
      "lab_soroteca_samples",
      "lab_soroteca_shelves",
      "lab_soroteca_units",
      "lab_finance_transactions",
      "lab_price_tables",
      "lab_external_access",
      "user_roles"
    ];

    // Log the start of cleanup
    console.log(`Starting cleanup for company: ${companyId}`);

    for (const table of tablesToDelete) {
      const { error: delErr } = await supabaseAdmin.from(table).delete().eq("company_id", companyId);
      if (delErr) {
        console.warn(`Warning deleting from ${table}: ${delErr.message}`);
      }
    }

    // 2. Identify and remove all associated user accounts and profiles
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_id", companyId);

    if (profiles && profiles.length > 0) {
      console.log(`Deleting ${profiles.length} associated users`);
      for (const p of profiles) {
        // Remove roles specifically to avoid FK issues
        await supabaseAdmin.from("user_roles").delete().eq("user_id", p.id);
        // Remove profile
        await supabaseAdmin.from("profiles").delete().eq("id", p.id);
        // Remove auth user
        try {
          const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(p.id);
          if (authDelErr) console.error(`Auth deletion error for ${p.id}:`, authDelErr.message);
        } catch (e) {
          console.error(`Unexpected auth deletion error:`, e);
        }
      }
    }

    // 4. Finally delete the company itself
    const { error: deleteError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (deleteError) {
      throw new Error(`Erro final ao deletar empresa: ${deleteError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Empresa e todos os dados vinculados foram removidos com sucesso." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro fatal na exclusão:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
