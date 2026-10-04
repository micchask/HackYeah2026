// Kolor punktów instytucji: inny niż znaczniki A/B i kolory trudności trasy,
// kontrast > 3:1 z jasnym podkładem mapy (WCAG 1.4.11)
export const INSTITUTION_COLOR = '#00707a'

const MAX_LABEL = 34

// Skróty jednostek w podpisach; null = część po myślniku wystarcza (np. oddział muzeum)
const PARENT_SHORT: Record<string, string | null> = {
  'Urząd Miasta Krakowa': 'UMK',
  'Zarząd Dróg Miasta Krakowa': 'ZDMK',
  ZDMK: 'ZDMK',
  'Muzeum Krakowa': null,
}

/**
 * Krótki podpis na mapę, np. "UMK · Wydział Geodezji", "Pałac Krzysztofory".
 * Pełna nazwa jest w okienku, w title znacznika i w liście instytucji.
 */
export function shortInstitutionName(name: string): string {
  const [parent, rest] = name.split(' — ')
  let short = name
  if (rest) {
    const first = rest.split(' / ')[0].trim()
    const prefix = PARENT_SHORT[parent.trim()]
    short = prefix === null ? first : `${prefix ?? parent.trim()} · ${first}`
  }
  return short.length > MAX_LABEL ? `${short.slice(0, MAX_LABEL - 1).trimEnd()}…` : short
}

/**
 * Nazwa przycisku znacznika: najpierw widoczny podpis, potem pełna nazwa (WCAG 2.5.3 „Label in Name”) -
 * sterowanie głosem („kliknij UMK Magistrat”) trafia w przycisk, a czytnik czyta pełną nazwę.
 */
export function institutionMarkerLabel(name: string): string {
  const visible = shortInstitutionName(name).replace(/…$/, '').trimEnd()
  return visible === name ? `${name} – pokaż szczegóły` : `${visible}: ${name} – pokaż szczegóły`
}
