import { useEffect, useRef } from 'react'
import type { Barrier, Report } from '../api/client'
import { ReportVotes } from './ReportVotes'

interface Props {
  barrier: Barrier
  onClose: () => void
  onVoted?: (report: Report) => void
}

/** Okienko zgłoszenia użytkownika na mapie: co zgłoszono i głosowanie innych (#62). */
export function ReportPopup({ barrier, onClose, onVoted }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [barrier.id])

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

  if (!barrier.report) return null
  return (
    <div ref={root} className="institution-popup">
      <p className="institution-kind">Zgłoszenie użytkownika</p>
      <h2 ref={heading} tabIndex={-1}>
        {barrier.description}
      </h2>
      {barrier.street && <p className="meta">{barrier.street}</p>}
      <p className="meta">Czy problem nadal tu jest?</p>
      <ReportVotes key={barrier.id} report={barrier.report} onVoted={onVoted} />
    </div>
  )
}
