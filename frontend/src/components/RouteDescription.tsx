import type { RouteResponse } from '../api/client'

const STATUS_LABEL: Record<string, string> = {
  verified: 'dane potwierdzone',
  unverified: 'dane niepotwierdzone',
  conflicting: 'źródła się nie zgadzają',
  outdated: 'dane mogą być nieaktualne',
}

/** Tekstowa alternatywa mapy: pełny opis trasy krok po kroku. */
export function RouteDescription({ route }: { route: RouteResponse }) {
  const km = (route.distance_m / 1000).toFixed(2)
  const minutes = Math.round(route.duration_s / 60)

  return (
    <section aria-labelledby="route-heading">
      <h2 id="route-heading">Opis trasy</h2>
      <p>
        Długość: {km} km, około {minutes} min.
      </p>
      {route.warnings?.map((w) => (
        <p key={w} role="note" className="warning">
          {w}
        </p>
      ))}
      <ol>
        {route.segments.map((s, i) => (
          <li key={i}>
            <p>{s.instruction}</p>
            <p className="meta">
              {Math.round(s.distance_m)} m{s.surface ? `, nawierzchnia: ${s.surface}` : ''}
              {s.data_status ? ` – ${STATUS_LABEL[s.data_status] ?? s.data_status}` : ''}
            </p>
            {s.warnings?.map((w) => (
              <p key={w} className="warning">
                Uwaga: {w}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </section>
  )
}
