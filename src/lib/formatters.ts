import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Parses a currency string (e.g. "1.234,50") to a number (1234.50)
 * Handles Brazilian format where dot is thousands separator and comma is decimal.
 * Robust implementation to handle malformed strings.
 */
export const parseCurrency = (
  value: string | number | null | undefined,
): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  if (value === null || value === undefined) return 0

  try {
    const stringValue = String(value)

    // Remove R$, spaces, and everything except digits, comma, dot, minus
    // 1. Remove "thousands" separators (dots) first, assuming BR format
    //    We assume dots are ALWAYS thousands separators in this system context
    let cleaned = stringValue.replace(/\./g, '')

    // 2. Replace decimal separator (comma) with dot
    cleaned = cleaned.replace(',', '.')

    // 3. Remove non-numeric chars (except dot and minus)
    cleaned = cleaned.replace(/[^0-9.-]/g, '')

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  } catch (error) {
    console.warn('Error parsing currency:', value, error)
    return 0
  }
}

/**
 * Formats a number to a currency string for DB storage (e.g. 1234.50 -> "1234,50")
 * Uses 2 decimal places and comma as separator.
 */
export const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) return '0,00'
  return value.toFixed(2).replace('.', ',')
}

/**
 * Safely formats a date string using date-fns
 * Returns a placeholder if date is invalid
 */
export const safeFormatDate = (
  dateString: string | null | undefined,
  formatString: string = 'dd/MM/yyyy HH:mm',
): string => {
  if (!dateString) return '-'
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return 'Data inválida'
    return format(date, formatString, { locale: ptBR })
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Erro na data'
  }
}
