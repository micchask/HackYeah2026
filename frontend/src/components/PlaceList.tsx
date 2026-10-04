// Lista miejsc (tekstowa alternatywa mapy): tylko nazwa, kategoria, status i odległość.
// Szczegóły i źródła danych - w karcie miejsca po kliknięciu.
import { useId, useState } from 'react'
import type { LatLon, Place } from '../api/client'
import { distanceM } from '../app/nearby'
import { EmptyState } from './EmptyState'
import { formatKm } from './format'
import { PlaceAccessIcon } from './PlaceAccessIcon'
import { ACCESS_LABEL, accessibilityOf, GROUP_LABEL, placeGroup } from './placeCategories'

const PAGE = 20

interface Props {
  places: Place[]
  query: string
  onQueryChange: (query: string) => void
  /** Maksymalna liczba miejsc z API - gdy jest ich tyle, w okolicy może być więcej */
  limit: number
  /** Ile miejsc z widoku ukrywają wyłączone chipy warstw (lista filtruje tak jak mapa) */
  hiddenByLayers?: number
  /** Środek mapy - lista od najbliższych */
  center?: LatLon | null
  /** Klik w miejsce - karta miejsca i okienko na mapie */
  onShow?: (place: Place) => void
}

export function PlaceList({
  places,
  query,
  onQueryChange,
  limit,
  hiddenByLayers = 0,
  center = null,
  onShow,
}: Props) {
  const searchId = useId()
  // Licznik "pokaż więcej" wraca do pierwszej porcji, gdy przyjdzie nowa lista
  const [shown, setShown] = useState({ list: places, count: PAGE })
  const count = shown.list === places ? shown.count : PAGE
  const sorted = center
    ? places
        .map((place) => ({ place, distance: distanceM(center, place.location) }))
        .sort((a, b) => a.distance - b.distance)
    : places.map((place) => ({ place, distance: null as number | null }))
  const visible = sorted.slice(0, count)

  return (
    <section className="place-list" aria-labelledby="places-heading">
      <h2 id="places-heading" className="visually-hidden">
        Miejsca
      </h2>
      <label htmlFor={searchId} className="visually-hidden">
        Szukaj miejsca po nazwie
      </label>
      <input
        id={searchId}
        type="search"
        className="address-input place-list-search"
        value={query}
        placeholder="Szukaj po nazwie, np. Sukiennice"
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <p className="list-note">
        {places.length >= limit ? `${limit}+` : places.length} w widoku mapy
        {hiddenByLayers > 0 && ` · ${hiddenByLayers} ukrytych przez warstwy`}
      </p>

      {visible.length ? (
        <ul className="item-list">
          {visible.map(({ place, distance }) => {
            const access = accessibilityOf(place)
            return (
              <li key={place.id}>
                <button type="button" className="item" onClick={() => onShow?.(place)}>
                  <PlaceAccessIcon access={access} size={28} />
                  <span className="item-text">
                    <span className="item-title">{place.name ?? 'Miejsce bez nazwy'}</span>
                    <span className="item-meta">
                      {GROUP_LABEL[placeGroup(place)]} · {ACCESS_LABEL[access]}
                    </span>
                  </span>
                  {distance !== null && <span className="item-end">{formatKm(distance)}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title={query ? 'Brak miejsc o tej nazwie' : 'Brak miejsc w widoku'}>
          {query ? 'Sprawdź pisownię albo przesuń mapę.' : 'Przesuń albo oddal mapę.'}
        </EmptyState>
      )}

      {sorted.length > count && (
        <button
          type="button"
          className="secondary-button place-list-more"
          onClick={() => setShown({ list: places, count: count + PAGE })}
        >
          Pokaż więcej ({sorted.length - count})
        </button>
      )}
    </section>
  )
}
