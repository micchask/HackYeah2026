// Typy są generowane z OpenAPI backendu: `make gen-api` (nie edytuj schema.d.ts ręcznie)
import type { components } from './schema'

export type Place = components['schemas']['Place']
export type RouteRequest = components['schemas']['RouteRequest']
export type RouteResponse = components['schemas']['RouteResponse']
export type RouteSegment = components['schemas']['RouteSegment']
export type RoutePreferences = components['schemas']['RoutePreferences']
export type ReportCreate = components['schemas']['ReportCreate']
export type City = components['schemas']['CityConfig']

export const DEFAULT_PREFERENCES: RoutePreferences = {
  avoid_stairs: true,
  max_incline_percent: 6,
  max_kerb_height_cm: 3,
  avoid_rough_surface: true,
  prefer_lit_paths: false,
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  cities: () => request<City[]>('/cities'),
  places: (city: string, q?: string) =>
    request<Place[]>(`/places?${new URLSearchParams({ city, ...(q ? { q } : {}) })}`),
  route: (body: RouteRequest) =>
    request<RouteResponse>('/routes', { method: 'POST', body: JSON.stringify(body) }),
  report: (body: ReportCreate, city: string) =>
    request(`/reports?city=${city}`, { method: 'POST', body: JSON.stringify(body) }),
}
