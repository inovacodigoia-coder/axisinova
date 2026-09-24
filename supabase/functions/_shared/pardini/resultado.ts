// Parse e importação de resultados do Pardini (getResultado). Nunca libera sozinho.
import { attr, filhos, numeroPardini, texto } from './xml.ts'
import type { Ctx } from './soap.ts'

export interface Analito { chave: string; nome: string; valor: string; valor_bruto: string; unidade: string; referencia: string; tipo: string; casas: number | null }
export interface Super {
  codExmApoio: string; codExmLab: string; codigoFormato: string; retificacao: string; materialNome: string; exameNome: string; xml: string
  conteudo: { analitos: Analito[]; metodo?: string; codigo_formato?: string; interpretacao?: string; nota?: string; comentario_patologista?: string; observacao?: string; inf_adicional?: string[]; referencia_texto?: string; material?: string; exame?: string }
}
export interface PedidoRes { codPedApoio: string; codPedLab: string; nome: string; retificacao: string; supers: Super[] }

// Nome do analito: <Nome> do próprio ItemDeExame (antes dos Resultados); o atributo Nome do Resultado ("%") é só o rótulo
const nomeDe = (b: string) => texto(b.replace(/^<[^>]*>/, '').replace(/<(Resultado|Conteudo)\b[\s\S]*/i, ''), 'Nome') || attr(b, 'Nome') || attr(b, 'Descricao') || ''

export function parseResultados(xml: string): PedidoRes[] {
  const out: PedidoRes[] = []
  for (const p of filhos(xml, 'Pedido')) {
    const cab = p.replace(/<SuperExame\b[\s\S]*/i, '')
    const ped: PedidoRes = { codPedApoio: texto(cab, 'CodPedApoio'), codPedLab: texto(cab, 'CodPedLab'), nome: texto(cab, 'Nome'), retificacao: texto(cab, 'Retificacao'), supers: [] }
    for (const s of filhos(p, 'SuperExame')) {
      const cabS = s.replace(/<Exame\b[\s\S]*/i, '')
      const analitos: Analito[] = []
      const c: Super['conteudo'] = { analitos, inf_adicional: [] }
      for (const ex of filhos(s, 'Exame')) {
        const idE = attr(ex, 'idExame')
        const semItens = ex.replace(/<ItemDeExame\b[\s\S]*?<\/ItemDeExame>/gi, '')
        c.metodo ||= texto(semItens, 'Metodo'); c.interpretacao ||= texto(semItens, 'Interpretacao')
        c.nota ||= texto(semItens, 'Nota'); c.comentario_patologista ||= texto(semItens, 'ComentarioDoPatologista')
        c.observacao ||= texto(semItens, 'Observacao')
        for (const ia of filhos(semItens, 'InfAdicional')) {
          const v = filhos(ia, 'Valor')[0] ?? ''
          const val = numeroPardini(texto(`<x>${v}</x>`, 'Valor'), attr(v, 'Tipo'), attr(v, 'CasasDecimais'))
          const t = [texto(ia, 'Descricao'), [val, texto(ia, 'Unidade')].filter(Boolean).join(' ')].filter(Boolean).join(': ')
          if (t) c.inf_adicional!.push(t)
        }
        for (const it of filhos(ex, 'ItemDeExame')) {
          const idI = attr(it, 'idItemDeExame')
          for (const r of filhos(it, 'Resultado')) {
            const idR = attr(r, 'idResultado')
            const unidade = texto(r, 'UnidadeDeMedida')
            const ref = texto(r, 'ValorReferenciaBlocoTexto') || texto(r, 'ValorDeReferencia')
            for (const v of filhos(r, 'Valor')) {
              const bruto = texto(`<x>${v}</x>`, 'Valor')
              const tipo = attr(v, 'Tipo'), casas = attr(v, 'CasasDecimais')
              analitos.push({
                chave: [idE, idI, idR, attr(v, 'idValor')].join('/'), nome: nomeDe(it) || nomeDe(r), valor_bruto: bruto,
                valor: numeroPardini(bruto, tipo, casas), unidade, referencia: ref, tipo, casas: casas === '' ? null : Number(casas),
              })
            }
          }
        }
      }
      c.referencia_texto = texto(cabS, 'ValorReferenciaBlocoTexto'); c.material = texto(cabS, 'MaterialNome'); c.exame = texto(cabS, 'ExameNome')
      // Método: o do <Exame> prevalece; se não vier, usa o do <SuperExame>
      c.metodo = (c.metodo || texto(cabS, 'Metodo') || '').trim() || undefined
      c.codigo_formato = texto(cabS, 'CodigoFormato') || undefined
      ped.supers.push({
        codExmApoio: texto(cabS, 'CodExmApoio'), codExmLab: texto(cabS, 'CodExmLab'), codigoFormato: texto(cabS, 'CodigoFormato'),
        retificacao: texto(cabS, 'Retificacao'), materialNome: c.material, exameNome: c.exame, xml: s, conteudo: c,
      })
    }
    out.push(ped)
  }
  return out
}

async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export interface ItemFmt { chave: string; nome: string; unidade: string; tipo: string; casas: number | null }
const nrm = (x: string) => (x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const tipoN = (t: string) => /num/i.test(t || '') ? 'N' : 'T'
/** Formatos idênticos: mesmos valores (nome + unidade + tipo + casas) na mesma ordem */
export function formatoIdentico(a: ItemFmt[], b: ItemFmt[]) {
  return a.length > 0 && a.length === b.length && a.every((x, i) => nrm(x.nome) === nrm(b[i].nome) && nrm(x.unidade) === nrm(b[i].unidade) && tipoN(x.tipo) === tipoN(b[i].tipo) && (x.casas ?? 0) === (b[i].casas ?? 0))
}

/** Formato novo idêntico a um já mapeado → copia o mapeamento (sem reter), com log e auditoria */
export async function mapearIdentico(admin: any, lab: { id: string; company_id: string }, deparaId: string, companyId: string, s: Super) {
  const { data: mod } = await admin.from('apoio_modelo_resultado').select('modelo_json').eq('apoio_id', lab.id).eq('cod_exm_apoio', s.codExmApoio).eq('codigo_formato', s.codigoFormato).maybeSingle()
  const novo: ItemFmt[] = (mod?.modelo_json?.length ? mod.modelo_json : s.conteudo.analitos).map((a: any) => ({ chave: a.chave, nome: a.nome, unidade: a.unidade || '', tipo: a.tipo || '', casas: a.casas ?? null }))
  const { data: rows } = await admin.from('apoio_depara_analito').select('codigo_formato, chave_analito, nome_apoio, parametro_id, ignorar, casas_decimais').eq('depara_exame_id', deparaId)
  const porFmt = new Map<string, any[]>()
  for (const r of rows ?? []) if (r.parametro_id || r.ignorar) porFmt.set(r.codigo_formato, [...(porFmt.get(r.codigo_formato) ?? []), r])
  if (!porFmt.size) return []
  const { data: mods } = await admin.from('apoio_modelo_resultado').select('codigo_formato, modelo_json').eq('apoio_id', lab.id).eq('cod_exm_apoio', s.codExmApoio).in('codigo_formato', [...porFmt.keys()])
  for (const m of mods ?? []) {
    const velho: ItemFmt[] = m.modelo_json ?? []
    if (!formatoIdentico(velho, novo)) continue
    const mapV = new Map(porFmt.get(m.codigo_formato)!.map((r: any) => [r.chave_analito, r]))
    if (!velho.every((v) => mapV.has(v.chave))) continue // formato de origem precisa estar 100% mapeado
    const ins = novo.map((n, i) => { const o = mapV.get(velho[i].chave); return { company_id: companyId, depara_exame_id: deparaId, codigo_formato: s.codigoFormato, chave_analito: n.chave, nome_apoio: n.nome, parametro_id: o.parametro_id, ignorar: o.ignorar, casas_decimais: o.casas_decimais } })
    const { error } = await admin.from('apoio_depara_analito').upsert(ins, { onConflict: 'depara_exame_id,codigo_formato,chave_analito' })
    if (error) return []
    const msg = `Formato ${s.codigoFormato} mapeado automaticamente (idêntico ao ${m.codigo_formato})`
    await admin.from('apoio_chamada_log').insert({ company_id: lab.company_id, apoio_id: lab.id, operacao: 'formato_auto', erro: null, requisicao: msg, resposta: null }).then(() => {}, () => {})
    await admin.from('apoio_auditoria').insert({ company_id: lab.company_id, tabela: 'apoio_depara_analito', registro_id: deparaId, acao: 'FORMATO_AUTO', usuario_id: null, depois: { mensagem: msg, cod_exm_apoio: s.codExmApoio, novo: s.codigoFormato, origem: m.codigo_formato } }).then(() => {}, () => {})
    return ins
  }
  return []
}

const retif = (s: string) => !!s && !/^(n|nao|não|0|false)$/i.test(s.trim())

export interface ResumoImport { exames: number; novos: number; repetidos: number; orfaos: number; pendentes: number; divergentes: number }

export async function importar(ctx: Ctx, pedidos: PedidoRes[], opts: { reprocessar?: boolean } = {}): Promise<ResumoImport> {
  const { admin, lab } = ctx
  const res: ResumoImport = { exames: 0, novos: 0, repetidos: 0, orfaos: 0, pendentes: 0, divergentes: 0 }
  for (const p of pedidos) {
    const { data: pes } = await admin.from('apoio_pedido_exame').select('id, company_id, exame_id, codigo_apoio, sequencial, status')
      .eq('apoio_id', lab.id).eq('cod_ped_apoio', p.codPedApoio)
    for (const s of p.supers) {
      res.exames++
      const cod = s.codExmApoio.toUpperCase()
      const pe = (pes ?? []).find((x: any) => {
        const base = String(x.codigo_apoio || '').toUpperCase()
        return cod === `${base}|${x.sequencial ?? 1}` || cod === base || cod.startsWith(base + '|')
      })
      if (!pe) {
        res.orfaos++
        await admin.from('apoio_chamada_log').insert({ company_id: lab.company_id, apoio_id: lab.id, operacao: 'orfao', erro: `Resultado sem pedido: ${p.codPedApoio} / ${s.codExmApoio}`, requisicao: null, resposta: s.xml.slice(0, 50_000) })
        continue
      }
      const hash = await sha(s.xml)
      const { data: existente } = await admin.from('apoio_resultado_versao').select('id').eq('pedido_exame_id', pe.id).eq('hash', hash).maybeSingle()
      if (existente && !opts.reprocessar) { res.repetidos++; continue }

      // De/Para
      const { data: dp } = await admin.from('apoio_depara_exame').select('id, codigo_formato').eq('apoio_id', lab.id).eq('exame_id', pe.exame_id).eq('ativo', true).order('prioridade').limit(1).maybeSingle()
      let situacao = 'importado'
      const mapa = new Map<string, { parametro_id: string | null; ignorar: boolean }>()
      if (dp) {
        // De/Para escolhido pelo CodigoFormato do SuperExame (um exame tem vários formatos vigentes)
        const { data: an } = await admin.from('apoio_depara_analito').select('chave_analito, parametro_id, ignorar').eq('depara_exame_id', dp.id).eq('codigo_formato', s.codigoFormato || dp.codigo_formato || '')
        for (const a of an ?? []) if (a.ignorar || a.parametro_id) mapa.set(a.chave_analito, a)
        if (!mapa.size && s.codigoFormato) {
          const auto = await mapearIdentico(admin, lab, dp.id, pe.company_id, s)
          for (const a of auto) if (a.ignorar || a.parametro_id) mapa.set(a.chave_analito, a)
        }
      }
      if (!mapa.size) {
        // Formato novo/não mapeado: não preenche nada, retém e avisa quem gerencia o De/Para
        situacao = 'pendente_formato'
        mapa.clear()
        const desc = `Formato novo do apoio: revisar De/Para (${s.codExmApoio} · formato ${s.codigoFormato || '?'})`
        const { data: ja } = await admin.from('apoio_acao_pendente').select('id').eq('pedido_exame_id', pe.id).eq('tipo', 'revisar_depara').is('concluida_em', null).limit(1)
        if (!ja?.length) {
          await admin.from('apoio_acao_pendente').insert({ company_id: pe.company_id, pedido_exame_id: pe.id, tipo: 'revisar_depara', descricao: desc })
          await admin.rpc('apoio_alertar', { _company: pe.company_id, _evento: 'apoio_formato_novo', _perm: 'apoio.resultado.liberar', _titulo: 'Formato novo do apoio', _msg: desc, _rota: '/app/apoio/kanban?visao=excecoes' }).then(() => {}, () => {})
        }
      }
      if (situacao === 'importado' && s.conteudo.analitos.some((a) => { const m = mapa.get(a.chave); return !m || (!m.ignorar && !m.parametro_id) })) situacao = 'pendente_depara'

      // Obrigatórios do laudo ajustado ao modelo do apoio (origem 'apoio'): nada vai para Validação em branco
      if (situacao === 'importado') {
        const pids = [...new Set([...mapa.values()].map((m) => m.parametro_id).filter(Boolean))] as string[]
        if (pids.length) {
          const { data: req } = await admin.from('lab_exam_parameters').select('id, name').in('id', pids).eq('origin', 'apoio').eq('is_required', true).eq('is_hidden', false)
          const vazios = (req ?? []).filter((r: any) => !s.conteudo.analitos.some((a) => mapa.get(a.chave)?.parametro_id === r.id && String(a.valor_bruto ?? a.valor ?? '').trim() !== ''))
          if (vazios.length) {
            situacao = 'incompleto'
            const desc = `Resultado do apoio incompleto: ${vazios.map((v: any) => v.name).join(', ')}`
            const { data: ja } = await admin.from('apoio_acao_pendente').select('id').eq('pedido_exame_id', pe.id).eq('tipo', 'resultado_incompleto').is('concluida_em', null).limit(1)
            if (!ja?.length) await admin.from('apoio_acao_pendente').insert({ company_id: pe.company_id, pedido_exame_id: pe.id, tipo: 'resultado_incompleto', descricao: desc })
          }
        }
      }

      // Comparação com digitação manual anterior
      const { data: manual } = await admin.from('apoio_resultado_versao').select('id, conteudo').eq('pedido_exame_id', pe.id).eq('origem', 'manual').not('situacao', 'in', '(substituido,descartado)').order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (situacao === 'importado' && manual) {
        const vals = manual.conteudo?.valores || {}
        const iguais = s.conteudo.analitos.every((a) => {
          const m = mapa.get(a.chave); if (!m || m.ignorar || !m.parametro_id) return true
          const mv = String(vals[m.parametro_id] ?? '').replace(',', '.').trim()
          return mv === '' || mv === a.valor || Number(mv) === Number(a.valor)
        })
        situacao = iguais ? 'confirmado' : 'divergente'
        if (!iguais) res.divergentes++
      }

      const retificacao = retif(s.retificacao) || retif(p.retificacao)
      if (existente && opts.reprocessar) {
        await admin.from('apoio_resultado_versao').update({ conteudo: s.conteudo, situacao, codigo_formato: s.codigoFormato }).eq('id', existente.id)
      } else {
        // Versões anteriores da integração viram "substituido"
        await admin.from('apoio_resultado_versao').update({ situacao: 'substituido' }).eq('pedido_exame_id', pe.id).eq('origem', 'integracao').not('situacao', 'in', '(substituido,descartado)')
        const { error } = await admin.from('apoio_resultado_versao').insert({
          company_id: pe.company_id, pedido_exame_id: pe.id, cod_ped_apoio: p.codPedApoio, cod_exm_apoio: s.codExmApoio,
          codigo_formato: s.codigoFormato || null, retificacao: retificacao ? 'S' : null, origem: 'integracao', conteudo: s.conteudo,
          xml_original: s.xml.slice(0, 500_000), hash, situacao,
        })
        if (error) { if (error.code === '23505') { res.repetidos++; continue } throw new Error(error.message) }
        res.novos++
      }
      if (situacao !== 'importado' && situacao !== 'confirmado') res.pendentes++

      // Status: importado / importado_com_pendencia (a retificação de liberado é tratada pelo gatilho do banco)
      const alvo = situacao === 'importado' || situacao === 'confirmado' ? 'importado' : 'importado_com_pendencia'
      const { data: atual } = await admin.from('apoio_pedido_exame').select('status').eq('id', pe.id).single()
      if (atual?.status === 'importado' && alvo === 'importado_com_pendencia' || !['importado', 'liberado_local'].includes(atual?.status)) {
        await admin.rpc('apoio_integ_status', { _pe: pe.id, _novo: alvo, _motivo: retificacao ? 'Resultado retificado recebido' : 'Resultado recebido do apoio', _dados: { situacao } })
      }
    }
  }
  return res
}
