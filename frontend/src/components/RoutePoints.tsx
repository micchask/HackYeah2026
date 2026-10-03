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

export type PickTarget = 'origin' | 'destination' | 'report'

interface Props {
  city: string
  origin: NamedPoint | null
  destination: NamedPoint | null
  presets: Preset[]
  pickTarget: PickTarget | null
  onChange: (target: PickTarget, value: NamedPoint) => void
  onPick: (target: PickTarget | null) => void
  onPreset: (preset: Preset) => void
  onSwap: () => void
}

const ROWS = [
  { target: 'origin', letter: 'A', title: 'Start', empty: 'Wpisz adres startu' },
  { target: 'destination', letter: 'B', title: 'Cel', empty: 'Wpisz adres celu' },
] as const

/** Punkty A/B: wyszukiwarka adresów, gotowe trasy albo kliknięcie na mapie. */
export function RoutePoints({
  city,
  origin,
  destination,
  presets,
  pickTarget,
  onChange,
  onPick,
  onPreset,
  onSwap,
}: Props) {
  const values = { origin, destination }
  const activePreset = presets.find(
    (p) => p.origin === origin && p.destination === destination,
  )?.label

  return (
    <fieldset className="route-points">
      <legend className="card-title">Zaplanuj trasę</legend>

      <div className="points">
        <ol className="points-list">
          {ROWS.map(({ target, letter, title, empty }) => {
            const picking = pickTarget === target
            return (
              <li key={target} className={picking ? 'point-row picking' : 'point-row'}>
                <span
                  className={`point-badge point-badge-${letter.toLowerCase()}`}
                  aria-hidden="true"
                >
                  {letter}
                </span>
                <AddressSearch
                  label={title}
                  placeholder={picking ? 'Kliknij na mapie…' : empty}
                  value={values[target]}
                  city={city}
                  onSelect={(value) => onChange(target, value)}
                />
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
          disabled={!origin || !destination}
        >
          <SwapIcon size={18} />
          <span className="visually-hidden">Zamień start i cel</span>
        </button>
      </div>

      <fieldset className="presets">
        <legend className="presets-label">Szybki wybór – trasy demo</legend>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="chip"
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
