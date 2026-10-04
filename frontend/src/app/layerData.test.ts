import { describe, expect, it } from 'vitest'
import type { Barrier, Institution, Place } from '../api/client'
import { mapLayerData, nearRoute } from './layerData'
import { appReducer, initialState } from './state'

const P = { lat: 50.06, lon: 19.94 }
const data = {
  places: [
    { id: 'osm:1', city: 'krakow', name: 'Apteka', category: 'pharmacy', location: P },
  ] as Place[],
  institutions: [{ id: 'i-1', name: 'Urząd', address: 'x', kind: 'urząd' }] as Institution[],
  barriers: [
    {
      id: 'segment:1',
      type: 'stairs',
      description: 'Schody',
      location: P,
      geometry: [P],
      source: 'osm',
      confidence: 0.6,
    },
  ] as Barrier[],
}

describe('mapLayerData', () => {
  it('po „Pokaż wszystkie” mapa pokazuje tylko wyniki - bez pozostałych warstw', () => {
    const layers = initialState().layers
    expect(mapLayerData(data, layers, true)).toEqual({ places: [], institutions: [], barriers: [] })
  })

  it('bez wyników - warstwy jak zwykle (wg chipów)', () => {
    const layers = { ...initialState().layers, institutions: true, barriers: true }
    const visible = mapLayerData(data, layers, false)
    expect(visible.institutions).toHaveLength(1)
    expect(visible.barriers).toHaveLength(1)
  })
})

describe('nearRoute', () => {
  // trasa wzdłuż równoleżnika; 0.001° szerokości to ok. 111 m
  const line = [
    { lat: 50.06, lon: 19.93 },
    { lat: 50.06, lon: 19.95 },
  ]
  const at = (dLat: number) => ({ lat: 50.06 + dLat, lon: 19.94 })
  const input = {
    places: [
      { id: 'blisko', city: 'krakow', category: 'cafe', location: at(0.0005) },
      { id: 'daleko', city: 'krakow', category: 'cafe', location: at(0.002) },
    ] as Place[],
    institutions: [
      { id: 'i-blisko', name: 'U', address: 'x', kind: 'urząd', location: { point: at(-0.0008) } },
      { id: 'i-daleko', name: 'U', address: 'x', kind: 'urząd', location: { point: at(0.003) } },
      { id: 'i-bez-punktu', name: 'U', address: 'x', kind: 'urząd' },
    ] as Institution[],
    barriers: [
      { ...data.barriers[0], id: 'b-daleko', location: at(0.002), geometry: [at(0.002)] },
      // punkt daleko, ale odcinek bariery dochodzi do trasy
      { ...data.barriers[0], id: 'b-odcinek', location: at(0.002), geometry: [at(0.002), at(0)] },
    ] as Barrier[],
  }

  it('zostawia tylko obiekty do 100 m od trasy', () => {
    const near = nearRoute(input, line)
    expect(near.places.map((p) => p.id)).toEqual(['blisko'])
    expect(near.institutions.map((i) => i.id)).toEqual(['i-blisko'])
    expect(near.barriers.map((b) => b.id)).toEqual(['b-odcinek'])
  })

  it('bez trasy niczego nie ukrywa', () => {
    expect(nearRoute(input, [])).toBe(input)
  })
})

describe('przełącznik „Pokaż wszystkie obiekty na mapie”', () => {
  it('domyślnie wyłączony, akcja go przełącza', () => {
    const state = initialState()
    expect(state.showAllObjects).toBe(false)
    expect(appReducer(state, { type: 'setShowAllObjects', on: true }).showAllObjects).toBe(true)
  })
})
