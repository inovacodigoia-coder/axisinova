// Testa a conexão chamando getListaErroPedido e atualiza a tabela de erros do apoio.
import { adminClient, autenticar, carregarCtx, corsHeaders, cursorGravar, json, uuidOk } from '../_shared/pardini/contexto.ts'
import { chamar } from '../_shared/pardini/soap.ts'
import { desescapar, resolverHref } from '../_shared/pardini/xml.ts'

const COMERCIAL = ['10035', '10040', '10204', '10205', '10206', '10213', '10214', '10226', '10228']
const TECNICO = ['10103', '10110', '10207', '10227']
export const categoria = (c: string) => ['10023', '10217'].includes(c) ? 'duplicidade' : COMERCIAL.includes(c) ? 'comercial' : TECNICO.includes(c) ? 'tecnico' : 'preenchimento'

function extrair(xml: string): { codigo: string; mensagem: string }[] {
  const r = resolverHref(xml)
  const out = new Map<string, string>()
  // Pares <tagA>1xxxx</tagA><tagB>mensagem</tagB> (em qualquer ordem)
  const re1 = /<([\w:-]+)[^>]*>\s*(1\d{4})\s*<\/\1>\s*<([\w:-]+)[^>]*>([^<]+)<\/\3>/g
  const re2 = /<([\w:-]+)[^>]*>([^<]{3,})<\/\1>\s*<([\w:-]+)[^>]*>\s*(1\d{4})\s*<\/\3>/g
  let m
  while ((m = re1.exec(r))) out.set(m[2], desescapar(m[4]).trim())
  while ((m = re2.exec(r))) if (!out.has(m[4])) out.set(m[4], desescapar(m[2]).trim())
  // Texto "10023 - mensagem" / "10023;mensagem"
  for (const t of r.replace(/<[^>]+>/g, '\n').split('\n')) {
    const x = t.match(/^\s*(1\d{4})\s*[-;:|]\s*(.+)$/); if (x && !out.has(x[1])) out.set(x[1], desescapar(x[2]).trim())
  }
  return [...out.entries()].map(([codigo, mensagem]) => ({ codigo, mensagem }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const inicio = Date.now()
  const admin = adminClient()
  const quem = await autenticar(req, admin, 'apoio.laboratorio.gerenciar')
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  if (!uuidOk(body?.apoio_id)) return json({ ok: false, motivo: 'Laboratório inválido' }, 400)
  const { data: lab } = await admin.from('apoio_laboratorio').select('id, company_id').eq('id', body.apoio_id).maybeSingle()
  if (!lab || (quem.companyId && lab.company_id !== quem.companyId)) return json({ ok: false, motivo: 'Laboratório de apoio não encontrado' }, 404)
  try {
    const ctx = await carregarCtx(admin, lab.id)
    const resp = await chamar(ctx, 'getListaErroPedido', [], { tentativas: 2 })
    const erros = extrair(resp)
    if (erros.length) {
      await admin.from('apoio_erro').delete().eq('apoio_id', lab.id)
      const rows = erros.map((e) => ({ company_id: lab.company_id, apoio_id: lab.id, codigo: e.codigo, mensagem: e.mensagem.slice(0, 1000), categoria: categoria(e.codigo) }))
      for (let i = 0; i < rows.length; i += 200) await admin.from('apoio_erro').insert(rows.slice(i, i + 200))
    }
    await cursorGravar(admin, ctx.lab, 'conexao', {})
    const cats = erros.reduce((a: any, e) => { const c = categoria(e.codigo); a[c] = (a[c] ?? 0) + 1; return a }, {})
    return json({ ok: true, tempo_ms: Date.now() - inicio, erros: erros.length, categorias: cats })
  } catch (e) {
    const msg = (e as Error).message
    const { data: l } = await admin.from('apoio_laboratorio').select('id, company_id').eq('id', lab.id).single()
    await cursorGravar(admin, l as any, 'conexao', { erro: msg })
    return json({ ok: false, motivo: msg, tempo_ms: Date.now() - inicio })
  }
})
