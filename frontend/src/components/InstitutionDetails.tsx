import { useEffect, useRef } from 'react'
import type { Institution, InstitutionAttribute } from '../api/client'
import { AlertIcon } from './icons'
import { formatDate } from './format'

type Status = InstitutionAttribute['status']

// Brak informacji ma osobny, neutralny status - nigdy nie wygląda jak "dostępne"
const STATUS: Record<Status, { label: string; badge: string }> = {
  confirmed: { label: 'potwierdzone', badge: 'badge-verified' },
  confirmed_no_date: { label: 'bez daty weryfikacji', badge: 'badge-outdated' },
  unknown: { label: 'brak informacji', badge: 'badge-unverified' },
}

interface Props {
  institution: Institution
  onSetOrigin: () => void
  onSetDestination: () => void
  onClose: () => void
}

/** Informacje o dostępności instytucji z deklaracji dostępności (BIP). */
export function InstitutionDetails({
  institution: inst,
  onSetOrigin,
  onSetDestination,
  onClose,
}: Props) {
  const card = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const attributes = inst.attributes ?? []

  // Po wyborze (także kliknięciem na mapie) fokus na nagłówek - czytnik ekranu od razu go przeczyta
  useEffect(() => {
    heading.current?.focus()
  }, [inst.id])

  // Escape zamyka kartę, gdy fokus jest w jej środku
  useEffect(() => {
    const el = card.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <section ref={card} className="card institution" aria-labelledby="institution-heading">
      <p className="meta institution-kind">
        {inst.kind} · {inst.address}
      </p>
      <h2 id="institution-heading" ref={heading} tabIndex={-1}>
        {inst.name}
      </h2>

      {inst.location && !inst.location.exact && (
        <p className="callout callout-warning">
          <AlertIcon size={18} />
          <span>Punkt na mapie jest przybliżony – adres w deklaracji nie ma numeru budynku.</span>
        </p>
      )}

      <ul className="attributes">
        {attributes.map((a) => {
          const status = STATUS[a.status]
          return (
            <li key={a.category} className="attribute institution-attribute">
              <span className="attribute-main">
                {a.label}: <strong>{a.value ?? 'brak informacji'}</strong>
              </span>
              <span className="attribute-meta">
                <span className={`badge ${status.badge}`}>{status.label}</span>
                <span className="meta">
                  pewność {Math.round(a.confidence * 100)}%
                  {a.last_verified ? ` · zweryfikowano ${formatDate(a.last_verified)}` : ''}
                </span>
              </span>
              {a.note && <span className="meta institution-note">{a.note}</span>}
            </li>
          )
        })}
      </ul>

      <p className="meta">
        Źródło: {attributes[0]?.source ?? 'deklaracja dostępności'}.
        {inst.location && ` Lokalizacja: ${inst.location.source}.`}
      </p>

      <div className="institution-actions">
        <button type="button" className="chip" onClick={onSetOrigin}>
          Trasa stąd (A)
        </button>
        <button type="button" className="chip" onClick={onSetDestination}>
          Trasa tutaj (B)
        </button>
        <button type="button" className="link-button" onClick={onClose}>
          Zamknij
        </button>
      </div>
    </section>
  )
}
