// Pobieranie trasy i warianty (przeniesione z dawnego HomePage).
import { useEffect, useMemo, type Dispatch } from 'react'
import { api, type RouteResponse } from '../api/client'
import type { NamedPoint } from '../components/RoutePoints'
import { buildRouteVariants } from '../components/routeVariants'
import { CITY, useApp } from './context'
import type { Action, AppState } from './state'

/** Efekt w AppProvider: przelicza trasę po zmianie punktów lub preferencji. */
export function useRouteFetch(state: AppState, dispatch: Dispatch<Action>): void {
  const { origin, destination, waypoints, prefs, routeNonce } = state
  useEffect(() => {
    if (!origin || !destination) return
    const validWaypoints = waypoints.filter(wp => wp !== null).map(wp => wp.point)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      dispatch({ type: 'routeLoading' })
      try {
        const route = await api.route(
          { city: CITY, origin: origin.point, destination: destination.point, waypoints: validWaypoints, preferences: prefs },
          controller.signal,
        )
        dispatch({ type: 'setRoute', route })
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        dispatch({ type: 'setRoute', route: null, error: (err as Error).message })
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // routeNonce: „Przelicz trasę” po nowym zgłoszeniu na trasie (#63)
  }, [origin, destination, waypoints, prefs, routeNonce, dispatch])
}

export interface ActiveRoute {
  route: RouteResponse | null
  /** Wybrany wariant - to on jest na mapie, w podsumowaniu i w opisie */
  active: RouteResponse | null
  variants: RouteResponse[]
  otherRoutes: { index: number; label: string }[]
  /** Środek zaznaczonego odcinka - miejsce zgłoszenia „na tej trasie” */
  segmentPoint: NamedPoint | null
}

/**
 * Warianty trasy jako stabilne obiekty. useMemo jest konieczny: nowy obiekt przy każdym renderze
 * = mapa w kółko dopasowuje widok, a ruch mapy zmienia stan i znów renderuje (pętla z #73).
 */
export function useActiveRoute(): ActiveRoute {
  const [{ route, variant, segment }] = useApp()
  const available = useMemo(() => (route ? buildRouteVariants(route) : []), [route])
  const variants = useMemo(() => available.map((v) => v.route), [available])
  const otherRoutes = useMemo(
    () =>
      available.filter((v) => v.index !== variant).map((v) => ({ index: v.index, label: v.label })),
    [available, variant],
  )
  const active = available[variant]?.route ?? null
  const segmentPoint = useMemo<NamedPoint | null>(() => {
    const geometry = segment !== null ? active?.segments[segment]?.geometry : undefined
    if (!geometry?.length) return null
    const street = segment !== null ? active?.segments[segment]?.street : null
    return {
      label: street ?? `odcinek ${(segment ?? 0) + 1}`,
      point: geometry[Math.floor(geometry.length / 2)],
    }
  }, [active, segment])
  return { route, active, variants, otherRoutes, segmentPoint }
}
