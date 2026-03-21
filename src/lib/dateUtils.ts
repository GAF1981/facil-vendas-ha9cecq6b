import { format, parseISO, parse, isValid } from 'date-fns'
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
      // Try to parse as ISO if it looks like one, otherwise try BR
      if (dateString.includes('-')) {
        return format(parseISO(`${dateString}T12:00:00`), formatStr, {
          locale: ptBR,
        })
      }
      // If BR format already, just return or reformat?
      // For now, assuming input might be YYYY-MM-DD or DD/MM/YYYY
      const date = parseDateSafe(dateString)
      if (date) return format(date, formatStr, { locale: ptBR })
    }
    const date = parseDateSafe(dateString)
    if (date) return format(date, formatStr, { locale: ptBR })
    return dateString
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
    const date = parseDateSafe(dateString) || new Date(dateString)
    if (!isValid(date)) return '-'

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

/**
 * Robustly parses a date string that might be in ISO (YYYY-MM-DD) or BR (DD/MM/YYYY) format.
 * Returns null if parsing fails.
 * Handles 2-digit years by assuming 2000s (fixing year 0026 issue).
 */
export const parseDateSafe = (
  dateString: string | null | undefined,
): Date | null => {
  if (!dateString) return null
  const str = String(dateString).trim()
  if (!str) return null

  let d: Date | null = null

  // Try ISO format (YYYY-MM-DD)
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const isoDate = parseISO(str)
    if (isValid(isoDate)) d = isoDate
  }

  // Try YYYY/MM/DD
  if (!d && str.match(/^\d{4}\/\d{2}\/\d{2}/)) {
    const cleaned = str.replace(/\//g, '-')
    const isoDate = parseISO(cleaned)
    if (isValid(isoDate)) d = isoDate
  }

  if (!d) {
    // Try BR formats, including 2-digit years
    const formats = [
      'dd/MM/yyyy HH:mm:ss',
      'dd/MM/yyyy HH:mm',
      'dd/MM/yyyy',
      'dd-MM-yyyy HH:mm:ss',
      'dd-MM-yyyy HH:mm',
      'dd-MM-yyyy',
      'dd/MM/yy HH:mm:ss',
      'dd/MM/yy HH:mm',
      'dd/MM/yy',
    ]

    for (const fmt of formats) {
      const parsed = parse(str, fmt, new Date(), { locale: ptBR })
      if (isValid(parsed)) {
        d = parsed
        break
      }
    }
  }

  // Last resort: standard Date parsing
  if (!d) {
    const fallback = new Date(str)
    if (isValid(fallback)) {
      d = fallback
    }
  }

  // Fix 2-digit year issue (e.g., 0026 -> 2026)
  if (d && isValid(d)) {
    const year = d.getFullYear()
    if (year < 100) {
      d.setFullYear(year + 2000)
    } else if (year < 1900) {
      d.setFullYear(year + 2000)
    }
    return d
  }

  return null
}
