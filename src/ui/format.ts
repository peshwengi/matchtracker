export function fmt(value: number | undefined, digits = 0): string {
  return value === undefined ? '–' : value.toFixed(digits)
}

/** "2024-06-15T07:23" or "2024-06-15" to "15 Jun 2024". */
export function fmtDate(value: string | undefined): string {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
  return month ? `${d} ${month} ${y}` : value
}

export function mean(values: number[]): number | undefined {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined
}
