import type { Difficulty } from '../api/client'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'

/** Legenda kolorów trasy. Kolor nigdy nie jest jedynym nośnikiem - opis trasy ma te same etykiety. */
export function Legend({ showBaseline }: { showBaseline: boolean }) {
  return (
    <section className="legend" aria-labelledby="legend-heading">
      <h2 id="legend-heading" className="legend-title">
        Legenda mapy
      </h2>
      <ul>
        {(Object.keys(DIFFICULTY_COLOR) as Difficulty[]).map((d) => (
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
            najkrótsza zwykła trasa piesza (dla porównania)
          </li>
        )}
      </ul>
    </section>
  )
}
