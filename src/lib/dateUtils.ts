import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Brazil Timezone
const TIMEZONE = 'America/Sao_Paulo'

export const getBrazilDateString = (date?: Date | string) => {
  const d = date
    ? typeof date === 'string'
      ? new Date(date)
      : date
    : new Date()
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }) // YYYY-MM-DD
}

export const getBrazilTimeString = (date?: Date | string) => {
  const d = date
    ? typeof date === 'string'
      ? new Date(date)
      : date
    : new Date()
  return d.toLocaleTimeString('pt-BR', { timeZone: TIMEZONE, hour12: false }) // HH:mm:ss
}

export const getBrazilCurrentISO = () => {
  // Returns a timestamp that represents current time in Brazil but in ISO format
  // Note: Standard ISO is UTC. If we want to store "Local Brazil Time" into a timestamp column without timezone,
  // we might need to shift it. But for timestamptz columns, we should send UTC or ISO with offset.
  // The user requirement is "standardize to Brazil timezone".
  // Best practice: Store as UTC (standard), Display as Brazil.
  // However, for "Ação de Cobrança" specifically, user noted "previous day" bug.
  // This happens when "Today in Brazil" (e.g. 2023-10-25) is "Tomorrow in UTC" (2023-10-26) late at night, or vice versa.
  // We should interpret date inputs as Brazil dates.
  return new Date().toISOString()
}

export const formatBrazilDate = (
  dateString: string | null | undefined,
  formatStr: string = 'dd/MM/yyyy',
) => {
  if (!dateString) return '-'
  try {
    // If it's a simple date string YYYY-MM-DD, just parse it
    if (dateString.length === 10 && !dateString.includes('T')) {
      // Append T12:00:00 to ensure it's treated as midday to avoid timezone shifts
      return format(parseISO(`${dateString}T12:00:00`), formatStr, {
        locale: ptBR,
      })
    }
    return format(parseISO(dateString), formatStr, { locale: ptBR })
  } catch (e) {
    return dateString
  }
}
