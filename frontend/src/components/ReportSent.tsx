import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from './icons'

interface Props {
  message: string
  /** Nazwa widoku, do którego wracamy, np. „Trasa” */
  backLabel: string
  /** Po tylu sekundach panel sam wraca (można zatrzymać - WCAG 2.2.1) */
  seconds?: number
  onBack: () => void
  /** „Zostań tutaj”: bez powrotu, formularz na kolejne zgłoszenie */
  onStay: () => void
}

/** Potwierdzenie zgłoszenia z automatycznym powrotem, który da się zatrzymać. */
export function ReportSent({ message, backLabel, seconds = 8, onBack, onStay }: Props) {
  const [left, setLeft] = useState(seconds)
  const back = useRef<HTMLButtonElement>(null)
  const onBackRef = useRef(onBack)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  // Fokus na „Wróć teraz” - z klawiatury można od razu wrócić albo przejść do „Zostań tutaj”
  useEffect(() => {
    back.current?.focus()
  }, [])

  useEffect(() => {
    if (left <= 0) {
      onBackRef.current()
      return
    }
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])

  return (
    <section className="card report-sent" aria-label="Zgłoszenie wysłane">
      <output className="callout callout-success">
        <CheckIcon size={18} />
        <span>{message}</span>
      </output>
      {/* odliczanie bez aria-live - czytnik ekranu nie czyta każdej sekundy */}
      <p className="meta">
        Za {left} s wrócisz do widoku „{backLabel}”.
      </p>
      <div className="report-sent-actions">
        <button ref={back} type="button" className="chip" onClick={onBack}>
          ← Wróć teraz
        </button>
        <button type="button" className="link-button" onClick={onStay}>
          Zostań tutaj i zgłoś kolejne
        </button>
      </div>
    </section>
  )
}
