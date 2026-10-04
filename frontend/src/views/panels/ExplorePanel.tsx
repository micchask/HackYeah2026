// Panel „Dla Ciebie” (plan §5.3) - docelowo #91. Na razie: dotychczasowa treść panelu bez wyników trasy.
import { useApp, useAppData } from '../../app/context'
import { openReport } from '../../app/mapActions'
import { PLACES_LIMIT } from '../../app/useMapData'
import { BarrierList } from '../../components/BarrierList'
import { InstitutionList } from '../../components/InstitutionList'
import { PlaceList } from '../../components/PlaceList'
import { RouteForm } from './RouteForm'

export function ExplorePanel() {
  const [state, dispatch] = useApp()
  const data = useAppData()
  const selectedInstitution =
    state.mapSelection?.kind === 'institution' ? state.mapSelection.id : null
  return (
    <>
      <RouteForm />
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
