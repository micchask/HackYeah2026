import type { SearchResult } from '../api/client'
import { ATTRIBUTE_LABEL, VALUE_LABEL } from './attributes'
import { STATUS_LABEL } from './dataStatus'
import { formatDate, formatKm } from './format'
import { MapPopupCard, type MapPopupActions } from './MapPopupCard'

const SOURCE_LABEL: Record<string, string> = {
  osm: 'OpenStreetMap',
  krakow_open_data: 'otwarte dane Krakowa',
  accessibility_declarations: 'deklaracja dostępności (BIP)',
  msip: 'MSIP Kraków',
  user_reports: 'zgłoszenia użytkowników',
  manual: 'dane wprowadzone ręcznie',
}

interface Props extends MapPopupActions {
  result: SearchResult
}

/** Okienko miejsca albo adresu z wyszukiwarki. Bez danych mówimy to wprost - nie "dostępne". */
export function PlacePopup({ result, ...actions }: Props) {
  const attributes = result.place?.attributes ?? []
  const subtitle = [
    result.description,
    result.distance_m != null ? `${formatKm(result.distance_m)} od środka mapy` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <MapPopupCard
      id={result.id}
      kind={result.kind}
      title={result.label}
      subtitle={subtitle || null}
      {...actions}
      details={
        attributes.length ? (
          <>
            <h3>Dostępność</h3>
            <ul className="attributes">
              {attributes.map((a) => {
                const status = a.status ?? 'unverified'
                return (
                  <li key={a.key} className="attribute institution-attribute">
                    <span className="attribute-main">
                      {ATTRIBUTE_LABEL[a.key] ?? a.key}:{' '}
                      <strong>{VALUE_LABEL[String(a.value)] ?? String(a.value)}</strong>
                    </span>
                    <span className="attribute-meta">
                      <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
                      <span className="meta">
                        {SOURCE_LABEL[a.provenance.source] ?? a.provenance.source} · pewność{' '}
                        {Math.round(a.confidence * 100)}%
                        {a.provenance.last_verified
                          ? ` · ${formatDate(a.provenance.last_verified)}`
                          : ''}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="meta">
              Pozostałych cech (np. winda, toaleta) nie ma w danych – to nie znaczy, że są dostępne.
            </p>
          </>
        ) : (
          <p className="callout callout-warning no-data">
            <span>
              Nie mamy danych o dostępności tego miejsca. To <strong>nie</strong> znaczy, że jest
              dostępne – sprawdź przed wyjściem albo zgłoś barierę, jeśli ją znasz.
            </span>
          </p>
        )
      }
    />
  )
}
