// Górny pasek (plan §5.2): wyszukiwarka, chipy warstw, chip trybu - rozbuduje #90 (chip trybu: #88).
import { CITY, useApp } from '../app/context'
import { fromSearchResult } from '../app/selectedPlace'
import { MapSearch } from '../components/MapSearch'
import { ProfileChip } from './ProfileChip'

export function TopBar() {
  const [{ mapCenter }, dispatch] = useApp()
  return (
    <>
      <MapSearch
        city={CITY}
        near={mapCenter}
        onSelect={(result) =>
          dispatch({ type: 'selectOnMap', selection: fromSearchResult(result) })
        }
      />
      <ProfileChip />
    </>
  )
}
