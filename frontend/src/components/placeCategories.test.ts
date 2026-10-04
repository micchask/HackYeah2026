import { describe, expect, it } from 'vitest'
import type { Place } from '../api/client'
import { visibleBarriers, visiblePlaces, layerCounts } from '../app/layerData'
import { PROFILE_DEFAULTS } from '../app/state'
import {
  PLACE_KINDS,
  accessibilityOf,
  institutionAccess,
  institutionKind,
  placeGroup,
  placeIconSvg,
  placeKind,
  placeLayer,
} from './placeCategories'

const P = { lat: 50.06, lon: 19.94 }

function place(category: string | null, wheelchair?: string | boolean): Place {
  return {
    id: `p-${category}-${String(wheelchair)}`,
    city: 'krakow',
    category,
    location: P,
    attributes:
      wheelchair === undefined
        ? []
        : [
            {
              key: 'wheelchair',
              value: wheelchair,
              provenance: { source: 'osm', source_type: 'osm', fetched_at: '2026-10-03T00:00:00Z' },
              confidence: 0.6,
            },
          ],
  } as Place
}

describe('accessibilityOf', () => {
  it('brak atrybutu to „brak danych”, nigdy „dostępne”', () => {
    expect(accessibilityOf(place('cafe'))).toBe('unknown')
  })
  it.each([
    ['yes', 'yes'],
    ['designated', 'yes'],
    ['limited', 'limited'],
    ['no', 'no'],
  ])('wheelchair=%s → %s', (value, expected) => {
    expect(accessibilityOf(place('cafe', value))).toBe(expected)
  })
})

describe('grupy i warstwy', () => {
  it('tagi OSM trafiają do grup, nieznany tag i brak kategorii - do „inne”', () => {
    expect(placeGroup(place('restaurant'))).toBe('food')
    expect(placeGroup(place('pharmacy'))).toBe('health')
    expect(placeGroup(place('platform'))).toBe('transport')
    expect(placeGroup(place('zoo_nieznane'))).toBe('other')
    expect(placeGroup(place(null))).toBe('other')
  })

  it('grupy mają swoje chipy; przystanki i inne nie mają warstwy', () => {
    expect(placeLayer(place('museum'))).toBe('places')
    expect(placeLayer(place('toilets'))).toBe('health')
    expect(placeLayer(place('townhall'))).toBe('institutions')
    expect(placeLayer(place('bus_stop'))).toBeNull()
    expect(placeLayer(place(null))).toBeNull()
  })

  it('mapa i lista pokazują tylko miejsca z włączonych chipów', () => {
    const places = [place('cafe'), place('pharmacy'), place('platform')]
    // wózek: toalety i zdrowie włączone
    const wheelchair = { ...PROFILE_DEFAULTS.wheelchair.layers, places: false }
    expect(visiblePlaces(places, wheelchair).map((p) => p.category)).toEqual(['pharmacy'])
    // turysta: jedzenie i kultura włączone, zdrowie nie
    const tourist = PROFILE_DEFAULTS.tourist.layers
    expect(visiblePlaces(places, tourist).map((p) => p.category)).toEqual(['cafe'])
  })

  it('zgłoszenia mają własny chip, pozostałe bariery - chip „Bariery”', () => {
    const barrier = (type: string) => ({ id: type, type }) as never
    const all = [barrier('stairs'), barrier('reported')]
    const layers = { ...PROFILE_DEFAULTS.guest.layers, barriers: true, reports: false }
    expect(visibleBarriers(all, layers).map((b) => b.id)).toEqual(['stairs'])
    expect(visibleBarriers(all, { ...layers, barriers: false, reports: true })).toHaveLength(1)
  })

  it('liczby w chipach nie zależą od tego, czy chip jest włączony', () => {
    const counts = layerCounts(
      {
        places: [place('cafe'), place('museum'), place('pharmacy'), place('platform')],
        institutions: [
          { id: 'a', name: 'A', location: { point: P } },
          { id: 'b', name: 'B', location: { point: { lat: 52.2, lon: 21 } } },
        ] as never,
        barriers: [{ type: 'stairs' }, { type: 'kerb' }, { type: 'reported' }] as never,
      },
      '50.05,19.93,50.07,19.95',
    )
    expect(counts).toEqual({ places: 2, health: 1, institutions: 1, barriers: 2, reports: 1 })
  })
})

describe('rodzaj ikony', () => {
  it.each([
    ['cafe', 'cafe'],
    ['restaurant', 'restaurant'],
    ['museum', 'museum'],
    ['attraction', 'monument'],
    ['place_of_worship', 'church'],
    ['townhall', 'office'],
    ['pharmacy', 'pharmacy'],
    ['toilets', 'toilets'],
  ])('%s → %s', (category, kind) => {
    expect(placeKind(place(category))).toBe(kind)
  })
  it('nieznany tag dostaje ikonę grupy, brak kategorii - „inne”', () => {
    expect(placeKind(place('optician_nowy'))).toBe('other')
    expect(placeKind(place('greengrocer'))).toBe('other')
    expect(placeKind(place('hairdresser'))).toBe('shop')
    expect(placeKind(place(null))).toBe('other')
  })
  it('każdy rodzaj ma ikonę z kwadracikiem dostępności w kolorze statusu', () => {
    for (const kind of PLACE_KINDS) {
      const svg = placeIconSvg(kind, 'no')
      expect(svg).toContain('<path')
      expect(svg).toContain('#c4122f')
    }
  })
})

describe('ikona instytucji', () => {
  it.each([
    ['urząd', 'office'],
    ['muzeum', 'museum'],
    ['teatr', 'theatre'],
    ['Biblioteka Kraków', 'library'],
    ['instytucja', 'office'],
  ])('%s → %s', (kind, expected) => {
    expect(institutionKind({ kind })).toBe(expected)
  })
  it('dostępność z deklaracji to zawsze „brak danych”, nigdy „dostępne”', () => {
    expect(institutionAccess({ attributes: [] })).toBe('unknown')
  })
})
