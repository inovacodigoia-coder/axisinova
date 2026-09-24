// Testa a conexão chamando getListaErroPedido e atualiza a tabela de erros do apoio.
import { adminClient, autenticar, carregarCtx, corsHeaders, cursorGravar, json, uuidOk } from '../_shared/pardini/contexto.ts'
import { chamar } from '../_shared/pardini/soap.ts'

import { categoriaErro as categoria, parseListaErro } from '../_shared/pardini/parsers.ts'
const extrair = parseListaErro

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
