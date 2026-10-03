import type { Difficulty } from '../api/client'
import { BarrierIcon } from './BarrierIcon'
import { BARRIER_LABEL, BARRIER_TYPES } from './barrierStyle'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'
import { INSTITUTION_COLOR } from './institutionStyle'

interface Props {
  showRoute: boolean
  showBaseline: boolean
  showInstitutions: boolean
  showBarriers?: boolean
}

/** Legenda kolorów trasy. Kolor nigdy nie jest jedynym nośnikiem - opis trasy ma te same etykiety. */
export function Legend({ showRoute, showBaseline, showInstitutions, showBarriers = false }: Props) {
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
      </ul>
    </section>
  )
}
