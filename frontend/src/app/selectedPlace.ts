// Co jest zaznaczone na mapie / pokazane w karcie miejsca (plan §5.5).
// Instytucję trzymamy po id, bo pełny obiekt przychodzi z /api/institutions (useAppData).
import type { Place, SearchResult } from '../api/client'

export type SelectedPlace =
  | { kind: 'institution'; id: string }
  | { kind: 'search'; result: SearchResult }
  | { kind: 'place'; place: Place }

export function fromSearchResult(result: SearchResult): SelectedPlace {
  return result.source === 'institution' && result.institution_id
    ? { kind: 'institution', id: result.institution_id }
    : { kind: 'search', result }
}

/** Miejsce kliknięte na mapie - jako wynik wyszukiwania, żeby pokazać to samo okienko (PlacePopup). */
export function fromPlace(place: Place, kind?: string): SelectedPlace {
  return {
    kind: 'search',
    result: {
      id: place.id,
      source: 'place',
      match: 'name',
      label: place.name ?? 'Miejsce bez nazwy',
      kind: kind ?? null,
      point: place.location,
      place,
    },
  }
}
