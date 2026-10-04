// Nawigacja w trakcie trasy: pozycja (GPS albo symulacja), postęp, zapowiedzi głosowe,
// automatyczne przeliczenie po zejściu z trasy. Logika obliczeń: navigation.ts.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LatLon, RouteResponse } from '../api/client'
import { useApp } from './context'
import {
  ANNOUNCE_FAR_M,
  ANNOUNCE_NEAR_M,
  ARRIVED_M,
  maneuverLead,
  maneuverSpeech,
  nextManeuver,
  OFF_ROUTE_FIXES,
  OFF_ROUTE_M,
  pointAt,
  progressOnRoute,
  routeLine,
  SIM_SPEED_MPS,
  SIM_TICK_MS,
  type Maneuver,
  type RouteLine,
  type RouteProgress,
} from './navigation'
import { loadMuted, saveMuted, speak, stopSpeaking } from './speech'
import type { NavigationMode } from './state'
import { useActiveRoute } from './useRoute'

/** Tak daleko od trasy GPS nie przelicza - to raczej test z innego miasta niż zejście z trasy */
const FAR_M = 1500
/** Odstęp między kolejnymi przeliczeniami trasy */
const REROUTE_EVERY_MS = 15_000

export type NavStatus = 'locating' | 'navigating' | 'rerouting' | 'far' | 'gps-error' | 'arrived'

export interface NavFix {
  point: LatLon
  /** Kierunek ruchu [°]; null - nieznany (stoimy) */
  heading: number | null
}

export interface Navigation {
  mode: NavigationMode | null
  route: RouteResponse | null
  fix: NavFix | null
  progress: RouteProgress | null
  maneuver: Maneuver | null
  status: NavStatus
  /** Czas ostatniej pozycji [ms] */
  updatedAt: number
  /** Ostatnia wskazówka - także dla czytnika ekranu (aria-live) */
  announcement: string
  muted: boolean
  setMuted: (muted: boolean) => void
}

interface Tracked {
  fix: NavFix | null
  progress: RouteProgress | null
  status: NavStatus
  /** Czas pozycji [ms] - od niego liczymy godzinę przyjazdu */
  at: number
}

const IDLE: Tracked = { fix: null, progress: null, status: 'locating', at: 0 }

const HAS_GPS = typeof navigator !== 'undefined' && 'geolocation' in navigator

export function useNavigation(): Navigation {
  const [{ navigation: mode }, dispatch] = useApp()
  const { active: route } = useActiveRoute()
  const line = useMemo(() => (route ? routeLine(route) : null), [route])
  const [tracked, setTracked] = useState<Tracked>(IDLE)
  const [announcement, setAnnouncement] = useState('')
  const [muted, setMutedState] = useState(loadMuted)

  // Stan dla callbacków GPS / symulacji (aktualizowany w efektach, nie w renderze)
  const routeRef = useRef(route)
  const lineRef = useRef<RouteLine | null>(line)
  const mutedRef = useRef(muted)
  const minAlong = useRef(0)
  const offFixes = useRef(0)
  const lastReroute = useRef(0)
  const announced = useRef(new Set<string>())
  const lastFix = useRef<NavFix | null>(null)
  const arrived = useRef(false)

  const announce = useRef((text: string) => {
    setAnnouncement(text)
    if (!mutedRef.current) speak(text)
  })

  // Nowa trasa (start, przeliczenie, „Przelicz trasę” z #63): postęp liczony od nowa
  useEffect(() => {
    routeRef.current = route
    lineRef.current = line
    minAlong.current = 0
    offFixes.current = 0
    // po przeliczeniu nie mówimy znowu „Rozpoczynam nawigację”
    announced.current = new Set(announced.current.has('start') ? ['start'] : [])
  }, [route, line])

  useEffect(() => {
    mutedRef.current = muted
    if (muted) stopSpeaking()
  }, [muted])

  const onFix = useRef((fix: NavFix, gps: boolean) => {
    const current = routeRef.current
    const currentLine = lineRef.current
    lastFix.current = fix
    if (!current || !currentLine || arrived.current) return
    const progress = progressOnRoute(currentLine, fix.point, minAlong.current)

    if (progress.offRoute > OFF_ROUTE_M && gps) {
      offFixes.current += 1
      if (progress.offRoute > FAR_M) {
        setTracked({ fix, progress, status: 'far', at: Date.now() })
        return
      }
      const now = Date.now()
      if (offFixes.current >= OFF_ROUTE_FIXES && now - lastReroute.current > REROUTE_EVERY_MS) {
        lastReroute.current = now
        announce.current('Jesteś poza trasą. Wyznaczam nową trasę.')
        dispatch({ type: 'rerouteFrom', point: fix.point })
        setTracked({ fix, progress, status: 'rerouting', at: Date.now() })
        return
      }
      setTracked({ fix, progress, status: 'navigating', at: Date.now() })
      return
    }
    offFixes.current = 0
    minAlong.current = Math.max(minAlong.current, progress.along)

    if (progress.remaining <= ARRIVED_M) {
      arrived.current = true
      announce.current('Jesteś u celu.')
      setTracked({ fix, progress, status: 'arrived', at: Date.now() })
      return
    }

    // Zapowiedzi: start, nowy odcinek z ostrzeżeniem, manewr z wyprzedzeniem i tuż przed
    const said = announced.current
    const maneuver = nextManeuver(current, progress)
    const segment = current.segments[progress.segment]
    const key = `${progress.segment}`
    const parts: string[] = []
    if (!said.has('start')) {
      said.add('start')
      const first = current.segments[0]
      parts.push(
        `Rozpoczynam nawigację. ${maneuverLead(first.instruction)}${first.street ? `: ${first.street}` : ''}.`,
      )
    }
    if (!said.has(`warn:${key}`)) {
      said.add(`warn:${key}`)
      if (segment?.warnings?.length) parts.push(`Uwaga: ${segment.warnings[0]}`)
    }
    if (maneuver.distance <= ANNOUNCE_NEAR_M && !said.has(`near:${key}`)) {
      said.add(`near:${key}`)
      said.add(`far:${key}`)
      parts.push(maneuverSpeech(maneuver, true))
    } else if (
      maneuver.distance <= ANNOUNCE_FAR_M &&
      maneuver.distance > ANNOUNCE_NEAR_M + 10 &&
      !said.has(`far:${key}`)
    ) {
      said.add(`far:${key}`)
      parts.push(maneuverSpeech(maneuver, false))
    }
    if (parts.length) announce.current(parts.join(' '))
    setTracked({ fix, progress, status: 'navigating', at: Date.now() })
  })

  // Źródło pozycji: GPS albo symulacja przejścia trasy
  useEffect(() => {
    if (!mode) return
    arrived.current = false
    announced.current = new Set()
    // koniec (albo zmiana źródła): cisza i stan od nowa
    const reset = () => {
      stopSpeaking()
      setTracked(IDLE)
      setAnnouncement('')
    }
    if (mode === 'gps') {
      if (!HAS_GPS) return reset
      const watch = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed } = pos.coords
          const moving = heading !== null && !Number.isNaN(heading) && (speed ?? 0) > 0.3
          onFix.current(
            { point: { lat: latitude, lon: longitude }, heading: moving ? heading : null },
            true,
          )
        },
        () => setTracked((prev) => ({ ...prev, status: 'gps-error', at: Date.now() })),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 20_000 },
      )
      return () => {
        navigator.geolocation.clearWatch(watch)
        reset()
      }
    }
    // Symulacja: kropka idzie po trasie; po przeliczeniu trasy - od rzutu ostatniej pozycji
    let along = 0
    let simLine = lineRef.current
    const step = () => {
      const currentLine = lineRef.current
      if (!currentLine || arrived.current) return
      if (currentLine !== simLine) {
        simLine = currentLine
        along = lastFix.current ? progressOnRoute(currentLine, lastFix.current.point).along : 0
      }
      along = Math.min(along + (SIM_SPEED_MPS * SIM_TICK_MS) / 1000, currentLine.length)
      const { point, heading } = pointAt(currentLine, along)
      onFix.current({ point, heading }, false)
    }
    step()
    const timer = setInterval(step, SIM_TICK_MS)
    return () => {
      clearInterval(timer)
      reset()
    }
  }, [mode])

  const setMuted = (value: boolean) => {
    setMutedState(value)
    saveMuted(value)
  }
  const maneuver = route && tracked.progress ? nextManeuver(route, tracked.progress) : null
  return {
    mode,
    route,
    fix: mode ? tracked.fix : null,
    progress: mode ? tracked.progress : null,
    maneuver: mode ? maneuver : null,
    status: mode === 'gps' && !HAS_GPS ? 'gps-error' : tracked.status,
    updatedAt: tracked.at,
    announcement: mode ? announcement : '',
    muted,
    setMuted,
  }
}
