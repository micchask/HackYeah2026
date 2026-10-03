import type { RouteResponse } from '../api/client'
import { formatKm } from './format'

interface Props {
  route: RouteResponse
  selected: number
  onChange: (index: number) => void
}

interface RouteChoice {
  label: string
  distance_m: number
  duration_s: number
  stairs_count: number
  rough_surface_m: number
  explanation: string
}

/** Wybór między trasą główną a różniącymi się od niej wariantami z API. */
export function RouteAlternatives({ route, selected, onChange }: Props) {
  const alternatives = route.alternatives ?? []
  if (!alternatives.length) return null

  const choices: RouteChoice[] = [
    {
      label: 'Najbardziej dostępna',
      distance_m: route.distance_m,
      duration_s: route.duration_s,
      stairs_count: route.stairs_count ?? 0,
      rough_surface_m: route.rough_surface_m ?? 0,
      explanation: route.explanation,
    },
    ...alternatives,
  ]

  return (
    <section className="card route-alternatives" aria-labelledby="route-alternatives-heading">
      <h2 id="route-alternatives-heading">Wybierz trasę</h2>
      <p className="meta">Porównaj warianty i wybierz ten, który chcesz zobaczyć na mapie.</p>
      <fieldset className="route-choices">
        <legend className="visually-hidden">Dostępne warianty trasy</legend>
        {choices.map((choice, index) => {
          const minutes = Math.max(1, Math.round(choice.duration_s / 60))
          return (
            <div key={`${choice.label}-${index}`} className="route-choice">
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
                  <span className="route-choice-label">{choice.label}</span>
                  <span className="route-choice-distance">{formatKm(choice.distance_m)}</span>
                </span>
                <span className="route-choice-stats">
                  ok. {minutes} min · schody: {choice.stairs_count || 'brak'} · nierówna
                  nawierzchnia: {Math.round(choice.rough_surface_m)} m
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
