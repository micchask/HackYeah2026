// Panel „Dla Ciebie” (plan §5.3) - docelowo #91. Na razie: dotychczasowa treść panelu bez wyników trasy.
import { useApp, useAppData } from '../../app/context'
import { openReport } from '../../app/mapActions'
import { fromSearchResult } from '../../app/selectedPlace'
import { PLACES_LIMIT } from '../../app/useMapData'
import { BarrierList } from '../../components/BarrierList'
import { DataGapsSection } from '../../components/DataGapsSection'
import { InstitutionList } from '../../components/InstitutionList'
import { PlaceList } from '../../components/PlaceList'
import { SearchResultsList } from '../../components/SearchResultsList'
import { RouteForm } from './RouteForm'

export function ExplorePanel() {
  const [state, dispatch] = useApp()
  const data = useAppData()
  const selectedInstitution =
    state.mapSelection?.kind === 'institution' ? state.mapSelection.id : null
  const selectedResult =
    state.mapSelection?.kind === 'institution'
      ? `institution:${state.mapSelection.id}`
      : state.mapSelection?.kind === 'search'
        ? state.mapSelection.result.id
        : null
  return (
    <>
      <RouteForm />
      {state.resultSet && (
        <SearchResultsList
          query={state.resultSet.query}
          results={state.resultSet.results}
          selected={selectedResult}
          onSelect={(result) =>
            dispatch({ type: 'selectOnMap', selection: fromSearchResult(result) })
          }
          onClear={() => dispatch({ type: 'clearResults' })}
        />
      )}
      <section className="card empty" aria-labelledby="start-heading">
        <h2 id="start-heading">Jak to działa?</h2>
        <ol>
          <li>Wpisz adres startu i celu, wybierz trasę demo albo wskaż punkty na mapie.</li>
          <li>Zaznacz, jak się poruszasz – trasa przeliczy się od razu.</li>
          <li>Sprawdź opis krok po kroku: bruk, schody, źródła danych.</li>
        </ol>
      </section>
      <button type="button" className="chip" onClick={() => openReport(dispatch, null)}>
        Zgłoś barierę
      </button>
      <BarrierList
        barriers={data.barriers}
        truncated={data.barriersTruncated}
        loading={data.barriersLoading}
        error={data.barriersError}
        visible={state.layers.barriers}
        onVisibleChange={(on) => dispatch({ type: 'toggleLayer', layer: 'barriers', on })}
        selected={state.selectedBarrier}
        onSelect={(id) => dispatch({ type: 'selectBarrier', id })}
      />
      <DataGapsSection
        summary={data.dataGapsSummary}
        error={data.dataGapsError}
        visible={state.layers.gaps}
        onVisibleChange={(on) => dispatch({ type: 'toggleLayer', layer: 'gaps', on })}
        onShow={(point) => dispatch({ type: 'focusMap', point })}
      />
      <InstitutionList
        institutions={data.institutions}
        selected={selectedInstitution}
        onSelect={(id) => dispatch({ type: 'selectOnMap', selection: { kind: 'institution', id } })}
      />
      <PlaceList
        places={data.places}
        query={state.placesQuery}
        onQueryChange={(query) => dispatch({ type: 'setPlacesQuery', query })}
        limit={PLACES_LIMIT}
      />
    </>
  )
}
