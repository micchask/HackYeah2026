import type { BarrierType, Difficulty } from '../api/client'
import { BarrierIcon } from './BarrierIcon'
import { BARRIER_LABEL, BARRIER_TYPES } from './barrierStyle'
import { GAP_CLASSES, GAP_COLOR, GAP_LABEL } from './dataGapsStyle'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'
import { DemoLayerIcon } from './DemoLayerIcon'
import { DEMO_LAYER_META, type DemoLayerId } from './demoLayerStyle'
import { INSTITUTION_COLOR } from './institutionStyle'
import { PlaceAccessIcon } from './PlaceAccessIcon'
import { ACCESS_LABEL, ACCESS_LEVELS } from './placeCategories'

interface Props {
  showRoute: boolean
  showBaseline: boolean
  showInstitutions: boolean
  otherRoutes?: { index: number; label: string }[]
  /** Typy barier widoczne na mapie (z włączonych chipów) */
  barrierTypes?: BarrierType[]
  /** Na mapie są miejsca (warstwa z klastrami) */
  showPlaces?: boolean
  showDataGaps?: boolean
  demoLayers?: DemoLayerId[]
}

/** Legenda pokazuje tylko to, co jest na mapie. Kolor nigdy nie jest jedynym nośnikiem informacji. */
export function Legend({
  showRoute,
  showBaseline,
  showInstitutions,
  otherRoutes = [],
  barrierTypes = [],
  showPlaces = false,
  showDataGaps = false,
  demoLayers = [],
}: Props) {
  return (
    <section className="map-legend" aria-labelledby="legend-heading">
      <h2 id="legend-heading" className="legend-title">
        Legenda
      </h2>
      <ul>
        {showInstitutions && (
          <li>
            <span
              className="legend-dot"
              style={{ background: INSTITUTION_COLOR }}
              aria-hidden="true"
            />
            instytucja publiczna (kliknij, by zobaczyć dostępność)
          </li>
        )}
        {showRoute &&
          (Object.keys(DIFFICULTY_COLOR) as Difficulty[]).map((d) => (
            <li key={d}>
              <span
                className="legend-swatch"
                style={{ background: DIFFICULTY_COLOR[d] }}
                aria-hidden="true"
              />
              {DIFFICULTY_LABEL[d]}
            </li>
          ))}
        {otherRoutes.map((route) => (
          <li key={route.index}>
            <span
              className={`legend-swatch legend-swatch-route-${route.index % 3}`}
              aria-hidden="true"
            />
            pozostały wariant: {route.label}
          </li>
        ))}
        {showBaseline && (
          <li>
            <span className="legend-swatch legend-swatch-dashed" aria-hidden="true" />
            zwykła trasa piesza
          </li>
        )}
        {BARRIER_TYPES.filter((t) => barrierTypes.includes(t)).map((t) => (
          <li key={t}>
            <BarrierIcon type={t} size={18} />
            {BARRIER_LABEL[t].toLowerCase()}
          </li>
        ))}
        {showPlaces && (
          <>
            {ACCESS_LEVELS.map((access) => (
              <li key={access}>
                <PlaceAccessIcon access={access} size={18} />
                miejsce: {ACCESS_LABEL[access]}
              </li>
            ))}
            <li>
              <span className="legend-cluster" aria-hidden="true">
                12
              </span>
              grupa miejsc (kliknij, by przybliżyć)
            </li>
          </>
        )}
        {demoLayers.map((kind) => (
          <li key={kind}>
            <DemoLayerIcon kind={kind} size={22} />
            {DEMO_LAYER_META[kind].label}
          </li>
        ))}
        {showDataGaps &&
          GAP_CLASSES.map((gap) => (
            <li key={gap}>
              <span
                className={`legend-swatch legend-swatch-gap-${gap}`}
                style={{ color: GAP_COLOR[gap] }}
                aria-hidden="true"
              />
              {GAP_LABEL[gap]}
            </li>
          ))}
      </ul>
    </section>
  )
}
