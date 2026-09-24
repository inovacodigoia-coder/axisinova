// Monta o <Registro> (Protocolo 2) do envio de lote ao Pardini.
// Todas as datas/horas no fuso America/Sao_Paulo; tags opcionais vazias são omitidas.
import { esc } from './xml.ts'

const cortar = (s: unknown, n: number) => String(s ?? '').slice(0, n)
const sexo = (g: string) => /^(m|male|masc)/i.test(g || '') ? 'Masculino' : /^(f|female|fem)/i.test(g || '') ? 'Feminino' : 'Indefinido'

/** Data (AAAA-MM-DD) e hora (HH:MM:SS) de um instante no horário de Brasília */
export function dataHoraBR(d: Date | string | number): { data: string; hora: string } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(d)).map((x) => [x.type, x.value]))
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:${p.second}` }
}

/** Tag só se houver valor (nunca <Tag></Tag>) */
const tag = (n: string, v: unknown) => { const s = String(v ?? '').trim(); return s ? `<${n}>${esc(s)}</${n}>` : '' }

export function montarRegistro(codLab: string, remessa: any, exames: any[], msgId: string, agora: Date = new Date()) {
  const { data, hora } = dataHoraBR(agora)
  const porPedido = new Map<string, any[]>()
  for (const e of exames) porPedido.set(e.pedido_id, [...(porPedido.get(e.pedido_id) ?? []), e])
  const pedidos = [...porPedido.values()].map((es) => {
    const e0 = es[0], o = e0.ordem, p = e0.paciente ?? {}
    const info = e0.info_complementar ?? {}
    const ped = dataHoraBR(o.created_at)
    const exXml = es.map((e) => {
      const ic = e.info_complementar?.info_comp ?? {}
      const infos = Object.entries(ic).filter(([, v]) => String(v ?? '').trim()).map(([k, v]) => `<InformacaoComplementar>${tag('InfoComp', k)}${tag('Valor', String(v).replace(',', '.'))}</InformacaoComplementar>`).join('')
      const cond = e.info_complementar?.condicao ? `<InformacaoComplementar><InfoComp>CONDICAO</InfoComp>${tag('Valor', e.info_complementar.condicao)}</InformacaoComplementar>` : ''
      const col = dataHoraBR(e.coletado_em || o.created_at)
      return `<Exame>${tag('CodExmApoio', `${e.codigo_apoio}|${e.sequencial ?? 1}`)}${tag('CodExmLab', cortar(e.cod_exm_lab, 15))}<DataColeta>${col.data}</DataColeta><HoraColeta>${col.hora}</HoraColeta>${infos}${cond}</Exame>`
    }).join('')
    const cpf = String(p.cpf ?? '').replace(/\D/g, '')
    // DataNasc é data pura (sem hora): não converter fuso, só validar o formato
    const nasc = String(p.birth_date ?? '').slice(0, 10)
    return `<Pedido>${tag('CodPedLab', e0.cod_ped_lab)}<DataPed>${ped.data}</DataPed><HoraPed>${ped.hora}</HoraPed>${tag('Obs', cortar(info.obs_envio ?? remessa.observacao ?? '', 70))}<Paciente>${tag('CodPacLab', cortar(String(o.patient_id ?? '').replace(/-/g, ''), 15))}${tag('Nome', cortar(info.nome_envio || p.name || o.patient_name, 35))}<Sexo>${sexo(p.gender)}</Sexo>${/^\d{4}-\d{2}-\d{2}$/.test(nasc) ? `<DataNasc>${nasc}</DataNasc>` : ''}${cpf.length === 11 ? `<CPF>${cpf}</CPF>` : ''}</Paciente>${exXml}</Pedido>`
  }).join('')
  return `<?xml version="1.0" encoding="utf-8"?><Registro><Protocolo>2</Protocolo><ID>${esc(msgId)}</ID><Lote>${tag('CodLab', codLab)}<CodLoteLab>${remessa.cod_lote_lab}</CodLoteLab><DataLote>${data}</DataLote><HoraLote>${hora}</HoraLote>${pedidos}</Lote></Registro>`
}
