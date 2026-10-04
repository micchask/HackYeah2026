// Panel „Dla Ciebie” (plan §5.3, #91): szybki start trasy, dostępne w pobliżu, wydarzenia, bariery.
import { useEffect, useState } from 'react'
import { demoApi, isDemoData, type DemoEvent } from '../../api/demo'
import { useApp, useAppData } from '../../app/context'
import { DEMO_ROUTES } from '../../app/demoRoutes'
import { visiblePlaces } from '../../app/layerData'
import { openReport } from '../../app/mapActions'
import { nearbyForMode } from '../../app/nearby'
import { fromPlace, fromSearchResult, type SelectedPlace } from '../../app/selectedPlace'
import { PLACES_LIMIT } from '../../app/useMapData'
import { BarrierList } from '../../components/BarrierList'
import { formatKm } from '../../components/format'
import { InstitutionList } from '../../components/InstitutionList'
import { PlaceAccessIcon } from '../../components/PlaceAccessIcon'
import { ACCESS_LABEL, GROUP_LABEL, placeGroup } from '../../components/placeCategories'
import { PlaceList } from '../../components/PlaceList'
import { SearchResultsList } from '../../components/SearchResultsList'

const NEARBY_LIMIT = 5
const EVENTS_LIMIT = 3
const BARRIERS_COLLAPSED = 5

const STEP_FREE_HINT: Record<string, string> = {
  wheelchair: 'Miejsca z widoku mapy oznaczone jako dostępne lub częściowo dostępne dla wózka.',
  senior: 'Miejsca z widoku mapy oznaczone jako dostępne lub częściowo dostępne bez schodów.',
  stroller: 'Miejsca z widoku mapy oznaczone jako dostępne lub częściowo dostępne dla wózka.',
}

function eventWhen(event: DemoEvent, now = new Date()): string {
  const start = new Date(event.start)
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000)
  const time = start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  const date =
    diff === 0
      ? 'dziś'
      : diff === 1
        ? 'jutro'
        : start.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${date}, ${time}`
}

function useEvents(): DemoEvent[] {
  const [events, setEvents] = useState<DemoEvent[]>([])
  useEffect(() => {
    let active = true
    void demoApi.events().then((all) => {
      if (active) setEvents(all.slice(0, EVENTS_LIMIT))
    })
    return () => {
      active = false
    }
  }, [])
  return events
}

export function ExplorePanel() {
  const [state, dispatch] = useApp()
  const data = useAppData()
  const events = useEvents()

  // Zaznaczenie na mapie (okienko) + karta miejsca w panelu
  const select = (selection: SelectedPlace) => {
    dispatch({ type: 'selectOnMap', selection })
    dispatch({ type: 'openPanel', panel: { kind: 'place', place: selection } })
  }
  const nearby = nearbyForMode(data.places, state.profile, state.mapCenter, NEARBY_LIMIT)
  const shownPlaces = visiblePlaces(data.places, state.layers)
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
      {state.resultSet && (
        <SearchResultsList
          query={state.resultSet.query}
          results={state.resultSet.results}
          selected={selectedResult}
          onSelect={(result) => select(fromSearchResult(result))}
          onClear={() => dispatch({ type: 'clearResults' })}
        />
      )}

      <section className="card explore-section" aria-labelledby="explore-route-heading">
        <h2 id="explore-route-heading">Zaplanuj trasę</h2>
        <button
          type="button"
          className="primary-button"
          onClick={() => dispatch({ type: 'openPanel', panel: { kind: 'route' } })}
        >
          Wyznacz trasę
        </button>
        <fieldset className="presets">
          <legend className="presets-label">Trasy demo – jedno kliknięcie</legend>
          {DEMO_ROUTES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="chip"
              onClick={() => {
                // oba punkty = panel trasy otwiera się sam (withPoints w state.ts)
                dispatch({ type: 'setOrigin', point: preset.origin })
                dispatch({ type: 'setDestination', point: preset.destination })
              }}
            >
              {preset.label}
            </button>
          ))}
        </fieldset>
      </section>

      <section className="card explore-section" aria-labelledby="explore-nearby-heading">
        <h2 id="explore-nearby-heading">Dostępne w pobliżu</h2>
        {state.profile && STEP_FREE_HINT[state.profile] && (
          <p className="meta">
            {STEP_FREE_HINT[state.profile]} Brak danych nie liczy się jako „dostępne”.
          </p>
        )}
        {nearby.length ? (
          <ul className="explore-list">
            {nearby.map(({ place, access, distance }) => (
              <li key={place.id}>
                <button
                  type="button"
                  className="explore-item"
                  onClick={() => select(fromPlace(place, GROUP_LABEL[placeGroup(place)]))}
                >
                  <PlaceAccessIcon access={access} size={22} />
                  <span className="explore-item-text">
                    <span className="explore-item-title">{place.name ?? 'Miejsce bez nazwy'}</span>
                    <span className="meta">
                      {GROUP_LABEL[placeGroup(place)]} · {ACCESS_LABEL[access]}
                      {distance !== null ? ` · ${formatKm(distance)}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="meta">
            W tym widoku nie ma miejsc z potwierdzoną dostępnością. Przesuń albo oddal mapę.
          </p>
        )}
      </section>

      {events.length > 0 && (
        <section className="card explore-section" aria-labelledby="explore-events-heading">
          <h2 id="explore-events-heading">Wydarzenia</h2>
          {events.some(isDemoData) && (
            <p className="meta">
              <span className="badge badge-demo-data">dane przykładowe</span> Kalendarz z
              prawdziwymi danymi to kolejny etap.
            </p>
          )}
          <ul className="explore-list">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="explore-item"
                  onClick={() =>
                    event.venueId && select({ kind: 'institution', id: event.venueId })
                  }
                >
                  <span className="explore-item-text">
                    <span className="explore-item-title">{event.title}</span>
                    <span className="meta">
                      {eventWhen(event)} · {event.venueName}
                    </span>
                    {event.features.length > 0 && (
                      <span className="tags">
                        {event.features.map((f) => (
                          <span key={f} className="tag">
                            {f}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BarrierList
        barriers={data.barriers}
        truncated={data.barriersTruncated}
        loading={data.barriersLoading}
        error={data.barriersError}
        visible={state.layers.barriers}
        onVisibleChange={(on) => dispatch({ type: 'toggleLayer', layer: 'barriers', on })}
        selected={state.selectedBarrier}
        onSelect={(id) => dispatch({ type: 'selectBarrier', id })}
        collapsedLimit={BARRIERS_COLLAPSED}
      />
      <button type="button" className="chip" onClick={() => openReport(dispatch, null)}>
        Zgłoś barierę
      </button>

      {/* Pełne listy - tekstowa alternatywa mapy (WCAG) */}
      <InstitutionList
        institutions={data.institutions}
        selected={selectedInstitution}
        onSelect={(id) => select({ kind: 'institution', id })}
      />
      <PlaceList
        places={shownPlaces}
        hiddenByLayers={data.places.length - shownPlaces.length}
        onShow={(place) => select(fromPlace(place, GROUP_LABEL[placeGroup(place)]))}
        query={state.placesQuery}
        onQueryChange={(query) => dispatch({ type: 'setPlacesQuery', query })}
        limit={PLACES_LIMIT}
      />
    </>
  )
}
