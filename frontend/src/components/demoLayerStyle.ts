import type { LayerId } from '../app/state'

export type DemoLayerId = Extract<LayerId, 'rest' | 'parking' | 'events'>

export const DEMO_LAYER_META: Record<
  DemoLayerId,
  { label: string; source: string; layer: string; image: string }
> = {
  rest: {
    label: 'miejsce odpoczynku',
    source: 'demo-rest',
    layer: 'demo-rest-points',
    image: 'demo-rest-icon',
  },
  parking: {
    label: 'parking OzN',
    source: 'demo-parking',
    layer: 'demo-parking-points',
    image: 'demo-parking-icon',
  },
  events: {
    label: 'wydarzenie dostępne',
    source: 'demo-events',
    layer: 'demo-events-points',
    image: 'demo-events-icon',
  },
}

export const DEMO_LAYER_IDS = Object.keys(DEMO_LAYER_META) as DemoLayerId[]

/** Różne sylwetki (ławka, romb P, kalendarz), więc warstwy da się odróżnić bez koloru. */
export function demoLayerIconSvg(kind: DemoLayerId, size = 56): string {
  const body = {
    rest: `
      <circle cx="28" cy="28" r="25" fill="#087f5b" stroke="#fff" stroke-width="3"/>
      <path fill="#fff" d="M14 18h28v9H14zM12 29h32v6H12zM16 34h5v10h-5zM35 34h5v10h-5z"/>`,
    parking: `
      <path fill="#1769aa" stroke="#fff" stroke-width="3" stroke-linejoin="round" d="M28 3 53 28 28 53 3 28Z"/>
      <path fill="#fff" d="M19 43V13h11c8 0 13 4 13 11s-5 11-13 11h-4v8Zm7-14h4c4 0 6-2 6-5s-2-5-6-5h-4Z"/>`,
    events: `
      <rect x="4" y="7" width="48" height="45" rx="8" fill="#7b2cbf" stroke="#fff" stroke-width="3"/>
      <path stroke="#fff" stroke-width="5" stroke-linecap="round" d="M17 4v10M39 4v10"/>
      <path fill="#fff" d="M12 19h32v6H12zM14 30h8v7h-8zM25 30h8v7h-8zM36 30h8v7h-8zM14 40h8v7h-8zM25 40h8v7h-8z"/>`,
  }[kind]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 56 56">${body}</svg>`
}

export function demoLayerIconDataUrl(kind: DemoLayerId): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(demoLayerIconSvg(kind))}`
}
