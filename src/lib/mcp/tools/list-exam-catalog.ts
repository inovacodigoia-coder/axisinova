import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_exam_catalog",
  title: "Consultar catálogo de exames",
  description: "Consulta o catálogo de exames da empresa por nome ou código interno.",
  inputSchema: {
    query: z.string().trim().optional().describe("Nome parcial ou código do exame."),
    only_active: z.boolean().optional().describe("Retornar apenas exames ativos (padrão true)."),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de exames retornados (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, only_active, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Usuário não autenticado");
    const supabase = supabaseForUser(ctx);

    let q = supabase
      .from("exams")
      .select("id, name, internal_code, tuss_code, type, measurement_unit, result_deadline_days, is_active")
      .order("name")
      .limit(limit ?? 20);

    if (only_active !== false) q = q.eq("is_active", true);
    if (query) q = q.or(`name.ilike.%${query}%,internal_code.ilike.%${query}%`);

    const { data, error } = await q;
    if (error) throw new ToolError(error.message);

    const exams = (data ?? []).map((e) => ({
      id: String(e.id),
      name: e.name ?? "",
      internal_code: e.internal_code ?? null,
      tuss_code: e.tuss_code ?? null,
      type: e.type ?? null,
      measurement_unit: e.measurement_unit ?? null,
      result_deadline_days: e.result_deadline_days ?? null,
      is_active: e.is_active ?? null,
    }));

    return {
      content: [{ type: "text", text: exams.length ? JSON.stringify(exams, null, 2) : "Nenhum exame encontrado." }],
      structuredContent: { exams },
    };
  },
});
