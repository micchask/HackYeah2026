// Chipy warstw mapy (plan §5.2, #90): przełączniki aria-pressed, stan w `layers` (domyślne z trybu).
import { useApp, useAppData } from '../app/context'
import { layerCounts } from '../app/layerData'
import type { LayerId } from '../app/state'

const LAYER_CHIPS: { id: LayerId; label: string }[] = [
  { id: 'barriers', label: 'Bariery' },
  { id: 'health', label: 'Toalety i zdrowie' },
  { id: 'institutions', label: 'Instytucje' },
  { id: 'places', label: 'Jedzenie i kultura' },
  { id: 'rest', label: 'Odpoczynek' },
  { id: 'parking', label: 'Parking OzN' },
  { id: 'events', label: 'Wydarzenia' },
  { id: 'reports', label: 'Zgłoszenia' },
]

export function LayerChips() {
  const [{ layers, mapBbox }, dispatch] = useApp()
  const data = useAppData()
  const counts = layerCounts(data, mapBbox)

  return (
    <fieldset className="layer-chips">
      <legend className="visually-hidden">Warstwy mapy</legend>
      {LAYER_CHIPS.map(({ id, label }) => {
        const count = counts[id] ?? 0
        return (
          <button
            key={id}
            type="button"
            className="chip layer-chip"
            aria-pressed={layers[id]}
            onClick={() => dispatch({ type: 'toggleLayer', layer: id })}
          >
            {label}
            {count > 0 && (
              <>
                {' '}
                <span className="layer-chip-count">{count}</span>{' '}
                <span className="visually-hidden">w widoku</span>
              </>
            )}
          </button>
        )
      })}
    </fieldset>
  )
}
