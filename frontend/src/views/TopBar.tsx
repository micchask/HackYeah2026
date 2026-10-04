// Górny pasek (plan §5.2, #90): wyszukiwarka, a pod nią chip trybu, wyniki wyszukiwania i chipy warstw.
import { CITY, useApp } from '../app/context'
import { fromSearchResult } from '../app/selectedPlace'
import { MapSearch } from '../components/MapSearch'
import { LayerChips } from './LayerChips'
import { ProfileChip } from './ProfileChip'

export function TopBar() {
  const [{ mapCenter, resultSet }, dispatch] = useApp()
  return (
    <div className="top-bar">
      <MapSearch
        city={CITY}
        near={mapCenter}
        onSelect={(result) => {
          const selection = fromSearchResult(result)
          dispatch({ type: 'selectOnMap', selection })
          dispatch({ type: 'openPanel', panel: { kind: 'place', place: selection } })
        }}
        onShowAll={(results, query) => dispatch({ type: 'showResults', query, results })}
      />
      <div className="top-bar-row">
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
        <LayerChips />
      </div>
    </div>
  )
}
