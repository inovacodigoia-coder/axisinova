/**
 * Período da fila de Digitação convertido em intervalo de created_at para buscar no servidor
 * só os pedidos CONCLUÍDOS daquele período. Os pendentes vêm sempre, de qualquer data.
 * Espelha exatamente o filtro de período da tela (dia local do cadastro).
 * Retorna null quando o período não limita data ("todos" ou personalizado sem datas).
 */
export function intervaloDoPeriodo(
  period: string,
  dateFrom?: Date | null,
  dateTo?: Date | null,
  agora: Date = new Date(),
): { from: string; to: string } | null {
  const inicio = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const fim = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  const hoje = inicio(agora)
  const de = (n: number) => { const d = new Date(hoje); d.setDate(d.getDate() - n); return d }
  const iso = (from: Date, to: Date) => ({ from: from.toISOString(), to: to.toISOString() })

  switch (period) {
    case 'hoje': return iso(hoje, fim(hoje))
    case '7d': return iso(de(6), fim(hoje))
    case '30d': return iso(de(29), fim(hoje))
    case 'este-mes':
      return iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)))
    case 'mes-passado':
      return iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), fim(new Date(hoje.getFullYear(), hoje.getMonth(), 0)))
    case 'custom':
      if (!dateFrom && !dateTo) return null
      return {
        from: dateFrom ? inicio(dateFrom).toISOString() : '1900-01-01T00:00:00.000Z',
        to: dateTo ? fim(dateTo).toISOString() : '9999-12-31T23:59:59.999Z',
      }
    default:
      return null
  }
}
