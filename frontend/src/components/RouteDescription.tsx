import { useEffect, useRef } from 'react'
import type { RouteResponse } from '../api/client'
import { STATUS_LABEL } from './dataStatus'
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from './difficulty'
import { formatKm } from './format'
import { AlertIcon } from './icons'
import { SegmentDetails } from './SegmentDetails'

interface Props {
  route: RouteResponse
  selected?: number | null
  onSelect?: (index: number | null) => void
}

/** Tekstowa alternatywa mapy: pełny opis trasy krok po kroku. */
export function RouteDescription({ route, selected = null, onSelect }: Props) {
  const list = useRef<HTMLOListElement>(null)
  const steps = useRef<(HTMLButtonElement | null)[]>([])

  // Odcinek wybrany na mapie: pokaż go na liście i przenieś tam fokus (czytnik ekranu)
  useEffect(() => {
    const step = selected !== null ? steps.current[selected] : null
    if (!step) return
    if (!list.current?.contains(document.activeElement)) step.focus({ preventScroll: true })
    step.scrollIntoView?.({ block: 'nearest' })
  }, [selected])

  const close = (index: number) => {
    onSelect?.(null)
    steps.current[index]?.focus()
  }

  return (
    <section className="card" aria-labelledby="route-heading">
      <h2 id="route-heading">Opis trasy</h2>
      <p className="meta">
        {route.segments.length} odcinków. Wybierz odcinek (tutaj albo na mapie), aby zobaczyć
        szczegóły i źródło danych.
      </p>
      <ol ref={list} className="timeline">
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
                <>
                  <button
                    ref={(el) => {
                      steps.current[i] = el
                    }}
                    type="button"
                    className="step-body"
                    aria-expanded={isSelected}
                    aria-controls={isSelected ? `segment-details-${i}` : undefined}
                    onClick={() => onSelect(isSelected ? null : i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && isSelected) close(i)
                    }}
                  >
                    {content}
                  </button>
                  {isSelected && (
                    <SegmentDetails
                      id={`segment-details-${i}`}
                      segment={s}
                      onClose={() => close(i)}
                    />
                  )}
                </>
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
