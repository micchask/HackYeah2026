import type { RouteResponse } from '../api/client'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'
import { formatKm } from './format'
import { AlertIcon } from './icons'

const STATUS_LABEL: Record<string, string> = {
  verified: 'dane potwierdzone',
  unverified: 'dane niepotwierdzone',
  conflicting: 'źródła się nie zgadzają',
  outdated: 'dane mogą być nieaktualne',
}

interface Props {
  route: RouteResponse
  selected?: number | null
  onSelect?: (index: number | null) => void
}

/** Tekstowa alternatywa mapy: pełny opis trasy krok po kroku. */
export function RouteDescription({ route, selected = null, onSelect }: Props) {
  return (
    <section className="card" aria-labelledby="route-heading">
      <h2 id="route-heading">Opis trasy</h2>
      <p className="meta">
        {route.segments.length} odcinków. Wybierz odcinek, aby zobaczyć go na mapie.
      </p>
      <ol className="timeline">
        {route.segments.map((s, i) => {
          const isSelected = selected === i
          const content = (
            <>
              <span className="instruction">{s.instruction}</span>
              <span className="tags">
                <span className={`tag tag-${s.difficulty}`}>
                  <span
                    className="tag-dot"
                    style={{ background: DIFFICULTY_COLOR[s.difficulty] }}
                    aria-hidden="true"
                  />
                  {DIFFICULTY_LABEL[s.difficulty]}
                </span>
                {s.surface && <span className="tag">{s.surface}</span>}
                <span className="tag">{formatKm(s.distance_m)}</span>
              </span>
              {s.warnings?.map((w) => (
                <span key={w} className="seg-warning">
                  <AlertIcon size={16} />
                  <span>Uwaga: {w}</span>
                </span>
              ))}
              <span className="provenance">
                <span className="confidence" aria-hidden="true">
                  <span style={{ width: `${Math.round(s.confidence * 100)}%` }} />
                </span>
                dostępność {s.accessibility_score}/100 · pewność danych{' '}
                {Math.round(s.confidence * 100)}%
                {s.data_status ? ` · ${STATUS_LABEL[s.data_status] ?? s.data_status}` : ''}
                {s.sources?.length ? ` · źródło: ${s.sources.join(', ')}` : ''}
              </span>
            </>
          )
          return (
            <li
              key={i}
              className={
                isSelected ? `step step-${s.difficulty} selected` : `step step-${s.difficulty}`
              }
            >
              {onSelect ? (
                <button
                  type="button"
                  className="step-body"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : i)}
                >
                  {content}
                </button>
              ) : (
                <div className="step-body">{content}</div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
