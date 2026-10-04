import { useId, useState } from 'react'
import type { Place } from '../api/client'
import { ATTRIBUTE_LABEL, VALUE_LABEL } from './attributes'
import { PlaceAccessIcon } from './PlaceAccessIcon'
import { ACCESS_LABEL, accessibilityOf, GROUP_LABEL, placeGroup } from './placeCategories'

// Lista pokazuje miejsca porcjami - setki pozycji naraz to męczarnia z czytnikiem ekranu
const PAGE = 20

const SOURCE_LABEL: Record<string, string> = {
  osm: 'OpenStreetMap',
  krakow_open_data: 'otwarte dane Krakowa',
  accessibility_declarations: 'deklaracja dostępności (BIP)',
  msip: 'MSIP Kraków',
  user_reports: 'zgłoszenia użytkowników',
  manual: 'dane wprowadzone ręcznie',
}

const STATUS_LABEL: Record<string, string> = {
  verified: 'potwierdzone',
  unverified: 'niepotwierdzone',
  conflicting: 'źródła się nie zgadzają',
  outdated: 'może być nieaktualne',
}

type Attribute = NonNullable<Place['attributes']>[number]

function describe(a: Attribute) {
  return `${VALUE_LABEL[String(a.value)] ?? String(a.value)}`
}

function sourceLine(a: Attribute) {
  return `${SOURCE_LABEL[a.provenance.source] ?? a.provenance.source} · pewność ${Math.round(a.confidence * 100)}%`
}

interface Props {
  places: Place[]
  query: string
  onQueryChange: (query: string) => void
  /** Maksymalna liczba miejsc z API - gdy jest ich tyle, w okolicy może być więcej */
  limit: number
  /** Ile miejsc z widoku ukrywają wyłączone chipy warstw (lista filtruje tak jak mapa) */
  hiddenByLayers?: number
  /** „Pokaż na mapie” - zaznacza miejsce i otwiera jego okienko */
  onShow?: (place: Place) => void
}

export function PlaceList({
  places,
  query,
  onQueryChange,
  limit,
  hiddenByLayers = 0,
  onShow,
}: Props) {
  const searchId = useId()
  // Licznik "pokaż więcej" wraca do pierwszej porcji, gdy przyjdzie nowa lista
  const [shown, setShown] = useState({ list: places, count: PAGE })
  const count = shown.list === places ? shown.count : PAGE
  const visible = places.slice(0, count)

  return (
    <section className="card" aria-labelledby="places-heading">
      <h2 id="places-heading">Miejsca i źródła danych</h2>
      <p className="meta">
        Każda informacja ma źródło, pewność i status. Gdy źródła się nie zgadzają, mówimy to wprost.
      </p>
      <div className="place-search">
        <label htmlFor={searchId} className="point-title">
          Szukaj miejsca po nazwie
        </label>
        <input
          id={searchId}
          type="search"
          className="address-input"
          value={query}
          placeholder="np. Sukiennice"
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <p className="field-hint">
          {query.trim()
            ? `Znaleziono: ${places.length}${places.length === limit ? '+' : ''}`
            : places.length === limit
              ? `Pokazujemy ${limit} miejsc z widoku mapy. Przybliż mapę lub wyszukaj po nazwie.`
              : `Miejsca w widoku mapy: ${places.length}`}
          {hiddenByLayers > 0 &&
            ` Ukryte przez wyłączone warstwy: ${hiddenByLayers} – włącz je chipami nad mapą.`}
        </p>
      </div>
      <ul className="places">
        {visible.map((p) => (
          <li key={p.id} className="place">
            <h3 className="place-name">{p.name ?? 'Bez nazwy'}</h3>
            <p className="place-access">
              <PlaceAccessIcon access={accessibilityOf(p)} size={18} />
              <span>
                {ACCESS_LABEL[accessibilityOf(p)]} · {GROUP_LABEL[placeGroup(p)]}
              </span>
              {onShow && (
                <button type="button" className="link-button" onClick={() => onShow(p)}>
                  Pokaż na mapie<span className="visually-hidden">: {p.name ?? 'miejsce'}</span>
                </button>
              )}
            </p>
            <ul className="attributes">
              {p.attributes?.map((a) => (
                <li key={a.key} className="attribute">
                  <span className="attribute-main">
                    {ATTRIBUTE_LABEL[a.key] ?? a.key}: <strong>{describe(a)}</strong>
                  </span>
                  <span className="attribute-meta">
                    {a.status && (
                      <span className={`badge badge-${a.status}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    )}
                    <span className="meta">{sourceLine(a)}</span>
                  </span>
                  {a.alternatives?.map((alt) => (
                    <span key={alt.provenance.source} className="attribute-alt meta">
                      Inne źródło: <strong>{describe(alt)}</strong> ({sourceLine(alt)})
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {count < places.length && (
        <button
          type="button"
          className="link-button"
          onClick={() => setShown({ list: places, count: count + PAGE })}
        >
          Pokaż więcej miejsc ({places.length - count})
        </button>
      )}
    </section>
  )
}
