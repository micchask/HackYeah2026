// Pełne listy z „Pokaż więcej” - tekstowa alternatywa mapy (WCAG), po jednej naraz.
import { isDemoData } from '../../api/demo'
import { useApp, useAppData } from '../../app/context'
import { visiblePlaces } from '../../app/layerData'
import { fromPlace, type SelectedPlace } from '../../app/selectedPlace'
import type { ListKind } from '../../app/state'
import { eventWhen, useEvents } from '../../app/useEvents'
import { PLACES_LIMIT } from '../../app/useMapData'
import { BarrierList } from '../../components/BarrierList'
import { DataGapsSection } from '../../components/DataGapsSection'
import { EmptyState, LoadingSkeleton, SoonTag } from '../../components/EmptyState'
import { CalendarIcon } from '../../components/icons'
import { InstitutionList } from '../../components/InstitutionList'
import { placeKindLabel, placeLayer } from '../../components/placeCategories'
import { PlaceList } from '../../components/PlaceList'

export function ListPanel({ list }: { list: ListKind }) {
  const [state, dispatch] = useApp()
  const data = useAppData()

  const select = (selection: SelectedPlace) => {
    dispatch({ type: 'selectOnMap', selection })
    dispatch({ type: 'openPanel', panel: { kind: 'place', place: selection } })
  }

  if (list === 'places' || list === 'health') {
    const shown =
      list === 'health'
        ? data.places.filter((place) => placeLayer(place) === 'health')
        : visiblePlaces(data.places, state.layers)
    return (
      <div className="list-panel">
        <PlaceList
          places={shown}
          hiddenByLayers={list === 'places' ? data.places.length - shown.length : 0}
          onShow={(place) => select(fromPlace(place, placeKindLabel(place)))}
          query={state.placesQuery}
          onQueryChange={(query) => dispatch({ type: 'setPlacesQuery', query })}
          limit={PLACES_LIMIT}
          center={state.mapCenter}
        />
      </div>
    )
  }

  if (list === 'barriers') {
    return (
      <div className="list-panel">
        <BarrierList
          barriers={data.barriers}
          truncated={data.barriersTruncated}
          loading={data.barriersLoading}
          error={data.barriersError}
          visible={state.layers.barriers}
          onVisibleChange={(on) => dispatch({ type: 'toggleLayer', layer: 'barriers', on })}
          selected={state.selectedBarrier}
          onSelect={(id) => dispatch({ type: 'selectBarrier', id })}
          onReportVoted={() => data.refreshBarriers()}
        />
      </div>
    )
  }

  if (list === 'institutions') {
    return (
      <div className="list-panel">
        {data.institutions.length ? (
          <InstitutionList
            institutions={data.institutions}
            selected={state.mapSelection?.kind === 'institution' ? state.mapSelection.id : null}
            onSelect={(id) => select({ kind: 'institution', id })}
          />
        ) : (
          <LoadingSkeleton rows={4} />
        )}
      </div>
    )
  }

  if (list === 'gaps') {
    return (
      <div className="list-panel">
        <DataGapsSection
          summary={data.dataGapsSummary}
          error={data.dataGapsError}
          visible={state.layers.gaps}
          onVisibleChange={(on) => dispatch({ type: 'toggleLayer', layer: 'gaps', on })}
          onShow={(point) => dispatch({ type: 'focusMap', point })}
        />
      </div>
    )
  }

  return <EventsList onSelect={(id) => select({ kind: 'institution', id })} />
}

function EventsList({ onSelect }: { onSelect: (venueId: string) => void }) {
  const { events, loading } = useEvents()
  if (loading) return <LoadingSkeleton rows={3} />
  if (!events.length) return <EmptyState title="Brak wydarzeń w najbliższych dniach" />
  return (
    <div className="list-panel">
      {events.some(isDemoData) && (
        <p className="list-note">
          <SoonTag>demo</SoonTag> Kalendarz miasta podłączymy w kolejnym etapie.
        </p>
      )}
      <ul className="item-list">
        {events.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              className="item"
              onClick={() => event.venueId && onSelect(event.venueId)}
            >
              <span className="item-icon">
                <CalendarIcon size={18} />
              </span>
              <span className="item-text">
                <span className="item-title">{event.title}</span>
                <span className="item-meta">
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
    </div>
  )
}
