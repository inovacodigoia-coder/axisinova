import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { parse, aplicarCatalogo } from "../_shared/pardini/catalogo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Não autenticado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Sessão inválida" }, 401);

    const form = await req.formData().catch(() => null);
    const apoioId = String(form?.get("apoio_id") ?? "");
    const file = form?.get("file");
    if (!/^[0-9a-f-]{36}$/i.test(apoioId) || !(file instanceof File)) return json({ ok: false, error: "Envie o laboratório e o arquivo XML" }, 400);
    if (file.size > 30 * 1024 * 1024) return json({ ok: false, error: "Arquivo acima de 30 MB" }, 400);

    const { data: lab } = await userClient.from("apoio_laboratorio").select("id, company_id, conector").eq("id", apoioId).maybeSingle();
    if (!lab) return json({ ok: false, error: "Laboratório de apoio não encontrado" }, 404);
    const [{ data: perm }, { data: lib }] = await Promise.all([
      userClient.rpc("apoio_tem_permissao", { _perm: "apoio.catalogo.gerenciar" }),
      userClient.rpc("apoio_modulo_liberado", { _company_id: lab.company_id }),
    ]);
    if (!lib) return json({ ok: false, error: "Módulo Apoio não liberado para a empresa" }, 403);
    if (!perm) return json({ ok: false, error: "Você não tem permissão para atualizar o catálogo" }, 403);

    const buf = new Uint8Array(await file.arrayBuffer());
    const head = new TextDecoder("latin1").decode(buf.slice(0, 200));
    const enc = /encoding=["']utf-8["']/i.test(head) ? "utf-8" : "iso-8859-1";
    const xml = new TextDecoder(enc).decode(buf);
    const itens = parse(xml);
    if (itens.length === 0) return json({ ok: false, error: "Nenhum <EXAME> válido encontrado no arquivo" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const r = await aplicarCatalogo(admin, lab, itens, file.name, user.id);
    await admin.from("apoio_chamada_log").insert({ company_id: lab.company_id, apoio_id: lab.id, operacao: "catalogo", requisicao: `UPLOAD ${file.name.slice(0, 150)}`, resposta: `${itens.length} exames`, http_status: 200, duracao_ms: 0, erro: null }).then(() => {}, () => {});
    return json({ ok: true, atualizado_em: r.sync.created_at, total: itens.length, novos: r.novos, alterados: r.alterados, desativados: r.desativados, terceirizados_afetados: r.afetados, alertas: r.alertas.map((a) => a.mensagem) });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: (e as Error).message || "Erro ao processar o catálogo" }, 500);
  }
});
