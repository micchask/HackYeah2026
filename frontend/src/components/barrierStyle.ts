import type { BarrierType } from '../api/client'

export const BARRIER_TYPES: BarrierType[] = ['stairs', 'kerb', 'steep', 'rough_surface', 'reported']

export const BARRIER_LABEL: Record<BarrierType, string> = {
  stairs: 'Schody',
  kerb: 'Wysoki krawężnik',
  steep: 'Strome nachylenie',
  rough_surface: 'Nierówna nawierzchnia',
  reported: 'Zgłoszenie użytkowników',
}

/** Odmiana do podsumowania trasy: [1, 2-4, 5+] */
export const BARRIER_COUNT_LABEL: Record<BarrierType, [string, string, string]> = {
  stairs: ['odcinek schodów', 'odcinki schodów', 'odcinków schodów'],
  kerb: ['wysoki krawężnik', 'wysokie krawężniki', 'wysokich krawężników'],
  steep: ['stromy odcinek', 'strome odcinki', 'stromych odcinków'],
  rough_surface: [
    'odcinek nierównej nawierzchni',
    'odcinki nierównej nawierzchni',
    'odcinków nierównej nawierzchni',
  ],
  reported: ['zgłoszona bariera', 'zgłoszone bariery', 'zgłoszonych barier'],
}

// Tło ikon - biały piktogram ma na nich kontrast min. 4.5:1
export const BARRIER_COLOR: Record<BarrierType, string> = {
  stairs: '#6d28d9',
  kerb: '#0f766e',
  steep: '#9f1239',
  rough_surface: '#7c4a12',
  reported: '#c2410c',
}

/** Piktogramy 24×24 (biała kreska) - każdy typ ma inny kształt, nie tylko kolor. */
export const BARRIER_GLYPH: Record<BarrierType, string> = {
  stairs: '<path d="M5 18h4v-4h4v-4h4V6h3"/>',
  kerb: '<path d="M3 16h8v-5h10"/><path d="M11 16v3"/>',
  steep: '<path d="M4 18h16V7z"/>',
  rough_surface:
    '<rect x="4" y="5" width="6" height="5" rx="1.2"/><rect x="13" y="5" width="7" height="5" rx="1.2"/>' +
    '<rect x="4" y="13" width="8" height="6" rx="1.2"/><rect x="15" y="13" width="5" height="6" rx="1.2"/>',
  reported: '<path d="M12 6v8"/><path d="M12 18h.01"/>',
}

/** Ikona bariery jako SVG (kółko w kolorze typu + piktogram) - do mapy i do obrazków. */
export function barrierIconSvg(type: BarrierType, size = 28): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-3 -3 30 30">` +
    `<circle cx="12" cy="12" r="14" fill="${BARRIER_COLOR[type]}" stroke="#fff" stroke-width="2"/>` +
    `<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
    `${BARRIER_GLYPH[type]}</g></svg>`
  )
}
