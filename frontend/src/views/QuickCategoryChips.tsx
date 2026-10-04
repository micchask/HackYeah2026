// Szybkie kategorie nad mapą: kilka lekkich chipów z ikoną. Pozostałe warstwy - przycisk „Warstwy”.
import type { ComponentType, SVGProps } from 'react'
import { useApp, useAppData } from '../app/context'
import { layerCounts } from '../app/layerData'
import type { LayerId } from '../app/state'
import {
  BuildingIcon,
  CoffeeIcon,
  MegaphoneIcon,
  StairsIcon,
  ToiletIcon,
} from '../components/icons'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const QUICK_CATEGORIES: { id: LayerId; label: string; Icon: IconComponent }[] = [
  { id: 'barriers', label: 'Bariery', Icon: StairsIcon },
  { id: 'health', label: 'Toalety', Icon: ToiletIcon },
  { id: 'places', label: 'Miejsca', Icon: CoffeeIcon },
  { id: 'institutions', label: 'Urzędy', Icon: BuildingIcon },
  { id: 'reports', label: 'Zgłoszenia', Icon: MegaphoneIcon },
]

export function QuickCategoryChips() {
  const [{ layers, mapBbox }, dispatch] = useApp()
  const data = useAppData()
  const counts = layerCounts(data, mapBbox)

  return (
    <fieldset className="quick-chips">
      <legend className="visually-hidden">Warstwy mapy</legend>
      {QUICK_CATEGORIES.map(({ id, label, Icon }) => {
        const count = counts[id] ?? 0
        return (
          <button
            key={id}
            type="button"
            className="quick-chip"
            aria-pressed={layers[id]}
            onClick={() => dispatch({ type: 'toggleLayer', layer: id })}
          >
            <Icon size={16} />
            {label}
            {count > 0 && (
              <>
                {' '}
                <span className="quick-chip-count">{count > 99 ? '99+' : count}</span>{' '}
                <span className="visually-hidden">w widoku</span>
              </>
            )}
          </button>
        )
      })}
    </fieldset>
  )
}
