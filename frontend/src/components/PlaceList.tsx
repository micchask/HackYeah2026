import type { Place } from '../api/client'

const ATTRIBUTE_LABEL: Record<string, string> = {
  wheelchair: 'dostępność dla wózka',
  step_free_entrance: 'wejście bez schodów',
  stairs: 'schody',
  step_count: 'liczba stopni',
  ramp: 'rampa',
  elevator: 'winda',
  accessible_toilet: 'toaleta dostępna',
  surface: 'nawierzchnia',
  incline_percent: 'nachylenie [%]',
  kerb_height_cm: 'krawężnik [cm]',
  width_cm: 'szerokość [cm]',
  tactile_paving: 'ścieżka dotykowa',
}

const VALUE_LABEL: Record<string, string> = {
  true: 'tak',
  false: 'nie',
  yes: 'tak',
  no: 'nie',
  limited: 'częściowo',
}

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
    <section aria-labelledby="places-heading">
      <h2 id="places-heading">Miejsca w okolicy</h2>
      <ul className="places">
        {places.map((p) => (
          <li key={p.id}>
            <strong>{p.name ?? 'Bez nazwy'}</strong>
            <ul>
              {p.attributes?.map((a) => (
                <li key={a.key} className={a.status === 'conflicting' ? 'conflict' : undefined}>
                  {ATTRIBUTE_LABEL[a.key] ?? a.key}:{' '}
                  {VALUE_LABEL[String(a.value)] ?? String(a.value)}
                  <span className="meta">
                    {' '}
                    (źródło: {SOURCE_LABEL[a.provenance.source] ?? a.provenance.source}, pewność{' '}
                    {Math.round(a.confidence * 100)}%
                    {a.status ? `, ${STATUS_LABEL[a.status] ?? a.status}` : ''})
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
