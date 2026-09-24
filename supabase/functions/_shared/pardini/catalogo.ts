// Parser e aplicação do catálogo tabexalhpV2.xml (usado no upload manual e na rotina diária)
const decodeEnt = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();

// Lê filho <TAG>..</TAG> ou atributo TAG="..."
function campo(bloco: string, tag: string): string {
  const m = bloco.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (m) return decodeEnt(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  const a = bloco.match(new RegExp(`<[^>]*\\s${tag}="([^"]*)"`, "i"));
  return a ? decodeEnt(a[1]) : "";
}
function blocos(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*?(?:/>|>([\\s\\S]*?)</${tag}>)`, "gi");
  let m;
  while ((m = re.exec(xml))) out.push(m[0]);
  return out;
}
function textos(bloco: string, tag: string): string[] {
  return blocos(bloco, tag).map((b) => decodeEnt(b.replace(/^<[^>]*>/, "").replace(/<\/[^>]*>$/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "))).filter(Boolean);
}

export interface Item {
  codigo: string; mnmat: string; mnexa: string; descricao: string; origem_admissivel: string | null;
  materiais: string[]; conservantes: string[]; info_comp: string[]; condicoes: string[];
}

export function parse(xml: string): Item[] {
  const map = new Map<string, Item>();
  for (const ex of blocos(xml, "EXAME")) {
    const mnmat = campo(ex, "MNMAT"), mnexa = campo(ex, "MNEXA");
    if (!mnmat || !mnexa) continue;
    const mats = blocos(ex, "MATREAL");
    map.set(`${mnmat}|${mnexa}`, {
      codigo: `${mnmat}|${mnexa}`, mnmat, mnexa,
      descricao: campo(ex, "DESCEXA"),
      origem_admissivel: campo(ex, "ORIGEMADMISSIVEL") || null,
      materiais: mats.map((m) => campo(m, "DESCMATREAL")).filter(Boolean),
      conservantes: mats.map((m) => campo(m, "CONSERVANTE")).filter(Boolean),
      info_comp: textos(ex, "INFOCOMP"),
      condicoes: textos(ex, "CONDICAO"),
    });
  }
  return [...map.values()];
}

const matSig = (m: unknown) => JSON.stringify(((m as string[]) ?? []).map((x) => String(x).toUpperCase().trim()).sort());
const assinatura = (i: Partial<Item>) =>
  JSON.stringify([i.descricao ?? "", i.origem_admissivel ?? null, i.materiais ?? [], i.conservantes ?? [], i.info_comp ?? [], i.condicoes ?? []]);


export async function aplicarCatalogo(admin: any, lab: { id: string; company_id: string }, itens: Item[], arquivoNome: string, userId: string | null) {
  const apoioId = lab.id
    const existentes = new Map<string, { id: string; ativo: boolean; sig: string; descricao: string; mat: string }>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from("apoio_catalogo_exame")
        .select("id, codigo, ativo, descricao, origem_admissivel, materiais, conservantes, info_comp, condicoes")
        .eq("apoio_id", apoioId).range(from, from + 999);
      if (error) throw error;
      for (const r of data ?? []) existentes.set(r.codigo, { id: r.id, ativo: r.ativo, descricao: r.descricao ?? "", sig: assinatura(r as any), mat: matSig((r as any).materiais) });
      if (!data || data.length < 1000) break;
    }

    const agora = new Date().toISOString();
    const noArquivo = new Set(itens.map((i) => i.codigo));
    let novos = 0; const alterados: string[] = []; const matMudou = new Set<string>();
    for (const i of itens) {
      const e = existentes.get(i.codigo);
      if (!e) novos++;
      else if (e.sig !== assinatura(i) || !e.ativo) { if (e.ativo) { alterados.push(i.codigo); if (e.mat !== matSig(i.materiais)) matMudou.add(i.codigo); } }
    }
    const desativar = [...existentes.entries()].filter(([c, e]) => e.ativo && !noArquivo.has(c)).map(([c]) => c);

    const rows = itens.map((i) => ({ company_id: lab.company_id, apoio_id: apoioId, ...i, ativo: true, sincronizado_em: agora }));
    for (let k = 0; k < rows.length; k += 500) {
      const { error } = await admin.from("apoio_catalogo_exame").upsert(rows.slice(k, k + 500), { onConflict: "apoio_id,codigo" });
      if (error) throw error;
    }
    for (let k = 0; k < desativar.length; k += 300) {
      const { error } = await admin.from("apoio_catalogo_exame").update({ ativo: false, sincronizado_em: agora })
        .eq("apoio_id", apoioId).in("codigo", desativar.slice(k, k + 300));
      if (error) throw error;
    }

    // Alertas só para códigos usados em exames terceirizados
    const relevantes = [...desativar, ...alterados];
    const alertas: { exame_id: string; codigo_apoio: string; tipo: string; mensagem: string }[] = [];
    if (relevantes.length) {
      const { data: dps } = await admin.from("apoio_depara_exame").select("exame_id, codigo_apoio")
        .eq("apoio_id", apoioId).eq("ativo", true).in("codigo_apoio", relevantes);
      const ids = [...new Set((dps ?? []).map((d: any) => d.exame_id))];
      const { data: exs } = ids.length ? await admin.from("exams").select("id, name").in("id", ids) : { data: [] as any[] };
      const nome = new Map((exs ?? []).map((e: any) => [e.id, e.name]));
      const desSet = new Set(desativar);
      for (const d of dps ?? []) {
        const desc = existentes.get(d.codigo_apoio)?.descricao || d.codigo_apoio;
        const tipo = desSet.has(d.codigo_apoio) ? "desativado" : matMudou.has(d.codigo_apoio) ? "material" : "alterado";
        const n = nome.get(d.exame_id) ?? "exame";
        alertas.push({
          exame_id: d.exame_id, codigo_apoio: d.codigo_apoio, tipo,
          mensagem: tipo === "desativado" ? `Exame desativado no Pardini: ${n} (${d.codigo_apoio} · ${desc})`
            : tipo === "material" ? `Material mudou no Pardini: ${n} (${d.codigo_apoio} · ${desc})`
            : `O Pardini alterou o exame ${desc} (${d.codigo_apoio}) usado em '${n}'`,
        });
      }
    }
    const afetados = new Set(alertas.map((a) => a.exame_id)).size;

    const { data: sync, error: sErr } = await admin.from("apoio_catalogo_sincronizacao").insert({
      company_id: lab.company_id, apoio_id: apoioId, arquivo_nome: arquivoNome.slice(0, 200), total_arquivo: itens.length,
      novos, alterados: alterados.length, desativados: desativar.length, terceirizados_afetados: afetados, executado_por: userId,
    }).select("id, created_at").single();
    if (sErr) throw sErr;
    if (alertas.length) {
      await admin.from("apoio_catalogo_alerta").insert(alertas.map((a) => ({ ...a, company_id: lab.company_id, apoio_id: apoioId, sincronizacao_id: sync.id })));
      // Sininho: desativados e material mudado avisam antes de chegar pedido novo
      for (const a of alertas.filter((x) => x.tipo !== "alterado").slice(0, 20)) {
        await admin.rpc("apoio_alertar", { _company: lab.company_id, _evento: "apoio_catalogo", _perm: "apoio.depara.gerenciar",
          _titulo: a.tipo === "desativado" ? "Exame desativado no Pardini" : "Material mudou no Pardini", _msg: a.mensagem, _rota: "/app/apoio/kanban?visao=excecoes" }).then(() => {}, () => {});
      }
    }
    await admin.from("apoio_auditoria").insert({
      company_id: lab.company_id, tabela: "apoio_catalogo_exame", registro_id: apoioId, acao: "SINCRONIZAR",
      usuario_id: userId, depois: { total: itens.length, novos, alterados: alterados.length, desativados: desativar.length, afetados },
    }).then(() => {}, () => {});

  return { sync, total: itens.length, afetados, alertas, novos, alterados: alterados.length, desativados: desativar.length }
}
