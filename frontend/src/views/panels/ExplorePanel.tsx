// Panel „Dla Ciebie” (plan §5.3): duże „Zaplanuj trasę”, szybkie akcje i po kilka pozycji
// w sekcjach. Pełne listy (tekstowa alternatywa mapy) - przez „Pokaż więcej” (ListPanel).
import type { ComponentType, SVGProps } from 'react'
import type { Barrier } from '../../api/client'
import { isDemoData } from '../../api/demo'
import { useApp, useAppData } from '../../app/context'
import { DEMO_ROUTES } from '../../app/demoRoutes'
import { MODE_META } from '../../app/modeMeta'
import { distanceM, nearbyForMode } from '../../app/nearby'
import { fromPlace, fromSearchResult, type SelectedPlace } from '../../app/selectedPlace'
import type { LayerId, ListKind } from '../../app/state'
import { eventWhen, useEvents } from '../../app/useEvents'
import { BarrierIcon } from '../../components/BarrierIcon'
import { BARRIER_LABEL } from '../../components/barrierStyle'
import { EmptyState, LoadingSkeleton, SoonTag } from '../../components/EmptyState'
import { formatKm } from '../../components/format'
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  RouteIcon,
  StairsIcon,
  ToiletIcon,
} from '../../components/icons'
import { PlaceAccessIcon } from '../../components/PlaceAccessIcon'
import { ACCESS_LABEL, placeKindLabel } from '../../components/placeCategories'
import { SearchResultsList } from '../../components/SearchResultsList'
import { SidebarSection } from '../SidebarSection'

const NEARBY_LIMIT = 4
const OBSTACLES_LIMIT = 3
const EVENTS_LIMIT = 2

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const QUICK_ACTIONS: { list: ListKind; layer?: LayerId; label: string; Icon: IconComponent }[] = [
  { list: 'health', layer: 'health', label: 'Toalety', Icon: ToiletIcon },
  { list: 'barriers', layer: 'barriers', label: 'Bariery', Icon: StairsIcon },
  { list: 'institutions', layer: 'institutions', label: 'Urzędy', Icon: BuildingIcon },
  { list: 'events', label: 'Wydarzenia', Icon: CalendarIcon },
]

/** Utrudnienia najbliżej środka mapy; zgłoszenia mieszkańców mają pierwszeństwo. */
function nearestObstacles(barriers: Barrier[], center: { lat: number; lon: number } | null) {
  return barriers
    .map((barrier) => ({
      barrier,
      distance: center ? distanceM(center, barrier.location) : null,
    }))
    .sort(
      (a, b) =>
        Number(b.barrier.type === 'reported') - Number(a.barrier.type === 'reported') ||
        (a.distance ?? 0) - (b.distance ?? 0),
    )
    .slice(0, OBSTACLES_LIMIT)
}

export function ExplorePanel() {
  const [state, dispatch] = useApp()
  const data = useAppData()
  const { events, loading: eventsLoading } = useEvents()
  const meta = state.profile ? MODE_META[state.profile] : null

  const select = (selection: SelectedPlace) => {
    dispatch({ type: 'selectOnMap', selection })
    dispatch({ type: 'openPanel', panel: { kind: 'place', place: selection } })
  }
  const openList = (list: ListKind, layer?: LayerId) => {
    if (layer) dispatch({ type: 'toggleLayer', layer, on: true })
    dispatch({ type: 'openPanel', panel: { kind: 'list', list } })
  }
  const nearby = nearbyForMode(data.places, state.profile, state.mapCenter, NEARBY_LIMIT)
  const obstacles = nearestObstacles(data.barriers, state.mapCenter)
  const selectedResult =
    state.mapSelection?.kind === 'institution'
      ? `institution:${state.mapSelection.id}`
      : state.mapSelection?.kind === 'search'
        ? state.mapSelection.result.id
        : null

  return (
    <div className="explore">
      {state.resultSet && (
        <SearchResultsList
          query={state.resultSet.query}
          results={state.resultSet.results}
          selected={selectedResult}
          onSelect={(result) => select(fromSearchResult(result))}
          onClear={() => dispatch({ type: 'clearResults' })}
        />
      )}

      <button
        type="button"
        className="plan-route"
        onClick={() => dispatch({ type: 'openPanel', panel: { kind: 'route' } })}
      >
        <span className="plan-route-icon">
          <RouteIcon size={22} />
        </span>
        <span className="plan-route-text">
          <span className="plan-route-title">Zaplanuj trasę</span>
          {meta && <span className="plan-route-sub">Dopasowaną do profilu: {meta.short}</span>}
        </span>
        <ArrowRightIcon size={20} />
      </button>

      <fieldset className="demo-routes">
        <legend>Szybki start</legend>
        <div className="demo-routes-chips">
          {DEMO_ROUTES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="chip chip-small"
              onClick={() => {
                // oba punkty = panel trasy otwiera się sam (withPoints w state.ts)
                dispatch({ type: 'setOrigin', point: preset.origin })
                dispatch({ type: 'setDestination', point: preset.destination })
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </fieldset>

      <ul className="quick-actions" aria-label="Szybkie akcje">
        {QUICK_ACTIONS.map(({ list, layer, label, Icon }) => (
          <li key={list}>
            <button type="button" className="quick-action" onClick={() => openList(list, layer)}>
              <span className="quick-action-icon">
                <Icon size={22} />
              </span>
              {label}
            </button>
          </li>
        ))}
      </ul>

      <SidebarSection title="Polecane w pobliżu" onMore={() => openList('places', 'places')}>
        {nearby.length ? (
          <ul className="item-list">
            {nearby.map(({ place, access, distance }) => (
              <li key={place.id}>
                <button
                  type="button"
                  className="item"
                  onClick={() => select(fromPlace(place, placeKindLabel(place)))}
                >
                  <PlaceAccessIcon access={access} size={28} />
                  <span className="item-text">
                    <span className="item-title">{place.name ?? 'Miejsce bez nazwy'}</span>
                    <span className="item-meta">
                      {placeKindLabel(place)} · {ACCESS_LABEL[access]}
                    </span>
                  </span>
                  {distance !== null && <span className="item-end">{formatKm(distance)}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : data.placesError ? (
          <EmptyState tone="error" title="Nie udało się wczytać miejsc" />
        ) : (
          <EmptyState title="Brak potwierdzonych miejsc w widoku">
            Przesuń albo oddal mapę.
          </EmptyState>
        )}
      </SidebarSection>

      <SidebarSection
        title="Aktualne utrudnienia"
        onMore={
          data.barriers.length > OBSTACLES_LIMIT
            ? () => openList('barriers', 'barriers')
            : undefined
        }
      >
        {data.barriersLoading && !data.barriers.length ? (
          <LoadingSkeleton rows={2} />
        ) : obstacles.length ? (
          <ul className="item-list">
            {obstacles.map(({ barrier, distance }) => (
              <li key={barrier.id}>
                <button
                  type="button"
                  className="item"
                  aria-pressed={state.selectedBarrier === barrier.id}
                  onClick={() => {
                    const layer = barrier.type === 'reported' ? 'reports' : 'barriers'
                    dispatch({ type: 'toggleLayer', layer, on: true })
                    dispatch({ type: 'selectBarrier', id: barrier.id })
                    dispatch({ type: 'focusMap', point: barrier.location })
                  }}
                >
                  <BarrierIcon type={barrier.type} size={28} />
                  <span className="item-text">
                    <span className="item-title">{BARRIER_LABEL[barrier.type]}</span>
                    <span className="item-meta">{barrier.street ?? 'ulica bez nazwy'}</span>
                  </span>
                  {distance !== null && <span className="item-end">{formatKm(distance)}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Brak znanych utrudnień w widoku" />
        )}
      </SidebarSection>

      <SidebarSection
        title="Wydarzenia"
        tag={events.some(isDemoData) ? <SoonTag>demo</SoonTag> : undefined}
        onMore={events.length > EVENTS_LIMIT ? () => openList('events') : undefined}
      >
        {eventsLoading ? (
          <LoadingSkeleton rows={2} />
        ) : events.length ? (
          <ul className="item-list">
            {events.slice(0, EVENTS_LIMIT).map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="item"
                  onClick={() =>
                    event.venueId && select({ kind: 'institution', id: event.venueId })
                  }
                >
                  <span className="item-icon">
                    <CalendarIcon size={18} />
                  </span>
                  <span className="item-text">
                    <span className="item-title">{event.title}</span>
                    <span className="item-meta">{eventWhen(event)}</span>
                  </span>
                  {event.features[0] && <span className="tag">{event.features[0]}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Brak wydarzeń w najbliższych dniach" />
        )}
      </SidebarSection>

      <nav className="browse-links" aria-label="Pełne listy">
        <h3 className="browse-title">Przeglądaj listy</h3>
        <ul>
          {(
            [
              ['places', 'Wszystkie miejsca'],
              ['gaps', 'Braki danych o dostępności'],
            ] as const
          ).map(([list, label]) => (
            <li key={list}>
              <button type="button" className="browse-link" onClick={() => openList(list)}>
                {label}
                <ChevronRightIcon size={16} />
              </button>
            </li>
          ))}
          <li>
            <a href="#/miasto" className="browse-link">
              Dashboard miasta
              <ChevronRightIcon size={16} />
            </a>
          </li>
        </ul>
      </nav>
    </div>
  )
}
