import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPatientsTool from "./tools/search-patients";
import listAttendanceOrdersTool from "./tools/list-attendance-orders";
import listExamResultsTool from "./tools/list-exam-results";
import listExamCatalogTool from "./tools/list-exam-catalog";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "axis-inova",
  title: "Axis Inova",
  version: "0.1.0",
  instructions:
    "Ferramentas do Axis Inova (gestão clínica e laboratorial). Use `search_patients` para localizar pacientes, `list_attendance_orders` para atendimentos/pedidos, `list_exam_results` para os exames de um protocolo e `list_exam_catalog` para o catálogo de exames. Todos os dados são limitados à empresa do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPatientsTool, listAttendanceOrdersTool, listExamResultsTool, listExamCatalogTool],
});
