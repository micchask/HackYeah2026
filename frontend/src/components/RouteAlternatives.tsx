import { formatKm } from './format'
import { buildRouteVariants } from './routeVariants'
import type { RouteResponse } from '../api/client'

interface Props {
  route: RouteResponse
  selected: number
  onChange: (index: number) => void
}

/** Wybór między trasą główną a różniącymi się od niej wariantami z API. */
export function RouteAlternatives({ route, selected, onChange }: Props) {
  const choices = buildRouteVariants(route)
  if (choices.length < 2) return null

  return (
    <section className="card route-alternatives" aria-labelledby="route-alternatives-heading">
      <h2 id="route-alternatives-heading">Wybierz trasę</h2>
      <p className="meta">Porównaj warianty i wybierz ten, który chcesz zobaczyć na mapie.</p>
      <fieldset className="route-choices">
        <legend className="visually-hidden">Dostępne warianty trasy</legend>
        {choices.map(({ index, label, route: choice }) => {
          const minutes = Math.max(1, Math.round(choice.duration_s / 60))
          return (
            <div key={`${label}-${index}`} className="route-choice">
              <input
                id={`route-choice-${index}`}
                type="radio"
                name="route-variant"
                value={index}
                checked={selected === index}
                onChange={() => onChange(index)}
                aria-describedby={`route-choice-${index}-description`}
              />
              <label htmlFor={`route-choice-${index}`} className="route-choice-content">
                <span className="route-choice-head">
                  <span className="route-choice-label">{label}</span>
                  <span className="route-choice-distance">{formatKm(choice.distance_m)}</span>
                </span>
                <span className="route-choice-stats">
                  ok. {minutes} min · schody: {choice.stairs_count || 'brak'} · bruk / nierówna
                  nawierzchnia: {Math.round(choice.rough_surface_m ?? 0)} m
                </span>
                <span className="route-choice-scores">
                  dostępność {choice.accessibility_score}/100 · pewność danych{' '}
                  {Math.round(choice.confidence * 100)}%
                </span>
                <span id={`route-choice-${index}-description`} className="route-choice-description">
                  {choice.explanation}
                </span>
              </label>
            </div>
          )
        })}
      </fieldset>
    </section>
  )
}
