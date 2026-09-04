import { jsPDF } from 'jspdf'
import type { ApiPartner } from '@/types/api-partners.types'
import { PARTNER_TYPE_LABEL } from '@/types/api-partners.types'
import { DEMO_EXAMS } from '@/mocks/registers.mock'
import { DEMO_SPECIALTIES } from '@/mocks/registers.mock'

const PURPLE: [number, number, number] = [123, 47, 247]
const CYAN: [number, number, number] = [0, 212, 255]
const SLATE: [number, number, number] = [30, 41, 59]
const TEXT: [number, number, number] = [40, 46, 58]
const MUTED: [number, number, number] = [110, 118, 133]

const BASE_URL = 'https://axisinova.inovacodigoia.com.br'

export function canGeneratePartnerGuide(partner: ApiPartner): boolean {
  return partner.credentials.some(c => !c.revokedAt && !!c.clientId)
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generatePartnerIntegrationGuide(partner: ApiPartner) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48
  const CW = W - M * 2
  let y = 0

  const clientId = partner.credentials.find(c => !c.revokedAt)?.clientId ?? '—'

  const footer = () => {
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.text('Axis Inova — Guia de Integração via API', M, H - 24)
    doc.text(`Página ${doc.getNumberOfPages()}`, W - M, H - 24, { align: 'right' })
  }

  const newPage = () => {
    footer()
    doc.addPage()
    y = M
  }

  const ensure = (need: number) => {
    if (y + need > H - 48) newPage()
  }

  const h1 = (text: string) => {
    ensure(46)
    y += 12
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...PURPLE)
    doc.text(text, M, y)
    y += 6
    doc.setDrawColor(...CYAN)
    doc.setLineWidth(2)
    doc.line(M, y, M + 60, y)
    y += 16
  }

  const h2 = (text: string) => {
    ensure(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...SLATE)
    doc.text(text, M, y)
    y += 14
  }

  const p = (text: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    const lines = doc.splitTextToSize(text, CW) as string[]
    lines.forEach(line => {
      ensure(14)
      doc.text(line, M, y)
      y += 14
    })
    y += 4
  }

  const bullets = (items: string[]) => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    items.forEach(item => {
      const lines = doc.splitTextToSize(item, CW - 16) as string[]
      lines.forEach((line, i) => {
        ensure(14)
        doc.setTextColor(...CYAN)
        if (i === 0) doc.text('•', M, y)
        doc.setTextColor(...TEXT)
        doc.text(line, M + 14, y)
        y += 14
      })
    })
    y += 4
  }

  const code = (text: string) => {
    const lines = text.split('\n')
    doc.setFont('courier', 'normal')
    doc.setFontSize(8.5)
    const lineH = 11
    const padding = 10
    let idx = 0
    while (idx < lines.length) {
      const remaining = H - 48 - y - padding * 2
      let fit = Math.max(1, Math.floor(remaining / lineH))
      if (fit < 3 && idx === 0) {
        newPage()
        fit = Math.floor((H - 48 - y - padding * 2) / lineH)
      }
      const chunk = lines.slice(idx, idx + fit)
      const boxH = chunk.length * lineH + padding * 2
      doc.setFillColor(...SLATE)
      doc.roundedRect(M, y, CW, boxH, 4, 4, 'F')
      doc.setTextColor(226, 232, 240)
      chunk.forEach((line, i) => {
        doc.text(line, M + padding, y + padding + 8 + i * lineH)
      })
      y += boxH + 10
      idx += fit
      if (idx < lines.length) newPage()
    }
    doc.setFont('helvetica', 'normal')
  }

  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const colW = widths.map(w => (w / widths.reduce((a, b) => a + b, 0)) * CW)
    const rowH = 18
    const drawHeader = () => {
      ensure(rowH * 2)
      doc.setFillColor(...PURPLE)
      doc.rect(M, y, CW, rowH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      let x = M + 6
      headers.forEach((hd, i) => {
        doc.text(hd, x, y + 12)
        x += colW[i]
      })
      y += rowH
    }
    drawHeader()
    doc.setFont('helvetica', 'normal')
    rows.forEach((row, ri) => {
      const cellLines = row.map((cell, i) => doc.splitTextToSize(cell, colW[i] - 12) as string[])
      const h = Math.max(rowH, Math.max(...cellLines.map(l => l.length)) * 11 + 8)
      if (y + h > H - 48) {
        newPage()
        drawHeader()
        doc.setFont('helvetica', 'normal')
      }
      if (ri % 2 === 0) {
        doc.setFillColor(244, 247, 250)
        doc.rect(M, y, CW, h, 'F')
      }
      doc.setFontSize(8.5)
      doc.setTextColor(...TEXT)
      let x = M + 6
      cellLines.forEach((lines, i) => {
        lines.forEach((line, li) => doc.text(line, x, y + 12 + li * 11))
        x += colW[i]
      })
      y += h
    })
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    y += 10
  }

  /* ---------- Capa ---------- */
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, W, 190, 'F')
  doc.setFillColor(...CYAN)
  doc.rect(0, 186, W, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(255, 255, 255)
  doc.text('Axis Inova', M, 90)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'normal')
  doc.text('Guia de Integração via API', M, 118)
  doc.setFontSize(9)
  doc.text('Documento gerado automaticamente para o parceiro identificado abaixo.', M, 146)

  y = 240
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...SLATE)
  doc.text(partner.name, M, y)
  y += 26
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...TEXT)
  doc.text(`Documento: ${partner.document}`, M, y); y += 18
  doc.text(`Tipo de parceiro: ${PARTNER_TYPE_LABEL[partner.type]}`, M, y); y += 18
  if (partner.contactName) { doc.text(`Contato: ${partner.contactName} — ${partner.contactEmail}`, M, y); y += 18 }
  doc.text(
    `Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    M, y,
  ); y += 30

  doc.setDrawColor(...CYAN)
  doc.setLineWidth(1)
  doc.line(M, y, W - M, y)

  newPage()

  /* ---------- 1. Visão Geral ---------- */
  h1('1. Visão Geral')
  p('Esta integração permite que o parceiro envie pedidos de atendimento (dados do paciente e exames solicitados) diretamente ao Axis Inova. O parceiro se autentica via OAuth2 (client credentials), envia o pedido em JSON e o sistema valida os dados, cria o paciente quando necessário e gera automaticamente o atendimento com protocolo interno.')
  h2('Fluxo resumido')
  bullets([
    'Autenticar — trocar client_id e client_secret por um token de acesso (Bearer).',
    'Enviar Pedido — POST com paciente + exames usando o token no cabeçalho.',
    'Sistema Valida — CPF, códigos de exame e autorizações do parceiro.',
    'Atendimento Criado — retorno com o protocolo interno gerado, ou Erro retornado com o código correspondente.',
  ])

  /* ---------- 2. Autenticação ---------- */
  h1('2. Autenticação (OAuth2 Client Credentials)')
  p(`Endpoint: POST ${BASE_URL}/auth/oauth-token`)
  p('O parceiro deve trocar seu client_id e client_secret por um token de acesso. O token retornado deve ser enviado no cabeçalho Authorization de todas as demais requisições, no formato Bearer.')
  h2('Seu client_id')
  code(clientId)
  p('O client_secret não é exibido neste documento por segurança. Ele foi fornecido apenas no momento do cadastro — caso tenha sido perdido, solicite a regeneração das credenciais à empresa responsável por esta integração.')
  h2('Exemplo de requisição')
  code(`POST ${BASE_URL}/auth/oauth-token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "${clientId}",
  "client_secret": "••••••••••••••••"
}`)
  h2('Exemplo de resposta')
  code(`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}`)

  /* ---------- 3. Criação de pedido ---------- */
  h1('3. Endpoint de Criação de Pedido')
  p(`Endpoint: POST ${BASE_URL}/partner/orders`)
  h2('Cabeçalhos obrigatórios')
  bullets([
    'Authorization: Bearer {token}',
    'Content-Type: application/json',
  ])
  h2('Exemplo de payload')
  code(`{
  "protocolo_parceiro": "PED-2026-00871",
  "paciente": {
    "nome": "Maria Aparecida Souza",
    "cpf": "123.456.789-09",
    "data_nascimento": "1985-04-17",
    "sexo": "F",
    "telefone": "(84) 99999-1234"
  },
  "exames": [
    { "codigo": "40301010" },
    { "codigo": "40302040" }
  ],
  "medico_solicitante": {
    "nome": "Dr. Rafael Andrade",
    "conselho": "CRM",
    "numero": "12345",
    "uf": "RN"
  },
  "convenio": {
    "nome": "Unimed",
    "numero_carteira": "0123456789",
    "numero_guia": "987654"
  }
}`)
  h2('Resposta de sucesso (201)')
  code(`{
  "success": true,
  "protocolo": "192-00",
  "status": "AGUARDANDO",
  "paciente_id": "pat_8f21c4",
  "exames": [
    { "codigo": "40301010", "nome": "Hemograma Completo", "status": "AGUARDANDO" },
    { "codigo": "40302040", "nome": "Glicemia de Jejum", "status": "AGUARDANDO" }
  ]
}`)
  h2('Resposta de erro (422)')
  code(`{
  "success": false,
  "error": "EXAM_CODE_NOT_FOUND",
  "message": "Código de exame não reconhecido: 99999999",
  "protocolo_parceiro": "PED-2026-00871"
}`)

  /* ---------- 4. Erros ---------- */
  h1('4. Status e Erros Possíveis')
  table(
    ['Código', 'Significado', 'O que fazer'],
    [
      ['UNAUTHORIZED', 'Token ausente, inválido ou expirado', 'Solicite um novo token no endpoint de autenticação'],
      ['PARTNER_NOT_AUTHORIZED', 'Parceiro sem autorização para criar pedidos via API', 'Solicite a liberação à empresa responsável'],
      ['EXAM_CODE_NOT_FOUND', 'Código de exame não reconhecido', 'Verifique o Código no Catálogo de Exames'],
      ['INVALID_CPF', 'CPF do paciente inválido', 'Envie o CPF com 11 dígitos válidos'],
      ['MISSING_FIELD', 'Campo obrigatório ausente', 'Confira nome, CPF e data de nascimento do paciente'],
      ['DUPLICATE_ORDER', 'Protocolo do parceiro já enviado', 'Use um protocolo_parceiro único por pedido'],
      ['RATE_LIMITED', 'Excesso de requisições', 'Aguarde e reenvie respeitando o limite informado'],
    ],
    [22, 34, 44],
  )

  /* ---------- 5. Catálogo ---------- */
  h1('5. Catálogo de Exames — Principais Códigos')
  const specName = (id?: string) => DEMO_SPECIALTIES.find(s => s.id === id)?.name ?? '—'
  table(
    ['Código', 'Nome do Exame', 'Setor Técnico'],
    DEMO_EXAMS.slice(0, 30).map(e => [e.tussCode ?? e.internalCode ?? '—', e.name, specName(e.specialtyId)]),
    [22, 48, 30],
  )
  p('Esta é uma lista dos exames mais utilizados. Para a lista completa e atualizada, seu sistema pode consultar o endpoint GET /list-exams-for-integration (mesmo padrão já usado por equipamentos, reaproveitável para parceiros) antes de montar cada pedido.')

  /* ---------- 6. Regras ---------- */
  h1('6. Regras Importantes')
  bullets([
    'Todos os exames do pedido precisam ter código reconhecido; caso contrário, o pedido inteiro é rejeitado.',
    'Se o paciente (CPF) não existir na base, ele é criado automaticamente com os dados enviados.',
    'O protocolo interno do Axis Inova é sempre gerado pelo sistema, independentemente do protocolo enviado pelo parceiro.',
    'O parceiro precisa estar com a permissão "Autorizado a criar pedidos via API" ativa e o módulo liberado para a empresa.',
    'O client_secret é exibido uma única vez, no cadastro. Em caso de perda, é necessário regenerar as credenciais.',
  ])

  /* ---------- 7. Suporte ---------- */
  h1('7. Suporte')
  p('Em caso de dúvidas técnicas sobre esta integração, entre em contato com o suporte:')
  bullets([
    'E-mail: suporte@axisinova.com.br',
    'Telefone: (84) 3000-0000',
    `Portal: ${BASE_URL}`,
  ])

  footer()
  doc.save(`Guia-Integracao-API-${slug(partner.name)}.pdf`)
}
