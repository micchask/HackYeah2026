export function formatKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(2).replace('.', ',')} km`
}

/** Polska odmiana: 1 odcinek, 2-4 odcinki, 5+ odcinków. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const lastTwo = n % 100
  const last = n % 10
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
