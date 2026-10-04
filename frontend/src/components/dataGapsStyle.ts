// Mapa braków danych (#31): klasa odcinka z pewności danych. Progi z reguły backendu
// (routing/scores.py: data_confidence): brak nawierzchni 0.35, do tego nieprecyzyjne
// nachylenie -0.10 (0.25); sama nieprecyzyjna wartość nachylenia przy znanej nawierzchni = 0.5.
// Każda klasa ma inny kolor I inny wzór linii - kolor nie jest jedynym nośnikiem (WCAG 1.4.1).

export type GapClass = 'none' | 'surface' | 'incline'

export const GAP_CLASSES: GapClass[] = ['none', 'surface', 'incline']

export const GAP_LABEL: Record<GapClass, string> = {
  none: 'brak nawierzchni i nachylenia',
  surface: 'brak danych o nawierzchni',
  incline: 'nachylenie bez wartości',
}

export const GAP_COLOR: Record<GapClass, string> = {
  none: '#b42318',
  surface: '#c2410c',
  incline: '#6b5a12',
}

/** Wzór linii MapLibre (kreska, przerwa) w szerokościach linii */
export const GAP_DASH: Record<GapClass, [number, number]> = {
  none: [1, 1],
  surface: [3, 1.5],
  incline: [0.4, 1.8],
}

export function gapClass(confidence: number): GapClass {
  if (confidence < 0.3) return 'none'
  if (confidence <= 0.4) return 'surface'
  return 'incline'
}
