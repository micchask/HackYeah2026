import type { LatLon } from '../api/client'

export interface NamedPoint {
  label: string
  point: LatLon
}

export interface Preset {
  label: string
  origin: NamedPoint
  destination: NamedPoint
}

export type PickTarget = 'origin' | 'destination'

interface Props {
  origin: NamedPoint | null
  destination: NamedPoint | null
  presets: Preset[]
  pickTarget: PickTarget | null
  onPick: (target: PickTarget | null) => void
  onPreset: (preset: Preset) => void
  onSwap: () => void
}

function describe(p: NamedPoint | null) {
  if (!p) return 'nie wybrano'
  return p.label
}

/** Punkty A/B: gotowe trasy (dostępne z klawiatury) albo kliknięcie na mapie. */
export function RoutePoints({
  origin,
  destination,
  presets,
  pickTarget,
  onPick,
  onPreset,
  onSwap,
}: Props) {
  return (
    <fieldset>
      <legend>Skąd i dokąd</legend>
      <fieldset className="presets">
        <legend className="presets-label">Gotowe trasy demo:</legend>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="secondary"
            onClick={() => onPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </fieldset>

      <dl className="points">
        <div>
          <dt>
            <span className="point-badge point-badge-a" aria-hidden="true">
              A
            </span>{' '}
            Start
          </dt>
          <dd>{describe(origin)}</dd>
        </div>
        <div>
          <dt>
            <span className="point-badge point-badge-b" aria-hidden="true">
              B
            </span>{' '}
            Cel
          </dt>
          <dd>{describe(destination)}</dd>
        </div>
      </dl>

      <div className="presets">
        <button
          type="button"
          className="secondary"
          aria-pressed={pickTarget === 'origin'}
          onClick={() => onPick(pickTarget === 'origin' ? null : 'origin')}
        >
          Wskaż A na mapie
        </button>
        <button
          type="button"
          className="secondary"
          aria-pressed={pickTarget === 'destination'}
          onClick={() => onPick(pickTarget === 'destination' ? null : 'destination')}
        >
          Wskaż B na mapie
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onSwap}
          disabled={!origin || !destination}
        >
          Zamień A i B
        </button>
      </div>
      {pickTarget && (
        <p className="hint" aria-live="polite">
          Kliknij na mapie, aby ustawić punkt {pickTarget === 'origin' ? 'A' : 'B'}.
        </p>
      )}
    </fieldset>
  )
}
