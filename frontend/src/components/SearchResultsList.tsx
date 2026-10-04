import type { SearchResult } from '../api/client'
import { formatKm } from './format'

interface Props {
  query: string
  results: SearchResult[]
  selected: string | null
  onSelect: (result: SearchResult) => void
  onClear: () => void
}

/** Wszystkie wyniki zapytania o rodzaj/cechę - tekstowa alternatywa punktów na mapie. */
export function SearchResultsList({ query, results, selected, onSelect, onClear }: Props) {
  return (
    <section className="card" aria-labelledby="search-results-heading">
      <div className="search-results-head">
        <h2 id="search-results-heading">
          „{query}”: {results.length} na mapie
        </h2>
        <button type="button" className="link-button" onClick={onClear}>
          Wyczyść
        </button>
      </div>
      <p className="meta">Od najbliższych środka mapy. Wybierz miejsce albo kliknij punkt.</p>
      <ul className="institution-list-items">
        {results.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="institution-button"
              aria-pressed={r.id === selected}
              onClick={() => onSelect(r)}
            >
              <span>{r.label}</span>
              <span className="meta">
                {[r.kind, r.description, r.distance_m != null ? formatKm(r.distance_m) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
