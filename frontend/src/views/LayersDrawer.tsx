// „Warstwy”: styl mapy (Mapa / Satelita / Uproszczona) i wszystkie warstwy w jednym okienku.
import { useApp } from '../app/context'
import type { BaseMap, LayerId } from '../app/state'
import { LayersIcon } from '../components/icons'
import { SoonTag } from '../components/EmptyState'
import { usePopover } from '../components/usePopover'

const BASE_MAP_OPTIONS: { id: BaseMap; label: string }[] = [
  { id: 'standard', label: 'Mapa' },
  { id: 'satellite', label: 'Satelita' },
  { id: 'light', label: 'Uproszczona' },
]

const LAYERS: { id: LayerId; label: string }[] = [
  { id: 'barriers', label: 'Bariery' },
  { id: 'reports', label: 'Zgłoszenia' },
  { id: 'health', label: 'Toalety i zdrowie' },
  { id: 'places', label: 'Jedzenie i kultura' },
  { id: 'institutions', label: 'Urzędy i instytucje' },
  { id: 'gaps', label: 'Braki danych' },
]

// Warstwy z interfejsu, których dane na mapie dojdą w kolejnej iteracji (#96)
const COMING: string[] = [
  'Parkingi dla OzN',
  'Miejsca odpoczynku',
  'Wydarzenia',
  'Dostępne wejścia',
]

export function MapStyleSwitcher() {
  const [{ baseMap }, dispatch] = useApp()
  return (
    <fieldset className="basemap-switcher">
      <legend className="popover-title">Widok mapy</legend>
      <div className="basemap-options">
        {BASE_MAP_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="basemap-option"
            aria-pressed={baseMap === id}
            onClick={() => dispatch({ type: 'setBaseMap', baseMap: id })}
          >
            <span className={`basemap-thumb basemap-thumb-${id}`} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function LayersDrawer() {
  const [{ layers }, dispatch] = useApp()
  const { open, toggle, id: popoverId, wrapper, trigger, triggerProps } = usePopover()

  return (
    <div ref={wrapper} className="map-control-wrap">
      <button
        ref={trigger}
        type="button"
        className="map-control"
        {...triggerProps}
        onClick={toggle}
      >
        <LayersIcon size={20} />
        <span className="map-control-label">Warstwy</span>
      </button>
      {open && (
        <section id={popoverId} className="popover layers-popover" aria-label="Warstwy mapy">
          <MapStyleSwitcher />
          <fieldset className="layer-toggles">
            <legend className="popover-title">Na mapie</legend>
            {LAYERS.map(({ id, label }) => (
              <label key={id} className="toggle-row">
                <span>{label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="switch"
                  checked={layers[id]}
                  aria-checked={layers[id]}
                  onChange={(e) =>
                    dispatch({ type: 'toggleLayer', layer: id, on: e.target.checked })
                  }
                />
              </label>
            ))}
          </fieldset>
          <div className="layer-coming">
            <p className="popover-title">W przygotowaniu</p>
            <ul>
              {COMING.map((label) => (
                <li key={label}>
                  {label} <SoonTag />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
