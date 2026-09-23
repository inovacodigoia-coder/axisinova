import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_patients",
  title: "Buscar pacientes",
  description: "Busca pacientes da empresa do usuário por nome ou CPF.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Nome parcial ou CPF do paciente."),
    limit: z.number().int().min(1).max(50).optional().describe("Máximo de pacientes retornados (padrão 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Usuário não autenticado");
    const supabase = supabaseForUser(ctx);
    const digits = query.replace(/\D/g, "");
    const filter = digits.length >= 3
      ? `cpf.ilike.%${digits}%,name.ilike.%${query}%`
      : `name.ilike.%${query}%`;

    const { data, error } = await supabase
      .from("patients")
      .select("id, name, cpf, birth_date, gender, phone, email, status, sequence_id")
      .or(filter)
      .order("name")
      .limit(limit ?? 10);

    if (error) throw new ToolError(error.message);

    const patients = (data ?? []).map((p) => ({
      id: String(p.id),
      name: p.name ?? "",
      cpf: p.cpf ?? null,
      birth_date: p.birth_date ?? null,
      gender: p.gender ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      status: p.status ?? null,
      sequence_id: p.sequence_id ?? null,
    }));

    return {
      content: [{ type: "text", text: patients.length ? JSON.stringify(patients, null, 2) : "Nenhum paciente encontrado." }],
      structuredContent: { patients },
    };
  },
});
