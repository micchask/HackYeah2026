import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDownIcon, InfoIcon } from './icons'

/** Zdarzenie DOM po zmianie rozmiaru okienka - mapa (MapView) dociąga je wtedy do widoku */
export const POPUP_RESIZE_EVENT = 'mappopup:resize'

export interface MapPopupActions {
  onSetOrigin: () => void
  onSetDestination: () => void
  onClose: () => void
}

interface Props extends MapPopupActions {
  /** Klucz obiektu - zmiana przenosi fokus na nazwę */
  id: string
  kind?: string | null
  title: string
  subtitle?: string | null
  /** Pełne informacje o dostępności, pokazywane po "Więcej informacji" */
  details: ReactNode
}

/**
 * Wspólne okienko przy punkcie na mapie (instytucja, miejsce, adres) - jak w mapach Google:
 * nazwa i szybkie akcje, a po "Więcej informacji" szczegóły dostępności.
 */
export function MapPopupCard({
  id,
  kind,
  title,
  subtitle,
  details,
  onSetOrigin,
  onSetDestination,
  onClose,
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const detailsId = useId()
  const [expanded, setExpanded] = useState(false)

  // Fokus na nazwę po otwarciu - działa też przy wyborze z listy albo wyszukiwarki klawiaturą
  useEffect(() => {
    heading.current?.focus()
  }, [id])

  // Po rozwinięciu/zwinięciu okienko zmienia wysokość - mapa musi je "dociągnąć" do widoku.
  // Przy samym otwarciu nie: mapa wtedy i tak centruje się na punkcie.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    root.current?.dispatchEvent(new CustomEvent(POPUP_RESIZE_EVENT, { bubbles: true }))
  }, [expanded])

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
      {kind && <p className="institution-kind">{kind}</p>}
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
      {subtitle && <p className="meta">{subtitle}</p>}

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
          {details}
        </div>
      )}
    </div>
  )
}
