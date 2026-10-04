import { describe, expect, it } from 'vitest'
import type { RouteResponse } from '../../api/client'
import type { DemoPoi } from '../../api/demo'
import { countRestSpotsNearRoute, distanceToPolylineMeters, routeBbox } from './routeRestSpots'

const route: RouteResponse = {
  distance_m: 100,
  duration_s: 90,
  accessibility_score: 90,
  confidence: 0.8,
  is_mock: false,
  explanation: 'Testowa trasa',
  segments: [
    {
      instruction: 'Idź prosto',
      distance_m: 100,
      geometry: [
        { lat: 50, lon: 19 },
        { lat: 50, lon: 19.002 },
      ],
      difficulty: 'easy',
      accessibility_score: 90,
      confidence: 0.8,
      data_status: 'verified',
    },
  ],
}

function bench(id: string, lat: number, lon: number): DemoPoi {
  return { id, kind: 'bench', name: null, location: { lat, lon }, details: {}, source: 'osm' }
}

describe('distanceToPolylineMeters', () => {
  it('mierzy odległość od najbliższego fragmentu łamanej, także poza jego końcem', () => {
    const line = route.segments[0].geometry

    expect(distanceToPolylineMeters({ lat: 50, lon: 19.001 }, line)).toBeCloseTo(0, 5)
    expect(distanceToPolylineMeters({ lat: 50.0002, lon: 19.001 }, line)).toBeCloseTo(22.24, 0)
    expect(distanceToPolylineMeters({ lat: 50, lon: 19.003 }, line)).toBeGreaterThan(70)
  })
})

describe('countRestSpotsNearRoute', () => {
  it('liczy ławki w odległości do 30 m od trasy', () => {
    const spots = [
      bench('on-route', 50, 19.001),
      bench('nearby', 50.0002, 19.0015),
      bench('too-far', 50.0004, 19.001),
    ]

    expect(countRestSpotsNearRoute(spots, route)).toBe(2)
  })

  it('tworzy obwiednię poszerzoną względem geometrii trasy', () => {
    const bbox = routeBbox(route)?.split(',').map(Number)

    expect(bbox).toBeDefined()
    expect(bbox![0]).toBeLessThan(50)
    expect(bbox![1]).toBeLessThan(19)
    expect(bbox![2]).toBeGreaterThan(50)
    expect(bbox![3]).toBeGreaterThan(19.002)
  })
})
