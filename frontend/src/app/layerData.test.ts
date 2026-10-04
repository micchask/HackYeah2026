import { describe, expect, it } from 'vitest'
import type { Barrier, Institution, Place } from '../api/client'
import { mapLayerData } from './layerData'
import { initialState } from './state'

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
