/**
 * Parses a currency string (e.g. "1.234,50") to a number (1234.50)
 * Handles Brazilian format where dot is thousands separator and comma is decimal.
 */
export const parseCurrency = (
  value: string | number | null | undefined,
): number => {
  if (typeof value === 'number') return value
  if (!value) return 0
  if (typeof value === 'string') {
    // Remove thousands separator (.) and replace decimal separator (,) with (.)
    const cleanValue = value.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(cleanValue)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/**
 * Formats a number to a currency string for DB storage (e.g. 1234.50 -> "1234,50")
 * Uses 2 decimal places and comma as separator.
 */
export const formatCurrency = (value: number): string => {
  return value.toFixed(2).replace('.', ',')
}
