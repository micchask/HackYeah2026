// Co pokazuje mapa przy danych chipach warstw (#90) i ile obiektów każdej warstwy jest w widoku.
// Czyste funkcje - te same reguły dla mapy, legendy, chipów i listy miejsc.
import type { Barrier, Institution, Place } from '../api/client'
import { placeLayer } from '../components/placeCategories'
import type { LayerId, Layers } from './state'

export interface LayerInput {
  places: Place[]
  institutions: Institution[]
  barriers: Barrier[]
}

export function visiblePlaces(places: Place[], layers: Layers): Place[] {
  return places.filter((place) => {
    const layer = placeLayer(place)
    return layer !== null && layers[layer]
  })
}

/** Zgłoszenia użytkowników mają własny chip, pozostałe bariery - chip „Bariery”. */
export function visibleBarriers(barriers: Barrier[], layers: Layers): Barrier[] {
  return barriers.filter((b) => (b.type === 'reported' ? layers.reports : layers.barriers))
}

export function visibleLayerData(data: LayerInput, layers: Layers): LayerInput {
  return {
    places: visiblePlaces(data.places, layers),
    institutions: layers.institutions ? data.institutions : [],
    barriers: visibleBarriers(data.barriers, layers),
  }
}

const NO_LAYER_DATA: LayerInput = { places: [], institutions: [], barriers: [] }

/**
 * Co rysuje mapa. Po „Pokaż wszystkie” dla rodzaju („hotele”) - tylko te wyniki (osobne punkty
 * z nazwami), bez pozostałych warstw; „Wyczyść” przywraca warstwy z chipów.
 */
export function mapLayerData(
  data: LayerInput,
  layers: Layers,
  showingResults: boolean,
): LayerInput {
  return showingResults ? NO_LAYER_DATA : visibleLayerData(data, layers)
}

function inBbox(bbox: string | null, lat: number, lon: number): boolean {
  if (!bbox) return true
  const [s, w, n, e] = bbox.split(',').map(Number)
  return lat >= s && lat <= n && lon >= w && lon <= e
}

/** Liczba obiektów każdej warstwy w widoku - niezależnie od tego, czy chip jest włączony. */
export function layerCounts(
  data: LayerInput,
  bbox: string | null,
): Partial<Record<LayerId, number>> {
  const counts: Partial<Record<LayerId, number>> = {}
  const add = (layer: LayerId) => {
    counts[layer] = (counts[layer] ?? 0) + 1
  }
  for (const place of data.places) {
    const layer = placeLayer(place)
    if (layer) add(layer)
  }
  for (const inst of data.institutions) {
    const point = inst.location?.point
    if (point && inBbox(bbox, point.lat, point.lon)) add('institutions')
  }
  for (const barrier of data.barriers) add(barrier.type === 'reported' ? 'reports' : 'barriers')
  return counts
}
