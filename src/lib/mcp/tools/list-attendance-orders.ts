import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_attendance_orders",
  title: "Listar atendimentos",
  description: "Lista os atendimentos/pedidos recentes, com filtros opcionais por protocolo, paciente ou status.",
  inputSchema: {
    protocol: z.string().trim().optional().describe("Protocolo exato do atendimento."),
    patient_name: z.string().trim().optional().describe("Nome parcial do paciente."),
    status: z.string().trim().optional().describe("Status do atendimento."),
    limit: z.number().int().min(1).max(50).optional().describe("Máximo de atendimentos retornados (padrão 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ protocol, patient_name, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Usuário não autenticado");
    const supabase = supabaseForUser(ctx);

    let q = supabase
      .from("attendance_orders")
      .select("id, protocol, order_number, patient_name, status, delivery_status, service_type, doctor_name, convenio_name, origin_name, created_at, delivery_date")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (protocol) q = q.eq("protocol", protocol);
    if (patient_name) q = q.ilike("patient_name", `%${patient_name}%`);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw new ToolError(error.message);

    const orders = (data ?? []).map((o) => ({
      id: String(o.id),
      protocol: o.protocol ?? null,
      order_number: o.order_number ?? null,
      patient_name: o.patient_name ?? null,
      status: o.status ?? null,
      delivery_status: o.delivery_status ?? null,
      service_type: o.service_type ?? null,
      doctor_name: o.doctor_name ?? null,
      convenio_name: o.convenio_name ?? null,
      origin_name: o.origin_name ?? null,
      created_at: o.created_at ?? null,
      delivery_date: o.delivery_date ?? null,
    }));

    return {
      content: [{ type: "text", text: orders.length ? JSON.stringify(orders, null, 2) : "Nenhum atendimento encontrado." }],
      structuredContent: { orders },
    };
  },
});
