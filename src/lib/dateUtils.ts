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

  // Format to YYYY-MM-DD using Brazil Timezone
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
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
  return new Date().toISOString()
}

export const formatBrazilDate = (
  dateString: string | null | undefined,
  formatStr: string = 'dd/MM/yyyy',
) => {
  if (!dateString) return '-'
  try {
    if (dateString.length === 10 && !dateString.includes('T')) {
      return format(parseISO(`${dateString}T12:00:00`), formatStr, {
        locale: ptBR,
      })
    }
    return format(parseISO(dateString), formatStr, { locale: ptBR })
  } catch (e) {
    return dateString
  }
}

/**
 * Formats a date string (ISO) to a Brazilian formatted date/time string with Timezone awareness.
 * Displays DD/MM/YYYY HH:mm
 */
export const formatDateTimeBR = (
  dateString: string | null | undefined,
): string => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch (e) {
    return '-'
  }
}
