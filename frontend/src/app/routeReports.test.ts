import { describe, expect, it } from 'vitest'
import type { ActiveReport, RouteResponse } from '../api/client'
import { distanceToLine, newReportsOnRoute } from './routeReports'

const M_LAT = 1 / 111_320
const A = { lat: 50.0617, lon: 19.9373 }
const B = { lat: 50.0617 + 100 * M_LAT, lon: 19.9373 }

function report(id: string, metersEast: number, effect: ActiveReport['effect']): ActiveReport {
  const k = 111_320 * Math.cos((A.lat * Math.PI) / 180)
  return {
    id,
    type: effect === 'warn' ? 'elevator_broken' : 'construction',
    effect,
    label: 'remont / zablokowane przejście',
    location: { lat: A.lat + 50 * M_LAT, lon: A.lon + metersEast / k },
    active_until: '2026-11-01T00:00:00Z',
  }
}

const route = {
  segments: [{ geometry: [A, B] }],
  reports_considered: ['stare'],
} as unknown as RouteResponse

describe('nowe zgłoszenia na trasie (#63)', () => {
  it('mierzy odległość od łamanej', () => {
    expect(distanceToLine(report('x', 10, 'block').location, [A, B])).toBeCloseTo(10, 0)
  })

  it('wybiera tylko nowe zgłoszenia blisko trasy', () => {
    const found = newReportsOnRoute(
      [
        report('blisko', 5, 'block'),
        report('daleko', 60, 'block'),
        report('stare', 0, 'block'),
        report('winda', 25, 'warn'),
        report('winda-daleko', 40, 'warn'),
      ],
      route,
    )
    expect(found.map((r) => r.id)).toEqual(['blisko', 'winda'])
  })

  it('pomija zamknięte przez użytkownika', () => {
    expect(
      newReportsOnRoute([report('blisko', 5, 'block')], route, route, new Set(['blisko'])),
    ).toEqual([])
  })
})
