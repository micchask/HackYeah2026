// Nawigacja krok po kroku: gdzie jesteśmy na trasie, następny manewr, zejście z trasy.
// Czysta logika (bez GPS i mapy) - testy w navigation.test.ts.
import type { LatLon, RouteResponse } from '../api/client'

/** Dalej od trasy niż tyle metrów = zejście z trasy */
export const OFF_ROUTE_M = 30
/** Tyle kolejnych pozycji poza trasą, zanim przeliczymy (pojedynczy skok GPS to nie zejście) */
export const OFF_ROUTE_FIXES = 3
/** Bliżej celu niż tyle metrów = na miejscu */
export const ARRIVED_M = 15
/** Zapowiedzi głosowe manewru: z wyprzedzeniem i tuż przed */
export const ANNOUNCE_FAR_M = 60
export const ANNOUNCE_NEAR_M = 15
/** Symulacja przejścia: prędkość [m/s] i krok [ms] */
export const SIM_SPEED_MPS = 6
export const SIM_TICK_MS = 1000

const M_PER_DEG = 111_320

interface LinePoint {
  point: LatLon
  /** Odległość od początku trasy [m] */
  along: number
  /** Odcinek trasy (RouteSegment), do którego należy punkt */
  segment: number
}

/** Trasa jako jedna łamana z odległościami narastająco. */
export interface RouteLine {
  points: LinePoint[]
  /** Początek każdego odcinka [m od startu] */
  segmentStart: number[]
  length: number
}

function meters(a: LatLon, b: LatLon): number {
  const k = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180)
  return Math.hypot((b.lon - a.lon) * k * M_PER_DEG, (b.lat - a.lat) * M_PER_DEG)
}

/** Kierunek [stopnie od północy, zgodnie z zegarem] z a do b. */
export function bearing(a: LatLon, b: LatLon): number {
  const k = Math.cos((a.lat * Math.PI) / 180)
  const deg = (Math.atan2((b.lon - a.lon) * k, b.lat - a.lat) * 180) / Math.PI
  return (deg + 360) % 360
}

export function routeLine(route: RouteResponse): RouteLine {
  const points: LinePoint[] = []
  const segmentStart: number[] = []
  let along = 0
  route.segments.forEach((segment, index) => {
    segmentStart.push(along)
    for (const point of segment.geometry) {
      const prev = points[points.length - 1]
      if (prev) along += meters(prev.point, point)
      points.push({ point, along, segment: index })
    }
  })
  return { points, segmentStart, length: along }
}

/** Punkt na trasie `along` metrów od startu (symulacja przejścia). */
export function pointAt(line: RouteLine, along: number): { point: LatLon; heading: number } {
  const pts = line.points
  if (pts.length < 2) return { point: pts[0].point, heading: 0 }
  const target = Math.max(0, Math.min(along, line.length))
  const i = Math.max(
    1,
    pts.findIndex((p) => p.along >= target),
  )
  const a = pts[i - 1]
  const b = pts[i]
  const span = b.along - a.along
  const t = span > 0 ? (target - a.along) / span : 1
  return {
    point: {
      lat: a.point.lat + (b.point.lat - a.point.lat) * t,
      lon: a.point.lon + (b.point.lon - a.point.lon) * t,
    },
    heading: bearing(a.point, b.point),
  }
}

export interface RouteProgress {
  /** Odległość od trasy [m] */
  offRoute: number
  /** Przebyte metry (rzut pozycji na trasę) */
  along: number
  /** Bieżący odcinek trasy */
  segment: number
  /** Do końca bieżącego odcinka = do następnego manewru [m] */
  toManeuver: number
  remaining: number
  /** Kierunek trasy w miejscu rzutu - dla obrotu mapy, gdy GPS nie podaje kursu */
  heading: number
}

/**
 * Rzut pozycji na trasę. `minAlong` - nie cofamy się na wcześniejszy fragment trasy
 * (trasa może przechodzić dwa razy obok tego samego miejsca).
 */
export function progressOnRoute(line: RouteLine, position: LatLon, minAlong = 0): RouteProgress {
  const k = Math.cos((position.lat * Math.PI) / 180) * M_PER_DEG
  const xy = (p: LatLon) => [(p.lon - position.lon) * k, (p.lat - position.lat) * M_PER_DEG]
  let best = { dist: Infinity, along: 0, segment: 0, heading: 0 }
  const pts = line.points
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if (b.along < minAlong - 5) continue
    const [ax, ay] = xy(a.point)
    const [bx, by] = xy(b.point)
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
    const dist = Math.hypot(ax + t * dx, ay + t * dy)
    // przy remisie (narożnik) wygrywa dalszy fragment - kolejny odcinek po skręcie
    if (dist < best.dist - 0.5 || (dist <= best.dist + 0.5 && a.along >= best.along)) {
      best = {
        dist,
        along: a.along + t * (b.along - a.along),
        segment: t === 1 ? b.segment : a.segment,
        heading: bearing(a.point, b.point),
      }
    }
  }
  if (pts.length === 1)
    best = { dist: meters(pts[0].point, position), along: 0, segment: 0, heading: 0 }
  const end = line.segmentStart[best.segment + 1] ?? line.length
  return {
    offRoute: best.dist,
    along: best.along,
    segment: best.segment,
    toManeuver: Math.max(0, end - best.along),
    remaining: Math.max(0, line.length - best.along),
    heading: best.heading,
  }
}

export type TurnKind =
  'straight' | 'slight-right' | 'slight-left' | 'right' | 'left' | 'uturn' | 'start' | 'arrive'

/** „Skręć w prawo: ul. Floriańska, 120 m.” -> „Skręć w prawo” */
export function maneuverLead(instruction: string): string {
  return instruction.split(':')[0].trim()
}

export function turnKind(lead: string): TurnKind {
  const text = lead.toLowerCase()
  if (text.startsWith('ruszaj')) return 'start'
  if (text.startsWith('zawróć')) return 'uturn'
  const right = text.includes('prawo')
  const left = text.includes('lewo')
  if (text.includes('lekko')) return right ? 'slight-right' : left ? 'slight-left' : 'straight'
  if (right) return 'right'
  if (left) return 'left'
  return 'straight'
}

export interface Maneuver {
  kind: TurnKind
  /** Np. „Skręć w prawo” albo „Cel podróży” */
  text: string
  street: string | null
  /** Odległość do manewru [m] */
  distance: number
}

/** Następny manewr: początek kolejnego odcinka, a na ostatnim odcinku - cel. */
export function nextManeuver(route: RouteResponse, progress: RouteProgress): Maneuver {
  const next = route.segments[progress.segment + 1]
  if (!next) {
    return { kind: 'arrive', text: 'Cel podróży', street: null, distance: progress.remaining }
  }
  const lead = maneuverLead(next.instruction)
  return {
    kind: turnKind(lead),
    text: lead,
    street: next.street ?? null,
    distance: progress.toManeuver,
  }
}

/** Odległość do wypowiedzenia: zaokrąglona jak w nawigacjach („za 50 metrów”). */
export function roundDistance(m: number): number {
  if (m < 20) return Math.max(5, Math.round(m / 5) * 5)
  if (m < 100) return Math.round(m / 10) * 10
  if (m < 1000) return Math.round(m / 50) * 50
  return Math.round(m / 100) * 100
}

export function formatDistance(m: number): string {
  const r = roundDistance(m)
  return r >= 1000
    ? `${(r / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} km`
    : `${r} m`
}

/** Tekst manewru do wypowiedzenia, np. „Za 50 metrów skręć w prawo w ul. Floriańska”. */
export function maneuverSpeech(maneuver: Maneuver, near: boolean): string {
  const where = maneuver.street ? `: ${maneuver.street}` : ''
  if (maneuver.kind === 'arrive') {
    return near ? 'Jesteś u celu.' : `Za ${roundDistance(maneuver.distance)} metrów cel podróży.`
  }
  const action = maneuver.text.charAt(0).toLowerCase() + maneuver.text.slice(1)
  return near
    ? `${maneuver.text}${where}.`
    : `Za ${roundDistance(maneuver.distance)} metrów ${action}${where}.`
}

/** Pozostały czas [s] - proporcjonalnie do czasu całej trasy z API (uwzględnia tempo profilu). */
export function remainingSeconds(route: RouteResponse, remaining: number): number {
  return route.distance_m > 0 ? (route.duration_s * remaining) / route.distance_m : 0
}
