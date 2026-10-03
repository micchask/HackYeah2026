import type { RouteResponse } from '../api/client'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'

const STATUS_LABEL: Record<string, string> = {
  verified: 'dane potwierdzone',
  unverified: 'dane niepotwierdzone',
  conflicting: 'źródła się nie zgadzają',
  outdated: 'dane mogą być nieaktualne',
}

interface Props {
  route: RouteResponse
  selected?: number | null
  onSelect?: (index: number | null) => void
}

/** Tekstowa alternatywa mapy: pełny opis trasy krok po kroku. */
export function RouteDescription({ route, selected = null, onSelect }: Props) {
  const km = (route.distance_m / 1000).toFixed(2)
  const minutes = Math.round(route.duration_s / 60)

  return (
    <section aria-labelledby="route-heading">
      <h2 id="route-heading">Opis trasy</h2>
      <p className="route-summary">
        Długość: {km} km, około {minutes} min.
        {route.rough_surface_m != null && <> Nierówna nawierzchnia: {route.rough_surface_m} m.</>}
        {route.stairs_count != null && (
          <> Schody: {route.stairs_count === 0 ? 'brak' : route.stairs_count}.</>
        )}
      </p>
      <dl className="route-scores" aria-label="Ocena trasy">
        <div>
          <dt>Dostępność trasy</dt>
          <dd>{route.accessibility_score}/100</dd>
        </div>
        <div>
          <dt>Pewność danych</dt>
          <dd>{Math.round(route.confidence * 100)}%</dd>
        </div>
      </dl>
      {route.baseline && !route.is_mock && (
        <p className="comparison">
          Dla porównania najkrótsza zwykła trasa piesza:{' '}
          {(route.baseline.distance_m / 1000).toFixed(2)} km, schody: {route.baseline.stairs_count},
          nierówna nawierzchnia: {route.baseline.rough_surface_m} m.
        </p>
      )}
      {route.warnings?.map((w) => (
        <p key={w} role="note" className="warning">
          {w}
        </p>
      ))}
      <ol className="segments">
        {route.segments.map((s, i) => (
          <li key={i} className={selected === i ? 'segment selected' : 'segment'}>
            <span
              className="segment-swatch"
              style={{ background: DIFFICULTY_COLOR[s.difficulty] }}
              aria-hidden="true"
            />
            <div>
              <p className="instruction">{s.instruction}</p>
              <p className="meta">
                {DIFFICULTY_LABEL[s.difficulty]}
                {s.surface ? `, nawierzchnia: ${s.surface}` : ''}
                {s.data_status ? ` – ${STATUS_LABEL[s.data_status] ?? s.data_status}` : ''}
                {`, dostępność ${s.accessibility_score}/100`}
                {`, pewność danych ${Math.round(s.confidence * 100)}%`}
                {s.sources?.length ? `, źródło: ${s.sources.join(', ')}` : ''}
              </p>
              {s.warnings?.map((w) => (
                <p key={w} className="warning">
                  Uwaga: {w}
                </p>
              ))}
              {onSelect && (
                <button
                  type="button"
                  className="link-button"
                  aria-pressed={selected === i}
                  onClick={() => onSelect(selected === i ? null : i)}
                >
                  {selected === i ? 'Ukryj na mapie' : 'Pokaż na mapie'}
                  <span className="visually-hidden"> odcinek {i + 1}</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
