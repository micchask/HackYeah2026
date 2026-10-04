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
