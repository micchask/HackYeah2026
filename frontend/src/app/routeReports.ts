// Nowe potwierdzone zgłoszenia na otwartej trasie (#63).
import type { ActiveReport, LatLon, RouteResponse } from '../api/client'

/** Blokada / kara: zgłoszenie dotyczy chodnika trasy, gdy leży tak blisko (jak RADIUS_M + zapas) */
export const ON_ROUTE_M = 20
/** Winda, wejście, parking: tylko ostrzeżenie, gdy trasa przechodzi tak blisko (NEAR_ROUTE_M) */
export const NEAR_ROUTE_M = 30
/** Co ile sprawdzamy nowe zgłoszenia, gdy trasa jest otwarta */
export const POLL_MS = 30_000

/** Najmniejsza odległość [m] punktu od łamanej (przybliżenie równoodległościowe). */
export function distanceToLine(point: LatLon, line: LatLon[]): number {
  const k = Math.cos((point.lat * Math.PI) / 180) * 111_320
  const xy = (p: LatLon) => [(p.lon - point.lon) * k, (p.lat - point.lat) * 111_320] as const
  if (line.length === 1) return Math.hypot(...xy(line[0]))
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = xy(line[i - 1])
    const [bx, by] = xy(line[i])
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return best
}

/**
 * Zgłoszenia leżące na pokazanym wariancie (`active`), których trasa jeszcze nie uwzględniła
 * (`route.reports_considered` - lista z odpowiedzi serwera, wspólna dla wariantów).
 */
export function newReportsOnRoute(
  reports: ActiveReport[],
  route: RouteResponse,
  active: RouteResponse = route,
  dismissed: ReadonlySet<string> = new Set(),
): ActiveReport[] {
  const considered = new Set(route.reports_considered ?? [])
  const line = active.segments.flatMap((s) => s.geometry)
  if (!line.length) return []
  return reports.filter((r) => {
    if (considered.has(r.id) || dismissed.has(r.id)) return false
    const limit = r.effect === 'warn' ? NEAR_ROUTE_M : ON_ROUTE_M
    return distanceToLine(r.location, line) <= limit
  })
}
