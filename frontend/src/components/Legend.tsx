import type { Difficulty } from '../api/client'
import { BarrierIcon } from './BarrierIcon'
import { BARRIER_LABEL, BARRIER_TYPES } from './barrierStyle'
import { GAP_CLASSES, GAP_COLOR, GAP_LABEL } from './dataGapsStyle'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'
import { INSTITUTION_COLOR } from './institutionStyle'

interface Props {
  showRoute: boolean
  showBaseline: boolean
  showInstitutions: boolean
  otherRoutes?: { index: number; label: string }[]
  showBarriers?: boolean
  showDataGaps?: boolean
}

/** Legenda kolorów trasy. Kolor nigdy nie jest jedynym nośnikiem - opis trasy ma te same etykiety. */
export function Legend({
  showRoute,
  showBaseline,
  showInstitutions,
  otherRoutes = [],
  showBarriers = false,
  showDataGaps = false,
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
        {showBarriers &&
          BARRIER_TYPES.map((t) => (
            <li key={t}>
              <BarrierIcon type={t} size={18} />
              {BARRIER_LABEL[t].toLowerCase()}
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
