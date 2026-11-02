import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'
import { imprimirDireto } from '@/lib/impressaoLocal'

export type HospitalContext = 'triage' | 'post' | 'admission'
export type HospitalPrintType = 'pulseira_triagem' | 'etiqueta_paciente' | 'etiqueta_acompanhante'
export interface HospitalLabelConfig { widthMm: number; heightMm: number; marginMm: number; nomeSizePt: number; nomeBold: boolean; textoSizePt: number; textoBold: boolean; barcode: boolean }
export interface HospitalPrintData {
  episodeId: string; patientId: string | null; patientName: string; birthDate: string | null; gender: string | null; risk: string | null;
  bed: string | null; sector: string | null; locationRequired: boolean; maxCompanions: number; canRegister: boolean;
  companions: { id: string; nome: string }[]; labelConfig: Partial<Record<HospitalPrintType, HospitalLabelConfig>>;
  printId?: string; isReprint?: boolean; emittedAt?: string;
}
export const defaultHospitalLabel: HospitalLabelConfig = { widthMm: 80, heightMm: 50, marginMm: 2, nomeSizePt: 11, nomeBold: true, textoSizePt: 9, textoBold: true, barcode: true }
export function validCompanionLimit(value: number) { return Number.isInteger(value) && value >= 1 }
export function missingPrintType(error: unknown): boolean {
  return error instanceof Error && /(?:tipo|impressora).*(?:não configurad|nao configurad|não cadastrad|nao cadastrad)/i.test(error.message)
}
export async function dispatchHospitalPdf(type: HospitalPrintType, blob: Blob): Promise<'confirmado' | 'navegador'> {
  try { await imprimirDireto(type, blob); return 'confirmado' } catch (error) { if (!missingPrintType(error)) throw error }
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.hidden = true; frame.src = url
  document.body.appendChild(frame)
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Não foi possível abrir a impressão do navegador')), 15000)
    frame.onload = () => { clearTimeout(timer); try { const win = frame.contentWindow; if (!win) throw new Error('Janela de impressão indisponível'); win.focus(); win.print(); resolve() } catch (e) { reject(e) } }
  }).finally(() => { setTimeout(() => { frame.remove(); URL.revokeObjectURL(url) }, 120000) })
  return 'navegador'
}
export function hospitalLabelPdf(type: HospitalPrintType, data: HospitalPrintData, config = defaultHospitalLabel, companionName?: string): Blob {
  const { widthMm: w, heightMm: h, marginMm: m } = config
  const pdf = new jsPDF({ unit: 'mm', format: [w, h], orientation: w > h ? 'landscape' : 'portrait' })
  const emitted = new Date(data.emittedAt || Date.now())
  const dt = emitted.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' — ' + emitted.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  const colors: Record<string, string> = { red: 'VERMELHO', orange: 'LARANJA', yellow: 'AMARELO', green: 'VERDE', blue: 'AZUL' }
  let birth = 'Não informado'; let age = 'Não informada'
  if (data.birthDate) {
    const b = new Date(data.birthDate + 'T12:00:00Z'); birth = data.birthDate.split('-').reverse().join('/')
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(emitted)
    const today = ['year', 'month', 'day'].map(key => Number(parts.find(p => p.type === key)?.value))
    if (today.length === 3) age = String(today[0] - b.getUTCFullYear() - (today[1] < b.getUTCMonth() + 1 || (today[1] === b.getUTCMonth() + 1 && today[2] < b.getUTCDate()) ? 1 : 0)) + ' anos'
  }
  const gender = ({ M: 'Masculino', F: 'Feminino', male: 'Masculino', female: 'Feminino', masculino: 'Masculino', feminino: 'Feminino' } as Record<string, string>)[data.gender || ''] || data.gender || 'Não informado'
  const lines = type === 'etiqueta_acompanhante'
    ? [{ text: 'ACOMPANHANTE', title: true }, { text: companionName || '', title: true }, { text: `Leito: ${data.bed || ''}   Setor: ${data.sector || ''}` }, { text: `PAC: ${data.patientName}` }, { text: dt }]
    : [{ text: data.patientName, title: true }, { text: `Nascimento: ${birth}   Idade: ${age}` }, { text: `Sexo: ${gender}` }, { text: `Atendimento: ${data.episodeId}` }, { text: `Setor: ${data.sector || ''}` }, { text: `Risco: ${colors[data.risk || ''] || 'Não informado'}` }, { text: dt }]
  const available = h - m * 2 - (config.barcode ? 13 : 0)
  let scale = 1
  const measure = () => lines.map(line => { const size = (line.title ? config.nomeSizePt : config.textoSizePt) * scale; pdf.setFont('helvetica', (line.title ? config.nomeBold : config.textoBold) ? 'bold' : 'normal'); pdf.setFontSize(size); return { ...line, size, wrapped: pdf.splitTextToSize(line.text, w - m * 2) as string[] } })
  let rows = measure()
  while (rows.reduce((sum, r) => sum + r.wrapped.length * r.size * 0.4 + 0.6, 0) > available && scale > 0.35) { scale -= 0.025; rows = measure() }
  if (rows.reduce((sum, r) => sum + r.wrapped.length * r.size * 0.4 + 0.6, 0) > available) throw new Error('Conteúdo não cabe na etiqueta. Aumente o tamanho nas configurações.')
  let y = m
  rows.forEach((row, i) => { pdf.setFont('helvetica', (row.title ? config.nomeBold : config.textoBold) ? 'bold' : 'normal'); pdf.setFontSize(row.size); row.wrapped.forEach(text => { y += row.size * 0.4; pdf.text(text, m, y) }); y += 0.6; if (type === 'etiqueta_acompanhante' && i === 0) { pdf.line(m, y, w - m, y); y += 0.6 } })
  if (config.barcode) { const canvas = document.createElement('canvas'); JsBarcode(canvas, data.episodeId, { format: 'CODE128', displayValue: false, height: 40, width: 2, margin: 0 }); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', m, h - m - 10, w - 2 * m, 10) }
  return pdf.output('blob')
}