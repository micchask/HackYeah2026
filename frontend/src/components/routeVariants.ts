import type { RouteResponse, RouteSegment } from '../api/client'

export interface RouteVariant {
  index: number
  label: string
  route: RouteResponse
}

/** Jedna lista wariantów współdzielona przez wybór, tabelę porównawczą i mapę. */
export function buildRouteVariants(route: RouteResponse): RouteVariant[] {
  return [
    { index: 0, label: 'Najbardziej dostępna', route },
    ...(route.alternatives ?? []).map((alternative, index) => ({
      index: index + 1,
      label: conciseVariantLabel(alternative.label),
      route: routeForVariant(route, index + 1),
    })),
  ]
}

function conciseVariantLabel(label: string): string {
  const normalized = label.toLocaleLowerCase('pl')
  if (normalized.includes('najkrótsz')) return 'Najkrótsza'
  if (normalized.includes('kompromis')) return 'Kompromis'
  return label
}

/** Buduje pełny widok wybranego wariantu, aby wszystkie części UI pokazywały tę samą trasę. */
export function routeForVariant(route: RouteResponse, selected: number): RouteResponse {
  if (selected === 0) return route
  const alternative = route.alternatives?.[selected - 1]
  if (!alternative) return route

  const [accessibility_score, confidence] = aggregateScores(alternative.segments)
  return {
    ...route,
    distance_m: alternative.distance_m,
    duration_s: alternative.duration_s,
    segments: alternative.segments,
    accessibility_score,
    confidence,
    rough_surface_m: alternative.rough_surface_m,
    stairs_count: alternative.stairs_count,
    explanation: alternative.explanation,
  }
}

export function selectedVariantLabel(route: RouteResponse, selected: number): string {
  return buildRouteVariants(route)[selected]?.label ?? 'Najbardziej dostępna'
}

function aggregateScores(segments: RouteSegment[]): [number, number] {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.distance_m, 0), 0)
  if (total <= 0) return [0, 0]

  const accessibility = segments.reduce(
    (sum, segment) => sum + segment.accessibility_score * Math.max(segment.distance_m, 0),
    0,
  )
  const confidence = segments.reduce(
    (sum, segment) => sum + segment.confidence * Math.max(segment.distance_m, 0),
    0,
  )
  return [Math.round(accessibility / total), Math.round((confidence / total) * 100) / 100]
}
