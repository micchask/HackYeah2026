// Górny pasek (plan §5.2): wyszukiwarka, chipy warstw, chip trybu - rozbuduje #90 (i #88 chip).
import { CITY, useApp } from '../app/context'
import { fromSearchResult } from '../app/selectedPlace'
import { MapSearch } from '../components/MapSearch'

export function TopBar() {
  const [{ mapCenter }, dispatch] = useApp()
  return (
    <MapSearch
      city={CITY}
      near={mapCenter}
      onSelect={(result) => dispatch({ type: 'selectOnMap', selection: fromSearchResult(result) })}
    />
  )
}
