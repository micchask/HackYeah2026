import type { Place } from '../api/client'
import { ATTRIBUTE_LABEL, VALUE_LABEL } from './attributes'

const SOURCE_LABEL: Record<string, string> = {
  osm: 'OpenStreetMap',
  krakow_open_data: 'otwarte dane Krakowa',
  msip: 'MSIP Kraków',
  user_reports: 'zgłoszenia użytkowników',
}

const STATUS_LABEL: Record<string, string> = {
  verified: 'potwierdzone',
  unverified: 'niepotwierdzone',
  conflicting: 'źródła się nie zgadzają',
  outdated: 'może być nieaktualne',
}

export function PlaceList({ places }: { places: Place[] }) {
  return (
    <section className="card" aria-labelledby="places-heading">
      <h2 id="places-heading">Miejsca i źródła danych</h2>
      <p className="meta">
        Każda informacja ma źródło, pewność i status. Gdy źródła się nie zgadzają, mówimy to wprost.
      </p>
      <ul className="places">
        {places.map((p) => (
          <li key={p.id} className="place">
            <h3 className="place-name">{p.name ?? 'Bez nazwy'}</h3>
            <ul className="attributes">
              {p.attributes?.map((a) => (
                <li key={a.key} className="attribute">
                  <span className="attribute-main">
                    {ATTRIBUTE_LABEL[a.key] ?? a.key}:{' '}
                    <strong>{VALUE_LABEL[String(a.value)] ?? String(a.value)}</strong>
                  </span>
                  <span className="attribute-meta">
                    {a.status && (
                      <span className={`badge badge-${a.status}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    )}
                    <span className="meta">
                      {SOURCE_LABEL[a.provenance.source] ?? a.provenance.source} · pewność{' '}
                      {Math.round(a.confidence * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
