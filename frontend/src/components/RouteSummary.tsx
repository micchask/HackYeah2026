import type { BarrierType, RouteResponse } from '../api/client'
import { BarrierIcon } from './BarrierIcon'
import { BARRIER_COUNT_LABEL, BARRIER_TYPES } from './barrierStyle'
import { formatKm, plural } from './format'
import { AlertIcon, CheckIcon, ClockIcon, CobbleIcon, RouteIcon, StairsIcon } from './icons'
import { buildRouteVariants } from './routeVariants'

function routeMinutes(route: RouteResponse): number {
  return Math.max(1, Math.round(route.duration_s / 60))
}

/** Wyjaśnienie aktywnego wyboru i tekstowa alternatywa dla porównania na mapie. */
function Comparison({
  route,
  comparisonRoute,
  selectedVariant,
  showRough,
}: {
  route: RouteResponse
  comparisonRoute?: RouteResponse
  selectedVariant: number
  showRough: boolean
}) {
  const variants = comparisonRoute ? buildRouteVariants(comparisonRoute) : []
  const baseline = route.baseline && !route.is_mock ? route.baseline : null
  const baselineDescription = baseline
    ? `Zwykła trasa (szara linia na mapie): ${formatKm(baseline.distance_m)}, schody: ${baseline.stairs_count}` +
      (showRough ? `, nierówna nawierzchnia: ${baseline.rough_surface_m} m.` : '.')
    : null

  return (
    <div className="comparison">
      <h3>Dlaczego ta trasa?</h3>
      <p>{route.explanation}</p>

      {variants.length > 1 && (
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <caption>Porównanie dostępnych tras</caption>
            <thead>
              <tr>
                <th scope="col">Cecha</th>
                {variants.map((variant) => (
                  <th scope="col" key={variant.index}>
                    {variant.label}
                    {variant.index === selectedVariant && (
                      <span className="selected-route-label">wybrana</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Długość</th>
                {variants.map((variant) => (
                  <td key={variant.index}>{formatKm(variant.route.distance_m)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Czas</th>
                {variants.map((variant) => (
                  <td key={variant.index}>ok. {routeMinutes(variant.route)} min</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Schody</th>
                {variants.map((variant) => (
                  <td key={variant.index}>{variant.route.stairs_count || 'brak'}</td>
                ))}
              </tr>
              {showRough && (
                <tr>
                  <th scope="row">Bruk / nierówna nawierzchnia</th>
                  {variants.map((variant) => (
                    <td key={variant.index}>{Math.round(variant.route.rough_surface_m ?? 0)} m</td>
                  ))}
                </tr>
              )}
              <tr>
                <th scope="row">Dostępność</th>
                {variants.map((variant) => (
                  <td key={variant.index}>{variant.route.accessibility_score}/100</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Pewność danych</th>
                {variants.map((variant) => (
                  <td key={variant.index}>{Math.round(variant.route.confidence * 100)}%</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Wyjaśnienie</th>
                {variants.map((variant) => (
                  <td key={variant.index}>{variant.route.explanation}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {baseline && (
        <p className="meta">
          <span className="legend-swatch legend-swatch-dashed" aria-hidden="true" />{' '}
          {baselineDescription}
        </p>
      )}
    </div>
  )
}

interface Props {
  route: RouteResponse
  heading?: string
  /** Pełna odpowiedź API z wariantami - do porównania tras (U7) */
  comparisonRoute?: RouteResponse
  selectedVariant?: number
  /** Otwiera odcinek w opisie trasy (panel szczegółów) */
  onSelectSegment?: (index: number) => void
  /** false = tryb nie oznacza bruku (turysta, gość) - bez statystyk o bruku */
  showRough?: boolean
}

/** Najważniejsze liczby trasy i porównanie z najkrótszą zwykłą trasą pieszą. */
export function RouteSummary({
  route,
  heading = 'Twoja trasa',
  comparisonRoute,
  selectedVariant = 0,
  onSelectSegment,
  showRough = true,
}: Props) {
  const minutes = routeMinutes(route)
  const stairs = route.stairs_count ?? null
  // tryb bez oznaczania bruku (turysta, gość) - bez statystyki „0 m”, która wprowadzałaby w błąd
  const rough = showRough ? (route.rough_surface_m ?? null) : null

  return (
    <section className="card summary" aria-labelledby="summary-heading">
      <div className="summary-head">
        <h2 id="summary-heading">{heading}</h2>
        {route.is_mock && <span className="badge badge-warning">trasa przykładowa</span>}
      </div>

      <dl className="stats">
        <div className="stat">
          <dt>
            <RouteIcon size={18} /> Długość
          </dt>
          <dd>{formatKm(route.distance_m)}</dd>
        </div>
        <div className="stat">
          <dt>
            <ClockIcon size={18} /> Czas
          </dt>
          <dd>ok. {minutes} min</dd>
        </div>
        <div className="stat">
          <dt>
            <CheckIcon size={18} /> Dostępność trasy
          </dt>
          <dd>{route.accessibility_score}/100</dd>
        </div>
        <div className="stat">
          <dt>
            <AlertIcon size={18} /> Pewność danych
          </dt>
          <dd>{Math.round(route.confidence * 100)}%</dd>
        </div>
        {rough !== null && (
          <div className="stat">
            <dt>
              <CobbleIcon size={18} /> Nierówna nawierzchnia
            </dt>
            <dd>{rough} m</dd>
          </div>
        )}
        {stairs !== null && (
          <div className="stat">
            <dt>
              <StairsIcon size={18} /> Schody
            </dt>
            <dd>{stairs === 0 ? 'brak' : stairs}</dd>
          </div>
        )}
      </dl>

      <RouteBarriers route={route} onSelectSegment={onSelectSegment} />

      <details className="disclosure">
        <summary>Porównanie i szczegóły</summary>
        <Comparison
          route={route}
          comparisonRoute={comparisonRoute}
          selectedVariant={selectedVariant}
          showRough={showRough}
        />
      </details>

      {route.warnings?.map((w) => (
        <p key={w} role="note" className="callout callout-warning">
          <AlertIcon size={18} />
          <span>{w}</span>
        </p>
      ))}
    </section>
  )
}

/** „Na tej trasie: 2 odcinki bruku, 1 wysoki krawężnik” + odnośniki do odcinków. */
function RouteBarriers({ route, onSelectSegment }: Props) {
  const withBarriers = route.segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment.barriers?.length)
  if (!withBarriers.length) {
    return (
      <p className="route-barriers-none">
        <CheckIcon size={18} /> Na tej trasie nie ma znanych barier.
      </p>
    )
  }

  const counts = new Map<BarrierType, number>()
  for (const { segment } of withBarriers)
    for (const type of new Set(segment.barriers?.map((b) => b.type)))
      counts.set(type, (counts.get(type) ?? 0) + 1)
  const summary = BARRIER_TYPES.filter((t) => counts.has(t))
    .map((t) => {
      const n = counts.get(t) ?? 0
      return `${n} ${plural(n, ...BARRIER_COUNT_LABEL[t])}`
    })
    .join(', ')

  return (
    <div className="route-barriers">
      <h3>Na tej trasie: {summary}</h3>
      <ul>
        {withBarriers.map(({ segment, index }) => (
          <li key={index}>
            <BarrierIcon type={segment.barriers![0].type} size={20} />
            <span className="route-barrier-text">
              <strong>{segment.street ?? `Odcinek ${index + 1}`}</strong>:{' '}
              {segment.barriers!.map((b) => b.description.toLowerCase()).join(', ')}
            </span>
            {onSelectSegment && (
              <button type="button" className="link-button" onClick={() => onSelectSegment(index)}>
                Szczegóły <span className="visually-hidden">odcinka {index + 1}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
