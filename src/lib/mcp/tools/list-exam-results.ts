import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_exam_results",
  title: "Listar exames do pedido",
  description: "Lista os exames de um atendimento pelo protocolo, com status de digitação e liberação.",
  inputSchema: {
    protocol: z.string().trim().min(1).describe("Protocolo do atendimento."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ protocol }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Usuário não autenticado");
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("lab_exam_results")
      .select("id, protocol, exam_code, exam_name, patient_name, status, typed_at, released_at, updated_at")
      .eq("protocol", protocol)
      .order("exam_name");

    if (error) throw new ToolError(error.message);

    const exams = (data ?? []).map((e) => ({
      id: String(e.id),
      protocol: e.protocol ?? null,
      exam_code: e.exam_code ?? null,
      exam_name: e.exam_name ?? null,
      patient_name: e.patient_name ?? null,
      status: e.status ?? null,
      typed_at: e.typed_at ?? null,
      released_at: e.released_at ?? null,
      updated_at: e.updated_at ?? null,
    }));

    return {
      content: [{ type: "text", text: exams.length ? JSON.stringify(exams, null, 2) : `Nenhum exame encontrado para o protocolo ${protocol}.` }],
      structuredContent: { exams },
    };
  },
});
