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

    // 1. Delete related data (cascade-like but explicit for safety)
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
    ];

    // Use a transaction-like approach by deleting in sequence and handling errors
    for (const table of tablesToDelete) {
      const { error: tableError } = await supabaseAdmin.from(table).delete().eq("company_id", companyId);
      if (tableError) {
        console.error(`Erro ao deletar da tabela ${table}:`, tableError.message);
      }
    }

    // 2. Get all user profiles linked to this company to clean up auth
    const { data: companyProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_id", companyId);

    // 3. Delete user-related records and auth users
    if (companyProfiles && companyProfiles.length > 0) {
      for (const p of companyProfiles) {
        // Explicitly delete roles first
        await supabaseAdmin.from("user_roles").delete().eq("user_id", p.id);
        
        // Delete profile
        await supabaseAdmin.from("profiles").delete().eq("id", p.id);
        
        // Delete auth user (Admin API)
        try {
          await supabaseAdmin.auth.admin.deleteUser(p.id);
        } catch (e) {
          console.error(`Erro ao deletar usuário auth ${p.id}:`, e.message);
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
