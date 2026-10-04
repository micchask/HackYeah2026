import type { LatLon } from '../api/client'
import { AddressSearch } from './AddressSearch'
import { PinIcon, SwapIcon } from './icons'

export interface NamedPoint {
  label: string
  point: LatLon
}

export interface Preset {
  label: string
  origin: NamedPoint
  destination: NamedPoint
}

export type PickTarget = 'origin' | 'destination' | 'report' | { waypoint: number }

interface Props {
  city: string
  origin: NamedPoint | null
  destination: NamedPoint | null
  waypoints: NamedPoint[]
  presets: Preset[]
  pickTarget: PickTarget | null
  onChange: (target: PickTarget, value: NamedPoint) => void
  onPick: (target: PickTarget | null) => void
  onPreset: (preset: Preset) => void
  onSwap: () => void
  onAddWaypoint: () => void
  onRemoveWaypoint: (index: number) => void
}

/** Punkty A/B: wyszukiwarka adresów, gotowe trasy albo kliknięcie na mapie. */
export function RoutePoints({
  city,
  origin,
  destination,
  waypoints,
  presets,
  pickTarget,
  onChange,
  onPick,
  onPreset,
  onSwap,
  onAddWaypoint,
  onRemoveWaypoint,
}: Props) {
  const activePreset = presets.find(
    (p) => p.origin === origin && p.destination === destination && waypoints.length === 0,
  )?.label

  const isPicking = (t: PickTarget) => {
    if (typeof t === 'string') return pickTarget === t
    if (typeof pickTarget === 'object' && pickTarget !== null && 'waypoint' in pickTarget) {
      return pickTarget.waypoint === t.waypoint
    }
    return false
  }

  const rows = [
    { target: 'origin' as PickTarget, letter: 'A', title: 'Start', empty: 'Wpisz adres startu', val: origin },
    ...waypoints.map((wp, i) => ({
      target: { waypoint: i } as PickTarget,
      letter: String(i + 1),
      title: `Przystanek ${i + 1}`,
      empty: 'Wpisz adres przystanku',
      val: wp,
      isWaypoint: true,
      index: i
    })),
    { target: 'destination' as PickTarget, letter: 'B', title: 'Cel', empty: 'Wpisz adres celu', val: destination },
  ]

  return (
    <fieldset className="route-points">
      <legend className="visually-hidden">Start i cel trasy</legend>

      <div className="points">
        <ol className="points-list">
          {rows.map(({ target, letter, title, empty, val, isWaypoint, index }) => {
            const picking = isPicking(target)
            const key = typeof target === 'string' ? target : `wp-${index}`
            return (
              <li key={key} className={picking ? 'point-row picking' : 'point-row'}>
                <span
                  className={`point-badge ${typeof target === 'string' ? 'point-badge-' + letter.toLowerCase() : 'point-badge-wp'}`}
                  aria-hidden="true"
                >
                  {letter}
                </span>
                <AddressSearch
                  label={title}
                  placeholder={picking ? 'Kliknij na mapie…' : empty}
                  value={val}
                  city={city}
                  onSelect={(value) => onChange(target, value)}
                />
                {isWaypoint && (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onRemoveWaypoint(index as number)}
                    title={`Usuń ${title.toLowerCase()}`}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-pressed={picking}
                  onClick={() => onPick(picking ? null : target)}
                >
                  <PinIcon size={18} />
                  <span className="visually-hidden">Wskaż punkt {letter} na mapie</span>
                </button>
              </li>
            )
          })}
        </ol>
        <button
          type="button"
          className="icon-button swap-button"
          onClick={onSwap}
          disabled={!origin || !destination || waypoints.length > 0}
          title={waypoints.length > 0 ? "Zamiana niemożliwa z przystankami" : "Zamień start i cel"}
        >
          <SwapIcon size={18} />
          <span className="visually-hidden">Zamień start i cel</span>
        </button>
      </div>

      <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
        <button
          type="button"
          className="chip chip-small"
          onClick={onAddWaypoint}
        >
          + Dodaj przystanek
        </button>
      </div>

      <fieldset className="presets">
        <legend className="presets-label">Trasy demo</legend>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="chip chip-small"
            aria-pressed={activePreset === preset.label}
            onClick={() => onPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </fieldset>
    </fieldset>
  )
}
