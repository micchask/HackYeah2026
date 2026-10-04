// Panel trasy (plan §5.4) - docelowo #92. Na razie: dotychczasowe wyniki trasy pod formularzem.
import { useApp } from '../../app/context'
import { openReport } from '../../app/mapActions'
import { useActiveRoute } from '../../app/useRoute'
import { AlertIcon } from '../../components/icons'
import { RouteAlternatives } from '../../components/RouteAlternatives'
import { RouteDescription } from '../../components/RouteDescription'
import { RouteSummary } from '../../components/RouteSummary'
import { selectedVariantLabel } from '../../components/routeVariants'
import { RouteForm } from './RouteForm'

export function RoutePanel() {
  const [state, dispatch] = useApp()
  const { route, active, segmentPoint } = useActiveRoute()
  const { routeLoading: loading, routeError: error, variant, segment } = state
  const selectSegment = (index: number | null) => dispatch({ type: 'setSegment', segment: index })
  return (
    <>
      <RouteForm />
      <div className="results" aria-live="polite" aria-busy={loading}>
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
            <RouteDescription route={active} selected={segment} onSelect={selectSegment} />
            <button
              type="button"
              className="chip"
              onClick={() => openReport(dispatch, segmentPoint)}
            >
              Zgłoś barierę na tej trasie
            </button>
          </div>
        )}
      </div>
    </>
  )
}
