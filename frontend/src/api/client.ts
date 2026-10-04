// Typy są generowane z OpenAPI backendu: `make gen-api` (nie edytuj schema.d.ts ręcznie)
import type { FeatureCollection, LineString } from 'geojson'
import type { components } from './schema'

export type Place = components['schemas']['Place']
export type LatLon = components['schemas']['LatLon']
export type RouteRequest = components['schemas']['RouteRequest']
export type RouteResponse = components['schemas']['RouteResponse']
export type RouteAlternative = components['schemas']['RouteAlternative']
export type RouteSegment = components['schemas']['RouteSegment']
export type RouteBaseline = components['schemas']['RouteBaseline']

/** Odpowiedź `POST /api/routes/geojson` - można ją podać wprost do źródła `geojson` w MapLibre. */
export type RouteFeatureProperties =
  | ({ kind: 'segment'; index: number } & Omit<RouteSegment, 'geometry'>)
  | ({ kind: 'baseline' } & Omit<RouteBaseline, 'geometry'>)
export type RouteGeoJSON = FeatureCollection<LineString, RouteFeatureProperties> & {
  properties: Omit<RouteResponse, 'segments' | 'baseline'>
}
export type RoutePreferences = components['schemas']['RoutePreferences']
export type Difficulty = components['schemas']['Difficulty']
export type ReportCreate = components['schemas']['ReportCreate']
export type Report = components['schemas']['Report']
export type City = components['schemas']['CityConfig']
export type GeocodeResult = components['schemas']['GeocodeResult']
export type Institution = components['schemas']['Institution']
export type InstitutionAttribute = components['schemas']['InstitutionAttribute']
export type SearchResult = components['schemas']['SearchResult']
/** Odcinki sieci pieszej (`GET /api/segments`) - GeoJSON do źródła `geojson` w MapLibre. */
export type SegmentCollection = components['schemas']['SegmentCollection']
/** Ile i gdzie brakuje danych (`GET /api/data-gaps`) - tekst do mapy braków danych */
export type DataGapsSummary = components['schemas']['DataGapsSummary']
export type Barrier = components['schemas']['Barrier']
export type BarrierType = components['schemas']['BarrierType']
export type BarrierList = components['schemas']['BarrierList']
/** Tryb z ekranu startowego (`GET /api/profiles`): preferencje trasy i domyślne warstwy */
export type ModePreset = components['schemas']['ModePreset']

export type ProfileId = 'wheelchair' | 'stroller'

export interface ProfilePreset {
  label: string
  description: string
  preferences: RoutePreferences
}

/** Gotowe zestawy preferencji. Opisują sposób poruszania się, nie osobę. */
export const PROFILE_PRESETS: Record<ProfileId, ProfilePreset> = {
  wheelchair: {
    label: 'Wózek inwalidzki',
    description: 'Bez schodów, nachylenie do 6%, omija bruk i kocie łby.',
    preferences: {
      profile: 'wheelchair',
      avoid_stairs: true,
      max_incline_percent: 6,
      max_kerb_height_cm: 2,
      avoid_rough_surface: true,
      prefer_lit_paths: false,
    },
  },
  stroller: {
    label: 'Rodzina z wózkiem dziecięcym',
    description: 'Bez schodów, nachylenie do 10%, krótki bruk jest akceptowalny.',
    preferences: {
      profile: 'stroller',
      avoid_stairs: true,
      max_incline_percent: 10,
      max_kerb_height_cm: 5,
      avoid_rough_surface: true,
      prefer_lit_paths: false,
    },
  },
}

export const DEFAULT_PREFERENCES: RoutePreferences = PROFILE_PRESETS.wheelchair.preferences

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    let message = `API ${res.status}: ${text}`
    try {
      const detail = (JSON.parse(text) as { detail?: unknown }).detail
      if (typeof detail === 'string') message = detail
      // błędy walidacji FastAPI: [{ msg: "Value error, …" }, …]
      else if (Array.isArray(detail))
        message = detail
          .map((d: { msg?: string }) => (d.msg ?? '').replace(/^Value error, /, ''))
          .join(' ')
    } catch {
      // odpowiedź nie jest JSON-em - zostaje surowy tekst
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const api = {
  cities: () => request<City[]>('/cities'),
  /** `bbox`: "south,west,north,east"; bez niego backend bierze obszar demo miasta */
  places: (
    city: string,
    opts: { q?: string; bbox?: string; limit?: number } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({ city })
    if (opts.q) params.set('q', opts.q)
    if (opts.bbox) params.set('bbox', opts.bbox)
    if (opts.limit) params.set('limit', String(opts.limit))
    return request<Place[]>(`/places?${params}`, { signal })
  },
  route: (body: RouteRequest, signal?: AbortSignal) =>
    request<RouteResponse>('/routes', { method: 'POST', body: JSON.stringify(body), signal }),
  routeGeojson: (body: RouteRequest, signal?: AbortSignal) =>
    request<RouteGeoJSON>('/routes/geojson', {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    }),
  geocode: (q: string, city: string, signal?: AbortSignal) =>
    request<GeocodeResult[]>(`/geocode?${new URLSearchParams({ q, city })}`, { signal }),
  reverseGeocode: (point: LatLon, city: string, signal?: AbortSignal) =>
    request<GeocodeResult | null>(
      `/geocode/reverse?${new URLSearchParams({ lat: String(point.lat), lon: String(point.lon), city })}`,
      { signal },
    ),
  search: (q: string, city: string, near: LatLon | null, signal?: AbortSignal) =>
    request<SearchResult[]>(
      `/search?${new URLSearchParams({
        q,
        city,
        ...(near ? { lat: String(near.lat), lon: String(near.lon) } : {}),
      })}`,
      { signal },
    ),
  institutions: (city: string) =>
    request<Institution[]>(`/institutions?${new URLSearchParams({ city })}`),
  report: (body: ReportCreate, city: string) =>
    request<Report>(`/reports?${new URLSearchParams({ city })}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  reports: (city: string, signal?: AbortSignal) =>
    request<Report[]>(`/reports?${new URLSearchParams({ city })}`, { signal }),
  /** bbox: [south, west, north, east] jak w konfiguracji miasta */
  /** bbox: "south,west,north,east" (jak z MapView.onBoundsChange) */
  profiles: (signal?: AbortSignal) => request<ModePreset[]>('/profiles', { signal }),
  barriers: (city: string, bbox: string, signal?: AbortSignal) =>
    request<BarrierList>(`/barriers?${new URLSearchParams({ city, bbox })}`, { signal }),
  dataGaps: (city: string, signal?: AbortSignal) =>
    request<DataGapsSummary>(`/data-gaps?${new URLSearchParams({ city })}`, { signal }),
  segments: (
    city: string,
    bbox: [number, number, number, number],
    options: { maxConfidence?: number; signal?: AbortSignal } = {},
  ) =>
    request<SegmentCollection>(
      `/segments?${new URLSearchParams({
        city,
        bbox: bbox.join(','),
        ...(options.maxConfidence !== undefined
          ? { max_confidence: String(options.maxConfidence) }
          : {}),
      })}`,
      { signal: options.signal },
    ),
}
