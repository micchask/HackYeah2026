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

export type ProfileId = 'wheelchair' | 'stroller'

/** Gotowe zestawy preferencji. Nazwy opisują sprzęt, nie osobę. */
export const PROFILE_PRESETS: Record<ProfileId, { label: string; preferences: RoutePreferences }> =
  {
    wheelchair: {
      label: 'Wózek inwalidzki',
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
      label: 'Wózek dziecięcy',
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
  report: (body: ReportCreate, city: string) =>
    request(`/reports?city=${city}`, { method: 'POST', body: JSON.stringify(body) }),
}
