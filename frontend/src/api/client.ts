// Typy są generowane z OpenAPI backendu: `make gen-api` (nie edytuj schema.d.ts ręcznie)
import type { components } from './schema'

export type Place = components['schemas']['Place']
export type LatLon = components['schemas']['LatLon']
export type RouteRequest = components['schemas']['RouteRequest']
export type RouteResponse = components['schemas']['RouteResponse']
export type RouteSegment = components['schemas']['RouteSegment']
export type RoutePreferences = components['schemas']['RoutePreferences']
export type Difficulty = components['schemas']['Difficulty']
export type ReportCreate = components['schemas']['ReportCreate']
export type City = components['schemas']['CityConfig']
export type GeocodeResult = components['schemas']['GeocodeResult']
export type Institution = components['schemas']['Institution']
export type InstitutionAttribute = components['schemas']['InstitutionAttribute']

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
    } catch {
      // odpowiedź nie jest JSON-em - zostaje surowy tekst
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const api = {
  cities: () => request<City[]>('/cities'),
  places: (city: string, q?: string) =>
    request<Place[]>(`/places?${new URLSearchParams({ city, ...(q ? { q } : {}) })}`),
  route: (body: RouteRequest, signal?: AbortSignal) =>
    request<RouteResponse>('/routes', { method: 'POST', body: JSON.stringify(body), signal }),
  geocode: (q: string, city: string, signal?: AbortSignal) =>
    request<GeocodeResult[]>(`/geocode?${new URLSearchParams({ q, city })}`, { signal }),
  reverseGeocode: (point: LatLon, city: string, signal?: AbortSignal) =>
    request<GeocodeResult | null>(
      `/geocode/reverse?${new URLSearchParams({ lat: String(point.lat), lon: String(point.lon), city })}`,
      { signal },
    ),
  institutions: (city: string) =>
    request<Institution[]>(`/institutions?${new URLSearchParams({ city })}`),
  report: (body: ReportCreate, city: string) =>
    request(`/reports?city=${city}`, { method: 'POST', body: JSON.stringify(body) }),
}
