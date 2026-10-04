import { describe, expect, it } from 'vitest'
import type { Place } from '../api/client'
import { nearbyForMode } from './nearby'

const CENTER = { lat: 50.06, lon: 19.94 }

function place(id: string, category: string, wheelchair: string | null, dLat = 0): Place {
  return {
    id,
    city: 'krakow',
    name: id,
    category,
    location: { lat: CENTER.lat + dLat, lon: CENTER.lon },
    attributes: wheelchair
      ? [
          {
            key: 'wheelchair',
            value: wheelchair,
            confidence: 0.6,
            provenance: { source: 'osm', source_type: 'osm', fetched_at: '2026-10-03T00:00:00Z' },
          },
        ]
      : [],
  } as Place
}

const PLACES = [
  place('daleka-dostepna', 'cafe', 'yes', 0.003),
  place('bliska-czesciowo', 'museum', 'limited', 0.0005),
  place('bliska-dostepna', 'pharmacy', 'yes', 0.001),
  place('bez-danych', 'restaurant', null, 0.0001),
  place('niedostepna', 'cafe', 'no', 0.0002),
  place('przystanek', 'platform', 'yes', 0.0001),
]

describe('nearbyForMode', () => {
  it('wózek: tylko dostępne i częściowo, najpierw dostępne, potem najbliższe', () => {
    const ids = nearbyForMode(PLACES, 'wheelchair', CENTER).map((n) => n.place.id)
    expect(ids).toEqual(['bliska-dostepna', 'daleka-dostepna', 'bliska-czesciowo'])
  })

  it('brak danych nigdy nie jest „dostępne” dla trybów bez schodów', () => {
    for (const mode of ['wheelchair', 'senior', 'stroller'] as const) {
      const ids = nearbyForMode(PLACES, mode, CENTER).map((n) => n.place.id)
      expect(ids).not.toContain('bez-danych')
      expect(ids).not.toContain('niedostepna')
    }
  })

  it('turysta i bez profilu: wszystkie miejsca z warstw, bez przystanków', () => {
    const ids = nearbyForMode(PLACES, 'tourist', CENTER, 10).map((n) => n.place.id)
    expect(ids).toHaveLength(5)
    expect(ids).not.toContain('przystanek')
    expect(ids.at(-1)).toBe('niedostepna') // niedostępne na końcu
  })

  it('limit i odległość od środka mapy', () => {
    const result = nearbyForMode(PLACES, 'guest', CENTER, 2)
    expect(result).toHaveLength(2)
    expect(result[0].distance).toBeGreaterThan(0)
  })
})
