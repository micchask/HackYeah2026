import { CarIcon } from './icons'
import { SoonTag } from './EmptyState'
import { formatKm } from './format'
import { buildRouteVariants } from './routeVariants'
import type { RouteResponse } from '../api/client'

interface Props {
  route: RouteResponse
  selected: number
  onChange: (index: number) => void
  /** false = tryb nie oznacza bruku (turysta, gość) - bez znaczników o bruku */
  showRough?: boolean
}

/** 1–2 najważniejsze cechy wariantu zamiast zdań. */
function features(
  route: RouteResponse,
  showRough: boolean,
): { label: string; tone: 'good' | 'warn' }[] {
  const out: { label: string; tone: 'good' | 'warn' }[] = []
  const stairs = route.stairs_count ?? 0
  out.push(
    stairs === 0
      ? { label: 'bez schodów', tone: 'good' }
      : { label: `schody: ${stairs}`, tone: 'warn' },
  )
  const rough = Math.round(route.rough_surface_m ?? 0)
  // tryb bez oznaczania bruku (turysta, gość): 0 m nie znaczy „mało bruku”
  if (!showRough) {
    if (route.confidence >= 0.7) out.push({ label: 'dane potwierdzone', tone: 'good' })
  } else if (rough < 100) out.push({ label: 'mało bruku', tone: 'good' })
  else if (route.confidence >= 0.7) out.push({ label: 'dane potwierdzone', tone: 'good' })
  else out.push({ label: `bruk ${rough} m`, tone: 'warn' })
  return out
}

/** Wybór między trasą główną a różniącymi się od niej wariantami z API. */
export function RouteAlternatives({ route, selected, onChange, showRough = true }: Props) {
  const choices = buildRouteVariants(route)
  if (choices.length < 2) return null

  return (
    <section className="route-alternatives" aria-labelledby="route-alternatives-heading">
      <h2 id="route-alternatives-heading" className="section-label">
        Warianty trasy
      </h2>
      <fieldset className="route-choices">
        <legend className="visually-hidden">Dostępne warianty trasy</legend>
        {choices.map(({ index, label, route: choice }) => {
          const minutes = Math.max(1, Math.round(choice.duration_s / 60))
          const isSelected = selected === index
          return (
            <div key={`${label}-${index}`} className="route-choice">
              <input
                id={`route-choice-${index}`}
                type="radio"
                name="route-variant"
                value={index}
                checked={isSelected}
                onChange={() => onChange(index)}
                aria-describedby={`route-choice-${index}-description`}
              />
              <label htmlFor={`route-choice-${index}`} className="route-choice-content">
                <span className="route-choice-head">
                  <span className="route-choice-label">{label}</span>
                  {isSelected && <span className="visually-hidden">Wybrana</span>}
                  <span className="route-choice-time">{minutes} min</span>
                </span>
                <span className="route-choice-meta">
                  <span className="route-choice-distance">{formatKm(choice.distance_m)}</span>
                  {features(choice, showRough).map((f) => (
                    <span key={f.label} className={`route-feature route-feature-${f.tone}`}>
                      {f.label}
                    </span>
                  ))}
                </span>
                <span className="route-choice-scores">
                  dostępność {choice.accessibility_score}/100 · pewność danych{' '}
                  {Math.round(choice.confidence * 100)}%
                </span>
                <span
                  id={`route-choice-${index}-description`}
                  className={
                    isSelected
                      ? 'route-choice-description'
                      : 'route-choice-description visually-hidden'
                  }
                >
                  {choice.explanation}
                </span>
              </label>
            </div>
          )
        })}
        <div className="route-choice route-choice-soon" aria-disabled="true">
          <span className="route-choice-soon-icon" aria-hidden="true">
            <CarIcon size={18} />
          </span>
          <span className="route-choice-content">
            <span className="route-choice-head">
              <span className="route-choice-label">Auto + wózek</span>
              <SoonTag />
            </span>
            <span className="route-choice-meta">Parking dla OzN i dojście do celu</span>
          </span>
        </div>
      </fieldset>
    </section>
  )
}
