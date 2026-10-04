// Dane dla warstw mapy bez własnego backendu jeszcze (plan §5.8).
// Ławki i przewijaki są już prawdziwe (GET /api/pois, #100). Parkingi OzN i wydarzenia to dane
// przykładowe w kształcie przyszłego API - podmiana na backend = zmiana ciała jednej funkcji.
import type { LatLon } from './client'
import { buildDemoEvents } from './demoData/events'
import { DEMO_PARKING } from './demoData/parking'
import type { components } from './schema'

export type Poi = components['schemas']['Poi']

/** Punkt warstwy mapy. Prawdziwe dane (np. z OSM) mają też `provenance` i `confidence`. */
export interface DemoPoi {
  id: string
  kind: Poi['kind'] | 'parking_disabled'
  name: string | null
  location: LatLon
  details: Record<string, string | number | boolean>
  /** 'demo' = dane przykładowe; prawdziwe źródła: 'osm' itd. */
  source: string
  provenance?: Poi['provenance']
  confidence?: number
}

export type EventFeature = 'napisy' | 'PJM' | 'audiodeskrypcja' | 'pętla indukcyjna'

export interface DemoEvent {
  id: string
  title: string
  start: string
  end: string
  venueId?: string
  venueName: string
  location: LatLon
  features: EventFeature[]
  source: string
}

export const DEMO_SOURCE = 'demo'

/** Czy pokazać etykietę „dane przykładowe”. */
export function isDemoData(item: { source: string }): boolean {
  return item.source === DEMO_SOURCE
}

/** Punkt w obszarze 'south,west,north,east' (format jak w /api/places i /api/barriers). */
export function inBbox(point: LatLon, bbox: string | null): boolean {
  if (!bbox) return true
  const [s, w, n, e] = bbox.split(',').map(Number)
  return point.lat >= s && point.lat <= n && point.lon >= w && point.lon <= e
}

async function getPois(
  kind: Poi['kind'],
  city: string,
  bbox: string | null,
  signal?: AbortSignal,
): Promise<DemoPoi[]> {
  const params = new URLSearchParams({ city, kind, limit: '2000', ...(bbox ? { bbox } : {}) })
  const res = await fetch(`/api/pois?${params}`, { signal })
  if (!res.ok) throw new Error(`API ${res.status}: nie udało się pobrać punktów (${kind})`)
  const pois = (await res.json()) as Poi[]
  // API pomija puste pola - front dostaje zawsze pełny kształt DemoPoi
  return pois.map((p) => ({ ...p, name: p.name ?? null, details: p.details ?? {} }))
}

export const demoApi = {
  /** Ławki i stoły piknikowe - prawdziwe dane z OSM (#100). */
  restSpots: (bbox: string | null, signal?: AbortSignal, city = 'krakow') =>
    getPois('bench', city, bbox, signal),

  /** Przewijaki - prawdziwe dane z OSM (#100). */
  changingTables: (bbox: string | null, signal?: AbortSignal, city = 'krakow') =>
    getPois('changing_table', city, bbox, signal),

  /** Koperty OzN - dane przykładowe (#64 zastąpi je prawdziwymi). */
  parkingSpots: async (bbox: string | null): Promise<DemoPoi[]> =>
    DEMO_PARKING.filter((p) => inBbox(p.location, bbox)),

  /** Wydarzenia - dane przykładowe (#60), od najbliższego. */
  events: async (now: Date = new Date()): Promise<DemoEvent[]> =>
    buildDemoEvents(now).sort((a, b) => a.start.localeCompare(b.start)),
}
