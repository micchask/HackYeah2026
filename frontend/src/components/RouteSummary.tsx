import type { RouteResponse } from '../api/client'
import { formatKm } from './format'
import { AlertIcon, CheckIcon, ClockIcon, CobbleIcon, RouteIcon, StairsIcon } from './icons'

/** Najważniejsze liczby trasy i porównanie z najkrótszą zwykłą trasą pieszą. */
export function RouteSummary({
  route,
  heading = 'Twoja trasa',
}: {
  route: RouteResponse
  heading?: string
}) {
  const minutes = Math.max(1, Math.round(route.duration_s / 60))
  const baseline = route.baseline && !route.is_mock ? route.baseline : null
  const baselineDescription = baseline
    ? `Zwykła trasa (szara linia na mapie): ${formatKm(baseline.distance_m)}, schody: ${baseline.stairs_count}, nierówna nawierzchnia: ${baseline.rough_surface_m} m.`
    : null
  const stairs = route.stairs_count ?? null
  const rough = route.rough_surface_m ?? null

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

      <div className="comparison">
        <h3>Dlaczego ta trasa?</h3>
        <p>{route.explanation}</p>
        {baseline && (
          <p className="meta">
            <span className="legend-swatch legend-swatch-dashed" aria-hidden="true" />{' '}
            {baselineDescription}
          </p>
        )}
      </div>

      {route.warnings?.map((w) => (
        <p key={w} role="note" className="callout callout-warning">
          <AlertIcon size={18} />
          <span>{w}</span>
        </p>
      ))}
    </section>
  )
}
