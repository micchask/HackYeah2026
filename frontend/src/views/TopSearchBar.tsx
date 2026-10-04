// Pływający pasek nad mapą: przełącznik panelu, wyszukiwarka i profil; pod nim szybkie kategorie.
import { CITY, useApp } from '../app/context'
import { fromSearchResult } from '../app/selectedPlace'
import { CloseIcon, PanelIcon } from '../components/icons'
import { MapSearch } from '../components/MapSearch'
import { ProfileSwitcher } from './ProfileSwitcher'
import { QuickCategoryChips } from './QuickCategoryChips'
import { SIDEBAR_BODY_ID } from './Sidebar'

export function TopSearchBar() {
  const [{ mapCenter, resultSet, sidebarOpen, navigation }, dispatch] = useApp()
  if (navigation) return null
  return (
    <div className="top-search">
      <div className="search-pill">
        <button
          type="button"
          className="icon-button icon-button-ghost search-pill-panel"
          aria-expanded={sidebarOpen}
          aria-controls={SIDEBAR_BODY_ID}
          aria-label={sidebarOpen ? 'Zwiń panel' : 'Rozwiń panel'}
          onClick={() => dispatch({ type: 'toggleSidebar' })}
        >
          <PanelIcon />
        </button>
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
        <ProfileSwitcher />
      </div>
      <div className="top-search-row">
        {resultSet && (
          <div className="result-set-chip">
            <span>
              „{resultSet.query}” · {resultSet.results.length}
            </span>
            <button
              type="button"
              className="result-set-clear"
              onClick={() => dispatch({ type: 'clearResults' })}
              aria-label={`Wyczyść wyniki „${resultSet.query}” z mapy`}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        )}
        <QuickCategoryChips />
      </div>
    </div>
  )
}
