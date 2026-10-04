// Górny pasek (plan §5.2): wyszukiwarka, chipy warstw, chip trybu - rozbuduje #90 (chip trybu: #88).
import { CITY, useApp } from '../app/context'
import { fromSearchResult } from '../app/selectedPlace'
import { MapSearch } from '../components/MapSearch'
import { ProfileChip } from './ProfileChip'

export function TopBar() {
  const [{ mapCenter, resultSet }, dispatch] = useApp()
  return (
    <>
      <MapSearch
        city={CITY}
        near={mapCenter}
        onSelect={(result) =>
          dispatch({ type: 'selectOnMap', selection: fromSearchResult(result) })
        }
        onShowAll={(results, query) => dispatch({ type: 'showResults', query, results })}
      />
      <ProfileChip />
      {resultSet && (
        <div className="result-set-chip">
          <span>
            „{resultSet.query}”: {resultSet.results.length} na mapie
          </span>
          <button
            type="button"
            className="banner-button"
            onClick={() => dispatch({ type: 'clearResults' })}
            aria-label={`Wyczyść wyniki „${resultSet.query}” z mapy`}
          >
            Wyczyść
          </button>
        </div>
      )}
    </>
  )
}
