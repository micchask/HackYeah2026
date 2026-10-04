// Estetyczne stany puste / błędu / „w przygotowaniu” zamiast surowego tekstu.
import type { ReactNode } from 'react'
import { AlertIcon, InfoIcon, SparkIcon } from './icons'

type Tone = 'empty' | 'error' | 'soon'

const ICON: Record<Tone, ReactNode> = {
  empty: <InfoIcon size={22} />,
  error: <AlertIcon size={22} />,
  soon: <SparkIcon size={22} />,
}

interface Props {
  title: string
  children?: ReactNode
  tone?: Tone
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, children, tone = 'empty', icon, action }: Props) {
  return (
    <div
      className={`empty-state empty-state-${tone}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <span className="empty-state-icon" aria-hidden="true">
        {icon ?? ICON[tone]}
      </span>
      <p className="empty-state-title">{title}</p>
      {children && <p className="empty-state-text">{children}</p>}
      {action}
    </div>
  )
}

/** Szkielet listy podczas ładowania (dla czytnika: tekst w aria-busy rodzica). */
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton-row">
          <span className="skeleton-dot" />
          <span className="skeleton-lines">
            <span />
            <span />
          </span>
        </span>
      ))}
    </div>
  )
}

/** Mały tag „wkrótce” / „demo” przy funkcjach, których logika dojdzie później. */
export function SoonTag({ children = 'wkrótce' }: { children?: ReactNode }) {
  return <span className="soon-tag">{children}</span>
}
