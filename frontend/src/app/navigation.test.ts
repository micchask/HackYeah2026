import { describe, expect, it } from 'vitest'
import type { RouteResponse } from '../api/client'
import {
  formatDistance,
  maneuverSpeech,
  nextManeuver,
  pointAt,
  progressOnRoute,
  remainingSeconds,
  routeLine,
  turnKind,
} from './navigation'

const M_LAT = 1 / 111_320
const M_LON = 1 / (111_320 * Math.cos((50.0617 * Math.PI) / 180))
const at = (north: number, east: number) => ({
  lat: 50.0617 + north * M_LAT,
  lon: 19.9373 + east * M_LON,
})

// 100 m na północ, potem skręt w prawo i 50 m na wschód
const route = {
  distance_m: 150,
  duration_s: 300,
  segments: [
    {
      instruction: 'Ruszaj na północ: ul. Floriańska, 100 m.',
      street: 'ul. Floriańska',
      geometry: [at(0, 0), at(50, 0), at(100, 0)],
    },
    {
      instruction: 'Skręć w prawo: ul. Szpitalna, 50 m.',
      street: 'ul. Szpitalna',
      geometry: [at(100, 0), at(100, 50)],
    },
  ],
} as unknown as RouteResponse

describe('nawigacja (pozycja na trasie)', () => {
  const line = routeLine(route)

  it('liczy długość trasy i początki odcinków', () => {
    expect(line.length).toBeCloseTo(150, 0)
    expect(line.segmentStart[1]).toBeCloseTo(100, 0)
  })

  it('rzutuje pozycję obok trasy i podaje odległość do manewru', () => {
    const progress = progressOnRoute(line, at(40, 5))
    expect(progress.segment).toBe(0)
    expect(progress.offRoute).toBeCloseTo(5, 0)
    expect(progress.toManeuver).toBeCloseTo(60, 0)
    expect(progress.remaining).toBeCloseTo(110, 0)

    const maneuver = nextManeuver(route, progress)
    expect(maneuver).toMatchObject({
      kind: 'right',
      text: 'Skręć w prawo',
      street: 'ul. Szpitalna',
    })
    expect(maneuverSpeech(maneuver, false)).toBe('Za 60 metrów skręć w prawo: ul. Szpitalna.')
    expect(maneuverSpeech(maneuver, true)).toBe('Skręć w prawo: ul. Szpitalna.')
  })

  it('na ostatnim odcinku następnym manewrem jest cel', () => {
    const progress = progressOnRoute(line, at(100, 30))
    expect(progress.segment).toBe(1)
    const maneuver = nextManeuver(route, progress)
    expect(maneuver.kind).toBe('arrive')
    expect(maneuver.distance).toBeCloseTo(20, 0)
  })

  it('wykrywa zejście z trasy', () => {
    expect(progressOnRoute(line, at(50, 80)).offRoute).toBeGreaterThan(30)
  })

  it('symulacja przesuwa punkt wzdłuż trasy', () => {
    expect(pointAt(line, 50).point.lat).toBeCloseTo(at(50, 0).lat, 6)
    const turned = pointAt(line, 125)
    expect(turned.point.lon).toBeCloseTo(at(100, 25).lon, 6)
    expect(turned.heading).toBeCloseTo(90, 0)
  })

  it('czas do celu proporcjonalnie do czasu trasy', () => {
    expect(remainingSeconds(route, 75)).toBeCloseTo(150, 0)
  })

  it('rozpoznaje manewry i zaokrągla odległości', () => {
    expect(turnKind('Odbij lekko w lewo')).toBe('slight-left')
    expect(turnKind('Zawróć')).toBe('uturn')
    expect(turnKind('Idź dalej prosto')).toBe('straight')
    expect(formatDistance(437)).toBe('450 m')
    expect(formatDistance(1260)).toBe('1,3 km')
  })
})
