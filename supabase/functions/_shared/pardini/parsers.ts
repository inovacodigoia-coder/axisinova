// Leitores puros das respostas do Pardini (sem banco): usados pelas Edge Functions e pelos testes com fixtures.
import { attr, blocos, filhos, interno, resolverHref, texto } from './xml.ts'

// ---------- getPedido (envio) / ConsultaLote ----------
export interface RecipienteAdm { codBarApoio: string; etiquetaEpl: string; exames: { codExmApoio: string; codExmLab: string }[] }
export interface PedidoAdm { codPedLab: string; codPedApoio: string; recipientes: RecipienteAdm[] }
export interface Admitido { id: string; codLoteLab: string; codLoteApoio: string; pedidos: PedidoAdm[] }

export function parseAdmitido(util: string): Admitido | null {
  const reg = filhos(util, 'RegistroAdmitido')[0]
  if (!reg) return null
  const lote = filhos(reg, 'Lote')[0] ?? reg
  const cabLote = lote.replace(/<Pedido\b[\s\S]*/i, '')
  return {
    id: texto(reg.replace(/<Lote\b[\s\S]*/i, ''), 'ID'),
    codLoteLab: texto(cabLote, 'CodLoteLab'),
    codLoteApoio: texto(cabLote, 'CodLoteApoio'),
    pedidos: filhos(lote, 'Pedido').map((p) => {
      const cab = p.replace(/<Recipiente\b[\s\S]*/i, '')
      return {
        codPedLab: texto(cab, 'CodPedLab'), codPedApoio: texto(cab, 'CodPedApoio'),
        recipientes: filhos(p, 'Recipiente').map((r) => {
          const epl = filhos(r, 'EtqCodBar')[0]
          return {
            codBarApoio: texto(r.replace(/<EtqCodBar\b[\s\S]*?<\/EtqCodBar>/i, ''), 'CodBarApoio'),
            // EPL: preserva as linhas exatamente, só remove a quebra inicial/final
            etiquetaEpl: epl ? interno(epl).replace(/^\s*\n/, '').replace(/\n\s*$/, '\n') : '',
            exames: filhos(r, 'Exame').map((e) => ({ codExmApoio: texto(e, 'CodExmApoio'), codExmLab: texto(e, 'CodExmLab') })),
          }
        }),
      }
    }),
  }
}

// ---------- getListaErroPedido ----------
const COMERCIAL = ['10035', '10040', '10204', '10205', '10206', '10213', '10214', '10226', '10228']
const TECNICO = ['10103', '10110', '10207', '10227']
export const categoriaErro = (c: string) =>
  ['10023', '10217'].includes(c) ? 'duplicidade' : COMERCIAL.includes(c) ? 'comercial' : TECNICO.includes(c) ? 'tecnico' : 'preenchimento'

export function parseListaErro(xml: string): { codigo: string; mensagem: string; categoria: string }[] {
  const r = resolverHref(xml)
  const vistos = new Map<string, string>()
  for (const b of blocos(r, 'Erro')) {
    const cod = texto(b, 'Codigo'), msg = texto(b, 'Mensagem')
    if (/^1\d{4}$/.test(cod) && msg && !vistos.has(cod)) vistos.set(cod, msg)
  }
  return [...vistos.entries()].map(([codigo, mensagem]) => ({ codigo, mensagem, categoria: categoriaErro(codigo) }))
}

// ---------- getRastreabilidade ----------
export interface RastExame { codExm: string; codStatus: string; descricao: string; quando: string }
export interface RastAmostra { idTuboLab: string; etqCodBar: string; pedido: string; codStatus: string; descricao: string; quando: string; exames: RastExame[] }

export function parseRastreabilidade(xml: string): RastAmostra[] {
  const r = resolverHref(xml)
  return filhos(r, 'RastreabilidadeAmostra').map((a) => {
    const cab = a.replace(/<(?:\w+:)?exames\b[\s\S]*?<\/(?:\w+:)?exames>/i, '')
    return {
      idTuboLab: texto(cab, 'idtuboLab'), etqCodBar: texto(cab, 'etqCodBar'), pedido: texto(cab, 'pedido'),
      codStatus: texto(cab, 'codStatus'), descricao: texto(cab, 'descricaoStatus'), quando: texto(cab, 'dataHoraStatusAmostra'),
      exames: filhos(a, 'exame').map((e) => ({
        codExm: `${texto(e, 'mnMaterial')}|${texto(e, 'mnExame')}|${texto(e, 'sqeExa') || 1}`.toUpperCase(),
        codStatus: texto(e, 'codStatus'), descricao: texto(e, 'descricaoStatus'), quando: texto(e, 'dataHoraStatusExame'),
      })),
    }
  })
}

// ---------- getPendenciaTecnica ----------
export interface Pendencia { codPedApoio: string; exames: string[]; pendencia: string; detalhamento: string; disposicao: string; situacao: string }

export function parsePendencias(xml: string): Pendencia[] {
  const r = resolverHref(xml)
  const out: Pendencia[] = []
  for (const p of filhos(r, 'PendenciaTecnicaPedido')) {
    const codPed = texto(p, 'codPedApoio')
    if (!codPed) continue // só "retorno" textual (ex.: "Não existe(m) pendência(s)…") não cria nada
    out.push({
      codPedApoio: codPed,
      exames: blocos(p, 'mnExame').length ? filhos(p, 'PendenciaTecnicaExame').concat(filhos(p, 'exame')).map((e) => `${texto(e, 'mnMaterial')}|${texto(e, 'mnExame')}|${texto(e, 'sqeExa') || 1}`.toUpperCase()) : [],
      pendencia: texto(p, 'pendencia'), detalhamento: texto(p, 'detalhamentoPendencia'), disposicao: texto(p, 'disposicao'), situacao: texto(p, 'situacaoPendencia'),
    })
  }
  return out
}

export const _attr = attr

// ---------- Modelos de resultado (ModelosTodos / modelos.xml) ----------
export interface ModeloValor { chave: string; nome: string; unidade: string; tipo: string; casas: number | null; tamanho?: number | null }
export interface ModeloExame { codExmApoio: string; materialNome: string; exameNome: string; codigoFormato: string; unidadeProdutiva: string; metodo: string; ultimaLiberacao: string | null; itens: ModeloValor[] }

/** "dd/mm/aaaa[ hh:mm[:ss]]" ou ISO -> ISO; vazio -> null */
export function dataPardini(v: string): string | null {
  const t = (v || '').trim(); if (!t) return null
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}-03:00`
  const d = new Date(t); return isNaN(d.getTime()) ? null : d.toISOString()
}

/** Atributo ou filho simples, olhando só o cabeçalho do bloco (sem os sub-blocos) */
function campo(bloco: string, sub: string[], ...nomes: string[]): string {
  let cab = bloco
  for (const s of sub) cab = cab.replace(new RegExp(`<(?:\\w+:)?${s}\\b[\\s\\S]*`, 'i'), '')
  for (const n of nomes) { const a = attr(bloco, n); if (a) return a.trim() }
  for (const n of nomes) { const t = texto(cab, n); if (t) return t }
  return ''
}

export function parseModelos(xml: string): ModeloExame[] {
  const out: ModeloExame[] = []
  for (const se of blocos(xml, 'SuperExame')) {
    const codExmApoio = campo(se, ['Exame'], 'CodExmApoio').toUpperCase()
    if (!codExmApoio) continue
    let codigoFormato = campo(se, ['Exame'], 'CodigoFormato')
    let exameNome = campo(se, ['Exame'], 'ExameNome'), materialNome = campo(se, ['Exame'], 'Material', 'NomeMaterial', 'MaterialNome')
    const itens: ModeloValor[] = [], vistos = new Set<string>()
    // Mesma chave do resultado: idExame/idItemDeExame/idResultado/idValor
    for (const ex of filhos(se, 'Exame')) {
      codigoFormato ||= campo(ex, ['ItemDeExame'], 'CodigoFormato')
      exameNome ||= campo(ex, ['ItemDeExame'], 'Nome', 'NomeExame')
      const idEx = attr(ex, 'idExame')
      for (const it of filhos(ex, 'ItemDeExame')) {
        const idIt = attr(it, 'idItemDeExame')
        const nomeIt = campo(it, ['Resultado'], 'Nome')
        for (const res of filhos(it, 'Resultado')) {
          const idRes = attr(res, 'idResultado')
          const unidade = texto(res, 'UnidadeDeMedida') || campo(res, ['Valor', 'Conteudo'], 'Unidade')
          // Só <Resultado>/<Conteudo>/<Valor> representa resultado. Não percorra o
          // Resultado inteiro: ValorDeReferencia também contém tags <Valor>.
          for (const conteudo of filhos(res, 'Conteudo')) for (const v of blocos(conteudo, 'Valor')) {
            const chave = [idEx, idIt, idRes, attr(v, 'idValor')].join('/')
            if (vistos.has(chave)) continue
            vistos.add(chave)
            const casas = attr(v, 'CasasDecimais'), tam = attr(v, 'TamanhoMaximo')
            itens.push({
              chave, nome: nomeIt || campo(res, ['Valor', 'Conteudo'], 'Nome'), unidade,
              tipo: attr(v, 'Tipo').toLowerCase(),
              casas: casas && !isNaN(Number(casas)) ? Number(casas) : null,
              tamanho: tam && !isNaN(Number(tam)) ? Number(tam) : null,
            })
          }
        }
      }
    }
    out.push({ codExmApoio, materialNome, exameNome, codigoFormato, itens,
      unidadeProdutiva: campo(se, ['Exame'], 'UnidadeProdutiva'), metodo: campo(se, ['Exame'], 'Metodo'), ultimaLiberacao: dataPardini(campo(se, ['Exame'], 'UltimaLiberacao')) })
  }
  return out
}

export const MSG_MODELOS_PARDINI = "O Pardini não conseguiu gerar os modelos agora (falha do lado do Pardini). Use 'Enviar modelos.xml manualmente'."
/** Nunca expõe erro cru do Caché/SOAP ao usuário (o original fica no log de integração) */
export const amigavelModelos = (msg: string) =>
  /Badly formed SOAP|ERRO\s*#|<info>|UNDEFINED|fault/i.test(msg || '') ? MSG_MODELOS_PARDINI : msg
