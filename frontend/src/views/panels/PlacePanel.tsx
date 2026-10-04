// Karta miejsca (plan §5.5, #93): status, paszport dostępności ze źródłami i akcje.
import { useEffect, useState } from 'react'
import { demoApi, isDemoData } from '../../api/demo'
import { useApp, useAppData } from '../../app/context'
import { openReport } from '../../app/mapActions'
import { placeCard, type CardAttribute, type SelectedPlace } from '../../app/selectedPlace'
import { SOURCE_LABEL } from '../../components/attributes'
import { formatDate } from '../../components/format'
import { EmptyState, LoadingSkeleton, SoonTag } from '../../components/EmptyState'
import { AlertIcon, ImageIcon, PinIcon, RouteIcon } from '../../components/icons'
import { PlaceAccessIcon } from '../../components/PlaceAccessIcon'
import { ACCESS_LABEL, placeGroup } from '../../components/placeCategories'

// Przewijak „przy toalecie” = punkt z warstwy przewijaków w tym promieniu
const CHANGING_TABLE_RADIUS_M = 40

function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const k = Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(a.lat - b.lat, (a.lon - b.lon) * k) * 111_320
}

/** Przewijak w pobliżu toalety (#89/#100) jako dodatkowy atrybut paszportu. */
function useChangingTable(selection: SelectedPlace): CardAttribute | null {
  const place =
    selection.kind === 'place'
      ? selection.place
      : selection.kind === 'search'
        ? selection.result.place
        : null
  const isToilet = !!place && placeGroup(place) === 'toilets'
  const [found, setFound] = useState<{ id: string; attr: CardAttribute | null } | null>(null)

  useEffect(() => {
    if (!place || !isToilet) return
    const controller = new AbortController()
    const { lat, lon } = place.location
    const d = 0.001 // ok. 100 m
    demoApi
      .changingTables(`${lat - d},${lon - d},${lat + d},${lon + d}`, controller.signal)
      .then((tables) => {
        const near = tables
          .map((t) => ({ t, dist: distanceM(t.location, place.location) }))
          .filter(({ dist }) => dist <= CHANGING_TABLE_RADIUS_M)
          .sort((a, b) => a.dist - b.dist)[0]
        const attr: CardAttribute | null = near
          ? {
              key: 'changing_table',
              label: 'przewijak',
              value: `tak (ok. ${Math.round(near.dist)} m)`,
              source: isDemoData(near.t)
                ? 'dane przykładowe'
                : (SOURCE_LABEL[near.t.provenance?.source ?? near.t.source] ?? near.t.source),
              date: near.t.provenance?.last_verified ?? null,
              confidence: near.t.confidence ?? null,
              status: isDemoData(near.t)
                ? { label: 'dane przykładowe', badge: 'badge-demo-data' }
                : { label: 'dane niepotwierdzone', badge: 'badge-unverified' },
              alternatives: [],
            }
          : null
        setFound({ id: place.id, attr })
      })
      .catch(() => {
        // brak danych o przewijakach - karta działa bez nich
      })
    return () => controller.abort()
  }, [place, isToilet])

  return place && found?.id === place.id ? found.attr : null
}

export function PlacePanel({ place: selection }: { place: SelectedPlace }) {
  const [, dispatch] = useApp()
  const { institutions } = useAppData()
  const changingTable = useChangingTable(selection)
  const card = placeCard(selection, institutions)

  if (!card) {
    return (
      <div aria-busy="true">
        <LoadingSkeleton rows={3} />
        <p className="visually-hidden">Wczytuję dane miejsca…</p>
      </div>
    )
  }

  const attributes = changingTable ? [...card.attributes, changingTable] : card.attributes
  const named = card.point ? { label: card.title, point: card.point } : null
  const sources = [...new Set(attributes.map((a) => a.source))]
  const lastChecked = attributes
    .map((a) => a.date)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1)

  return (
    <article className="place-card" aria-labelledby="place-card-title">
      <header className="place-card-head">
        {card.kind && <p className="eyebrow">{card.kind}</p>}
        <h3 id="place-card-title" className="place-card-title">
          {card.title}
        </h3>
        {card.subtitle && <p className="place-card-sub">{card.subtitle}</p>}
        {card.demo && <SoonTag>dane przykładowe</SoonTag>}
      </header>
      {card.locationNote && (
        <p className="callout callout-warning">
          <AlertIcon size={18} />
          <span>{card.locationNote}</span>
        </p>
      )}

      <p className={`place-status place-status-${card.access}`}>
        <PlaceAccessIcon access={card.access} size={24} />
        <span>
          <strong>{ACCESS_LABEL[card.access]}</strong>
          {card.accessNote && <span className="place-status-note">{card.accessNote}</span>}
        </span>
      </p>

      <div className="place-actions">
        <button
          type="button"
          className="primary-button"
          disabled={!named}
          onClick={() => {
            if (!named) return
            dispatch({ type: 'setDestination', point: named })
            dispatch({ type: 'openPanel', panel: { kind: 'route' } })
          }}
        >
          <RouteIcon size={18} /> Prowadź tutaj
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!named}
          onClick={() => {
            if (!named) return
            dispatch({ type: 'setOrigin', point: named })
            dispatch({ type: 'openPanel', panel: { kind: 'route' } })
          }}
        >
          Ustaw jako start
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!named}
          onClick={() => {
            if (!named) return
            dispatch({ type: 'addWaypoint', point: named })
            dispatch({ type: 'openPanel', panel: { kind: 'route' } })
          }}
        >
          Dodaj przystanek
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!card.point}
          onClick={() => card.point && dispatch({ type: 'focusMap', point: card.point })}
        >
          <PinIcon size={16} /> Pokaż na mapie
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => openReport(dispatch, named)}
        >
          Zgłoś zmianę
        </button>
      </div>

      {attributes.length > 0 && (
        <ul className="place-tags" aria-label="Najważniejsze cechy">
          {attributes.slice(0, 4).map((a) => (
            <li key={a.key} className="tag">
              {a.label}: {a.value}
            </li>
          ))}
        </ul>
      )}

      <details className="disclosure" open>
        <summary>Dostępność</summary>
        {attributes.length ? (
          <>
            <ul className="attributes place-passport">
              {attributes.map((a) => (
                <PassportItem key={a.key} attribute={a} />
              ))}
            </ul>
            <p className="meta">
              Cech, których nie ma na liście, nie znamy – to nie znaczy, że są dostępne.
            </p>
          </>
        ) : (
          <p className="callout callout-warning no-data">
            <AlertIcon size={18} />
            <span>
              Nie mamy danych o dostępności tego miejsca. To <strong>nie</strong> znaczy, że jest
              dostępne – sprawdź przed wyjściem albo zgłoś barierę, jeśli ją znasz.
            </span>
          </p>
        )}
      </details>

      <details className="disclosure">
        <summary>Źródła danych</summary>
        {sources.length ? (
          <p className="meta">
            {sources.join(' · ')}
            {lastChecked
              ? ` · ostatnio sprawdzone ${formatDate(lastChecked)}`
              : ' · bez daty weryfikacji'}
          </p>
        ) : (
          <EmptyState title="Brak źródeł dla tego miejsca" />
        )}
      </details>

      <details className="disclosure">
        <summary>Zdjęcia</summary>
        <EmptyState tone="soon" icon={<ImageIcon size={22} />} title="Zdjęcia wejść – wkrótce">
          Mieszkańcy dodadzą zdjęcia wejścia i toalety.
        </EmptyState>
      </details>

      <details className="disclosure">
        <summary>Zgłoszenia</summary>
        <EmptyState title="Brak zgłoszeń dla tego miejsca">
          Widzisz barierę? Daj znać innym.
        </EmptyState>
      </details>
    </article>
  )
}

function PassportItem({ attribute: a }: { attribute: CardAttribute }) {
  const conflict = a.alternatives.length > 0
  return (
    <li className={conflict ? 'attribute passport-item conflict' : 'attribute passport-item'}>
      <span className="attribute-main">
        {a.label}: <strong>{a.value}</strong>
      </span>
      <span className="attribute-meta">
        <span className={`badge ${a.status.badge}`}>{a.status.label}</span>
        <span className="meta">
          {a.source}
          {a.confidence != null && ` · pewność ${Math.round(a.confidence * 100)}%`}
          {a.date ? ` · sprawdzone ${formatDate(a.date)}` : ' · bez daty weryfikacji'}
        </span>
      </span>
      {conflict && (
        <span className="passport-conflict">
          <AlertIcon size={16} />
          <span>
            Źródła się nie zgadzają:{' '}
            {a.alternatives.map((alt) => `${alt.source} podaje „${alt.value}”`).join('; ')}.
          </span>
        </span>
      )}
      {a.note && <span className="meta institution-note">{a.note}</span>}
    </li>
  )
}
