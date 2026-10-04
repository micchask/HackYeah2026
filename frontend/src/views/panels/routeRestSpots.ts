import type { LatLon, RouteResponse } from '../../api/client'
import type { DemoPoi } from '../../api/demo'

const EARTH_RADIUS_M = 6_371_000

/** Odległość punktu od łamanej w metrach (lokalna projekcja wystarcza dla tras miejskich). */
export function distanceToPolylineMeters(point: LatLon, polyline: readonly LatLon[]): number {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY

  const cosLat = Math.cos((point.lat * Math.PI) / 180)
  const project = (candidate: LatLon) => ({
    x: (((candidate.lon - point.lon) * Math.PI) / 180) * EARTH_RADIUS_M * cosLat,
    y: (((candidate.lat - point.lat) * Math.PI) / 180) * EARTH_RADIUS_M,
  })

  if (polyline.length === 1) {
    const only = project(polyline[0])
    return Math.hypot(only.x, only.y)
  }

  let closest = Number.POSITIVE_INFINITY
  for (let index = 1; index < polyline.length; index += 1) {
    const start = project(polyline[index - 1])
    const end = project(polyline[index])
    const dx = end.x - start.x
    const dy = end.y - start.y
    const lengthSquared = dx * dx + dy * dy
    const position =
      lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, -(start.x * dx + start.y * dy) / lengthSquared))
    closest = Math.min(closest, Math.hypot(start.x + position * dx, start.y + position * dy))
  }
  return closest
}

/** Liczy miejsca odpoczynku nie dalej niż `maxDistanceM` od któregokolwiek odcinka trasy. */
export function countRestSpotsNearRoute(
  spots: readonly DemoPoi[],
  route: RouteResponse,
  maxDistanceM = 30,
): number {
  const polylines = route.segments.map((segment) => segment.geometry).filter((line) => line.length)
  return spots.filter((spot) =>
    polylines.some((line) => distanceToPolylineMeters(spot.location, line) <= maxDistanceM),
  ).length
}

/** Obwiednia do pobrania kandydatów; końcowy próg 30 m sprawdza `countRestSpotsNearRoute`. */
export function routeBbox(route: RouteResponse, paddingM = 30): string | null {
  const points = route.segments.flatMap((segment) => segment.geometry)
  if (!points.length) return null

  const latitudes = points.map((point) => point.lat)
  const longitudes = points.map((point) => point.lon)
  const south = Math.min(...latitudes)
  const north = Math.max(...latitudes)
  const west = Math.min(...longitudes)
  const east = Math.max(...longitudes)
  const middleLatitude = (south + north) / 2
  const latitudePadding = (paddingM / EARTH_RADIUS_M) * (180 / Math.PI)
  const longitudePadding =
    latitudePadding / Math.max(Math.cos((middleLatitude * Math.PI) / 180), 0.01)

  return [
    south - latitudePadding,
    west - longitudePadding,
    north + latitudePadding,
    east + longitudePadding,
  ]
    .map((coordinate) => coordinate.toFixed(6))
    .join(',')
}
