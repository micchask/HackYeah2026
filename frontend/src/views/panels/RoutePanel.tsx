import { useEffect, useState } from 'react'
import { CITY, useApp } from '../../app/context'
import { DEMO_ROUTES } from '../../app/demoRoutes'
import { openReport, setPointAction } from '../../app/mapActions'
import { MAX_WAYPOINTS } from '../../app/state'
import { useActiveRoute } from '../../app/useRoute'
import { useRouteReportWatch } from '../../app/useRouteReportWatch'
import type { RouteResponse } from '../../api/client'
import { demoApi } from '../../api/demo'
import { AlertIcon } from '../../components/icons'
import { RouteAlternatives } from '../../components/RouteAlternatives'
import { RouteDescription } from '../../components/RouteDescription'
import { RouteReportAlert } from '../../components/RouteReportAlert'
import { RoutePoints } from '../../components/RoutePoints'
import { RouteSummary } from '../../components/RouteSummary'
import { selectedVariantLabel } from '../../components/routeVariants'
import { countRestSpotsNearRoute, routeBbox } from './routeRestSpots'

type RestSpotsState =
  | { route: RouteResponse; status: 'ready'; count: number }
  | { route: RouteResponse; status: 'error'; count: 0 }

export function RoutePanel() {
  const [state, dispatch] = useApp()
  const { route, active, segmentPoint } = useActiveRoute()
  const {
    origin,
    destination,
    waypoints,
    pickTarget,
    routeLoading: loading,
    routeError: error,
    variant,
    segment,
    layers,
  } = state
  const newReports = useRouteReportWatch(route, active)
  const hasEmptyWaypoint = waypoints.some((waypoint) => waypoint === null)
  const [restSpots, setRestSpots] = useState<RestSpotsState | null>(null)
  // Opis krok po kroku zwinięty; odcinek wybrany na mapie sam go rozwija
  const [stepsOpen, setStepsOpen] = useState(false)
  const showSteps = stepsOpen || segment !== null
  const selectSegment = (index: number | null) => dispatch({ type: 'setSegment', segment: index })
  const visibleRestSpots =
    active && restSpots?.route === active
      ? restSpots
      : active && routeBbox(active)
        ? ({ status: 'loading', count: 0 } as const)
        : ({ status: 'ready', count: 0 } as const)

  useEffect(() => {
    if (!layers.rest || !active) return

    const bbox = routeBbox(active)
    if (!bbox) return

    const controller = new AbortController()
    demoApi
      .restSpots(bbox, controller.signal, CITY)
      .then((spots) => {
        setRestSpots({
          route: active,
          status: 'ready',
          count: countRestSpotsNearRoute(spots, active),
        })
      })
      .catch((cause: Error) => {
        if (cause.name !== 'AbortError') setRestSpots({ route: active, status: 'error', count: 0 })
      })
    return () => controller.abort()
  }, [active, layers.rest])

  return (
    <>
      <form
        className="card"
        onSubmit={(event) => event.preventDefault()}
        aria-describedby={error ? 'error' : undefined}
      >
        <RoutePoints
          city={CITY}
          origin={origin}
          destination={destination}
          waypoints={waypoints}
          maxWaypoints={MAX_WAYPOINTS}
          presets={DEMO_ROUTES}
          pickTarget={pickTarget}
          onAddWaypoint={() => dispatch({ type: 'addWaypoint' })}
          onRemoveWaypoint={(index) => dispatch({ type: 'removeWaypoint', index })}
          onChange={(target, value) => {
            dispatch(setPointAction(target, value))
            dispatch({ type: 'setPickTarget', target: null })
          }}
          onPick={(target) => dispatch({ type: 'setPickTarget', target })}
          onPreset={(preset) => {
            dispatch({ type: 'clearWaypoints' })
            dispatch({ type: 'setOrigin', point: preset.origin })
            dispatch({ type: 'setDestination', point: preset.destination })
            dispatch({ type: 'setPickTarget', target: null })
          }}
          onSwap={() => dispatch({ type: 'swapPoints' })}
        />
      </form>
      <div className="results" aria-live="polite" aria-busy={loading}>
        {hasEmptyWaypoint && (
          <p className="callout">
            Wyszukaj miejsce albo wskaż przystanek na mapie. Trasa zostanie przeliczona po
            uzupełnieniu wszystkich przystanków.
          </p>
        )}
        {error && (
          <p id="error" role="alert" className="callout callout-error">
            <AlertIcon size={18} />
            <span>{error}</span>
          </p>
        )}
        {loading && !route && (
          <div className="card skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
        {loading && <p className="visually-hidden">Szukam trasy…</p>}
        {route && active && (
          <div className={loading ? 'stale' : undefined}>
            <RouteReportAlert
              reports={newReports.reports}
              onRecalculate={() => dispatch({ type: 'recalculateRoute' })}
              onDismiss={newReports.dismiss}
            />
            <RouteAlternatives
              route={route}
              selected={variant}
              onChange={(index) => dispatch({ type: 'setVariant', variant: index })}
            />
            <RouteSummary
              route={active}
              heading={selectedVariantLabel(route, variant)}
              comparisonRoute={route}
              selectedVariant={variant}
              onSelectSegment={selectSegment}
            />
            <details
              className="disclosure"
              open={showSteps}
              onToggle={(event) => {
                const open = event.currentTarget.open
                if (open === showSteps) return
                setStepsOpen(open)
                if (!open) selectSegment(null)
              }}
            >
              <summary>Opis krok po kroku · {active.segments.length} odc.</summary>
              <RouteDescription route={active} selected={segment} onSelect={selectSegment} />
            </details>
            {layers.rest && (
              <output className="card route-rest-spots" aria-live="polite">
                <strong>Miejsca odpoczynku na trasie:</strong>{' '}
                {visibleRestSpots.status === 'loading'
                  ? 'sprawdzam…'
                  : visibleRestSpots.status === 'error'
                    ? 'nie udało się sprawdzić'
                    : visibleRestSpots.count}
              </output>
            )}
            <button
              type="button"
              className="secondary-button route-report-button"
              onClick={() => openReport(dispatch, segmentPoint)}
            >
              <AlertIcon size={18} /> Zgłoś barierę na tej trasie
            </button>
          </div>
        )}
      </div>
    </>
  )
}
