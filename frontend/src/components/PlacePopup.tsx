import type { SearchResult } from '../api/client'
import { formatKm } from './format'
import { MapPopupCard, type MapPopupActions } from './MapPopupCard'

interface Props extends MapPopupActions {
  result: SearchResult
}

/** Dymek miejsca albo adresu z wyszukiwarki. Dostępność i źródła - w karcie miejsca w panelu. */
export function PlacePopup({ result, ...actions }: Props) {
  const subtitle = [
    result.description,
    result.distance_m != null ? `${formatKm(result.distance_m)} od środka mapy` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <MapPopupCard
      id={result.id}
      kind={result.kind}
      title={result.label}
      subtitle={subtitle || null}
      {...actions}
    />
  )
}
