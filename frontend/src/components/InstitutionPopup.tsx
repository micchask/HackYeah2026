import { useEffect, useId, useRef, useState } from 'react'
import type { Institution, InstitutionAttribute } from '../api/client'
import { AlertIcon, ChevronDownIcon, InfoIcon } from './icons'
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
  /** Wywoływane po zmianie rozmiaru (rozwinięcie) - mapa dopasowuje się, żeby okienko było widać */
  onResize?: () => void
}

/**
 * Okienko przy punkcie instytucji na mapie: nazwa i szybkie akcje,
 * a po "Więcej informacji" pełne dane o dostępności z deklaracji (BIP).
 */
export function InstitutionPopup({
  institution: inst,
  onSetOrigin,
  onSetDestination,
  onClose,
  onResize,
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const detailsId = useId()
  const [expanded, setExpanded] = useState(false)
  const attributes = inst.attributes ?? []

  // Fokus na nazwę po otwarciu - działa też przy wyborze z listy klawiaturą
  useEffect(() => {
    heading.current?.focus()
  }, [inst.id])

  // Po rozwinięciu/zwinięciu okienko zmienia wysokość - mapa musi je "dociągnąć" do widoku.
  // Przy samym otwarciu nie: mapa wtedy i tak centruje się na punkcie.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    onResize?.()
  }, [expanded, onResize])

  // Escape zamyka okienko, gdy fokus jest w jego środku
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div ref={root} className="institution-popup">
      <p className="institution-kind">{inst.kind}</p>
      <h2 ref={heading} tabIndex={-1}>
        {inst.name}
      </h2>
      <p className="meta">{inst.address}</p>

      <div className="institution-actions">
        <button type="button" className="chip" onClick={onSetOrigin}>
          Start (A)
        </button>
        <button type="button" className="chip" onClick={onSetDestination}>
          Cel (B)
        </button>
      </div>
      <button
        type="button"
        className="more-button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((v) => !v)}
      >
        <InfoIcon size={18} />
        <span>{expanded ? 'Mniej informacji' : 'Więcej informacji o dostępności'}</span>
        <ChevronDownIcon size={18} className="more-chevron" />
      </button>

      {expanded && (
        <div id={detailsId} className="institution-more">
          {inst.location && !inst.location.exact && (
            <p className="callout callout-warning">
              <AlertIcon size={18} />
              <span>Punkt na mapie jest przybliżony – adres nie ma numeru budynku.</span>
            </p>
          )}
          <h3>Dostępność</h3>
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
                      {a.last_verified ? ` · ${formatDate(a.last_verified)}` : ''}
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
        </div>
      )}
    </div>
  )
}
