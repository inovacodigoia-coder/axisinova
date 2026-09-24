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
