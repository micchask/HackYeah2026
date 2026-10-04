import { useEffect, useRef } from 'react'

/** Zdarzenie DOM po zmianie rozmiaru okienka - mapa (MapView) dociąga je wtedy do widoku */
export const POPUP_RESIZE_EVENT = 'mappopup:resize'

export interface MapPopupActions {
  onClose: () => void
  /** Otwiera zgłoszenie bariery z tym miejscem (#95) */
  onReport?: () => void
}

interface Props extends MapPopupActions {
  /** Klucz obiektu - zmiana przenosi fokus na nazwę */
  id: string
  kind?: string | null
  title: string
  subtitle?: string | null
}

/**
 * Mały dymek przy punkcie na mapie (jak w mapach Google): rodzaj i nazwa.
 * Pełne informacje i akcje są w karcie miejsca w panelu (plan §5.5) - otwiera się sama
 * przy wyborze punktu, więc dymek nie ma osobnego przycisku „Szczegóły”.
 */
export function MapPopupCard({ id, kind, title, subtitle, onClose, onReport }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  // Fokus na nazwę po otwarciu - działa też przy wyborze z listy albo wyszukiwarki klawiaturą
  useEffect(() => {
    heading.current?.focus()
  }, [id])

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
      {onReport && (
        <button type="button" className="link-button popup-report" onClick={onReport}>
          Zgłoś problem tutaj
        </button>
      )}
    </div>
  )
}
